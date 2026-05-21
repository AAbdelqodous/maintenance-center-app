import React from 'react';
import { Tabs, Redirect, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetNotificationsQuery } from '@/store/api/notificationsApi';
import { useAppSelector } from '@/store';

export default function StaffTabLayout() {
  const session = useAppSelector((state) => state.auth.session);
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const pathname = usePathname();
  const { data: notificationsData } = useGetNotificationsQuery({ page: 0, size: 100 });
  const unreadCount = notificationsData?.unreadCount ?? 0;

  if (!session || session.userType !== 'STAFF') {
    return <Redirect href="/(auth)/login" />;
  }

  if (pathname.startsWith('/staff/pricing') && !activePermissions.includes('MANAGE_PRICING')) {
    return <Redirect href="/staff/dashboard" />;
  }

  if (pathname.startsWith('/staff/offers') && !activePermissions.includes('MANAGE_OFFERS')) {
    return <Redirect href="/staff/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9E9E9E',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reviews',
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      {/* Hidden screens — navigated to from dashboard quick actions */}
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="offers"  options={{ href: null }} />
    </Tabs>
  );
}
