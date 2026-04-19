# Quickstart: Phase 2.5 — Production Hardening

**Branch**: `001-production-hardening` | **Date**: 2026-04-16

This guide gets a developer from zero to a fully configured production-hardening setup.

---

## Prerequisites

- EAS CLI installed: `npm install -g eas-cli`
- Logged into Expo account: `eas login`
- Sentry account with a React Native project created (get DSN from Sentry dashboard)
- The EAS project registered on expo.dev (run `eas project:init` if not yet done)

---

## Step 1: Install Sentry

```bash
npx expo install @sentry/react-native
```

Verify `@sentry/react-native` appears in `package.json` dependencies.

---

## Step 2: Convert app.json → app.config.ts

1. Delete `app.json`
2. Create `app.config.ts` using the shape defined in `data-model.md`
3. Run `npx expo start` and confirm the app still launches — the dynamic config is valid

---

## Step 3: Create eas.json

Create `eas.json` at repo root using the shape in `data-model.md`. Do not commit secrets.

```bash
# Verify eas.json is valid
eas build --profile development --platform android --dry-run
```

---

## Step 4: Set EAS Secrets

Run the following for `preview` and `production` (use your real values):

```bash
# Preview secrets
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://api.your-domain.com/api/v1/" --environment preview
eas secret:create --scope project --name EXPO_PUBLIC_WS_URL --value "wss://api.your-domain.com/ws" --environment preview
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://xxx@o123.ingest.sentry.io/456" --environment preview

# Production secrets (use production Sentry DSN)
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://api.your-domain.com/api/v1/" --environment production
eas secret:create --scope project --name EXPO_PUBLIC_WS_URL --value "wss://api.your-domain.com/ws" --environment production
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://yyy@o123.ingest.sentry.io/789" --environment production

# Build-time Sentry source map upload (all environments)
eas secret:create --scope project --name SENTRY_ORG --value "your-org-slug"
eas secret:create --scope project --name SENTRY_PROJECT --value "center-owner-app"
eas secret:create --scope project --name EAS_PROJECT_ID --value "your-eas-project-id"
```

---

## Step 5: Update lib/constants/config.ts

Replace the existing `API_BASE_URL` and `WS_URL` definitions with the env-variable-first pattern from `data-model.md`. Confirm local dev still works (values fall back to localhost when env vars are absent).

---

## Step 6: Create lib/sentry.ts

Create the Sentry initialization module using the shape from `data-model.md`.

---

## Step 7: Initialize Sentry in app/_layout.tsx

Add `initSentry()` call at the top of `RootLayout` before any child renders:

```tsx
import { initSentry } from '../lib/sentry';
initSentry();

export default function RootLayout() { ... }
```

---

## Step 8: Wire setSentryCenter in Auth Flow

In `store/authSlice.ts` (or wherever login success is handled), call `setSentryCenter(centerId)` after a successful authentication. The `centerId` comes from the center profile loaded after login.

---

## Step 9: Create ErrorBoundary Component

Create `components/ui/ErrorBoundary.tsx` using the shape from `data-model.md`. Add i18n keys `error.title`, `error.message`, `error.retry` to both `en.json` and `ar.json`.

---

## Step 10: Wrap Each Tab Screen

In each of the 6 tab screen files, wrap the default export content in `<ErrorBoundary>`:

```tsx
// Example: app/(app)/(tabs)/index.tsx
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

export default function DashboardScreen() {
  return (
    <ErrorBoundary>
      {/* existing screen content */}
    </ErrorBoundary>
  );
}
```

Files to update:
- `app/(app)/(tabs)/index.tsx`
- `app/(app)/(tabs)/bookings/index.tsx`
- `app/(app)/(tabs)/chat/index.tsx`
- `app/(app)/(tabs)/profile/index.tsx`
- `app/(app)/(tabs)/reviews/index.tsx`
- `app/(app)/(tabs)/notifications/index.tsx`

---

## Step 11: Register EAS Project ID in app.config.ts

Run `eas project:init` if not done. Copy the project ID from expo.dev → Settings and ensure it is set via the `EAS_PROJECT_ID` secret (Step 4) and referenced in `app.config.ts`.

---

## Verification Checklist

### Error Boundary Verification

- [ ] Open the app in development. In any tab screen, add `throw new Error('test')` at the top of the render function.
- [ ] Confirm: error boundary fallback UI appears (not a blank screen).
- [ ] Confirm: other tabs are still navigable.
- [ ] Confirm: tapping "Try Again" removes the error UI and re-renders the screen.
- [ ] Confirm: Sentry receives the test error (check Sentry dashboard within 60s).
- [ ] Remove the `throw` statement.

### EAS Build Verification

- [ ] Run `eas build --profile preview --platform android --local` (or without `--local` for cloud build).
- [ ] Install the APK. Confirm it connects to the staging API (HTTPS).
- [ ] Confirm no HTTP requests appear in a network inspector.
- [ ] Confirm `com.maintainance.centerapp.preview` appears as the bundle identifier.

### Push Notification Verification

- [ ] Install preview build on a physical device.
- [ ] Use Expo's push tool to send a test notification to the device's FCM token.
- [ ] Confirm notification arrives within 30s while the app is backgrounded.

### PII Audit

- [ ] Trigger any crash in a preview build.
- [ ] Open Sentry event. Confirm: no email, no name, no phone number in tags, breadcrumbs, or context.
- [ ] Confirm `center_id` tag is present as an integer string.
