import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/lib/constants/config';

export enum NotificationType {
  NEW_BOOKING = 'NEW_BOOKING',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_REVIEW = 'NEW_REVIEW',
  SYSTEM = 'SYSTEM',
}

export interface NotificationData {
  notificationType: NotificationType;
  referenceId?: string;
  title?: string;
  body?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web platform');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  let pushTokenString = '';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const projectId = (Constants as any).default?.expoConfig?.extra?.eas?.projectId
    ?? (Constants as any).expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('Expo project ID not configured. Set extra.eas.projectId in app.json.');
    return null;
  }
  pushTokenString = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  console.log('Push token:', pushTokenString);

  return pushTokenString;
};

export const registerPushTokenWithBackend = async (pushToken: string, sessionToken: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me/push-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    });

    if (!response.ok) {
      console.error('Failed to register push token:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
};

export const getNavigationTarget = (data: NotificationData): string | null => {
  const { notificationType, referenceId } = data;

  switch (notificationType) {
    case NotificationType.NEW_BOOKING:
    case NotificationType.BOOKING_CANCELLED:
    case NotificationType.BOOKING_UPDATED:
      return referenceId ? `/(app)/(tabs)/bookings/${referenceId}` : null;
    case NotificationType.NEW_MESSAGE:
      return referenceId ? `/(app)/(tabs)/chat/${referenceId}` : null;
    case NotificationType.NEW_REVIEW:
      return '/(app)/(tabs)/reviews';
    case NotificationType.SYSTEM:
      return '/(app)/(tabs)/notifications';
    default:
      return null;
  }
};
