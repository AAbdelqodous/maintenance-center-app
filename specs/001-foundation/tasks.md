# Tasks: Phase 1 — Foundation

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-1-foundation`

---

## Phase 1: Project Setup

- [x] T001 Initialize Expo managed project with TypeScript template
- [x] T002 Install and configure Redux Toolkit + RTK Query
- [x] T003 Install and configure react-i18next with Arabic (RTL) + English locales
- [x] T004 Install NativeWind and configure Tailwind CSS for React Native
- [x] T005 Install expo-secure-store and create `lib/storage.ts` (SecureStore + localStorage web fallback)

---

## Phase 2: Foundational Infrastructure

- [x] T006 Create `lib/constants/config.ts` — `API_BASE_URL` with platform-aware Android `10.0.2.2` address
- [x] T007 Create `store/api/baseApi.ts` — RTK Query base with `Authorization: Bearer` header injection and `API_BASE_URL`
- [x] T008 Create `store/authSlice.ts` — `session: { token, email }`, `setSession`, `clearSession` actions
- [x] T009 Create `store/index.ts` — Redux store with 401 auto-logout middleware (clears session + redirects on 401 response)
- [x] T010 Create `lib/i18n/index.ts` — i18next init with Arabic default, English fallback, RTL detection
- [x] T011 Create `lib/i18n/locales/en.json` + `ar.json` — base translation keys (common, auth, dashboard)
- [x] T012 Create `app/_layout.tsx` — root layout wrapping with Redux Provider + i18n init

---

## Phase 3: User Story 1 — Login (P1)

**Goal**: Center owner can log in with email + password; JWT stored securely; session restored on relaunch.

- [x] T013 [P] Create `store/api/authApi.ts` — `login` mutation (`POST /auth/authenticate` → `{ token, approvalStatus }`)
- [x] T014 [P] Create `app/(auth)/_layout.tsx` — auth group stack layout
- [x] T015 Create `app/(auth)/login.tsx` — login form (email + password, validation, calls `login` mutation, stores token via `storage.saveSession`, dispatches `setSession`, navigates to `(app)`)
- [x] T016 Create `app/(app)/_layout.tsx` — auth guard (reads session from secure storage on mount, dispatches `setSession` or redirects to login if missing/expired; checks `approvalStatus` → redirects to `pending-approval` if PENDING_APPROVAL)

---

## Phase 4: User Story 2 — OTP Verification (P1)

**Goal**: Unverified accounts are redirected to OTP screen; correct OTP activates account.

- [x] T017 Add `activateAccount` + `resendOtp` endpoints to `store/api/authApi.ts`
- [x] T018 Create `app/(auth)/verify-otp.tsx` — 6-digit numeric input, submit calls `activateAccount`, resend with 60-second cooldown timer, inline error on wrong OTP

---

## Phase 5: User Story 3 — Home Dashboard (P1)

**Goal**: Dashboard shows today's pending count, active count, and overall rating with skeleton loading.

- [x] T019 Add `getBookingStats` query to `store/api/bookingsApi.ts` (or create as part of dashboard API)
- [x] T020 Create `app/(app)/(tabs)/_layout.tsx` — bottom tab navigator (Dashboard, Bookings, Profile, Notifications)
- [x] T021 Create `app/(app)/(tabs)/index.tsx` — dashboard screen: skeleton loading, stat cards (pending, active, rating), navigation on card tap
- [x] T022 Create `components/ui/RatingStars.tsx` — star rating display (configurable count, filled/empty)
- [x] T023 Create `components/ui/AppText.tsx` — base text component with i18n-aware styling

---

## Phase 6: User Story 4 — Language Switching (P2)

**Goal**: Owner switches language; preference persists; all screens re-render instantly.

- [x] T024 Add language preference persistence to `lib/storage.ts` (save/load locale key)
- [x] T025 Add language setting to settings screen or profile — `i18n.changeLanguage()` + save to storage
- [x] T026 Load persisted language on app start in `lib/i18n/index.ts` before rendering

---

## Phase 7: User Story 5 — Session Expiry & Logout (P2)

**Goal**: 401 auto-logout; manual logout clears storage and navigates to login.

- [x] T027 Implement 401 middleware in `store/index.ts` — intercepts 401 RTK Query responses, dispatches `clearSession()`, redirects to `/(auth)/login`
- [x] T028 Add logout handler — `storage.clearAll()` + `dispatch(clearSession())` + `router.replace('/(auth)/login')` — wired to logout button in settings/profile
- [x] T029 Create `app/(app)/pending-approval.tsx` — shown when `approvalStatus === 'PENDING_APPROVAL'`

---

## Phase 8: Polish

- [x] T030 Verify RTL layout on all 4 screens in Arabic locale
- [x] T031 Verify session restore: close and reopen app within JWT window → lands on dashboard
- [x] T032 Verify 401 auto-logout: invalidate token → any API call → redirected to login

---

## Dependencies

- T007 (baseApi) must complete before any RTK Query endpoints
- T009 (store) must complete before T013+
- T012 (root layout) must complete before auth/app layouts
- T015 (login) depends on T013 (authApi) + T008 (authSlice) + T012 (root layout)
- T016 (app layout) depends on T009 (401 middleware) + T008 (authSlice)
