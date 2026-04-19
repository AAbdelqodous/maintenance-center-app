import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { store } from '../store';
import '../lib/i18n';
import { initSentry } from '../lib/sentry';

initSentry();

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
