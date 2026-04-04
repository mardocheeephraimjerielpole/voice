// VoiceCommandHandler.js

class VoiceCommandHandler {
    constructor() {
        this.commands = {};
        console.log('[VoiceCommandHandler] Initialized');
    }

    registerCommand(command, handler) {
        this.commands[command] = handler;
        console.log(`[VoiceCommandHandler] Command registered: ${command}`);
    }

    handleCommand(command) {
        console.log(`[VoiceCommandHandler] Handling command: ${command}`);
        if (this.commands[command]) {
            try {
                this.commands[command]();
            } catch (error) {
                console.error(`[VoiceCommandHandler] Error executing command: ${command}`, error);
            }
        } else {
            console.warn(`[VoiceCommandHandler] Command not recognized: ${command}`);
        }
    }
}

// Example usage
const voiceHandler = new VoiceCommandHandler();

// Register a sample command
voiceHandler.registerCommand('greet', () => {
    console.log('Hello! How can I assist you today?');
});

// Handle a command (for demonstration)
voiceHandler.handleCommand('greet');

// Handle an unrecognized command
voiceHandler.handleCommand('unknown');
