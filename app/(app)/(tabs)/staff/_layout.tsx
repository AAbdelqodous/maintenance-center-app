import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function StaffLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t('staff.title') }}
      />
      <Stack.Screen
        name="invite"
        options={{ title: t('staff.invite.title') }}
      />
      <Stack.Screen
        name="[membershipId]"
        options={{ title: t('staff.member.title') }}
      />
    </Stack>
  );
}
