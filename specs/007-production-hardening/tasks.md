---
description: "Task list for Phase 2.5 — Production Hardening"
---

# Tasks: Phase 2.5 — Production Hardening

**Input**: Design documents from `specs/001-production-hardening/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/build-profiles.md ✅ | quickstart.md ✅

**Tests**: Not requested — manual verification checklist is in `quickstart.md`.

**LLM implementer note**: Every task references the exact file path to write/modify and the exact section of `data-model.md` or `research.md` that defines the expected content. Do not guess — read the referenced section before writing the file.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependencies)
- **[Story]**: Maps to a user story from spec.md (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the new package and add the i18n error keys that the ErrorBoundary component will use.

- [ ] T001 Run `npx expo install @sentry/react-native` from repo root and confirm `@sentry/react-native` appears in `package.json` dependencies — do NOT manually edit package.json; use the expo install command so Expo resolves the compatible version
- [ ] T002 [P] Add the `error` namespace to `lib/i18n/locales/en.json`: add `"error": { "title": "Something went wrong", "message": "An unexpected error occurred. Please try again.", "retry": "Try Again" }` nested under the root JSON object — preserve all existing keys
- [ ] T003 [P] Add the `error` namespace to `lib/i18n/locales/ar.json`: add `"error": { "title": "حدث خطأ ما", "message": "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", "retry": "حاول مجدداً" }` nested under the root JSON object — preserve all existing keys

**Checkpoint**: Package installed, i18n keys in both locale files, app still launches (`npx expo start --web`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace `app.json` with the dynamic `app.config.ts` and create `eas.json`. These two files are required by every user story in this phase. Both must be complete before any user story work begins.

**⚠️ CRITICAL**: Do not start Phase 3–7 until T004 and T005 are complete and the app still launches.

- [ ] T004 Delete `app.json` and create `app.config.ts` at repo root using the **exact full content** defined in `data-model.md` under the section `## app.config.ts Shape`. Key points to implement correctly: (a) `const variant = process.env.APP_VARIANT ?? 'development'` at the top; (b) `bundleIdSuffix` and `appNameSuffix` derived from `variant`; (c) iOS `bundleIdentifier: 'com.maintainance.centerapp' + bundleIdSuffix`; (d) Android `package: 'com.maintainance.centerapp' + bundleIdSuffix.replace('.', '_')`; (e) `android.usesCleartextTraffic: variant === 'development'` (true only for dev, false for preview+production); (f) plugins array includes `'expo-router'`, `'expo-localization'`, and `['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]`; (g) `extra.eas.projectId: process.env.EAS_PROJECT_ID ?? 'PLACEHOLDER-SET-VIA-EAS-SECRET'`
- [ ] T005 Create `eas.json` at repo root using the **exact content** defined in `data-model.md` under `## EAS Build Profile Configuration`. Key points: (a) `"cli": { "version": ">= 13.0.0" }`; (b) `development` profile has `developmentClient: true`, `distribution: "internal"`, hardcoded localhost env vars (`EXPO_PUBLIC_API_BASE_URL: "http://localhost:8080/api/v1/"`, `EXPO_PUBLIC_WS_URL: "ws://localhost:8080/ws"`), `APP_VARIANT: "development"`, and `android.buildType: "apk"`; (c) `preview` profile has `distribution: "internal"`, only `APP_VARIANT: "preview"` in env (all other vars come from EAS Secrets); (d) `production` profile has `distribution: "store"`, only `APP_VARIANT: "production"` in env

**Checkpoint**: Run `npx expo start --web` — app launches. Run `eas build --profile development --platform android --dry-run` — no config errors.

---

## Phase 3: User Story 1 — App Survives Screen-Level Crashes (Priority: P1) 🎯 MVP

**Goal**: Any runtime JavaScript error thrown in a tab screen shows a safe fallback UI instead of a blank screen. The bottom navigation remains functional. Tapping "Try Again" re-mounts the crashed screen. The error is captured by Sentry.

**Independent Test**: In `app/(app)/(tabs)/index.tsx` temporarily add `throw new Error('test boundary')` at the top of the component function. Open the app → the ErrorBoundary fallback UI appears. Bottom tabs are still tappable. Tap "Try Again" → screen re-renders normally (remove the throw after testing).

- [ ] T006 [P] [US1] Create `lib/sentry.ts` using the **exact shape** defined in `data-model.md` under `## Sentry Initialization Shape`. The file must export: (a) `initSentry(): void` — calls `Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, debug: __DEV__, environment: process.env.APP_VARIANT ?? 'development', beforeSend(event) { if (event.user) { delete event.user.email; delete event.user.username; delete event.user.ip_address; } return event; } })` — if DSN is absent/empty, logs a dev warning and returns early without calling Sentry.init; (b) `setSentryCenter(centerId: number): void` — calls `Sentry.setTag('center_id', String(centerId))`; import is `import * as Sentry from '@sentry/react-native'`
- [ ] T007 [P] [US1] Create `components/ui/ErrorBoundary.tsx` as a React **class** component (not a function component — `componentDidCatch` requires a class). Implement exactly: (a) `interface Props { children: React.ReactNode; fallback?: React.ReactNode; }`; (b) `interface State { hasError: boolean; error: Error | null; }`; (c) `static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }`; (d) `componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void { Sentry.captureException(error, { extra: errorInfo as Record<string, unknown> }); }` — import Sentry from `@sentry/react-native`; (e) render: when `this.state.hasError` is true, render the `fallback` prop if provided, otherwise render a `View` with an `AppText` showing `t('error.title')`, a second `AppText` showing `t('error.message')`, and a `TouchableOpacity` with label `t('error.retry')` that calls `this.setState({ hasError: false, error: null })`; use `useTranslation` — since this is a class component, wrap the i18n call: export the class and wrap it in a function component that passes the `t` function as a prop, OR use `i18next.t()` directly (import `i18next` from `i18next`); (f) when `!this.state.hasError`, render `this.props.children`
- [ ] T008 [US1] Wrap the default export content of `app/(app)/(tabs)/index.tsx` in `<ErrorBoundary>`: import `ErrorBoundary` from `'../../../components/ui/ErrorBoundary'`; the existing screen JSX becomes the child of `<ErrorBoundary>` — do not change any other logic in the file
- [ ] T009 [US1] Wrap the default export content of `app/(app)/(tabs)/bookings/index.tsx` in `<ErrorBoundary>` — same pattern as T008; import path is `'../../../../components/ui/ErrorBoundary'`
- [ ] T010 [US1] Wrap the default export content of `app/(app)/(tabs)/chat/index.tsx` in `<ErrorBoundary>` — same pattern as T008; import path is `'../../../../components/ui/ErrorBoundary'`
- [ ] T011 [US1] Wrap the default export content of `app/(app)/(tabs)/profile/index.tsx` in `<ErrorBoundary>` — same pattern as T008; import path is `'../../../../components/ui/ErrorBoundary'`
- [ ] T012 [US1] Wrap the default export content of `app/(app)/(tabs)/reviews/index.tsx` in `<ErrorBoundary>` — same pattern as T008; import path is `'../../../../components/ui/ErrorBoundary'`
- [ ] T013 [US1] Wrap the default export content of `app/(app)/(tabs)/notifications/index.tsx` in `<ErrorBoundary>` — same pattern as T008; import path is `'../../../../components/ui/ErrorBoundary'`

**Parallel notes**: T006 and T007 touch different files — run in parallel. T008–T013 each touch different files and both depend only on T007 being complete — run in parallel after T007.

**Checkpoint**: All 6 tab screens are wrapped. The temporary `throw` test (described in Independent Test above) confirms the boundary catches the error and shows the fallback UI with "Try Again" in the correct locale.

---

## Phase 4: User Story 2 — Crashes Visible to Development Team (Priority: P1)

**Goal**: Sentry is initialized at app startup. When a crash occurs in a preview/production build, it appears in the Sentry dashboard within 60 seconds with a readable stack trace. The center ID is attached as a non-PII tag. No PII fields appear in any event.

**Independent Test**: With a valid `EXPO_PUBLIC_SENTRY_DSN` set in `.env.local` (for local testing), trigger a crash via the ErrorBoundary test above. Check the Sentry project dashboard — the event should appear within 60 seconds showing: error message, stack trace with TypeScript file references, and `center_id` tag. Confirm no `user.email` or `user.username` fields.

- [ ] T014 [P] [US2] Modify `app/_layout.tsx`: add `import { initSentry } from '../lib/sentry'` at the top of the file; call `initSentry()` as the **first statement** in the module body (outside the component function, so it runs once at module load time before any render); the existing `Provider` + `Stack` structure must remain unchanged
- [ ] T015 [P] [US2] Modify `store/authSlice.ts`: add `import { setSentryCenter } from '../lib/sentry'` at the top; find the location where a successful login sets the session state (look for where `token` and `email` are stored after authentication) — after the session is set, call `setSentryCenter(centerId)` where `centerId` is the center's numeric ID; also find where session is restored on app launch (the `(app)/_layout.tsx` calls `GET /users/me` — trace where the response is handled in the Redux store or auth flow) and call `setSentryCenter` there too; if `centerId` is not directly in the auth token payload, call it after the center profile is loaded via `GET /centers/my/profile`

**Parallel notes**: T014 and T015 touch different files — run in parallel. Both depend on T006 (`lib/sentry.ts`) being complete.

**Checkpoint**: App launches without errors. `initSentry()` runs at startup. After login, `center_id` tag is set in Sentry. In a preview build, crashes appear in the Sentry dashboard.

---

## Phase 5: User Story 3 — Production Builds Use Secure Connections (Priority: P1)

**Goal**: In preview and production builds, all API calls use `https://` and all WebSocket connections use `wss://`. In development, HTTP and WS to localhost/10.0.2.2 continue to work.

**Independent Test**: Install a preview build (built with `eas build --profile preview`). Use a network proxy to inspect traffic. Confirm every API call starts with `https://`. Confirm the chat WebSocket uses `wss://`. Confirm no `http://` requests to non-localhost addresses.

- [ ] T016 [US3] Modify `lib/constants/config.ts`: replace the existing `API_BASE_URL` and `WS_URL` constant definitions with the **exact pattern** defined in `data-model.md` under `## Environment Variables` → `### Updated source file: lib/constants/config.ts`. The new pattern uses `process.env.EXPO_PUBLIC_API_BASE_URL ??` as the primary value with the existing `Platform.select()` object as the fallback — this means local development (no env vars injected) continues to use localhost, while EAS preview/production builds use the HTTPS values injected via EAS Secrets; do not change any other code in the file or any import of `API_BASE_URL` / `WS_URL` elsewhere in the codebase

**Checkpoint**: Run `npx expo start --web` and open the app — login still works (HTTP localhost fallback active). The `lib/constants/config.ts` file no longer has any hardcoded `https://` or production domain strings.

---

## Phase 6: User Story 4 — Three Separate Build Environments (Priority: P1)

**Goal**: A developer can run one EAS CLI command to build for any of the three profiles. Each profile connects to the correct API, uses the correct bundle ID, and has the correct crash reporting DSN. Environment-sensitive values are never committed to source control.

**Independent Test**: Run `eas build --profile development --platform android --dry-run` — succeeds with no validation errors. Run `eas build --profile preview --platform android --dry-run` — succeeds. Inspect the generated bundle for `preview` — confirm `com.maintainance.centerapp.preview` bundle ID and no `http://` non-localhost URLs.

- [ ] T017 [US4] Create `scripts/setup-eas-secrets.sh` as a shell script template that documents the one-time EAS Secrets setup. The file must contain: (a) a comment block explaining that this script must be run once by a developer with access to the EAS project before the first preview/production build; (b) `eas secret:create` commands for each required secret listed in `contracts/build-profiles.md` under `## Environment Variable Contract` — use `<REPLACE_ME>` as placeholder values for the actual secret values; (c) separate sections for `--environment preview` and `--environment production` secrets; (d) a comment explaining that `development` profile uses hardcoded localhost values in `eas.json` and does not need secrets. This file is documentation for future developers — the LLM does not need to run it.

**Checkpoint**: `eas.json` exists with 3 profiles (T005). `app.config.ts` reads `APP_VARIANT` and sets correct bundle IDs (T004). `scripts/setup-eas-secrets.sh` documents all required secrets. `lib/constants/config.ts` reads from env vars (T016).

---

## Phase 7: User Story 5 — Push Notifications Work in Production (Priority: P2)

**Goal**: `app.json`/`app.config.ts` contains a valid, non-placeholder EAS project ID. A push notification sent to a registered device FCM/APNS token arrives within 30 seconds on a preview build.

**Independent Test**: Read `app.config.ts` → confirm `extra.eas.projectId` is set (not the `'PLACEHOLDER-SET-VIA-EAS-SECRET'` string). Install a preview build. Send a test push via Expo's push tool targeting the device's token. Notification arrives within 30 seconds.

- [ ] T018 [US5] Verify that `app.config.ts` (created in T004) already includes `extra: { eas: { projectId: process.env.EAS_PROJECT_ID ?? 'PLACEHOLDER-SET-VIA-EAS-SECRET' } }`. If it does not, add it now. Then add a prominent comment block above the `extra` field: `// ACTION REQUIRED (one-time): Register this project on expo.dev by running 'eas project:init', // then set the EAS_PROJECT_ID secret via: eas secret:create --scope project --name EAS_PROJECT_ID --value <your-id> // Without this, push notifications will be silently broken in production builds.`

**Checkpoint**: `app.config.ts` has the `projectId` field with the env var reference and the action-required comment. Once the EAS secret is set by a team member, push notifications will work in preview and production builds.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final production-readiness check — ensure nothing was missed, the app launches cleanly in dev, and the verification checklist from `quickstart.md` can be executed.

- [ ] T019 [P] Verify no `app.json` file remains at repo root (it was deleted in T004 and replaced by `app.config.ts`) — if it still exists, delete it; having both causes Expo to use `app.json` and ignore `app.config.ts`
- [ ] T020 [P] Verify that `components/ui/ErrorBoundary.tsx` is re-exported from `components/ui/index.ts` (or equivalent barrel file if one exists) — if a barrel file exists in `components/ui/`, add `export { ErrorBoundary } from './ErrorBoundary'`; if no barrel file exists, skip this task
- [ ] T021 Run the verification checklist in `quickstart.md` under `## Verification Checklist` — specifically: (a) perform the error boundary throw test in `app/(app)/(tabs)/index.tsx` (add `throw new Error('test boundary')`, confirm fallback UI, confirm other tabs work, confirm "Try Again" resets, remove the throw); (b) confirm `app.json` is deleted and `app.config.ts` exists; (c) confirm `eas.json` exists with all 3 profiles; (d) confirm `lib/sentry.ts` exists and exports `initSentry` and `setSentryCenter`; (e) confirm `lib/constants/config.ts` uses `process.env.EXPO_PUBLIC_API_BASE_URL` with fallback

**Checkpoint**: Full feature complete. All checklist items in `quickstart.md` pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001 first; T002 and T003 run in parallel after T001
- **Phase 2 (Foundational)**: Depends on Phase 1 — T004 and T005 run in parallel; blocks all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — T006 and T007 run in parallel; T008–T013 run in parallel after T007
- **Phase 4 (US2)**: Depends on T006 (lib/sentry.ts) — T014 and T015 run in parallel
- **Phase 5 (US3)**: Depends on Phase 2 (app.config.ts and eas.json must exist) — T016 is a single task
- **Phase 6 (US4)**: Depends on T004, T005, T016 — T017 is a single documentation task
- **Phase 7 (US5)**: Depends on T004 (app.config.ts) — T018 is a verification + comment task
- **Phase 8 (Polish)**: Depends on all previous phases — T019 and T020 run in parallel; T021 sequential

### User Story Dependencies

| Story | Priority | Depends On | Shares Files With |
|-------|----------|------------|-------------------|
| US1 Screen Crash Recovery | P1 | T004, T005 (Phase 2) | T006 (lib/sentry.ts) shared with US2 |
| US2 Crash Visibility | P1 | T006 (lib/sentry.ts) | `app/_layout.tsx`, `authSlice.ts` |
| US3 Secure Connections | P1 | T004, T005 (Phase 2) | `lib/constants/config.ts` |
| US4 Build Environments | P1 | T004, T005, T016 | Creates `scripts/setup-eas-secrets.sh` |
| US5 Push Notifications | P2 | T004 (app.config.ts) | `app.config.ts` (read-only check) |

### File Modification Map

| File | Task(s) | Type |
|------|---------|------|
| `app.json` | T004 | DELETE |
| `app.config.ts` | T004, T018 | CREATE + MODIFY |
| `eas.json` | T005 | CREATE |
| `lib/sentry.ts` | T006 | CREATE |
| `components/ui/ErrorBoundary.tsx` | T007 | CREATE |
| `lib/constants/config.ts` | T016 | MODIFY |
| `app/_layout.tsx` | T014 | MODIFY |
| `store/authSlice.ts` | T015 | MODIFY |
| `app/(app)/(tabs)/index.tsx` | T008 | MODIFY |
| `app/(app)/(tabs)/bookings/index.tsx` | T009 | MODIFY |
| `app/(app)/(tabs)/chat/index.tsx` | T010 | MODIFY |
| `app/(app)/(tabs)/profile/index.tsx` | T011 | MODIFY |
| `app/(app)/(tabs)/reviews/index.tsx` | T012 | MODIFY |
| `app/(app)/(tabs)/notifications/index.tsx` | T013 | MODIFY |
| `lib/i18n/locales/en.json` | T002 | MODIFY |
| `lib/i18n/locales/ar.json` | T003 | MODIFY |
| `scripts/setup-eas-secrets.sh` | T017 | CREATE |

---

## Parallel Execution Examples

### Phase 2 (Foundational)
```
Parallel:
  T004 — Create app.config.ts (replace app.json)
  T005 — Create eas.json
```

### Phase 3 (US1)
```
Parallel first:
  T006 — Create lib/sentry.ts
  T007 — Create components/ui/ErrorBoundary.tsx

Parallel after T007:
  T008 — Wrap app/(app)/(tabs)/index.tsx
  T009 — Wrap bookings/index.tsx
  T010 — Wrap chat/index.tsx
  T011 — Wrap profile/index.tsx
  T012 — Wrap reviews/index.tsx
  T013 — Wrap notifications/index.tsx
```

### Phase 4 (US2)
```
Parallel (both depend on T006 being complete):
  T014 — Modify app/_layout.tsx (call initSentry)
  T015 — Modify store/authSlice.ts (call setSentryCenter)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T005)
3. Phase 3: US1 — ErrorBoundary on all 6 tabs (T006–T013)
4. **STOP and VALIDATE**: Throw test confirms boundary catches crash, shows fallback, retries work, other tabs unaffected
5. This MVP delivers: zero blank-screen crashes in production

### Incremental Delivery

1. Phase 1 + 2 → Config files in place, app still works locally
2. Phase 3 (US1) → ErrorBoundary on all tabs ✅ Zero blank-screen crashes
3. Phase 4 (US2) → Sentry initialized ✅ Crashes now visible in dashboard
4. Phase 5 (US3) → URL env vars ✅ HTTPS enforced in preview/production builds
5. Phase 6 (US4) → EAS secrets documented ✅ Team can run any build profile
6. Phase 7 (US5) → EAS project ID confirmed ✅ Push notifications work
7. Phase 8 → Verification passes ✅ Production-ready

---

## Notes for LLM Implementer

- **app.json must be deleted**: Do not leave both `app.json` and `app.config.ts` — Expo uses `app.json` first if both exist.
- **ErrorBoundary must be a class**: React's `componentDidCatch` and `getDerivedStateFromError` have no equivalent in function components. Using hooks here will silently fail.
- **i18n in class component**: The `useTranslation` hook cannot be called inside a class component. Use `import i18next from 'i18next'` and call `i18next.t('error.title')` directly inside the render method.
- **`__DEV__`**: This is a React Native global (boolean) — no import needed. It is `true` during development and `false` in production builds.
- **`EXPO_PUBLIC_*` prefix**: Expo requires this prefix for env vars to be inlined at bundle time. Variables without this prefix are available at build time but NOT accessible in app code at runtime.
- **No `.env` files needed**: EAS Secrets replace `.env` files for preview/production. For local dev testing of Sentry, create a `.env.local` file with `EXPO_PUBLIC_SENTRY_DSN=<your-dev-dsn>` — this file should be gitignored (check `.gitignore`).
- **Do not run EAS builds**: Task T017 creates a script template — do not actually run `eas secret:create` commands; those require real credentials.
- **Alert.alert**: The ErrorBoundary fallback must NOT use `Alert.alert` for the "Try Again" interaction — it uses a `TouchableOpacity` button per the project feedback rule (Alert is a no-op on web).
