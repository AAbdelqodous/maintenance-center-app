# Quickstart: Phase 1 — Foundation

**Branch**: `phase-1-foundation` | **Status**: ✅ Implemented

---

## Prerequisites

- Docker Compose running: `docker-compose up -d` (postgres + maildev)
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- MailDev UI: `http://localhost:1080`
- Node/npm installed

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web        # web (fastest for testing)
npx expo start              # native (requires emulator)
```

---

## Step-by-Step Setup (already implemented — for reference)

1. Initialize Expo project with TypeScript
2. Install dependencies: `redux`, `@reduxjs/toolkit`, `react-i18next`, `nativewind`, `expo-secure-store`
3. Create `lib/constants/config.ts` with platform-aware `API_BASE_URL`
4. Create `store/api/baseApi.ts` with `Authorization: Bearer` header injection
5. Create `store/authSlice.ts` + `store/index.ts` with 401 middleware
6. Create `lib/storage.ts` (SecureStore + localStorage)
7. Create `lib/i18n/` with `en.json` + `ar.json`
8. Create navigation shell: `app/_layout.tsx` → `(auth)/` → `(app)/(tabs)/`
9. Create `login.tsx`, `verify-otp.tsx`, dashboard `index.tsx`
10. Wire up session restore in `(app)/_layout.tsx`

---

## Smoke Test Checklist

### Login Flow
- [ ] Open app → Login screen appears (no onboarding)
- [ ] Submit empty form → inline validation errors appear (email required, password required)
- [ ] Submit wrong credentials → "Username and/or password is incorrect" error shown
- [ ] Submit valid OWNER credentials → navigate to Dashboard

### Session Restore
- [ ] After login, close and reopen app → Dashboard loads without re-login
- [ ] Wait for JWT to expire (2.4h) or manually clear token → navigated to login with session-expired message

### OTP Verification
- [ ] Register new account → check MailDev → enter 6-digit OTP → account activated
- [ ] Enter wrong OTP → inline error shown, field cleared
- [ ] Tap "Resend Code" → new OTP arrives in MailDev; resend button shows 60s cooldown

### Dashboard
- [ ] Dashboard shows pending booking count, active count, and center rating
- [ ] Tapping a stat card navigates to the bookings list
- [ ] Skeleton placeholders appear while data is loading

### Language Switching
- [ ] Switch to Arabic → all text changes to Arabic, layout flips to RTL
- [ ] Restart app → Arabic remains active
- [ ] Switch back to English → all text returns to English

### Auto-Logout
- [ ] Invalidate JWT (change token in SecureStore or wait for expiry) → any API call → redirected to login

### Pending Approval
- [ ] Log in with a PENDING_APPROVAL account → redirected to pending-approval screen (not dashboard)
