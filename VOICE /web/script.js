// CONFIGURATION GLOBALE
const VoiceControlApp = {
    // État de l'application
    state: {
        isInitialized: false,
        isListening: false,
        isControlling: false,
        recognition: null,
        commandsHistory: [],
        currentElement: null,
        speechSynthesis: window.speechSynthesis,
        language: 'fr-FR',
        hotword: 'ok voice',
        settings: {
            autoStart: true,
            voiceFeedback: true,
            soundEffects: true,
            visualFeedback: true,
            continuousListening: false,
            sensitivity: 0.7
        }
    },

    // Commandes prédéfinies
    commands: {
        navigation: [
            { pattern: /(clique|cliquer|appuie|appuyer) (ici|sur ça)/i, action: 'click' },
            { pattern: /(revenir|retour|arrière)/i, action: 'back' },
            { pattern: /(accueil|home|maison)/i, action: 'home' },
            { pattern: /(défile|défiler|descendre|vers le bas)/i, action: 'scroll-down' },
            { pattern: /(monte|monter|vers le haut)/i, action: 'scroll-up' },
            { pattern: /(ouvre|ouvrir) (les |)?applications/i, action: 'open-apps' },
            { pattern: /(ferme|fermer) (l'|la |)?application/i, action: 'close-app' }
        ],
        system: [
            { pattern: /(paramètres|settings|configuration)/i, action: 'open-settings' },
            { pattern: /(volume) (plus|augmente)/i, action: 'volume-up' },
            { pattern: /(volume) (moins|diminue)/i, action: 'volume-down' },
            { pattern: /(silencieux|mode silencieux)/i, action: 'toggle-silent' },
            { pattern: /(capture|screenshot)/i, action: 'screenshot' },
            { pattern: /(verrouille|verrouiller)/i, action: 'lock' },
            { pattern: /(micro|microphone) (est|est[- ]ce que|suis|suis[- ]je)? (activé|activée|en marche|allumé)/i, action: 'mic-status' }
        ],
        media: [
            { pattern: /(joue|play|lance)/i, action: 'play' },
            { pattern: /(pause|stop|arrête)/i, action: 'pause' },
            { pattern: /(suivant|next)/i, action: 'next' },
            { pattern: /(précédent|previous)/i, action: 'previous' }
        ],
        text: [
            { pattern: /(tape|écris|écrire) (.+)/i, action: 'type', extract: true },
            { pattern: /(efface|supprime)/i, action: 'delete' },
            { pattern: /(sélectionne tout|tout sélectionner)/i, action: 'select-all' },
            { pattern: /(copie|copier)/i, action: 'copy' },
            { pattern: /(colle|coller)/i, action: 'paste' }
        ],
        tasks: [
            { pattern: /(exécute|exécuter|lance|lancer) (la )?tâche (.+)/i, action: 'execute-task', extract: true },
            { pattern: /(exécute|exécuter|lance|lancer) (.+)/i, action: 'execute-task', extract: true }
        ]
    },

    // Initialisation automatique
    init: function() {
        console.log('🚀 Initialisation de VoiceControl Pro...');
        
        // Masquer la barre d'adresse sur mobile
        this.setupFullscreen();
        
        // Démarrer la prise de contrôle
        this.startControlTakeover();
        
        // Configurer les écouteurs d'événements
        this.setupEventListeners();
        
        // Initialiser la reconnaissance vocale
        this.initSpeechRecognition();
        
        // Démarrer l'écoute continue si configuré
        if (this.state.settings.continuousListening) {
            this.startContinuousListening();
        }
        
        // Vérifier les permissions
        this.checkPermissions();
        
        // Marquer comme initialisé
        this.state.isInitialized = true;
        
        console.log('✅ VoiceControl Pro initialisé avec succès');
    },

    // Prise de contrôle complète
    startControlTakeover: function() {
        console.log('🔄 Prise de contrôle de l\'appareil...');
        
        // 1. Empêcher les actions par défaut
        document.addEventListener('touchstart', this.preventDefault, { passive: false });
        document.addEventListener('touchmove', this.preventDefault, { passive: false });
        document.addEventListener('contextmenu', this.preventDefault, { passive: false });
        
        // 2. Prendre le focus
        document.body.focus();
        
        // 3. Désactiver le zoom sur mobile
        document.addEventListener('gesturestart', this.preventDefault);
        document.addEventListener('gesturechange', this.preventDefault);
        document.addEventListener('gestureend', this.preventDefault);
        
        // 4. Masquer l'interface système
        this.hideSystemUI();
        
        // 5. Afficher l'interface après 2 secondes
        setTimeout(() => {
            document.getElementById('controlOverlay').style.display = 'none';
            document.getElementById('appInterface').classList.add('active');
            this.state.isControlling = true;
            this.showFeedback('✅ Contrôle vocal activé', 'success');
            this.speak('VoiceControl est maintenant actif. Dites "ok voice" suivi d\'une commande.');
        }, 2000);
    },

    // Empêcher les actions par défaut
    preventDefault: function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    },

    // Cacher l'interface système
    hideSystemUI: function() {
        // Pour les applications web progressives
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // Déjà en mode application
        }
        
        // Pour mobile
        if ('standalone' in window.navigator) {
            document.documentElement.style.height = '100vh';
            document.documentElement.style.overflow = 'hidden';
        }
        
        // Ajouter une classe pour le mode contrôle
        document.documentElement.classList.add('voice-control-active');
    },

    // Initialiser la reconnaissance vocale
    initSpeechRecognition: function() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.state.recognition = new SpeechRecognition();
            
            // Configuration optimisée
            this.state.recognition.continuous = true;
            this.state.recognition.interimResults = true;
            this.state.recognition.lang = this.state.language;
            this.state.recognition.maxAlternatives = 3;
            
            // Événements
            this.state.recognition.onstart = () => {
                console.log('🎤 Reconnaissance vocale démarrée');
                this.updateUI(true);
                this.showFeedback('🎤 Écoute active...', 'listening');
            };
            
            this.state.recognition.onresult = (event) => {
                const results = event.results;
                const transcript = results[results.length - 1][0].transcript;
                const confidence = results[results.length - 1][0].confidence;
                
                console.log(`🗣️ Reconnu: "${transcript}" (${Math.round(confidence * 100)}%)`);
                
                // Traiter seulement si la confiance est suffisante
                if (confidence > this.state.settings.sensitivity) {
                    this.processVoiceCommand(transcript, confidence);
                }
            };
            
            this.state.recognition.onerror = (event) => {
                console.error('❌ Erreur reconnaissance:', event.error);
                
                if (event.error === 'not-allowed') {
                    this.showFeedback('❌ Microphone non autorisé', 'error');
                    this.requestMicrophonePermission();
                } else if (event.error === 'no-speech') {
                    // Pas d'erreur, juste pas de parole détectée
                }
                
                this.updateUI(false);
            };
            
            this.state.recognition.onend = () => {
                console.log('⏹️ Reconnaissance vocale arrêtée');
                this.updateUI(false);
                
                // Redémarrer si en écoute continue
                if (this.state.settings.continuousListening && this.state.isControlling) {
                    setTimeout(() => {
                        this.startListening();
                    }, 500);
                }
            };
            
            console.log('✅ Reconnaissance vocale initialisée');
        } else {
            console.error('❌ API de reconnaissance vocale non supportée');
            this.showFeedback('❌ Reconnaissance vocale non supportée', 'error');
        }
    },

    // Démarrer l'écoute
    startListening: function() {
        if (this.state.recognition && !this.state.isListening) {
            try {
                this.state.recognition.start();
                this.state.isListening = true;
                this.playSound('start');
            } catch (error) {
                console.error('❌ Erreur démarrage écoute:', error);
            }
        }
    },

    // Arrêter l'écoute
    stopListening: function() {
        if (this.state.recognition && this.state.isListening) {
            this.state.recognition.stop();
            this.state.isListening = false;
            this.playSound('stop');
        }
    },

    // Traiter une commande vocale
    processVoiceCommand: function(transcript, confidence) {
        // Ajouter à l'historique
        this.addToHistory(transcript, confidence);
        
        // Vérifier le mot d'activation
        const lowerTranscript = transcript.toLowerCase();
        
        if (this.state.settings.continuousListening || lowerTranscript.includes(this.state.hotword)) {
            // Retirer le mot d'activation si présent
            const cleanTranscript = lowerTranscript.replace(this.state.hotword, '').trim();
            
            // Chercher une commande correspondante
            const command = this.findMatchingCommand(cleanTranscript);
            
            if (command) {
                this.executeCommand(command, cleanTranscript);
            } else {
                this.showFeedback(`❌ Commande non reconnue: "${cleanTranscript}"`, 'error');
                this.speak('Je n\'ai pas compris cette commande. Essayez de reformuler.');
            }
        }
    },

    // Trouver une commande correspondante
    findMatchingCommand: function(transcript) {
        for (const category in this.commands) {
            for (const cmd of this.commands[category]) {
                const match = transcript.match(cmd.pattern);
                if (match) {
                    return {
                        ...cmd,
                        match: match,
                        params: cmd.extract ? match[match.length - 1] : null
                    };
                }
            }
        }
        return null;
    },

    // Exécuter une commande
    executeCommand: function(command, originalTranscript) {
        console.log(`⚡ Exécution: ${command.action}`, command.params || '');
        
        // Feedback visuel
        this.showFeedback(`✅ ${originalTranscript}`, 'success');
        
        // Jouer un son
        this.playSound('action');
        
        // Exécuter l'action correspondante
        switch (command.action) {
            case 'click':
                this.simulateClick();
                break;
            case 'back':
                window.history.back();
                break;
            case 'home':
                this.goToHome();
                break;
            case 'scroll-down':
                window.scrollBy({ top: 300, behavior: 'smooth' });
                break;
            case 'scroll-up':
                window.scrollBy({ top: -300, behavior: 'smooth' });
                break;
            case 'open-settings':
                this.openSettings();
                break;
            case 'type':
                this.typeText(command.params);
                break;
            case 'play':
                this.mediaControl('play');
                break;
            case 'pause':
                this.mediaControl('pause');
                break;
            case 'volume-up':
                this.adjustVolume(0.1);
                break;
            case 'volume-down':
                this.adjustVolume(-0.1);
                break;
            case 'mic-status':
                const isMicOn = this.state.isListening;
                const msg = isMicOn ? 'Le microphone est activé' : 'Le microphone est désactivé';
                this.showFeedback(isMicOn ? '🎤 Micro activé' : '🎤 Micro désactivé', isMicOn ? 'success' : 'info');
                if (this.state.settings.voiceFeedback) this.speak(msg);
                break;
            case 'execute-task':
                // command.params peut contenir le nom de la tâche
                const taskName = command.params || originalTranscript.replace(/^(exécute|exécuter|lance|lancer)\s*/i, '').trim();
                this.executeTask(taskName);
                break;
            default:
                console.log(`Action non implémentée: ${command.action}`);
        }
        
        // Feedback vocal si activé
        if (this.state.settings.voiceFeedback) {
            this.speak(`Commande exécutée: ${originalTranscript}`);
        }
    },

    // Simuler un clic
    simulateClick: function() {
        const element = document.elementFromPoint(
            window.innerWidth / 2,
            window.innerHeight / 2
        );
        
        if (element) {
            element.click();
            this.highlightElement(element);
        }
    },

    // Aller à l'accueil
    goToHome: function() {
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
        this.showFeedback('🏠 Accueil', 'info');
    },

    // Ouvrir les paramètres
    openSettings: function() {
        this.showFeedback('⚙️ Ouverture des paramètres...', 'info');
        // Implémenter l'interface des paramètres
    },

    // Saisir du texte
    typeText: function(text) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || 
                              activeElement.tagName === 'TEXTAREA' || 
                              activeElement.isContentEditable)) {
            activeElement.value += text;
            this.showFeedback(`📝 Saisie: "${text}"`, 'info');
        } else {
            this.showFeedback('❌ Aucun champ de texte actif', 'error');
        }
    },

    // Contrôle média
    mediaControl: function(action) {
        const video = document.querySelector('video');
        const audio = document.querySelector('audio');
        
        if (video) {
            if (action === 'play') video.play();
            else if (action === 'pause') video.pause();
        } else if (audio) {
            if (action === 'play') audio.play();
            else if (action === 'pause') audio.pause();
        }
    },

    // Ajuster le volume
    adjustVolume: function(change) {
        const video = document.querySelector('video');
        const audio = document.querySelector('audio');
        
        if (video) {
            video.volume = Math.min(1, Math.max(0, video.volume + change));
            this.showFeedback(`🔊 Volume: ${Math.round(video.volume * 100)}%`, 'info');
        } else if (audio) {
            audio.volume = Math.min(1, Math.max(0, audio.volume + change));
            this.showFeedback(`🔊 Volume: ${Math.round(audio.volume * 100)}%`, 'info');
        }
    },

    // Mettre en surbrillance un élément
    highlightElement: function(element) {
        const originalOutline = element.style.outline;
        element.style.outline = '3px solid #00d4ff';
        element.style.transition = 'outline 0.3s ease';
        
        setTimeout(() => {
            element.style.outline = originalOutline;
        }, 1000);
    },

    // Exécuter une tâche (placeholder / proxy vers backend)
    executeTask: function(taskName) {
        if (!taskName) {
            this.showFeedback('❌ Nom de tâche manquant', 'error');
            this.speak('Nom de tâche manquant. Réessayez.');
            return;
        }

        this.showFeedback(`🛠️ Exécution de la tâche : ${taskName}`, 'info');
        this.playSound('action');

        // Tentative d'appel du backend si disponible
        // Read token from localStorage or prompt user once
        const token = localStorage.getItem('EXECUTE_TOKEN') || prompt('Entrez le token d\'execution backend :');
        if (token) localStorage.setItem('EXECUTE_TOKEN', token);

        fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ task: taskName })
        })
        .then(res => {
            if (!res.ok) throw new Error('Erreur backend');
            return res.json();
        })
        .then(data => {
            this.showFeedback(`✅ Tâche exécutée: ${taskName}`, 'success');
            if (this.state.settings.voiceFeedback) this.speak(`Tâche ${taskName} exécutée`);
            console.log('Backend response:', data);
        })
        .catch(err => {
            console.warn('Backend non disponible ou erreur:', err);
            // Comportement de repli : simuler l'exécution
            setTimeout(() => {
                this.showFeedback(`✅ (Simulé) Tâche exécutée: ${taskName}`, 'success');
                if (this.state.settings.voiceFeedback) this.speak(`Tâche ${taskName} simulée`);
            }, 800);
        });
    },

    // Parler (synthèse vocale)
    speak: function(text) {
        if (this.state.speechSynthesis && this.state.settings.voiceFeedback) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.state.language;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            this.state.speechSynthesis.speak(utterance);
        }
    },

    // Afficher un feedback visuel
    showFeedback: function(text, type = 'info') {
        if (!this.state.settings.visualFeedback) return;
        
        const feedback = document.getElementById('visualFeedback');
        const feedbackText = document.getElementById('feedbackText');
        
        feedbackText.textContent = text;
        feedback.className = 'visual-feedback';
        
        // Ajouter la classe de type
        feedback.classList.add(type);
        feedback.classList.add('active');
        
        // Masquer après 3 secondes
        setTimeout(() => {
            feedback.classList.remove('active');
        }, 3000);
    },

    // Jouer un son
    playSound: function(type) {
        if (!this.state.settings.soundEffects) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch (type) {
                case 'start':
                    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // Do
                    break;
                case 'stop':
                    oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // Sol
                    break;
                case 'success':
                    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // Mi
                    break;
                case 'error':
                    oscillator.frequency.setValueAtTime(493.88, audioContext.currentTime); // Si
                    break;
                case 'action':
                    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // Ré
                    break;
            }
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('AudioContext non supporté:', error);
        }
    },

    // Ajouter à l'historique
    addToHistory: function(command, confidence) {
        const historyItem = {
            id: Date.now(),
            command: command,
            confidence: confidence,
            timestamp: new Date().toLocaleTimeString(),
            executed: true
        };
        
        this.state.commandsHistory.unshift(historyItem);
        
        // Garder seulement les 50 dernières commandes
        if (this.state.commandsHistory.length > 50) {
            this.state.commandsHistory.pop();
        }
        
        // Mettre à jour l'interface
        this.updateHistoryUI();
        
        // Mettre à jour le badge
        this.updateHistoryBadge();
    },

    // Mettre à jour l'interface de l'historique
    updateHistoryUI: function() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        this.state.commandsHistory.slice(0, 10).forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: 600;">"${item.command}"</span>
                    <span style="color: #a0a0c0; font-size: 12px;">${item.timestamp}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #00d4ff; font-size: 12px;">
                        <i class="fas fa-microphone"></i> ${Math.round(item.confidence * 100)}%
                    </span>
                    <span style="color: #00ff88; font-size: 12px;">
                        <i class="fas fa-check-circle"></i> exécuté
                    </span>
                </div>
            `;
            historyList.appendChild(div);
        });
    },

    // Mettre à jour le badge d'historique
    updateHistoryBadge: function() {
        const badge = document.getElementById('historyBadge');
        if (badge && this.state.commandsHistory.length > 0) {
            badge.style.display = 'block';
        }
    },

    // Configurer le plein écran
    setupFullscreen: function() {
        // Pour mobile iOS
        document.documentElement.style.height = '100vh';
        document.documentElement.style.overflow = 'hidden';
        
        // Pour Android/Chrome
        if ('standalone' in navigator || window.matchMedia('(display-mode: standalone)').matches) {
            document.documentElement.classList.add('standalone');
        }
    },

    // Configurer les écouteurs d'événements
    setupEventListeners: function() {
        // Bouton microphone
        const micButton = document.getElementById('micButton');
        const initMicButton = document.getElementById('initMicButton');
        
        if (micButton) {
            micButton.addEventListener('click', () => {
                if (this.state.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });
        }
        
        if (initMicButton) {
            initMicButton.addEventListener('click', () => {
                this.requestMicrophonePermission();
            });
        }
        
        // Boutons de commandes rapides
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                this.processVoiceCommand(command, 0.9);
            });
        });
        
        // Boutons de la barre de contrôle
        document.getElementById('homeBtn')?.addEventListener('click', () => this.goToHome());
        document.getElementById('historyBtn')?.addEventListener('click', () => this.toggleHistory());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('powerBtn')?.addEventListener('click', () => this.shutdown());
        
        // Gestion des touches
        document.addEventListener('keydown', (e) => {
            // Espace pour activer/désactiver le microphone
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.state.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            }
            
            // Échap pour quitter
            if (e.code === 'Escape') {
                this.showShutdownConfirmation();
            }
        });
        
        // Gestion des clics pour le menu contextuel
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu && contextMenu.classList.contains('active')) {
                contextMenu.classList.remove('active');
            }
        });
        
        // Détection de la parole pour l'écoute continue
        if (this.state.settings.continuousListening) {
            this.setupVAD(); // Voice Activity Detection
        }
    },

    // Basculer l'historique
    toggleHistory: function() {
        const history = document.getElementById('commandHistory');
        history.classList.toggle('active');
    },

    // Arrêter l'application
    shutdown: function() {
        this.showShutdownConfirmation();
    },

    // Afficher la confirmation d'arrêt
    showShutdownConfirmation: function() {
        if (confirm('Voulez-vous quitter VoiceControl Pro ?')) {
            this.stopListening();
            this.state.isControlling = false;
            
            // Restaurer les comportements normaux
            document.removeEventListener('touchstart', this.preventDefault);
            document.removeEventListener('touchmove', this.preventDefault);
            
            // Rediriger ou fermer
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        }
    },

    // Vérifier les permissions
    checkPermissions: function() {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' })
                .then(permissionStatus => {
                    if (permissionStatus.state === 'granted') {
                        console.log('✅ Permission microphone accordée');
                        this.startListening();
                    } else if (permissionStatus.state === 'prompt') {
                        console.log('ℹ️ Permission microphone demandée');
                        this.requestMicrophonePermission();
                    } else {
                        console.log('❌ Permission microphone refusée');
                        this.showFeedback('❌ Microphone non autorisé', 'error');
                    }
                    
                    permissionStatus.onchange = () => {
                        console.log('Permission microphone changée:', permissionStatus.state);
                    };
                })
                .catch(error => {
                    console.warn('Permissions API non supportée:', error);
                });
        }
    },

    // Demander la permission microphone
    requestMicrophonePermission: function() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('✅ Microphone autorisé');
                this.showFeedback('✅ Microphone activé', 'success');
                
                // Arrêter les tracks pour éviter l'indicateur d'enregistrement constant
                stream.getTracks().forEach(track => track.stop());
                
                // Démarrer l'écoute
                this.startListening();
            })
            .catch(error => {
                console.error('❌ Erreur permission microphone:', error);
                this.showFeedback('❌ Microphone refusé', 'error');
            });
    },

    // Mettre à jour l'interface utilisateur
    updateUI: function(isListening) {
        const micButton = document.getElementById('micButton');
        const statusText = document.getElementById('statusText');
        const pulseRing = document.getElementById('pulseRing');
        
        if (micButton) {
            if (isListening) {
                micButton.classList.add('listening');
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                statusText.textContent = '🎤 Parlez maintenant...';
                statusText.classList.add('active');
                pulseRing.style.display = 'block';
            } else {
                micButton.classList.remove('listening');
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                statusText.textContent = 'Appuyez sur le microphone pour parler';
                statusText.classList.remove('active');
                pulseRing.style.display = 'none';
            }
        }
    },

    // Détection d'activité vocale (VAD)
    setupVAD: function() {
        // Implémentation simplifiée de VAD
        if (navigator.mediaDevices && this.state.settings.continuousListening) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const audioContext = new AudioContext();
                    const source = audioContext.createMediaStreamSource(stream);
                    const analyser = audioContext.createAnalyser();
                    
                    source.connect(analyser);
                    analyser.fftSize = 256;
                    
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    
                    let silenceCounter = 0;
                    let isSpeaking = false;
                    
                    const detectVoice = () => {
                        analyser.getByteFrequencyData(dataArray);
                        
                        let sum = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / bufferLength;
                        
                        if (average > 20) { // Seuil de détection
                            silenceCounter = 0;
                            if (!isSpeaking) {
                                isSpeaking = true;
                                this.showFeedback('🎤 Parole détectée', 'listening');
                            }
                        } else {
                            silenceCounter++;
                            if (silenceCounter > 10 && isSpeaking) {
                                isSpeaking = false;
                            }
                        }
                        
                        requestAnimationFrame(detectVoice);
                    };
                    
                    detectVoice();
                })
                .catch(error => {
                    console.warn('VAD non disponible:', error);
                });
        }
    },

    // Écoute continue
    startContinuousListening: function() {
        if (!this.state.settings.continuousListening) return;
        
        console.log('🔈 Activation de l\'écoute continue...');
        
        // Démarrer l'écoute
        this.startListening();
        
        // Redémarrer automatiquement si arrêté
        setInterval(() => {
            if (!this.state.isListening && this.state.isControlling) {
                this.startListening();
            }
        }, 1000);
    }
};

// Démarrer l'application automatiquement
document.addEventListener('DOMContentLoaded', () => {
    VoiceControlApp.init();
});

// Gestion des événements de visibilité de page
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        VoiceControlApp.stopListening();
    } else if (VoiceControlApp.state.isControlling) {
        VoiceControlApp.startListening();
    }
});

// Empêcher le sommeil de l'écran
if ('wakeLock' in navigator) {
    let wakeLock = null;
    
    const requestWakeLock = async () => {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('🚫 Écran maintenu actif');
        } catch (err) {
            console.warn('Wake Lock non disponible:', err);
        }
    };
    
    requestWakeLock();
    
    // Renouveler le wake lock lorsque la page redevient visible
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });
}


// Valeurs par défaut et configurations finales
VoiceControlApp.state.hotword = 'ok voice';
VoiceControlApp.state.settings.voiceFeedback = true;
VoiceControlApp.state.settings.continuousListening = false;
VoiceControlApp.state.language = 'fr-FR';