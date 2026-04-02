import { Provider } from 'react-redux';
import { store } from '../store';
import { Stack } from 'expo-router';
import '../lib/i18n';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
