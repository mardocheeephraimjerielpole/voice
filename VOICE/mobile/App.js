import React, { useEffect, useState } from 'react';
import { View, Text, Button, PermissionsAndroid, Alert } from 'react-native';
import Voice from '@react-native-voice/voice';
import BatteryManager from 'react-native-battery-manager';
import PushNotification from 'react-native-push-notification';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(0);

  useEffect(() => {
    checkPermissions();
    setupBatteryMonitoring();
    setupPushNotification();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const checkPermissions = async () => {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission Denied', 'Audio recording permission is required to use voice commands.');
    }
  };

  const setupBatteryMonitoring = () => {
    BatteryManager.getBatteryLevel().then(level => {
      setBatteryLevel(level);
    });
    BatteryManager.onBatteryLevelChanged((level) => {
      setBatteryLevel(level);
    });
  };

  const setupPushNotification = () => {
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
      },
    });
  };

  const startListening = async () => {
    setIsListening(true);
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    try {
      await Voice.stop();
      await Voice.removeAllListeners();
    } catch (e) {
      console.error(e);
    }
  };

  Voice.onSpeechResults = (e) => {
    setRecognizedText(e.value[0]);
    pushNotification(e.value[0]);
  };

  const pushNotification = (command) => {
    PushNotification.localNotification({
      title: 'Voice Command Recognized',
      message: command,
    });
  };

  return (
    <View>
      <Text>Battery Level: {batteryLevel}%</Text>
      <Text>Recognized Text: {recognizedText}</Text>
      <Button title={isListening ? 'Stop Listening' : 'Start Listening'} onPress={isListening ? stopListening : startListening} />
    </View>
  );
};

export default App;
