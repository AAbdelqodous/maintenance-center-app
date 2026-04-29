import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Platform.select({
    android: 'http://10.0.2.2:8080/api/v1/',
    default:  'http://localhost:8080/api/v1/',
  })!;

export const STATIC_BASE_URL =
  process.env.EXPO_PUBLIC_STATIC_BASE_URL ??
  Platform.select({
    android: 'http://10.0.2.2:8080',
    default:  'http://localhost:8080',
  })!;

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  Platform.select({
    android: 'ws://10.0.2.2:8080/ws',
    default:  'ws://localhost:8080/ws',
  })!;

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return STATIC_BASE_URL + (path.startsWith('/') ? path : '/' + path);
}
