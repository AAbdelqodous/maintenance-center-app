import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

// Spec 025 — inventory & parts (owner config; reached from Profile, not a tab).
export default function InventoryLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('inventory.catalog.title') }} />
      <Stack.Screen name="new" options={{ title: t('inventory.form.addTitle') }} />
      <Stack.Screen name="[id]" options={{ title: t('inventory.detail.title') }} />
      <Stack.Screen name="reports" options={{ title: t('inventory.reports.title') }} />
    </Stack>
  );
}
