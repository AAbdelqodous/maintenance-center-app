# Research: Phase 1 — Foundation

**Branch**: `phase-1-foundation` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Navigation Library

**Decision**: Expo Router (file-based routing).

**Rationale**:
- Ships with Expo SDK 54 — zero additional install.
- File-based routing mirrors Next.js conventions the team already knows.
- Route groups `(auth)` and `(app)` provide clean auth-gating: the `(app)/_layout.tsx` auth guard runs before any protected screen renders.
- Deep-link support (push notification navigation) works automatically via file path conventions.

---

## Decision 2: State Management

**Decision**: Redux Toolkit + RTK Query.

**Rationale**:
- RTK Query eliminates boilerplate for data fetching, caching, and invalidation.
- Typed endpoints (`builder.query`, `builder.mutation`) with TypeScript generics prevent runtime type errors.
- 401-auto-logout middleware slots into the Redux store middleware chain cleanly — one place to intercept all failed API calls.
- `authSlice` holds `{ token, email }` — simple and sufficient for a JWT-based session.

---

## Decision 3: Secure Token Storage

**Decision**: `expo-secure-store` (native) with `localStorage` fallback (web) — abstracted behind `lib/storage.ts`.

**Rationale**:
- Constitution Principle VI: JWTs must be stored in encrypted secure storage — never AsyncStorage plain text.
- `expo-secure-store` uses Keychain (iOS) and Keystore (Android).
- Web uses `localStorage` since SecureStore is unavailable on web — acceptable for development/admin tools.
- `lib/storage.ts` provides a unified API (`saveSession`, `getSession`, `clearAll`) hiding platform differences.

---

## Decision 4: Internationalization (i18n)

**Decision**: `react-i18next` with Arabic as primary locale, English as fallback.

**Rationale**:
- Constitution Principle II: bilingual from day 1 — no retrofitting.
- `react-i18next` integrates with React Native via `initReactI18next` — hooks-based (`useTranslation`).
- RTL detection: `I18nManager.forceRTL(true)` when language is `ar`; persisted via `lib/storage.ts`.
- Locale files live at `lib/i18n/locales/en.json` and `ar.json` — structured by screen namespace.

---

## Decision 5: Styling

**Decision**: NativeWind (Tailwind CSS for React Native).

**Rationale**:
- Constitution Principle III: design tokens centralized, no hardcoded colors/spacing.
- NativeWind gives utility classes identical to web Tailwind — faster iteration than `StyleSheet.create`.
- Works in Expo managed workflow without ejecting.
- RTL: NativeWind supports `rtl:` variant prefix for RTL-specific overrides.

---

## Decision 6: API Base URL — Platform-Aware Android Loopback

**Decision**: `Platform.select({ android: 'http://10.0.2.2:8080/api/v1/', default: 'http://localhost:8080/api/v1/' })`.

**Rationale**:
- Android emulator maps `10.0.2.2` to the host machine's `localhost`.
- iOS simulator and web use `localhost` directly.
- Stored in `lib/constants/config.ts` — never hardcoded in API slices.

---

## Decision 7: 401 Auto-Logout Middleware

**Decision**: Custom Redux middleware in `store/index.ts` that intercepts RTK Query `rejected` actions where `error.status === 401`, dispatches `clearSession()`, and imperatively navigates to the login screen.

**Rationale**:
- A single middleware catches every expired-JWT response regardless of which screen triggered it.
- Avoids duplicating error handling in every RTK Query endpoint.
- `router.replace('/(auth)/login')` (Expo Router) from within middleware requires exposing the router instance or using a ref — this is the standard Expo Router pattern.

---

## Resolved Clarifications

- ✅ Navigation: Expo Router (file-based)
- ✅ State: Redux Toolkit + RTK Query
- ✅ Token storage: expo-secure-store + localStorage fallback
- ✅ i18n: react-i18next, Arabic primary
- ✅ Styling: NativeWind
- ✅ Android API base: `10.0.2.2`
- ✅ 401 logout: Redux middleware
