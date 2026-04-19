# Data Model: Phase 1 — Foundation

**Branch**: `phase-1-foundation` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

### Auth & Session

```typescript
// store/authSlice.ts
interface SessionState {
  token: string | null;
  email: string | null;
}

// store/api/authApi.ts response shapes
interface AuthResponse {
  token: string;
  approvalStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
}

interface UserResponse {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  userType: 'CENTER_OWNER' | 'CUSTOMER';
  approvalStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
}
```

### Dashboard

```typescript
// store/api/bookingsApi.ts (stats endpoint)
interface BookingStats {
  pendingCount: number;
  activeCount: number;
  completedCount: number;
  totalReviews: number;
  averageRating: number;
}
```

---

## Redux Auth Slice — `store/authSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SessionState {
  token: string | null;
  email: string | null;
}

const initialState: SessionState = { token: null, email: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ token: string; email: string }>) {
      state.token = action.payload.token;
      state.email = action.payload.email;
    },
    clearSession(state) {
      state.token = null;
      state.email = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
```

---

## RTK Query Slice — `store/api/authApi.ts`

```typescript
import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: 'auth/authenticate', method: 'POST', body }),
    }),
    activateAccount: builder.mutation<void, { token: string }>({
      query: ({ token }) => ({ url: `auth/activate-account?token=${token}`, method: 'GET' }),
    }),
    resendOtp: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: 'auth/resend-activation', method: 'POST', body }),
    }),
    getMe: builder.query<UserResponse, void>({
      query: () => 'users/me',
    }),
    registerOwner: builder.mutation<void, RegisterOwnerRequest>({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    updatePushToken: builder.mutation<void, { token: string }>({
      query: (body) => ({ url: 'users/me/push-token', method: 'PUT', body }),
    }),
  }),
});
```

---

## Storage Utility — `lib/storage.ts`

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'auth_email';
const LOCALE_KEY = 'app_locale';

const isWeb = Platform.OS === 'web';

export const storage = {
  async saveSession(token: string, email: string) {
    if (isWeb) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(EMAIL_KEY, email); }
    else { await SecureStore.setItemAsync(TOKEN_KEY, token); await SecureStore.setItemAsync(EMAIL_KEY, email); }
  },
  async getSession(): Promise<{ token: string | null; email: string | null }> {
    if (isWeb) return { token: localStorage.getItem(TOKEN_KEY), email: localStorage.getItem(EMAIL_KEY) };
    return { token: await SecureStore.getItemAsync(TOKEN_KEY), email: await SecureStore.getItemAsync(EMAIL_KEY) };
  },
  async clearAll() {
    if (isWeb) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EMAIL_KEY); }
    else { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(EMAIL_KEY); }
  },
  async saveLocale(locale: string) {
    if (isWeb) localStorage.setItem(LOCALE_KEY, locale);
    else await SecureStore.setItemAsync(LOCALE_KEY, locale);
  },
  async getLocale(): Promise<string | null> {
    if (isWeb) return localStorage.getItem(LOCALE_KEY);
    return SecureStore.getItemAsync(LOCALE_KEY);
  },
};
```

---

## i18n Key Structure (base namespaces)

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "yes": "Yes",
    "no": "No",
    "error": "Error",
    "loading": "Loading...",
    "retry": "Retry",
    "back": "Back"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "login": "Sign In",
    "loginError": "Username and/or password is incorrect",
    "sessionExpired": "Your session has expired, please sign in again",
    "logout": "Sign Out",
    "otpTitle": "Verify Your Account",
    "otpSubtitle": "Enter the 6-digit code sent to your email",
    "otpResend": "Resend Code",
    "otpResendCooldown": "Resend in {{seconds}}s",
    "otpError": "Invalid or expired code",
    "otpSuccess": "Account verified!"
  },
  "dashboard": {
    "title": "Dashboard",
    "pendingBookings": "Pending",
    "activeBookings": "Active",
    "rating": "Rating",
    "noBookings": "No bookings today"
  }
}
```

---

## API Base Config — `lib/constants/config.ts`

```typescript
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1/',
  ios: 'http://localhost:8080/api/v1/',
  web: 'http://localhost:8080/api/v1/',
  default: 'http://localhost:8080/api/v1/',
});

export const WS_URL = API_BASE_URL!
  .replace('http', 'ws')
  .replace('/api/v1/', '/ws');
```
