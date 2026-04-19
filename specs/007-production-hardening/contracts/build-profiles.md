# Contract: EAS Build Profiles & Environment Variables

**Feature**: Phase 2.5 — Production Hardening
**Type**: Configuration contract — defines the interface between EAS build system and the app source

---

## Build Profile Contract

Each EAS profile MUST satisfy the following guarantees:

### `development` profile

| Guarantee | Requirement |
|-----------|-------------|
| Target | Local development with Expo Dev Client or Expo Go |
| Bundle ID (iOS) | `com.maintainance.centerapp.dev` |
| Package (Android) | `com.maintainance.centerapp_dev` |
| API scheme | HTTP allowed (localhost / 10.0.2.2) |
| WebSocket scheme | WS allowed (localhost / 10.0.2.2) |
| Android cleartext | `usesCleartextTraffic: true` |
| Crash reporting | Dev Sentry DSN or disabled |
| Push notifications | Dev channel only |
| Build output | APK (sideload-friendly) |

### `preview` profile

| Guarantee | Requirement |
|-----------|-------------|
| Target | TestFlight (iOS) + Google Play internal track (Android) |
| Bundle ID (iOS) | `com.maintainance.centerapp.preview` |
| Package (Android) | `com.maintainance.centerapp_preview` |
| API scheme | HTTPS only — `https://` |
| WebSocket scheme | WSS only — `wss://` |
| Android cleartext | `usesCleartextTraffic: false` |
| Crash reporting | Dev/staging Sentry DSN (not production) |
| Push notifications | Dev/preview channel |
| EAS project ID | Must be a valid registered project ID |

### `production` profile

| Guarantee | Requirement |
|-----------|-------------|
| Target | App Store (iOS) + Google Play (Android) |
| Bundle ID (iOS) | `com.maintainance.centerapp` |
| Package (Android) | `com.maintainance.centerapp` |
| API scheme | HTTPS only — `https://` |
| WebSocket scheme | WSS only — `wss://` |
| Android cleartext | `usesCleartextTraffic: false` |
| Crash reporting | Production Sentry DSN |
| Push notifications | Production channel |
| EAS project ID | Must be a valid registered project ID |
| Source maps | Uploaded to Sentry during build |

---

## Environment Variable Contract

The following variables MUST be set as EAS Secrets before building `preview` or `production` profiles:

| Variable | Scope | Description | Example Value |
|----------|-------|-------------|---------------|
| `EXPO_PUBLIC_API_BASE_URL` | preview, production | HTTPS API base URL | `https://api.maintainance.com/api/v1/` |
| `EXPO_PUBLIC_WS_URL` | preview, production | WSS WebSocket URL | `wss://api.maintainance.com/ws` |
| `EXPO_PUBLIC_SENTRY_DSN` | preview, production | Sentry project DSN (per-profile) | `https://xxx@o123.ingest.sentry.io/456` |
| `SENTRY_ORG` | all profiles (build only) | Sentry organization slug | `maintainance-centers` |
| `SENTRY_PROJECT` | all profiles (build only) | Sentry project slug | `center-owner-app` |
| `EAS_PROJECT_ID` | preview, production | EAS project ID from expo.dev | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

**MUST NOT be committed to source control.** All of the above must be set via `eas secret:create` CLI or the EAS dashboard.

---

## ErrorBoundary Component Contract

The `ErrorBoundary` component in `components/ui/ErrorBoundary.tsx` MUST:

| Contract | Requirement |
|----------|-------------|
| Placement | Wrapping each individual tab screen export (6 screens) |
| On error capture | Call `Sentry.captureException(error)` before rendering fallback |
| Fallback UI | Show localized message (Arabic/English via i18n) + "Try Again" button |
| Retry behavior | Reset `hasError` state — re-render the child tree from scratch |
| Navigation impact | Bottom tab bar must remain visible after a tab-level boundary triggers |
| Sentry failure | If Sentry is unavailable, the boundary still renders fallback (non-blocking) |

---

## Sentry PII Contract

The following data MUST NEVER appear in any Sentry event:

| PII Field | Source | Prevention Mechanism |
|-----------|--------|---------------------|
| `user.email` | Auth token payload | Deleted in `beforeSend` hook |
| `user.username` | Auth token payload | Deleted in `beforeSend` hook |
| `user.ip_address` | SDK auto-collect | Deleted in `beforeSend` hook |
| Customer names | Booking/review data | Never set as Sentry context |
| Phone numbers | User profile | Never set as Sentry context |

**Allowed non-PII context**:
- `center_id` tag (integer ID only — not name, not owner name)
- `app.version` (set automatically by SDK)
- `device.model`, `os.version` (set automatically by SDK)
