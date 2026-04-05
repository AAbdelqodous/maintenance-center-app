import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'auth_session';

const storage = {
  saveSession: async (token: string, email: string): Promise<void> => {
    const value = JSON.stringify({ token, email });
    if (Platform.OS === 'web') {
      localStorage.setItem(SESSION_KEY, value);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, value);
    }
  },
  loadSession: async (): Promise<{ token: string; email: string } | null> => {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clearAll: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  },
};

export { storage };
