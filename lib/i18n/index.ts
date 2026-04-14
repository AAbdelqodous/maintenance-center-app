import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import ar from './locales/ar.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const lng = deviceLocale.startsWith('ar') ? 'ar' : 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
