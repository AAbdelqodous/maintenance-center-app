import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSession } from '@/store/authSlice';
import { storage } from '@/lib/storage';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.loadSession()
      .then((saved) => {
        if (saved) dispatch(setSession(saved));
      })
      .catch((error) => console.error('Failed to load session:', error))
      .finally(() => setIsLoading(false));
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}