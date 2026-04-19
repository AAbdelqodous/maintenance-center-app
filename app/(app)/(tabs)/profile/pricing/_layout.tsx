import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PricingLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('pricing.title') }} />
      <Stack.Screen name="add"   options={{ title: t('pricing.addService') }} />
      <Stack.Screen name="[id]"  options={{ title: t('pricing.editPricing') }} />
    </Stack>
  );
}
