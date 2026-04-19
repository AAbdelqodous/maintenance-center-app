# Implementation Plan: Phase 2.5 — Production Hardening

**Branch**: `001-production-hardening` | **Date**: 2026-04-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-production-hardening/spec.md`

## Summary

The app is functionally complete (Phase 2) but not production-safe: there is no crash reporting, no error recovery UI, no EAS build configuration, and the API URLs are hardcoded for local development. This phase closes all four gaps: (1) adds `@sentry/react-native` for automatic crash reporting with source-map-resolved stack traces; (2) creates a React class `ErrorBoundary` component wrapping each tab screen so runtime crashes show a recovery UI without taking down the full app; (3) creates `eas.json` with three build profiles (development / preview / production) and migrates `app.json` to `app.config.ts` for dynamic bundle IDs and HTTPS enforcement; and (4) registers the EAS project ID so push notifications work in production.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**New Dependency**: `@sentry/react-native` (with `@sentry/react-native/expo` build plugin)
**Build Tooling**: EAS CLI ≥ 13.0.0, EAS Secrets for sensitive env vars
**Storage**: N/A — no new data persistence
**Testing**: No automated tests for this phase — manual verification checklist in `quickstart.md`
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: Mobile app infrastructure / configuration
**Performance Goals**: Error boundary reset completes within 500ms; Sentry event appears within 60s of crash (SC-001, SC-002)
**Constraints**: Expo managed workflow — no `expo prebuild`, no custom native modules; all packages must work without ejecting
**Scale/Scope**: 1 new component, 2 new config files (`eas.json`, `app.config.ts`), 1 new utility module (`lib/sentry.ts`), 1 modified constants file, 6 screen files updated, 2 i18n locale files updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec approved; planning before implementation |
| II. Bilingual First | ✅ Pass | ErrorBoundary fallback uses i18n keys (`error.*`) in both Arabic and English |
| III. Component-Driven UI | ✅ Pass | `ErrorBoundary` is a standalone reusable component in `components/ui/` |
| IV. API Contract Adherence | ✅ Pass | No new API endpoints; existing RTK Query config unchanged |
| V. Owner-Context Awareness | ✅ Pass | Infrastructure change — no customer flows introduced |
| VI. Security & Privacy | ✅ Pass | Sentry `beforeSend` strips PII; HTTPS enforced via `usesCleartextTraffic: false`; JWT in secure storage unchanged |
| VII. Production Readiness | ✅ Pass | This phase IS the production readiness gate — it satisfies Principle VII for all future features |

**Constitution Check Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-production-hardening/
├── plan.md                        # This file
├── research.md                    # Phase 0: Sentry, EAS, error boundary decisions
├── data-model.md                  # Phase 1: config shapes, env vars, component props
├── quickstart.md                  # Phase 1: setup steps + verification checklist
├── contracts/
│   └── build-profiles.md         # Phase 1: EAS profile guarantees, env var contract, PII contract
├── checklists/
│   └── requirements.md           # Spec quality checklist
└── tasks.md                      # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
app.config.ts                      # NEW: replaces app.json; dynamic bundle IDs per APP_VARIANT
eas.json                           # NEW: 3 build profiles (development / preview / production)

lib/
├── constants/config.ts            # MODIFY: API_BASE_URL + WS_URL read from EXPO_PUBLIC_* env vars
└── sentry.ts                      # NEW: initSentry() + setSentryCenter() + beforeSend PII guard

components/ui/
└── ErrorBoundary.tsx              # NEW: React class component with componentDidCatch + Sentry capture

app/
└── _layout.tsx                    # MODIFY: call initSentry() before RootLayout renders

store/
└── authSlice.ts                   # MODIFY: call setSentryCenter(centerId) after login/session restore

app/(app)/(tabs)/
├── index.tsx                      # MODIFY: wrap export in <ErrorBoundary>
├── bookings/index.tsx             # MODIFY: wrap export in <ErrorBoundary>
├── chat/index.tsx                 # MODIFY: wrap export in <ErrorBoundary>
├── profile/index.tsx              # MODIFY: wrap export in <ErrorBoundary>
├── reviews/index.tsx              # MODIFY: wrap export in <ErrorBoundary>
└── notifications/index.tsx        # MODIFY: wrap export in <ErrorBoundary>

lib/i18n/locales/
├── en.json                        # ADD: error.title, error.message, error.retry keys
└── ar.json                        # ADD: Arabic translations for error.* keys
```

**Structure Decision**: Mobile-only infrastructure feature. No new screens, no new backend changes. The `app.json` → `app.config.ts` migration is a one-file rename+rewrite. All other changes are additive (new files) or minimal modifications to existing files.

## Complexity Tracking

> No constitution violations — this section is not applicable.
