import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  PermissionsAndroid,
  Alert,
  Vibration,
  AppState,
  BackHandler,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Audio from 'react-native-audio-recorder-player';
import Tts from 'react-native-tts';

const { width, height } = Dimensions.get('window');

const VoiceControlMobileApp = () => {
  // État de l'application
  const [isListening, setIsListening] = useState(false);
  const [isControlling, setIsControlling] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [commands, setCommands] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [batteryLevel, setBatteryLevel] = useState(100);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Configuration
  const settings = {
    autoStart: true,
    voiceFeedback: true,
    soundEffects: true,
    continuousListening: true,
    hotword: 'ok voice',
    language: 'fr-FR'
  };

  // Commandes prédéfinies
  const commandList = [
    { id: 1, icon: 'mouse', text: 'Cliquer ici', command: 'cliquer ici' },
    { id: 2, icon: 'arrow-left', text: 'Retour', command: 'revenir en arrière' },
    { id: 3, icon: 'home', text: 'Accueil', command: 'accueil' },
    { id: 4, icon: 'arrow-down', text: 'Défiler bas', command: 'défiler vers le bas' },
    { id: 5, icon: 'arrow-up', text: 'Défiler haut', command: 'défiler vers le haut' },
    { id: 6, icon: 'apps', text: 'Applications', command: 'ouvrir applications' },
    { id: 7, icon: 'cog', text: 'Paramètres', command: 'paramètres' },
    { id: 8, icon: 'volume-high', text: 'Volume +', command: 'augmenter volume' },
    { id: 9, icon: 'volume-low', text: 'Volume -', command: 'diminuer volume' },
    { id: 10, icon: 'power', text: 'Éteindre', command: 'éteindre' }
  ];

  // Initialisation au démarrage
  useEffect(() => {
    const initApp = async () => {
      // 1. Demander les permissions
      await requestPermissions();
      
      // 2. Initialiser TTS
      Tts.setDefaultLanguage('fr-FR');
      Tts.setDefaultRate(0.8);
      
      // 3. Configurer Voice
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      
      // 4. Prendre le contrôle
      takeControl();
      
      // 5. Démarrer l'écoute continue
      if (settings.continuousListening) {
        startListening();
      }
      
      // 6. Animation d'entrée
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    };

    initApp();

    // Gestionnaire pour le bouton retour Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    // Surveillance de l'état de l'application
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);
    
    // Surveillance de la batterie
    monitorBattery();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      backHandler.remove();
      appStateListener.remove();
    };
  }, []);

  // Demander les permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        if (granted['android.permission.RECORD_AUDIO'] === 'granted') {
          console.log('Microphone autorisé');
        } else {
          Alert.alert('Permission requise', 'VoiceControl a besoin d\'accéder au microphone');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Prendre le contrôle de l'appareil
  const takeControl = () => {
    console.log('Prise de contrôle de l\'appareil...');
    
    // Empêcher le sommeil de l'écran
    if (Platform.OS === 'android') {
      // Utiliser KeepAwake si nécessaire
    }
    
    // Prendre le focus
    setIsControlling(true);
    
    // Feedback visuel
    Vibration.vibrate(100);
    
    // Message vocal
    speak('VoiceControl est maintenant actif. Dites ok voice suivi d\'une commande.');
    
    // Animation de pulsation
    startPulseAnimation();
  };

  // Gestionnaire du bouton retour
  const handleBackPress = () => {
    if (showHistory) {
      setShowHistory(false);
      return true;
    }
    
    if (isControlling) {
      Alert.alert(
        'Quitter VoiceControl',
        'Voulez-vous vraiment quitter ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Quitter', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    }
    return false;
  };

  // Gestion du changement d'état de l'app
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background') {
      stopListening();
    } else if (nextAppState === 'active' && isControlling) {
      startListening();
    }
  };

  // Surveillance de la batterie
  const monitorBattery = () => {
    // Implémentation de la surveillance de la batterie
    // Note: Nécessite des modules supplémentaires comme react-native-battery
  };

  // Animation de pulsation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Événements Voice
  const onSpeechStart = () => {
    setIsListening(true);
    Vibration.vibrate(50);
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (e) => {
    const text = e.value[0];
    setRecognizedText(text);
    processCommand(text);
  };

  const onSpeechError = (e) => {
    console.log('Erreur reconnaissance:', e);
    setIsListening(false);
    
    // Redémarrer l'écoute en cas d'erreur
    if (settings.continuousListening) {
      setTimeout(() => {
        startListening();
      }, 1000);
    }
  };

  // Démarrer l'écoute
  const startListening = async () => {
    try {
      await Voice.start('fr-FR');
    } catch (e) {
      console.log('Erreur démarrage écoute:', e);
    }
  };

  // Arrêter l'écoute
  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.log('Erreur arrêt écoute:', e);
    }
  };

  // Traiter une commande
  const processCommand = (command) => {
    const cleanCommand = command.toLowerCase();
    
    // Vérifier le mot d'activation
    if (settings.continuousListening || cleanCommand.includes(settings.hotword)) {
      const actualCommand = cleanCommand.replace(settings.hotword, '').trim();
      
      // Ajouter à l'historique
      addToHistory(actualCommand);
      
      // Exécuter la commande
      executeCommand(actualCommand);
      
      // Feedback
      showVisualFeedback(`✅ ${actualCommand}`);
    }
  };

  // Exécuter une commande
  const executeCommand = (command) => {
    console.log('Exécution commande:', command);
    
    // Navigation
    if (command.includes('cliquer') || command.includes('clique')) {
      simulateClick();
    } else if (command.includes('retour') || command.includes('arrière')) {
      // Navigation système
    } else if (command.includes('accueil') || command.includes('home')) {
      // Retour à l'accueil
    } else if (command.includes('défiler bas') || command.includes('descendre')) {
      // Défiler
    } else if (command.includes('défiler haut') || command.includes('monter')) {
      // Défiler
    } else if (command.includes('paramètres') || command.includes('settings')) {
      openSettings();
    } else if (command.includes('volume plus') || command.includes('augmenter')) {
      adjustVolume(0.1);
    } else if (command.includes('volume moins') || command.includes('diminuer')) {
      adjustVolume(-0.1);
    } else if (command.includes('éteindre') || command.includes('arrêter')) {
      showShutdownConfirmation();
    }
    
    // Feedback vocal
    if (settings.voiceFeedback) {
      speak(`Commande exécutée: ${command}`);
    }
  };

  // Simuler un clic
  const simulateClick = () => {
    // Implémentation spécifique au système
    Vibration.vibrate(100);
  };

  // Ouvrir les paramètres
  const openSettings = () => {
    Alert.alert('Paramètres', 'Configuration de VoiceControl');
  };

  // Ajuster le volume
  const adjustVolume = (change) => {
    const newVolume = Math.max(0, Math.min(1, volume + change));
    setVolume(newVolume);
    showVisualFeedback(`Volume: ${Math.round(newVolume * 100)}%`);
  };

  // Afficher la confirmation d'arrêt
  const showShutdownConfirmation = () => {
    Alert.alert(
      'Arrêter VoiceControl',
      'Voulez-vous vraiment arrêter le contrôle vocal ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Arrêter', 
          style: 'destructive',
          onPress: () => {
            setIsControlling(false);
            stopListening();
            BackHandler.exitApp();
          }
        }
      ]
    );
  };

  // Parler
  const speak = (text) => {
    Tts.speak(text);
  };

  // Afficher un feedback visuel
  const showVisualFeedback = (text) => {
    // Implémenter un toast ou notification
    console.log('Feedback:', text);
  };

  // Ajouter à l'historique
  const addToHistory = (command) => {
    const newCommand = {
      id: Date.now(),
      text: command,
      time: new Date().toLocaleTimeString(),
    };
    
    setCommands(prev => [newCommand, ...prev.slice(0, 19)]);
  };

  // Basculer l'écoute
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Basculer l'historique
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#1a1a2e"
        barStyle="light-content"
        translucent={false}
      />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="microphone" size={28} color="#00d4ff" />
            <Text style={styles.logoText}>VoiceControl Pro</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isControlling ? '#00ff88' : '#ff4757' }]} />
            <Text style={styles.statusText}>
              {isControlling ? 'Contrôle actif' : 'Inactif'}
            </Text>
          </View>
        </View>

        {/* Contenu principal */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Indicateur de contrôle */}
          {isControlling && (
            <View style={styles.controlIndicator}>
              <Icon name="shield-check" size={24} color="#00ff88" />
              <Text style={styles.controlText}>Contrôle vocal actif</Text>
            </View>
          )}

          {/* Microphone principal */}
          <TouchableOpacity
            style={styles.micContainer}
            onPress={toggleListening}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Icon
                name={isListening ? 'microphone' : 'microphone-outline'}
                size={50}
                color="white"
              />
            </Animated.View>
            
            {isListening && (
              <View style={styles.pulseRing} />
            )}
            
            <Text style={[styles.micText, isListening && styles.micTextActive]}>
              {isListening ? '🎤 Parlez maintenant...' : 'Appuyez pour parler'}
            </Text>
          </TouchableOpacity>

          {/* Texte reconnu */}
          {recognizedText ? (
            <View style={styles.recognizedContainer}>
              <Text style={styles.recognizedLabel}>Dernière commande:</Text>
              <Text style={styles.recognizedText}>"{recognizedText}"</Text>
            </View>
          ) : null}

          {/* Commandes rapides */}
          <View style={styles.commandsSection}>
            <Text style={styles.sectionTitle}>Commandes rapides</Text>
            <View style={styles.commandsGrid}>
              {commandList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.commandButton}
                  onPress={() => processCommand(item.command)}
                  activeOpacity={0.6}
                >
                  <Icon name={item.icon} size={28} color="#00d4ff" />
                  <Text style={styles.commandText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Informations système */}
          <View style={styles.systemInfo}>
            <View style={styles.infoItem}>
              <Icon name="battery" size={20} color="#00ff88" />
              <Text style={styles.infoText}>{batteryLevel}%</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="volume-high" size={20} color="#00d4ff" />
              <Text style={styles.infoText}>{Math.round(volume * 100)}%</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="clock" size={20} color="#ffa502" />
              <Text style={styles.infoText}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Barre de contrôle fixe */}
        <View style={styles.controlBar}>
          <TouchableOpacity style={styles.controlBarButton} onPress={() => processCommand('accueil')}>
            <Icon name="home" size={24} color={isControlling ? '#00d4ff' : '#666'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlBarButton} onPress={toggleHistory}>
            <Icon name="history" size={24} color={showHistory ? '#00d4ff' : '#666'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlBarButton} onPress={toggleListening}>
            <Icon
              name={isListening ? 'microphone-off' : 'microphone'}
              size={24}
              color={isListening ? '#ff4757' : '#00d4ff'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlBarButton} onPress={openSettings}>
            <Icon name="cog" size={24} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlBarButton} onPress={showShutdownConfirmation}>
            <Icon name="power" size={24} color="#ff4757" />
          </TouchableOpacity>
        </View>

        {/* Historique des commandes (overlay) */}
        {showHistory && (
          <View style={styles.historyOverlay}>
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Historique des commandes</Text>
                <TouchableOpacity onPress={toggleHistory}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.historyList}>
                {commands.map((cmd) => (
                  <View key={cmd.id} style={styles.historyItem}>
                    <Text style={styles.historyCommand}>"{cmd.text}"</Text>
                    <Text style={styles.historyTime}>{cmd.time}</Text>
                  </View>
                ))}
                
                {commands.length === 0 && (
                  <Text style={styles.emptyHistory}>Aucune commande récente</Text>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#a0a0c0',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  controlIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: 12,
    borderRadius: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  controlText: {
    color: '#00ff88',
    fontWeight: '600',
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00d4ff',
  },
  micButtonActive: {
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#00d4ff',
    opacity: 0.5,
  },
  micText: {
    marginTop: 20,
    fontSize: 16,
    color: '#a0a0c0',
    textAlign: 'center',
  },
  micTextActive: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  recognizedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#00d4ff',
  },
  recognizedLabel: {
    color: '#a0a0c0',
    fontSize: 14,
    marginBottom: 5,
  },
  recognizedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  commandsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  commandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  commandButton: {
    width: (width - 60) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commandText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  systemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoItem: {
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlBarButton: {
    padding: 12,
    borderRadius: 12,
  },
  historyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCommand: {
    color: '#fff',
    flex: 1,
  },
  historyTime: {
    color: '#a0a0c0',
    fontSize: 12,
  },
  emptyHistory: {
    color: '#a0a0c0',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default VoiceControlMobileApp;