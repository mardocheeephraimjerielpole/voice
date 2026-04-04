import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

class AuthenticationManager {
    async storeToken(token) {
        const hashedToken = this.hashToken(token);
        await AsyncStorage.setItem('userToken', hashedToken);
    }

    async getToken() {
        const hashedToken = await AsyncStorage.getItem('userToken');
        return this.unhashToken(hashedToken);
    }

    hashToken(token) {
        return CryptoJS.SHA256(token).toString();
    }

    unhashToken(hashedToken) {
        // Note: Hashing is one-way, cannot retrieve original token
        return hashedToken;
    }

    async clearToken() {
        await AsyncStorage.removeItem('userToken');
    }
}

export default new AuthenticationManager();