# Feature Specification: Phase 1 — Foundation

**Feature Branch**: `phase-1-foundation`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 1 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Center Owner Login (Priority: P1)

A maintenance center owner opens the app for the first time. They are taken directly to a login screen (no onboarding — center owners are onboarded by the platform admin, not self-registered). They enter their registered email and password, and are authenticated via JWT. On success, they land on the home dashboard.

**Why this priority**: Login is the single gate to every feature in this app. Nothing else is accessible without it.

**Independent Test**: Log in with a verified center owner account → should arrive at the home dashboard with the center name displayed.

**Acceptance Scenarios**:

1. **Given** the app is opened for the first time, **When** it loads, **Then** the login screen is shown immediately (no onboarding flow).
2. **Given** valid credentials, **When** the owner submits the login form, **Then** a JWT is stored in encrypted secure storage and they are navigated to the home dashboard.
3. **Given** incorrect credentials, **When** submitted, **Then** an error message is shown: "Username and/or password is incorrect".
4. **Given** a locked account, **When** login is attempted, **Then** a message explains the account is locked and to contact support.
5. **Given** a non-verified account, **When** login is attempted, **Then** the user is redirected to the OTP verification screen.
6. **Given** an active session stored on device, **When** the app is relaunched, **Then** the user is taken directly to the home dashboard without re-authenticating.
7. **Given** the login screen, **When** displayed in Arabic locale, **Then** all labels, placeholders, and error messages appear in Arabic with RTL layout.

---

### User Story 2 — OTP Email Verification (Priority: P1)

A center owner whose account is not yet verified is redirected to an OTP screen. They receive a 6-digit OTP on their registered email. On successful entry, their account is activated and they are taken to the home dashboard.

**Why this priority**: Required to unlock the account before any center management is possible.

**Independent Test**: Trigger login with unverified account → enter correct OTP from MailDev → arrive at dashboard.

**Acceptance Scenarios**:

1. **Given** the OTP screen, **When** the user enters the correct 6-digit code, **Then** the account is activated and they are navigated to the home dashboard.
2. **Given** an incorrect OTP, **When** submitted, **Then** an inline error is shown and the field is cleared.
3. **Given** an expired OTP, **When** submitted, **Then** the system regenerates and resends a new OTP and informs the user.
4. **Given** the OTP screen, **When** the user taps "Resend Code", **Then** a new OTP is sent and a cooldown timer is shown (60 seconds before next resend is allowed).

---

### User Story 3 — Home Dashboard Overview (Priority: P1)

After login, the center owner sees a dashboard summarizing their center's current status: today's pending bookings count, active bookings count, overall star rating, and a quick-action area. This gives them situational awareness at a glance without navigating elsewhere.

**Why this priority**: The dashboard is the app's home base — it orients the owner and surfaces the most time-sensitive information every time they open the app.

**Independent Test**: Log in → dashboard should display counts for today's pending and active bookings, and the center's current rating.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** the dashboard loads, **Then** it displays: today's pending booking count, active booking count, and overall rating.
2. **Given** a center with no bookings today, **When** the dashboard loads, **Then** counts show 0 and a friendly empty-state message is shown.
3. **Given** the dashboard, **When** the owner taps a stat card, **Then** they are navigated to the relevant list (e.g., tapping "Pending" opens the bookings list filtered to pending).
4. **Given** a slow connection, **When** the dashboard loads, **Then** skeleton placeholders are shown while data is fetching.
5. **Given** the dashboard in Arabic, **When** rendered, **Then** all labels are in Arabic, numbers use Arabic-Indic digits if locale demands it, and layout is RTL.

---

### User Story 4 — Language Selection (Priority: P2)

The center owner can switch the app language between Arabic and English at any time. The selection persists across sessions. All screens immediately re-render in the chosen language and layout direction.

**Why this priority**: Constitution-level requirement — bilingual support must be baked in from Phase 1 so every subsequent screen is built correctly.

**Independent Test**: Switch to Arabic → navigate to dashboard → all text is Arabic, layout is RTL → restart app → Arabic is still active.

**Acceptance Scenarios**:

1. **Given** the app in English, **When** the owner switches to Arabic, **Then** all visible text changes to Arabic and layout flips to RTL.
2. **Given** the app in Arabic, **When** the app is restarted, **Then** Arabic remains the active language.
3. **Given** the app in Arabic, **When** the owner switches to English, **Then** all text changes to English and layout switches to LTR.

---

### User Story 5 — Session Expiry & Logout (Priority: P2)

When the JWT expires (2.4 hours), any navigation to a protected screen redirects the owner to the login screen with an explanatory message. The owner can also manually log out from the dashboard or settings.

**Why this priority**: Security baseline required before any protected screens are built in Phase 2+.

**Independent Test**: Manually expire token → navigate to dashboard → redirected to login with "session expired" message.

**Acceptance Scenarios**:

1. **Given** an expired JWT, **When** a protected screen is accessed, **Then** the user is redirected to login with the message "Your session has expired, please sign in again".
2. **Given** an authenticated owner, **When** they tap "Log Out", **Then** the JWT is cleared from secure storage and they are navigated to the login screen.

---

### Edge Cases

- What happens if the device is offline when the owner opens the app? → If a valid (non-expired) JWT exists, show the dashboard with cached data and a "You are offline" banner.
- What happens if the backend returns an unexpected 500 error on login? → Show a generic "Something went wrong, please try again" error — never expose raw server errors to the UI.
- What happens if the center owner has no center assigned to their account yet? → Show a placeholder screen: "Your center is being set up. Please contact support." — do not crash.
- What happens when the OTP input receives non-numeric input? → The field must reject non-numeric characters at the input level.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display the login screen on first launch — no onboarding flow.
- **FR-002**: The app MUST provide a login form accepting email and password.
- **FR-003**: The app MUST validate login fields before submission (required, valid email format, password non-empty).
- **FR-004**: The app MUST store the JWT in encrypted secure storage after successful login.
- **FR-005**: The app MUST restore the session from secure storage on launch and navigate accordingly.
- **FR-006**: The app MUST provide an OTP verification screen accepting a 6-digit numeric code.
- **FR-007**: The app MUST allow resending the OTP with a 60-second cooldown between resends.
- **FR-008**: The app MUST display a home dashboard showing: today's pending booking count, active booking count, and overall center rating.
- **FR-009**: The app MUST navigate to the bookings list (filtered) when the owner taps a stat card on the dashboard.
- **FR-010**: The app MUST show skeleton loading states on the dashboard while data is fetching.
- **FR-011**: The app MUST support language switching between Arabic (RTL) and English (LTR) at any time.
- **FR-012**: The selected language MUST persist across app restarts.
- **FR-013**: The app MUST handle expired JWTs by clearing the session and redirecting to login.
- **FR-014**: The app MUST provide a logout action that clears all session data.
- **FR-015**: All user-facing strings MUST be delivered via i18n keys — no hardcoded display text.
- **FR-016**: The app MUST show an offline banner on the dashboard when the device has no internet connection.

### Key Entities

- **CenterOwner**: Email, password (not stored client-side), account enabled status, active session (JWT).
- **Session**: JWT token, expiry timestamp — stored in encrypted secure storage.
- **Language Preference**: Selected locale (`ar` or `en`) — stored in persistent local storage.
- **DashboardSummary**: Today's pending count, active count, overall rating — fetched from API on load.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A center owner can log in and reach the dashboard in under 30 seconds on a mid-range Android device.
- **SC-002**: Language switching takes effect in under 300ms with no screen reload required.
- **SC-003**: 100% of user-facing strings are translated — zero hardcoded display text in any Phase 1 screen.
- **SC-004**: The app session survives 3 consecutive app restarts without requiring re-login (within JWT expiry window).
- **SC-005**: All 4 screens in this phase (Login, OTP Verify, Dashboard, Language Settings) render correctly in both Arabic (RTL) and English (LTR).
- **SC-006**: The dashboard loads and displays data within 2 seconds on a standard 4G connection.

---

## Assumptions

- Center owner accounts are created by the platform admin via the backend — there is no self-registration flow in this app.
- The Spring Boot backend is running and reachable at the configured API base URL during testing.
- Email delivery uses MailDev in development; production email config is out of scope for this phase.
- The `UserType` enum on the backend distinguishes center owners from customers — only `CENTER_OWNER` type accounts should be able to log in to this app.
- Password reset / forgot password is out of scope for Phase 1 (planned for Phase 3 — Center Profile).
- The dashboard summary data (counts, rating) is fetched from backend endpoints that will be built alongside this phase.
- Bottom tab navigation shell is part of this phase — tabs for: Dashboard, Bookings, Profile, Notifications.
