import * as Sentry from '@sentry/react-native';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) console.warn('[Sentry] DSN not set — crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: process.env.APP_VARIANT ?? 'development',
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function setSentryCenter(centerId: number): void {
  Sentry.setTag('center_id', String(centerId));
}
