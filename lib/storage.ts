import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'auth_session';
const ACTIVE_CENTER_ID_KEY = 'active_center_id';

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
  saveActiveCenterId: async (id: number): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(ACTIVE_CENTER_ID_KEY, String(id));
    } else {
      await SecureStore.setItemAsync(ACTIVE_CENTER_ID_KEY, String(id));
    }
  },
  loadActiveCenterId: async (): Promise<number | null> => {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(ACTIVE_CENTER_ID_KEY);
      return raw ? Number(raw) : null;
    }
    const raw = await SecureStore.getItemAsync(ACTIVE_CENTER_ID_KEY);
    return raw ? Number(raw) : null;
  },
  clearAll: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACTIVE_CENTER_ID_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(ACTIVE_CENTER_ID_KEY);
    }
  },
};

export { storage };
