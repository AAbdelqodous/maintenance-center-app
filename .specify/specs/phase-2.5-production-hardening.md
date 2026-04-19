# Feature Specification: Phase 2.5 — Production Hardening

**Feature Branch**: `phase-2.5-production-hardening`
**Created**: 2026-04-15
**Status**: Draft
**Phase**: 2.5 of 10

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Error Boundary Protection (Priority: P1)

A center owner is using the app and a component throws an unexpected JavaScript error. Instead of a white blank screen or a crash-to-home, the app shows a friendly error screen with a "Retry" button. The rest of the app continues to function normally — only the crashing screen is isolated.

**Why this priority**: A crash with no feedback is the worst possible UX and destroys trust. An error boundary is the minimum safety net before any production release.

**Independent Test**: Intentionally throw an error in a screen component → error boundary screen appears with a "Retry" button; tapping Retry re-mounts the component and restores normal flow.

**Acceptance Scenarios**:

1. **Given** any screen component throws a runtime error, **When** the error is thrown, **Then** the error boundary catches it and shows a safe fallback UI instead of a blank screen or app crash.
2. **Given** the error fallback screen, **When** the owner taps "Try Again", **Then** the error boundary resets and attempts to re-render the failed component.
3. **Given** a crash that the error boundary catches, **When** it occurs, **Then** the crash details are reported to the crash reporting service (Sentry) automatically.
4. **Given** the error fallback screen, **When** rendered in Arabic locale, **Then** all error messages and button labels appear in Arabic with RTL layout.
5. **Given** a crash inside a tab screen, **When** the boundary catches it, **Then** the bottom navigation bar remains visible — the owner can navigate to other tabs.

---

### User Story 2 — Crash Reporting Integration (Priority: P1)

When the app crashes or encounters an unhandled error, a crash report is automatically sent to Sentry (or Firebase Crashlytics). The crash report includes the error message, stack trace, device info, and the user's center ID (no PII). In development, crash reports are suppressed or sent to a dev project.

**Why this priority**: Without crash reporting, production bugs are invisible until a user complains. Sentry gives the team actionable crash data immediately.

**Independent Test**: Trigger a known crash → open Sentry dashboard → crash report appears within 60 seconds with a readable stack trace and device context.

**Acceptance Scenarios**:

1. **Given** a production build of the app, **When** any unhandled exception occurs, **Then** it is captured and sent to Sentry with: error message, stack trace, device OS + version, app version, and center ID.
2. **Given** a development build, **When** an error occurs, **Then** Sentry reports are either suppressed or sent to a separate dev Sentry project — not the production project.
3. **Given** the app is initialized, **When** Sentry loads, **Then** no PII (email, phone, customer names) is attached to any crash report — only the center ID.
4. **Given** a crash report in Sentry, **When** reviewed, **Then** the source maps are correctly resolved — the stack trace shows readable TypeScript file and line references (not minified bundle references).

---

### User Story 3 — EAS Build Profile Configuration (Priority: P1)

The project has three EAS build profiles configured: `development` (local dev with Expo Go), `preview` (TestFlight / internal testing), and `production` (App Store / Play Store). Each profile has its own API base URL, bundle ID suffix, and Sentry DSN. Developers can build any profile with a single EAS CLI command.

**Why this priority**: Without EAS profiles, there is no safe path to App Store submission. Getting this right early prevents painful post-submission fixes.

**Independent Test**: Run `eas build --profile preview` → build completes → install the preview IPA/APK → it connects to the staging API, not the local dev server.

**Acceptance Scenarios**:

1. **Given** the `development` profile, **When** built, **Then** the app connects to `http://10.0.2.2:8080/api/v1/` (Android) or `http://localhost:8080/api/v1/` (iOS) and has bundle ID `com.maintainance.centerapp.dev`.
2. **Given** the `preview` profile, **When** built, **Then** the app connects to the staging API (HTTPS) and has bundle ID `com.maintainance.centerapp.preview`.
3. **Given** the `production` profile, **When** built, **Then** the app connects to the production API (HTTPS), has the production bundle ID `com.maintainance.centerapp`, and has the production Sentry DSN configured.
4. **Given** any profile, **When** the build is produced, **Then** the API_BASE_URL and WS_URL are read from environment variables — never hardcoded in source.

---

### User Story 4 — HTTPS/WSS in Production (Priority: P1)

In development, HTTP and WS connections to `localhost` (or `10.0.2.2` on Android) are used. In `preview` and `production` builds, all API calls MUST use HTTPS and all WebSocket connections MUST use WSS. Cleartext traffic to production endpoints is blocked at the OS level.

**Why this priority**: HTTP in production leaks tokens and data. Both iOS App Transport Security and Android cleartext traffic policies will reject HTTP to non-localhost addresses by default.

**Independent Test**: Build the `preview` profile → attempt any API call → network inspector shows `https://` scheme; no cleartext traffic warnings appear.

**Acceptance Scenarios**:

1. **Given** a `preview` or `production` build, **When** any API call is made, **Then** it uses `https://` — never `http://` to a non-localhost address.
2. **Given** a `preview` or `production` build, **When** the WebSocket chat connection is established, **Then** it uses `wss://` — never `ws://`.
3. **Given** a `development` build, **When** connecting to `localhost` or `10.0.2.2`, **Then** HTTP is allowed (localhost exemption is maintained).
4. **Given** the Android build, **When** an HTTP (non-localhost) request is attempted in production, **Then** the OS blocks it and the error boundary shows a connectivity error — the app does not silently fail.

---

### User Story 5 — EAS Project ID Registration (Priority: P2)

The app's `app.json` has a valid EAS project ID registered on the Expo account. This is required for push notifications to work in production (Expo's push notification service routes by project ID). Without it, FCM tokens are generated but push delivery fails silently.

**Why this priority**: Push notification delivery is already built (Phase 2 / Phase 7 spec) but broken in production until the EAS project ID is set.

**Independent Test**: Confirm `app.json` has a non-empty `extra.eas.projectId` → build and install the `preview` profile → receive a test push notification sent via Expo's notification tool.

**Acceptance Scenarios**:

1. **Given** `app.json`, **When** inspected, **Then** it contains a valid EAS `projectId` value (non-placeholder, non-empty).
2. **Given** a production build with the correct EAS project ID, **When** a push notification is sent via the backend to a registered FCM token, **Then** the device receives the push notification within 30 seconds.
3. **Given** the development profile, **When** testing push notifications, **Then** notifications are delivered to the development channel (Expo Dev Client), not the production channel.

---

### Edge Cases

- What if Sentry initialization fails (e.g., invalid DSN)? → The app continues to function normally — crash reporting failure MUST NOT crash the app. Log a console warning in dev builds.
- What if the EAS project ID is missing from `app.json`? → Push notifications fail silently in production. The build should still succeed, but the missing project ID is logged as a warning during the EAS build.
- What if the HTTPS certificate for the staging/production server is self-signed? → Self-signed certificates are not supported — use a trusted CA (Let's Encrypt or equivalent). No certificate pinning workarounds.
- What if Sentry source maps upload fails during the EAS build? → The build succeeds but a warning is logged. Stack traces in Sentry will show minified references until source maps are corrected. Investigate CI configuration — do not skip source map upload.
- What if an error boundary is placed at the wrong level? → Error boundaries MUST be placed at the screen level (one per tab/screen root), not only at the app root — a tab-level crash should not take down other tabs.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST have an `ErrorBoundary` component wrapping each screen root (tab-level granularity).
- **FR-002**: The `ErrorBoundary` fallback UI MUST display a user-friendly message (Arabic + English via i18n) and a "Try Again" button.
- **FR-003**: The `ErrorBoundary` MUST forward caught errors to Sentry before rendering the fallback UI.
- **FR-004**: Sentry MUST be initialized with the correct DSN per build profile (dev DSN vs. production DSN).
- **FR-005**: Sentry reports MUST include: error, stack trace, device OS + version, app version, center ID — and MUST NOT include PII.
- **FR-006**: The `eas.json` file MUST define three build profiles: `development`, `preview`, and `production`.
- **FR-007**: Each EAS profile MUST configure the correct API base URL via environment variable — no hardcoded URLs in source.
- **FR-008**: The `preview` and `production` profiles MUST enforce HTTPS for API calls and WSS for WebSocket connections.
- **FR-009**: The `development` profile MUST allow HTTP to localhost/10.0.2.2.
- **FR-010**: `app.json` MUST contain a valid, non-empty EAS project ID.
- **FR-011**: Source maps MUST be uploaded to Sentry as part of the EAS build process.
- **FR-012**: All user-facing strings in the error boundary and offline banner MUST use i18n keys.

### Key Entities

- **EASProfile**: `development`, `preview`, `production` — each with its own `API_BASE_URL`, `WS_URL`, `SENTRY_DSN`, bundle ID suffix.
- **ErrorBoundary**: A React class component (or equivalent) wrapping screen roots, with `componentDidCatch` forwarding to Sentry.
- **SentryContext**: center ID (non-PII user tag) attached to every Sentry session.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A crash in any single screen does not crash any other screen — tab navigation remains functional after a tab-level error boundary triggers.
- **SC-002**: A production crash report appears in the Sentry dashboard within 60 seconds of occurring, with a readable stack trace (source maps resolved).
- **SC-003**: Running `eas build --profile production` produces an IPA/APK that makes zero HTTP (non-localhost) requests — all traffic is HTTPS/WSS.
- **SC-004**: A push notification sent to a registered token arrives on a `preview` build device within 30 seconds.
- **SC-005**: Zero PII fields appear in any Sentry crash report (confirmed by audit of Sentry tags and breadcrumbs).
- **SC-006**: The error boundary fallback screen renders correctly in both Arabic (RTL) and English (LTR).

---

## Assumptions

- The backend staging and production deployments are accessible over HTTPS — the mobile app team does not manage the server TLS configuration.
- Sentry.io is the chosen crash reporting service — Firebase Crashlytics is the fallback only if Sentry cannot be integrated.
- EAS (Expo Application Services) is the chosen build and distribution platform — no custom CI/CD build scripts are needed.
- Source map upload to Sentry is done via the `@sentry/react-native` EAS plugin — no manual upload step.
- The Expo account under which EAS is registered belongs to the project team — project ID is available to be added to `app.json`.
- The `preview` profile targets TestFlight (iOS) and internal testing track (Android) — not the public stores.
- Push notification testing in `development` profile uses Expo's `expo-notifications` local testing tools — no production FCM credentials needed for dev.
