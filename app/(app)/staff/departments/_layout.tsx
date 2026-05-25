import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DepartmentsLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('departments.title') }} />
      <Stack.Screen name="add" options={{ title: t('departments.add') }} />
      <Stack.Screen name="[id]" options={{ title: t('departments.edit') }} />
    </Stack>
  );
}
