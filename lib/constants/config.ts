import { Platform } from 'react-native';

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_BASE_URL = `http://${HOST}:8080/api/v1`;
export const SERVER_URL = `http://${HOST}:8080`;
export const WS_URL = `ws://${HOST}:8080/ws`;
