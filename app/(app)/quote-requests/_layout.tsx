import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function QuoteRequestsLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('quoteRequests.inbox.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('quoteRequests.detail.title') }} />
      <Stack.Screen name="preferences" options={{ title: t('quoteRequests.preferences.title') }} />
    </Stack>
  );
}
