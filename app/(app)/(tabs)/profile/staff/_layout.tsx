import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function StaffManagementLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('staff.title'), headerShown: true }} />
      <Stack.Screen name="invite" options={{ title: t('staff.invite.title'), headerShown: true }} />
      <Stack.Screen name="[id]" options={{ title: t('staff.member.title'), headerShown: true }} />
    </Stack>
  );
}
