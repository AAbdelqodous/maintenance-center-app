import { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT ?? 'development';

const bundleIdSuffix = variant === 'production' ? '' : `.${variant}`;
const appNameSuffix  = variant === 'production' ? '' : ` (${variant})`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `Center Owner${appNameSuffix}`,
  slug: 'maintenance-center-app',
  scheme: 'maintenancecenter',
  version: '1.0.0',
  platforms: ['ios', 'android', 'web'],

  ios: {
    bundleIdentifier: `com.maintainance.centerapp${bundleIdSuffix}`,
    supportsTablet: false,
  },

  android: {
    package: `com.maintainance.centerapp${bundleIdSuffix.replace('.', '_')}`,
    usesCleartextTraffic: variant === 'development',
  },

  plugins: [
    'expo-router',
    'expo-localization',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],

  // ACTION REQUIRED (one-time): Register this project on expo.dev by running 'eas project:init',
  // then set the EAS_PROJECT_ID secret via: eas secret:create --scope project --name EAS_PROJECT_ID --value <your-id>
  // Without this, push notifications will be silently broken in production builds.
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'PLACEHOLDER-SET-VIA-EAS-SECRET',
    },
  },
});
