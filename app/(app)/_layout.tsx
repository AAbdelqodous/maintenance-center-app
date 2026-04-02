import { useAppSelector } from '../../store';
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
  const session = useAppSelector((state) => state.auth.session);
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
