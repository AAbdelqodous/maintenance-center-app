import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSession, clearSession } from '@/store/authSlice';
import { setActiveCenter, setActiveCenterId, clearActiveCenter } from '@/store/centerSlice';
import { ROLE_PERMISSIONS } from '@/types/staff';
import type { CenterRole } from '@/types/staff';
import { storage } from '@/lib/storage';
import { Redirect, Stack, router, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { API_BASE_URL } from '@/lib/constants/config';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, registerPushTokenWithBackend, getNavigationTarget } from '@/lib/services/notificationService';

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const session = useAppSelector((state) => state.auth.session);
  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedCenters, setHasCheckedCenters] = useState(false);
  const [centersCount, setCentersCount] = useState(0);
  const [noCentersError, setNoCentersError] = useState(false);
  const [noAccessError, setNoAccessError] = useState(false);
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

          const meResponse = await fetch(`${API_BASE_URL}users/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (meResponse.status === 401) {
            await storage.clearAll();
            dispatch(clearSession());
            dispatch(clearActiveCenter());
            return;
          }

          if (!meResponse.ok) {
            console.error('Failed to fetch user profile:', meResponse.status);
            return;
          }

          const me = await meResponse.json();

          // Treat legacy null userType as OWNER
          const userType = me.userType ?? 'OWNER';

          // Admin users skip all center logic — dispatch session type and proceed
          if (userType === 'ADMIN') {
            dispatch(setSession({ token, email: saved.email, userType: 'ADMIN' }));
            return;
          }

          // Approval gate — only OWNER accounts require admin approval
          if (userType === 'OWNER' && me.approvalStatus === 'PENDING_APPROVAL') {
            dispatch(setSession({ token, email: saved.email, userType: 'OWNER' }));
            setIsPendingApproval(true);
            return;
          }

          // STAFF: invited staff member — resolve center via memberships
          if (userType === 'STAFF') {
            dispatch(setSession({ token, email: saved.email, userType: 'STAFF' }));
            const membershipsRes = await fetch(`${API_BASE_URL}users/me/memberships`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const memberships: any[] = membershipsRes.ok ? await membershipsRes.json() : [];

            if (memberships.length === 0) {
              setNoAccessError(true);
              return;
            }

            const target = memberships.find((m) => m.centerId === savedActiveCenterId) ?? memberships[0];
            dispatch(setActiveCenter({
              centerId: target.centerId,
              role: target.role as CenterRole,
              permissions: ROLE_PERMISSIONS[target.role as CenterRole],
            }));
            await storage.saveActiveCenterId(target.centerId);
            setCentersCount(memberships.length);
            return;
          }

          // OWNER flow
          dispatch(setSession({ token, email: saved.email, userType: 'OWNER' }));
          const [centersResponse, membershipsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}centers/my`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}users/me/memberships`, { headers: { 'Authorization': `Bearer ${token}` } }),
          ]);

          if (centersResponse.status === 401) {
            await storage.clearAll();
            dispatch(clearSession());
            dispatch(clearActiveCenter());
            return;
          }

          const memberships = membershipsResponse.ok ? await membershipsResponse.json() : [];

          const resolveAndDispatchCenter = (centerId: number) => {
            const membership = memberships.find((m: any) => m.centerId === centerId);
            const role: CenterRole = membership?.role ?? 'OWNER';
            dispatch(setActiveCenter({ centerId, role, permissions: ROLE_PERMISSIONS[role] }));
            storage.saveActiveCenterId(centerId);
          };

          if (centersResponse.ok) {
            const data = await centersResponse.json();
            const centers = Array.isArray(data) ? data : data.content || [];
            setCentersCount(centers.length);

            if (centers.length === 0) {
              setNoCentersError(true);
            } else if (centers.length === 1 && !savedActiveCenterId) {
              resolveAndDispatchCenter(centers[0].id);
            } else if (savedActiveCenterId) {
              resolveAndDispatchCenter(savedActiveCenterId);
            }
          } else {
            console.error('Failed to fetch centers:', centersResponse.status);
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

  if (isPendingApproval && !pathname.includes('pending-approval')) {
    return <Redirect href="/pending-approval" />;
  }

  if (noAccessError && !pathname.includes('no-center-access')) {
    return <Redirect href="/(app)/no-center-access" />;
  }

  if (session?.userType !== 'ADMIN' && hasCheckedCenters && noCentersError && !activeCenterId && !pathname.includes('setup-center')) {
    return <Redirect href="/(app)/setup-center" />;
  }

  if (session?.userType !== 'ADMIN' && hasCheckedCenters && centersCount > 1 && !activeCenterId && !pathname.includes('branch-select')) {
    return <Redirect href="/(app)/branch-select" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}