import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetNotificationsQuery } from '@/store/api/notificationsApi';
import { useGetBookingsQuery } from '@/store/api/bookingsApi';

export default function TabLayout() {
  const { data: notificationsData } = useGetNotificationsQuery({ page: 0, size: 100 });
  const { data: bookingsData } = useGetBookingsQuery({ page: 0, size: 100 });

  const unreadNotifications = notificationsData?.unreadCount ?? 0;
  const pendingBookings = bookingsData?.content.filter((b: { status: string }) => b.status === 'PENDING').length ?? 0;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2196F3', tabBarInactiveTintColor: '#9E9E9E' }}>
      <Tabs.Screen
        name="index"
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
          tabBarBadge: pendingBookings > 0 ? pendingBookings : undefined,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews/index"
        options={{
          title: 'Reviews',
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
