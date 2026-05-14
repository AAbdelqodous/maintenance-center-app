import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetNotificationsQuery } from '@/store/api/notificationsApi';
import { useGetBookingsQuery } from '@/store/api/bookingsApi';
import { useGetPendingUsersQuery } from '@/store/api/adminApi';
import { useAppSelector } from '@/store';

export default function TabLayout() {
  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const userType = useAppSelector((state) => state.auth.session?.userType);
  const isAdmin = userType === 'ADMIN';

  const { data: notificationsData } = useGetNotificationsQuery({ page: 0, size: 100 });
  const { data: bookingsData } = useGetBookingsQuery({ page: 0, size: 100 });
  const { data: pendingUsersData } = useGetPendingUsersQuery({ page: 0, size: 1 }, { skip: !isAdmin });

  const unreadNotifications = notificationsData?.unreadCount ?? 0;
  const pendingBookings = bookingsData?.content.filter((b: { bookingStatus: string }) => b.bookingStatus === 'PENDING').length ?? 0;

  const canManageChat = activePermissions.includes('MANAGE_CHAT');
  const canManageStaff = activeUserRole === 'OWNER' || activeUserRole === 'BRANCH_MANAGER';

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3', tabBarInactiveTintColor: '#9E9E9E' }}>
      {/* ── Center-owner tabs (hidden for admin) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          tabBarBadge: !isAdmin && pendingBookings > 0 ? pendingBookings : undefined,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews/index"
        options={{
          title: 'Reviews',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Notifications',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: !isAdmin && unreadNotifications > 0 ? unreadNotifications : undefined,
        }}
      />
      <Tabs.Screen
        name="analytics/index"
        options={{
          title: 'Analytics',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* ── Profile sub-routes — never shown as tabs ── */}
      <Tabs.Screen name="profile/trust" options={{ href: null }} />
      <Tabs.Screen name="profile/pricing" options={{ href: null }} />
      <Tabs.Screen name="profile/offers" options={{ href: null }} />
      <Tabs.Screen name="profile/staff" options={{ href: null }} />
      <Tabs.Screen name="profile/services" options={{ href: null }} />

      {/* ── Admin-only tab ── */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          tabBarBadge: pendingUsersData?.totalElements ? pendingUsersData.totalElements : undefined,
          tabBarActiveTintColor: '#7C3AED',
        }}
      />
    </Tabs>
  );
}
