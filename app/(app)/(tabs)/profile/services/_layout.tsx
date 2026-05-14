import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ServicesLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('services.title') }} />
      <Stack.Screen name="add" options={{ title: t('services.addService') }} />
      <Stack.Screen name="[id]" options={{ title: t('services.editService') }} />
    </Stack>
  );
}
