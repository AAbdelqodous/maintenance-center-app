import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

// Spec 023 — center payments hub (earnings / payouts / deposits / per-booking settlement).
export default function EarningsLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('earnings.title') }} />
      <Stack.Screen name="payouts" options={{ title: t('earnings.payouts.title') }} />
      <Stack.Screen name="deposit-config" options={{ title: t('earnings.deposit.title') }} />
      <Stack.Screen name="settlement/[bookingId]" options={{ title: t('earnings.settlement.title') }} />
    </Stack>
  );
}
