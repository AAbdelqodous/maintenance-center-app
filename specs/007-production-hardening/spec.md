# Feature Specification: Phase 2.5 — Production Hardening

**Feature Branch**: `001-production-hardening`
**Created**: 2026-04-16
**Status**: ✅ Implemented
**Input**: User description: "Phase 2.5 production hardening: error boundary, Sentry crash reporting, EAS build profiles, HTTPS enforcement, EAS project ID for push notifications"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App Survives Screen-Level Crashes (Priority: P1)

A center owner is using the app on their phone when a component in one screen throws an unexpected runtime error. Instead of seeing a blank white screen or an OS-level crash, they see a friendly error screen with a "Try Again" button. The bottom navigation bar remains intact — they can switch to another tab immediately. If they tap "Try Again", the crashed screen re-mounts and resumes normal operation.

**Why this priority**: A blank white screen on crash is the worst possible outcome — it destroys trust and leaves the user stranded with no recovery path. An error boundary is the minimum safety net before any production release.

**Independent Test**: In a test build, intentionally throw a runtime error in any single screen. Confirm: (1) only that screen shows the error fallback UI, (2) the bottom tab bar is still functional, (3) tapping "Try Again" re-mounts the screen successfully.

**Acceptance Scenarios**:

1. **Given** a center owner is on any screen, **When** a runtime JavaScript error is thrown inside that screen, **Then** a safe fallback UI appears instead of a blank screen or app crash.
2. **Given** the error fallback UI is showing, **When** the owner taps "Try Again", **Then** the error boundary resets and the screen re-renders from its initial state.
3. **Given** an error has occurred in one tab screen, **When** it is caught, **Then** the bottom tab navigation bar remains visible and all other tabs continue to function normally.
4. **Given** an error is caught by the boundary, **When** it happens, **Then** the crash details are automatically reported to the crash reporting service without any manual action from the user.
5. **Given** the error fallback UI, **When** the app is set to Arabic locale, **Then** the error message and "Try Again" button label appear in Arabic with RTL layout.

---

### User Story 2 - Crashes Are Visible to the Development Team (Priority: P1)

When any unhandled error or crash occurs in a production or preview build, a crash report automatically appears in the Sentry dashboard within one minute. The report includes the error message, a readable stack trace (not minified), device OS and version, app version, and the center's ID. No personally identifiable information (email, name, phone number) is ever included.

**Why this priority**: Without crash reporting, production bugs are invisible. The team learns about crashes only when a frustrated user complains, making diagnosis slow and fixes delayed.

**Independent Test**: Trigger a known crash in a preview build. Open the Sentry project dashboard within 60 seconds. Confirm: a new error event appears with a readable stack trace referencing TypeScript source files — not minified bundle references.

**Acceptance Scenarios**:

1. **Given** a production or preview build, **When** any unhandled exception occurs, **Then** a crash report is sent to Sentry within 60 seconds containing: error message, stack trace, device OS, device OS version, app version, and center ID.
2. **Given** a crash report in Sentry, **When** reviewed by the development team, **Then** the stack trace references readable TypeScript source file names and line numbers — not minified or obfuscated references.
3. **Given** a crash event, **When** it is captured, **Then** no PII is attached — specifically: no email address, no first name, no last name, no phone number, no customer data.
4. **Given** a development build, **When** an error occurs, **Then** crash reports are sent to a separate development Sentry project — not the production project.
5. **Given** Sentry initialization fails at startup (e.g., invalid or missing DSN), **When** the app loads, **Then** the app continues to function normally — Sentry failure does not crash the app or degrade any user-facing feature.

---

### User Story 3 - Production Builds Use Secure Connections (Priority: P1)

When a center owner installs the app from the App Store or Play Store, every API request and WebSocket chat connection uses an encrypted connection. No data is transmitted over unencrypted channels. In the development environment, connections to the local test server continue to work normally over HTTP.

**Why this priority**: Unencrypted connections in production expose JWT tokens and business data to network interception. Both iOS and Android enforce HTTPS for non-localhost addresses by default — HTTP causes silent failures in production builds.

**Independent Test**: Install a preview build on a physical device. Use a network inspection tool. Confirm: every outbound request uses `https://` and every WebSocket connection uses `wss://`. No HTTP requests appear for non-localhost addresses.

**Acceptance Scenarios**:

1. **Given** a preview or production build, **When** any API call is made, **Then** it uses `https://` — never `http://` to a non-localhost address.
2. **Given** a preview or production build, **When** the real-time chat WebSocket connects, **Then** it uses `wss://` — never `ws://`.
3. **Given** a development build connecting to a local test server, **When** API calls and WebSocket connections are made, **Then** `http://` and `ws://` to localhost or `10.0.2.2` are allowed — no changes to development workflow.
4. **Given** an Android production build, **When** an HTTP request to a non-localhost address is attempted, **Then** the OS network policy blocks it — the error boundary handles the resulting error gracefully instead of silently failing.

---

### User Story 4 - Three Separate Build Environments (Priority: P1)

A developer can build the app for three distinct environments: development (local testing with Expo Go or Dev Client), preview (internal testing via TestFlight or Google Play internal track), and production (public App Store / Play Store). Each environment connects to the correct API, uses its own crash reporting project, and has a distinct bundle identifier. Switching between environments requires only a single EAS build command — no manual file edits.

**Why this priority**: Without distinct build profiles, every test deployment risks pointing at the production database or sending real push notifications to real users. Separate profiles make this impossible by configuration.

**Independent Test**: Run the EAS build command for the `preview` profile. Install the resulting IPA/APK. Confirm: the app connects to the staging API (not localhost), uses the preview bundle ID, and crash reports go to the dev Sentry project (not production).

**Acceptance Scenarios**:

1. **Given** the `development` build profile, **When** the app starts, **Then** it connects to the local test server and uses the development bundle ID.
2. **Given** the `preview` build profile, **When** the app starts, **Then** it connects to the staging API over HTTPS and uses the preview bundle ID.
3. **Given** the `production` build profile, **When** the app starts, **Then** it connects to the production API over HTTPS and uses the production bundle ID.
4. **Given** any build profile, **When** the app is built, **Then** the API base URL, WebSocket URL, and Sentry DSN are read from environment variables — zero hardcoded values exist in source code.
5. **Given** the `production` build profile, **When** the EAS build runs, **Then** source maps are automatically uploaded to Sentry so that crash stack traces are readable.

---

### User Story 5 - Push Notifications Work in Production (Priority: P2)

When a center owner receives a booking notification, cancellation alert, or chat message on their phone, the push notification arrives even when the app is in the background or closed. This requires the EAS project ID to be registered in the app configuration — the platform's push notification service routes delivery by project ID.

**Why this priority**: Push notification delivery is already built (Phase 2 / Phase 7) but silently fails in production until the EAS project ID is registered. This is a one-time configuration fix that unblocks a critical engagement feature.

**Independent Test**: Confirm `app.json` contains a non-placeholder EAS project ID. Install a preview build. Trigger a test push notification. Confirm: the push notification arrives on the device within 30 seconds while the app is backgrounded.

**Acceptance Scenarios**:

1. **Given** the `app.json` file, **When** inspected, **Then** it contains a non-empty, non-placeholder EAS project ID value.
2. **Given** a preview build installed on a device, **When** a test push notification is sent to the device's registered FCM/APNS token, **Then** the notification arrives within 30 seconds even if the app is in the background or closed.
3. **Given** a development build, **When** push notifications are tested, **Then** they deliver to the development channel only — production users are not affected.

---

### Edge Cases

- What if a self-signed TLS certificate is used on the staging server? → Self-signed certificates are not supported in preview or production builds — a trusted CA certificate is required. No certificate pinning bypass workarounds.
- What if the EAS project ID is accidentally left as the placeholder value in `app.json`? → Push notifications fail silently. The build succeeds, but the invalid project ID is logged as a warning during the EAS build.
- What if an error boundary is placed only at the app root level? → A tab-level crash would take down the entire app. Error boundaries must wrap each tab screen root individually so one tab's failure cannot affect others.
- What if the Sentry DSN is wrong for a given build profile? → Sentry initialization fails silently — the app continues to work. Developers discover the misconfiguration by the absence of crash events in the dashboard.
- What if a new screen is added in a future phase without an error boundary? → The next higher-level boundary (tab root or app root) catches the error but may affect more than the crashing screen. Code review checklist should include an error boundary check for new screens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST have an error boundary component wrapping each tab screen root — one error boundary per tab, not one for the entire app.
- **FR-002**: The error boundary fallback UI MUST display a user-friendly message and a "Try Again" button, both delivered via i18n keys (Arabic and English).
- **FR-003**: When an error boundary catches an error, it MUST forward the error and stack trace to the crash reporting service before rendering the fallback UI.
- **FR-004**: The crash reporting service MUST be initialized at app startup using the DSN that corresponds to the active build profile.
- **FR-005**: Crash reports MUST include: error message, stack trace, device OS, device OS version, app version, and center ID as a non-PII context tag.
- **FR-006**: Crash reports MUST NOT include any PII — no email address, no user first or last name, no phone number, no customer booking data.
- **FR-007**: Source maps MUST be uploaded to Sentry as part of every preview and production EAS build so that stack traces reference readable TypeScript source locations.
- **FR-008**: Crash reporting service initialization failure MUST NOT crash the app or degrade any user-facing feature — it must fail silently with a development-mode console warning only.
- **FR-009**: The project MUST define three EAS build profiles in `eas.json`: `development`, `preview`, and `production`.
- **FR-010**: Each build profile MUST configure the API base URL, WebSocket URL, and crash reporting DSN via environment variables — never hardcoded in source files.
- **FR-011**: The `preview` and `production` profiles MUST use `https://` for all API calls and `wss://` for all WebSocket connections.
- **FR-012**: The `development` profile MUST allow `http://` and `ws://` connections to localhost and `10.0.2.2`.
- **FR-013**: `app.json` MUST contain a valid, non-placeholder EAS project ID.
- **FR-014**: Each build profile MUST use a distinct bundle identifier to prevent installation conflicts across environments.

### Key Entities

- **EASBuildProfile**: `development`, `preview`, `production` — each with its own API base URL, WebSocket URL, crash reporting DSN, and bundle identifier.
- **ErrorBoundary**: A component wrapping each tab screen root; catches runtime errors, reports to the crash service, and renders a localized fallback UI with a retry action.
- **CrashContext**: A non-PII session tag containing only the center ID — attached to every crash event for this app session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A runtime crash in any single tab screen does not affect any other tab — bottom navigation remains functional and all other tabs load normally after the crash.
- **SC-002**: A crash event appears in the Sentry dashboard within 60 seconds of occurring in a preview or production build, with a stack trace showing TypeScript source file names and line numbers (not minified references).
- **SC-003**: A full audit of any preview or production build's network traffic shows zero unencrypted requests to non-localhost addresses.
- **SC-004**: A test push notification sent to a registered device token arrives within 30 seconds on a preview build while the app is backgrounded.
- **SC-005**: Zero PII fields appear in any Sentry crash report — confirmed by a manual audit of Sentry event tags, breadcrumbs, and context.
- **SC-006**: The error boundary fallback UI renders correctly in both Arabic (RTL) and English (LTR) with no untranslated strings.
- **SC-007**: Building the `preview` profile with a single EAS CLI command produces a correctly configured build — zero manual file edits required.

## Assumptions

- The backend staging and production server deployments will be accessible over HTTPS with a trusted CA certificate — TLS configuration is managed by the backend team, not this phase.
- Sentry.io is the selected crash reporting service — Firebase Crashlytics is a fallback only if Sentry integration is blocked.
- EAS (Expo Application Services) is the chosen build and distribution platform — no custom CI/CD pipeline is required for this phase.
- The Expo account for this project is available to the team and a valid EAS project ID can be generated and registered.
- Source map upload to Sentry is handled by the official `@sentry/react-native` EAS build plugin — no manual upload step is needed.
- The `preview` profile targets TestFlight (iOS) and the Google Play internal testing track (Android) — not the public stores.
- Environment variable injection at EAS build time is used to inject DSNs and URLs — sensitive values are stored in EAS secrets, not committed to source control.
