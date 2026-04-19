# Data Model: Phase 2.5 — Production Hardening

**Branch**: `001-production-hardening` | **Date**: 2026-04-16

This phase is infrastructure/configuration — there are no new API entities or database tables. The "entities" here are configuration shapes and component props.

---

## EAS Build Profile Configuration

Defined in `eas.json` at repo root.

```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "development",
        "EXPO_PUBLIC_API_BASE_URL": "http://localhost:8080/api/v1/",
        "EXPO_PUBLIC_WS_URL": "ws://localhost:8080/ws"
      },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "preview"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "APP_VARIANT": "production"
      }
    }
  }
}
```

**Notes**:
- `preview` and `production` env vars (`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WS_URL`, `EXPO_PUBLIC_SENTRY_DSN`) are stored as **EAS Secrets** — not hardcoded in `eas.json`.
- `development` uses localhost values directly since they are not sensitive.
- Android `buildType: "apk"` for `development` to enable faster local installs.

---

## app.config.ts Shape

Replaces the existing `app.json`. Reads `APP_VARIANT` from `process.env`.

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT ?? 'development';

const bundleIdSuffix = variant === 'production' ? '' : `.${variant}`;
const appNameSuffix  = variant === 'production' ? '' : ` (${variant})`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `Center Owner${appNameSuffix}`,
  slug: 'maintenance-center-app',
  scheme: 'maintenancecenterapp',
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

  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'PLACEHOLDER-SET-VIA-EAS-SECRET',
    },
  },
});
```

---

## Environment Variables

### Injected at EAS build time (EAS Secrets for preview/production)

| Variable | Used In | Notes |
|----------|---------|-------|
| `APP_VARIANT` | `app.config.ts` | `development` / `preview` / `production` |
| `EXPO_PUBLIC_API_BASE_URL` | `lib/constants/config.ts` | HTTPS URL for preview/production |
| `EXPO_PUBLIC_WS_URL` | `lib/constants/config.ts` | WSS URL for preview/production |
| `EXPO_PUBLIC_SENTRY_DSN` | `lib/sentry.ts` | Per-profile DSN from Sentry dashboard |
| `SENTRY_ORG` | `app.config.ts` (build only) | Sentry organization slug |
| `SENTRY_PROJECT` | `app.config.ts` (build only) | Sentry project slug |
| `EAS_PROJECT_ID` | `app.config.ts` | Expo project ID from expo.dev |

### Updated source file: `lib/constants/config.ts`

```typescript
import { Platform } from 'react-native';

// EXPO_PUBLIC_* vars are inlined at bundle time by Expo.
// Falls back to dev values when building locally without EAS.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Platform.select({
    android: 'http://10.0.2.2:8080/api/v1/',
    default:  'http://localhost:8080/api/v1/',
  })!;

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  Platform.select({
    android: 'ws://10.0.2.2:8080/ws',
    default:  'ws://localhost:8080/ws',
  })!;
```

---

## ErrorBoundary Component Props & State

Location: `components/ui/ErrorBoundary.tsx`

```typescript
interface Props {
  children: React.ReactNode;
  /** Optional: custom fallback UI override */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}
```

**Lifecycle**:
- `componentDidCatch(error, errorInfo)`: calls `Sentry.captureException(error, { extra: errorInfo })`
- `static getDerivedStateFromError(error)`: returns `{ hasError: true, error }`
- "Try Again" button: calls `this.setState({ hasError: false, error: null })`

**Fallback UI content** (all via i18n keys):
```json
{
  "error": {
    "title": "Something went wrong",
    "message": "An unexpected error occurred. Please try again.",
    "retry": "Try Again"
  }
}
```
Arabic equivalents added to `ar.json`.

---

## Sentry Initialization Shape

Location: `lib/sentry.ts`

```typescript
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
    // PII guard: do not set user.email, user.username
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

/** Call after login to attach center ID as a non-PII context tag */
export function setSentryCenter(centerId: number): void {
  Sentry.setTag('center_id', String(centerId));
}
```

**Called from**: `app/_layout.tsx` on app startup (before any screen renders).
`setSentryCenter` called from auth slice after successful login/session restore.
