# Research: Phase 2.5 — Production Hardening

**Branch**: `001-production-hardening` | **Date**: 2026-04-16

---

## Decision 1: Crash Reporting Service

**Decision**: `@sentry/react-native` via the official Expo Sentry plugin (`@sentry/react-native/expo`).

**Rationale**:
- First-class Expo SDK 54 support via `expo-sentry` plugin — integrates into `app.json` with zero manual native configuration.
- Automatic source map upload during EAS builds via the Sentry Expo plugin — no separate CI step needed.
- Expo managed workflow compatible — works without `expo prebuild` or custom native builds.
- DSN is injected per build profile via EAS environment variables.
- The plugin automatically sets `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` at build time.

**Alternatives Considered**:
- Firebase Crashlytics (`@react-native-firebase/crashlytics`): Requires full `@react-native-firebase` setup, which needs native builds (`expo prebuild`). Not compatible with Expo managed workflow. Ruled out unless Sentry integration is blocked.
- Bugsnag: Expo-compatible but less common in the React Native ecosystem; team has no existing Bugsnag account. Ruled out.
- Manual console.error logging: Zero diagnostic value in production. Ruled out.

**Install command**:
```bash
npx expo install @sentry/react-native
```
Then add `@sentry/react-native/expo` to `app.json` plugins array.

---

## Decision 2: ErrorBoundary Implementation

**Decision**: React class component `ErrorBoundary` (React class required — `componentDidCatch` has no function-component equivalent in React 18). Placed at **tab screen level** via a wrapper in `app/(app)/(tabs)/_layout.tsx`, wrapping each tab individually.

**Rationale**:
- A single app-root boundary would catch all errors but take down the entire tab bar — users lose navigation recovery.
- Tab-level boundaries isolate a crashing screen while the rest of the app remains functional (FR-001).
- Class component is the only React-native way to implement `componentDidCatch`. React 19 `use(ErrorBoundary)` hook is not available in React 18 (used by RN 0.81.5).
- The `ErrorBoundary` component calls `Sentry.captureException(error)` inside `componentDidCatch` before rendering the fallback.

**Placement strategy**: Wrap each `<Tab.Screen>` content at the screen file level — each of the 6 tab screens (`index.tsx`, `bookings/index.tsx`, `chat/index.tsx`, `profile/index.tsx`, `reviews/index.tsx`, `notifications/index.tsx`) exports its content wrapped in `<ErrorBoundary>`.

**Fallback UI**: i18n-aware message + "Try Again" button that calls `this.setState({ hasError: false })` to reset.

---

## Decision 3: EAS Build Profile Structure

**Decision**: Three profiles in `eas.json`: `development`, `preview`, `production`. Environment variables for API URL, WebSocket URL, and Sentry DSN stored as EAS Secrets (not `.env` files) so they are never committed to source control.

**Rationale**:
- EAS Secrets are the recommended approach for sensitive values (DSNs, API keys) in EAS builds — they are injected at build time and never appear in git history.
- Three profiles map to the three deployment targets: local dev, TestFlight/internal track, App Store/Play Store.
- Each profile has a distinct `APP_VARIANT` env var that `app.config.ts` reads to set the bundle ID suffix and display name.

**Bundle ID strategy** (requires migrating from `app.json` → `app.config.ts`):
- Development: `com.maintainance.centerapp.dev`
- Preview: `com.maintainance.centerapp.preview`
- Production: `com.maintainance.centerapp`

---

## Decision 4: app.json → app.config.ts Migration

**Decision**: Convert `app.json` to `app.config.ts` so that bundle IDs, display names, and environment-specific values can be set dynamically based on the `APP_VARIANT` environment variable injected by EAS.

**Rationale**:
- `app.json` is static — it cannot read environment variables.
- `app.config.ts` (Expo dynamic config) runs at build time and can call `process.env.APP_VARIANT` to branch config values.
- This is the standard Expo pattern for multi-environment apps.
- The existing `app.json` content (name, slug, scheme, version, platforms, plugins) migrates directly.

**APP_VARIANT values**: `development` | `preview` | `production`

---

## Decision 5: HTTPS Enforcement

**Decision**: No code change needed for iOS (ATS enforces HTTPS by default). Android requires `android.usesCleartextTraffic: false` in `app.config.ts` for non-development builds. The `development` profile sets `android.usesCleartextTraffic: true` to allow `http://10.0.2.2:8080`.

**Rationale**:
- iOS App Transport Security blocks HTTP to non-localhost addresses by default — no configuration needed.
- Android's `usesCleartextTraffic` flag is the standard mechanism. Setting it to `false` in preview/production blocks all cleartext traffic at the OS level.
- The API base URL and WebSocket URL are already read from `lib/constants/config.ts` via `Platform.select()`. For non-development builds, these must point to `https://` hosts. Environment variable injection at EAS build time handles this.

---

## Decision 6: Environment Variable Injection in Source Code

**Decision**: The existing `lib/constants/config.ts` is updated to read `API_BASE_URL` and `WS_URL` from `process.env` (injected via EAS) rather than using hardcoded `Platform.select()` values. A fallback to the existing dev values is kept for local development (when env vars are absent).

**Rationale**:
- The existing file already centralizes the URL — it just needs to read from env rather than hardcode.
- `process.env.EXPO_PUBLIC_*` variables are the standard Expo approach for build-time env injection (they are inlined at bundle time).
- No changes to any API-calling code — only the constants file changes.

**Variable names** (using `EXPO_PUBLIC_` prefix for Expo's inline injection):
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_WS_URL`
- `EXPO_PUBLIC_SENTRY_DSN`

---

## Decision 7: EAS Project ID

**Decision**: Register the project on expo.dev and add the `projectId` to the `extra.eas.projectId` field in `app.config.ts`. This must be done once by a team member with access to the Expo account.

**Rationale**:
- Without a valid EAS project ID, Expo's push notification service cannot route notifications to the correct project.
- The push notification feature is already implemented (Phase 2/7) but silently broken in production without this registration.
- This is a one-time manual step — it cannot be automated.

**Where**: `app.config.ts` → `extra: { eas: { projectId: 'YOUR-PROJECT-ID' } }`

---

## Resolved Clarifications

All unknowns from the spec are resolved:
- ✅ Crash reporting library: `@sentry/react-native` with Expo plugin
- ✅ ErrorBoundary: React class component, tab-screen level
- ✅ EAS profiles: 3 profiles, `eas.json`, dynamic config via `app.config.ts`
- ✅ HTTPS: iOS default + Android `usesCleartextTraffic` flag
- ✅ Env vars: `EXPO_PUBLIC_*` prefix, injected via EAS Secrets
- ✅ EAS project ID: manual one-time step in `app.config.ts`
- ✅ Source map upload: handled automatically by `@sentry/react-native/expo` plugin
