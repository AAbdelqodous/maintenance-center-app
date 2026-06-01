import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';

export default function DepartmentsLayout() {
  const { t } = useTranslation();
  const session = useAppSelector((state) => state.auth.session);

  if (session?.userType === 'STAFF') {
    return <Redirect href="/staff/dashboard" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('departments.title') }} />
      <Stack.Screen name="add" options={{ title: t('departments.add') }} />
      <Stack.Screen name="[id]" options={{ title: t('departments.edit') }} />
    </Stack>
  );
}
