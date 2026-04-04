// TestApp.js

import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import Voice from 'react-native-voice';
import Battery from 'react-native-battery';
import PushNotification from 'react-native-push-notification';

const TestApp = () => {
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [batteryLevel, setBatteryLevel] = useState(0);

    useEffect(() => {
        Voice.onSpeechStart = () => setIsRecognizing(true);
        Voice.onSpeechEnd = () => setIsRecognizing(false);
        Voice.onSpeechResults = (event) => setRecognizedText(event.value[0]);

        const batteryListener = Battery.subscribe((level) => {
            setBatteryLevel(level);
        });

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
            batteryListener();
        };
    }, []);

    const startListening = async () => {
        try {
            await Voice.start('en-US');
        } catch (error) {
            Alert.alert('Error', 'Speech recognition failed.');
        }
    };

    const sendNotification = () => {
        PushNotification.localNotification({
            message: 'Test notification triggered!',
        });
    };

    const handleCommand = () => {
        if (recognizedText.toLowerCase() === 'test command') {
            Alert.alert('Command Recognized', 'You said: ' + recognizedText);
        } else {
            Alert.alert('Command Not Recognized', 'You said: ' + recognizedText);
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text>Voice Recognition Test App</Text>
            <Text style={{ marginVertical: 20 }}>Recognized Text: {recognizedText}</Text>
            <Text>Battery Level: {batteryLevel}%</Text>
            <Button title="Start Listening" onPress={startListening} disabled={isRecognizing} />
            <Button title="Send Notification" onPress={sendNotification} />
            <Button title="Test Command" onPress={handleCommand} />
            <Text style={{ marginTop: 20 }}>Instructions:</Text>
            <Text>1. Press 'Start Listening' and say 'test command' to see recognition.</Text>
            <Text>2. Check battery level displayed above.</Text>
            <Text>3. Send a test notification to see it in action.</Text>
        </View>
    );
};

export default TestApp;