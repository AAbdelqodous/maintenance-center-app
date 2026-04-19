import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function BookingsLayout() {
  const { t } = useTranslation();
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen 
        name="add-progress" 
        options={{ title: t('progress.addUpdate') }} 
      />
      <Stack.Screen 
        name="create-quote" 
        options={{ title: t('quote.createQuote') }} 
      />
      <Stack.Screen 
        name="quote-detail" 
        options={{ title: t('quote.title') }} 
      />
    </Stack>
  );
}
