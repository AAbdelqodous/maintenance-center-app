import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSession } from '@/store/authSlice';
import { setActiveCenterId, clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { Redirect, Stack, router } from 'expo-router';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { API_BASE_URL } from '@/lib/constants/config';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, registerPushTokenWithBackend, getNavigationTarget } from '@/lib/services/notificationService';

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedCenters, setHasCheckedCenters] = useState(false);
  const [centersCount, setCentersCount] = useState(0);
  const [noCentersError, setNoCentersError] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const saved = await storage.loadSession();
        if (saved) {
          dispatch(setSession(saved));

          const savedActiveCenterId = await storage.loadActiveCenterId();
          if (savedActiveCenterId) {
            dispatch(setActiveCenterId(savedActiveCenterId));
          }

          const token = saved.token;

          // Check approval status before anything else
          const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (meResponse.ok) {
            const me = await meResponse.json();
            if (me.approvalStatus === 'PENDING_APPROVAL') {
              setIsPendingApproval(true);
              return;
            }
          }

          const response = await fetch(`${API_BASE_URL}/centers/my`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const centers = Array.isArray(data) ? data : data.content || [];
            setCentersCount(centers.length);

            if (centers.length === 0) {
              setNoCentersError(true);
            } else if (centers.length === 1 && !savedActiveCenterId) {
              dispatch(setActiveCenterId(centers[0].id));
              await storage.saveActiveCenterId(centers[0].id);
            }
          } else {
            console.error('Failed to fetch centers:', response.status);
          }

          if (!notificationsInitialized) {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
              await registerPushTokenWithBackend(pushToken, token);
            }
            setNotificationsInitialized(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
        setHasCheckedCenters(true);
      }
    };

    initializeApp();
  }, [dispatch]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;

      if (data) {
        const target = getNavigationTarget(data);
        if (target) {
          router.push(target);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  if (isPendingApproval) return <Redirect href="/pending-approval" />;

  if (hasCheckedCenters && noCentersError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 }}>
        <Text style={{ fontSize: 18, color: '#666666', textAlign: 'center', marginBottom: 24 }}>
          No centers found for your account.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#F44336', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
          onPress={async () => {
            await storage.clearAll();
            dispatch(clearActiveCenter());
            router.replace('/(auth)/login');
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasCheckedCenters && centersCount > 1 && !activeCenterId) {
    return <Redirect href="/(app)/branch-select" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}