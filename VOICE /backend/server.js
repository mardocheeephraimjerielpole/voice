const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const clients = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Client Speech-to-Text Google Cloud
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json'
});

// API Routes
app.post('/api/process-audio', async (req, res) => {
  try {
    const { audio, language = 'fr-FR' } = req.body;
    
    const request = {
      audio: { content: audio },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: language,
        enableWordTimeOffsets: true,
        model: 'command_and_search',
      },
    };

    const [response] = await speechClient.recognize(request);
    const result = response.results[0];
    
    if (!result) {
      return res.json({ success: false, error: 'No speech detected' });
    }

    const transcript = result.alternatives[0].transcript;
    const confidence = result.alternatives[0].confidence;

    res.json({
      success: true,
      transcript,
      confidence,
      language
    });
  } catch (error) {
    console.error('Speech processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/commands', (req, res) => {
  const { userId, command } = req.body;
  
  // Log de la commande
  const log = {
    timestamp: new Date().toISOString(),
    userId,
    command,
    type: 'voice_command'
  };
  
  fs.appendFileSync('commands.log', JSON.stringify(log) + '\n');
  
  res.json({ success: true, executed: true, logId: log.timestamp });
});

// Endpoint pour les captures d'écran
app.post('/api/screenshot', (req, res) => {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ success: false, error: 'No image data' });
  }
  
  try {
    // Décoder l'image base64
    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const filename = `screenshot_${Date.now()}.png`;
    const filepath = `./screenshots/${filename}`;
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync('./screenshots')) {
      fs.mkdirSync('./screenshots');
    }
    
    // Sauvegarder l'image
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    res.json({ 
      success: true, 
      filename,
      filepath,
      message: 'Screenshot saved successfully'
    });
  } catch (error) {
    console.error('Screenshot save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint pour ouvrir des applications
app.post('/api/open-app', (req, res) => {
  const { app } = req.body;
  
  if (!app) {
    return res.status(400).json({ success: false, error: 'No app specified' });
  }
  
  let command = '';
  const appLower = app.toLowerCase();
  
  if (appLower.includes('zoom')) {
    command = process.platform === 'win32' 
      ? 'start zoom' 
      : process.platform === 'darwin'
        ? 'open -a "Zoom"'
        : 'zoom';
  } else if (appLower.includes('chrome') || appLower.includes('browser')) {
    command = process.platform === 'win32'
      ? 'start chrome'
      : process.platform === 'darwin'
        ? 'open -a "Google Chrome"'
        : 'google-chrome';
  } else if (appLower.includes('mail') || appLower.includes('gmail')) {
    command = process.platform === 'win32'
      ? 'start chrome https://mail.google.com'
      : process.platform === 'darwin'
        ? 'open https://mail.google.com'
        : 'xdg-open https://mail.google.com';
  } else if (appLower.includes('teams')) {
    command = process.platform === 'win32'
      ? 'start teams'
      : process.platform === 'darwin'
        ? 'open -a "Microsoft Teams"'
        : 'teams';
  }
  
  if (command) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error opening app:', error);
        res.status(500).json({ success: false, error: error.message });
      } else {
        res.json({ success: true, app, command });
      }
    });
  } else {
    res.status(400).json({ success: false, error: 'App not supported' });
  }
});

// Endpoint pour organiser des réunions
app.post('/api/schedule-meeting', (req, res) => {
  const { title, description, date } = req.body;
  
  // Créer un fichier .ics pour le calendrier
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title || 'VoiceControl Meeting'}
DESCRIPTION:${description || 'Meeting scheduled via VoiceControl Pro'}
DTSTART:${date || new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}
DTEND:${new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}
END:VEVENT
END:VCALENDAR`;
  
  const filename = `meeting_${Date.now()}.ics`;
  fs.writeFileSync(`./${filename}`, icsContent);
  
  res.json({ 
    success: true, 
    meeting: { title, description, date },
    icsFile: filename,
    downloadUrl: `/${filename}`
  });
});

// Endpoint sécurisé pour exécuter des tâches système
app.post('/api/execute', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;

    if (!process.env.EXECUTE_TOKEN) {
      return res.status(500).json({ success: false, error: 'EXECUTE_TOKEN not configured on server' });
    }

    if (!token || token !== process.env.EXECUTE_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { task } = req.body;
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ success: false, error: 'Task parameter required' });
    }

    const safeTask = task.trim().toLowerCase();

    // Whitelist des tâches autorisées
    const allowedTasks = {
      'taskmgr': 'Task Manager',
      'screencapture': 'Take Screenshot',
      'open zoom': 'Open Zoom',
      'open mail': 'Open Mail',
      'open chrome': 'Open Chrome',
      'lock screen': 'Lock Screen',
      'shutdown': 'Shutdown',
      'restart': 'Restart',
      'sleep': 'Sleep'
    };

    let command = '';
    let action = '';

    if (safeTask.includes('screenshot') || safeTask === 'screencapture') {
      if (process.platform === 'darwin') {
        command = `screencapture -x ./screenshot_${Date.now()}.png`;
        action = 'screenshot';
      } else if (process.platform === 'win32') {
        command = 'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"{PRTSC}\")"';
        action = 'screenshot';
      }
    } else if (safeTask.includes('zoom')) {
      command = process.platform === 'darwin' 
        ? 'open -a "Zoom"' 
        : process.platform === 'win32' 
          ? 'start zoom' 
          : 'zoom';
      action = 'open_zoom';
    } else if (safeTask.includes('mail')) {
      command = process.platform === 'darwin'
        ? 'open https://mail.google.com'
        : process.platform === 'win32'
          ? 'start chrome https://mail.google.com'
          : 'xdg-open https://mail.google.com';
      action = 'open_mail';
    } else if (safeTask.includes('lock')) {
      command = process.platform === 'darwin'
        ? 'pmset displaysleepnow'
        : process.platform === 'win32'
          ? 'rundll32.exe user32.dll,LockWorkStation'
          : 'gnome-screensaver-command -l';
      action = 'lock_screen';
    } else if (safeTask === 'taskmgr') {
      command = process.platform === 'win32'
        ? 'taskmgr'
        : process.platform === 'darwin'
          ? 'open -a "Activity Monitor"'
          : 'gnome-system-monitor';
      action = 'task_manager';
    } else {
      return res.status(400).json({ success: false, error: 'Task not allowed' });
    }

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('Command execution error:', err);
        return res.status(500).json({ success: false, error: stderr || err.message });
      }
      
      res.json({ 
        success: true, 
        action,
        task: safeTask,
        platform: process.platform,
        message: 'Command executed successfully'
      });
    });
  } catch (error) {
    console.error('Execute endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '2.0.0',
    features: [
      'voice_control',
      'app_control',
      'meeting_scheduling',
      'screenshot',
      'system_commands'
    ],
    clients: clients.size,
    uptime: process.uptime()
  });
});

// WebSocket pour communication temps réel
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  
  console.log(`New client connected: ${clientId}`);
  
  // Envoyer l'ID au client
  ws.send(JSON.stringify({ 
    type: 'connection', 
    clientId,
    features: ['voice', 'control', 'system']
  }));
  
  // Gérer les messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Gérer la déconnexion
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
});

function handleWebSocketMessage(clientId, data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'voice_command':
      // Traiter la commande vocale
      broadcastToAll({ 
        type: 'command_received', 
        payload: { 
          clientId, 
          command: payload.command,
          timestamp: new Date().toISOString()
        } 
      });
      break;
      
    case 'system_event':
      // Gérer les événements système
      console.log('System event:', payload);
      broadcastToAll({ type: 'system_event', payload });
      break;
      
    case 'test_result':
      // Résultats de test
      console.log('Test result:', payload);
      break;
      
    case 'keepalive':
      // Garder la connexion active
      clients.get(clientId).send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function broadcastToAll(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Créer les dossiers nécessaires
if (!fs.existsSync('./screenshots')) {
  fs.mkdirSync('./screenshots');
}

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 VoiceControl Pro Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
  console.log(`🎤 Features: Voice Control, App Control, Meeting Scheduling, Screenshot`);
});