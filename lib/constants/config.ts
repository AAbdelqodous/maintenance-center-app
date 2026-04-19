import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Platform.select({
    android: 'http://10.0.2.2:8080/api/v1/',
    default:  'http://localhost:8080/api/v1/',
  })!;

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  Platform.select({
    android: 'ws://10.0.2.2:8080/ws',
    default:  'ws://localhost:8080/ws',
  })!;
