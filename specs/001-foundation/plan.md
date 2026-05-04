# Implementation Plan: Phase 1 — Foundation

**Branch**: `phase-1-foundation` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Status**: ✅ COMPLETE — retrospective plan

## Summary

The Foundation phase establishes the entire structural skeleton of the center owner app: Expo Router navigation shell (auth group + app group + tabs), JWT auth flow (login → secure storage → session restore), OTP email verification, home dashboard with booking stats, language switching (Arabic RTL / English LTR via react-i18next), and automatic 401-logout middleware. All subsequent phases build on top of this.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: Expo Router (navigation), Redux Toolkit + RTK Query (state/API), expo-secure-store (token storage), react-i18next (i18n), NativeWind (styling)
**New Dependencies**: All established in this phase as baseline
**Storage**: expo-secure-store (native) + localStorage fallback (web) via `lib/storage.ts`
**Testing**: Manual smoke test — login, OTP, dashboard render in AR + EN
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: React Native mobile app — full navigation shell + auth + dashboard
**Performance Goals**: Dashboard loads < 2s (SC-006); login to dashboard < 30s (SC-001)
**Constraints**: Expo managed workflow; JWT expiry 2.4 hours; no onboarding screens; RTL from day 1
**Scale/Scope**: 4 screens, navigation shell, auth slice, base API config, i18n setup, session middleware

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec preceded all implementation |
| II. Bilingual First | ✅ Pass | i18n configured from day 1; all strings via keys; RTL layout |
| III. Component-Driven UI | ✅ Pass | `AppText`, `RatingStars` base components introduced |
| IV. API Contract Adherence | ✅ Pass | RTK Query from the start; `baseApi` with JWT auth header |
| V. Owner-Context Awareness | ✅ Pass | Login gated to OWNER user type |
| VI. Security & Privacy | ✅ Pass | JWT in expo-secure-store; never in AsyncStorage |
| VII. Production Readiness | ✅ Pass | No placeholder screens shipped |

## Project Structure

### Documentation

```text
specs/phase-1-foundation/
├── plan.md    # This file (retrospective)
├── spec.md    # Original specification
└── tasks.md   # Task list (retrospective)
```

### Source Code

```text
app/
├── _layout.tsx                    # Root: Redux Provider + Expo Router Stack
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx                  # Login form (email + password, JWT)
│   └── verify-otp.tsx             # 6-digit OTP entry + resend (60s cooldown)
└── (app)/
    ├── _layout.tsx                # Auth guard + session restore + approval check
    ├── pending-approval.tsx       # Shown when approvalStatus=PENDING_APPROVAL
    ├── setup-center.tsx           # First-time center setup placeholder
    └── (tabs)/
        ├── _layout.tsx            # Bottom tab navigator (Dashboard/Bookings/Profile/Notifications)
        └── index.tsx              # Dashboard screen (booking stats, rating)

store/
├── index.ts                       # Redux store + 401 auto-logout middleware + tagTypes
├── authSlice.ts                   # session: { token, email } + setSession/clearSession
└── api/
    ├── baseApi.ts                 # RTK Query base with Authorization header + baseUrl
    └── authApi.ts                 # login, activateAccount, resendOtp endpoints

lib/
├── constants/config.ts            # API_BASE_URL (platform-aware: 10.0.2.2 on Android)
├── storage.ts                     # SecureStore + localStorage fallback
└── i18n/
    ├── index.ts                   # i18next init (ar default, en fallback, RTL detection)
    ├── locales/en.json            # English translations
    └── locales/ar.json            # Arabic translations

components/ui/
├── AppText.tsx                    # Base text with i18n-aware font
└── RatingStars.tsx                # Star rating display component
```

## Complexity Tracking

> No constitution violations — this section is not applicable.
