import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#7C3AED' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="pending" options={{ title: 'Pending Approvals' }} />
      <Stack.Screen name="users" options={{ title: 'All Users' }} />
    </Stack>
  );
}
