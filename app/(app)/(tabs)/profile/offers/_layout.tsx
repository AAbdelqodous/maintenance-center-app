import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OffersLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('offers.title'), headerShown: true }} />
      <Stack.Screen name="add" options={{ title: t('offers.add'), headerShown: true }} />
      <Stack.Screen name="[id]" options={{ title: t('offers.edit'), headerShown: true }} />
    </Stack>
  );
}
