# Feature Specification: Phase 3 — Center Profile Management

**Feature Branch**: `phase-3-center-profile`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 3 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Center Profile (Priority: P1)

A center owner taps the "Profile" tab. They see their maintenance center's public profile as it would appear to customers: name (Arabic + English), description (Arabic + English), phone number, address, overall rating, category, and operating hours. This is a read-only view — editing is a separate action.

**Why this priority**: The owner needs visibility into exactly what customers see. This is the starting point for any edit flow and builds trust in data accuracy.

**Independent Test**: Navigate to the Profile tab → all center fields are displayed with correct data, no placeholders visible for populated fields.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Profile tab, **Then** their center's profile is displayed with: Arabic name, English name, Arabic description, English description, phone number, address (street, area, city), category, overall rating, and operating hours per day.
2. **Given** a profile field that is not yet populated, **When** displayed, **Then** a "Not set" placeholder is shown (not an empty string or crash).
3. **Given** the profile screen, **When** the owner taps "Edit Profile", **Then** they are navigated to the profile edit screen.
4. **Given** the profile screen in Arabic locale, **When** rendered, **Then** the Arabic name and description are displayed prominently, layout is RTL.

---

### User Story 2 — Edit Center Information (Priority: P1)

A center owner taps "Edit Profile" and can update their center's name, description, phone number, and address. Both Arabic and English variants of name and description are required. On save, the backend is updated and they return to the profile view with updated data.

**Why this priority**: Accurate center information directly affects customer trust and discoverability. Owners need to keep it current.

**Independent Test**: Edit the center's Arabic name → save → return to profile view → Arabic name reflects the update.

**Acceptance Scenarios**:

1. **Given** the edit screen, **When** it opens, **Then** all existing values are pre-populated in their respective fields.
2. **Given** the edit form, **Then** it MUST contain: Arabic name (required), English name (required), Arabic description (optional, max 500 chars), English description (optional, max 500 chars), phone number (Kuwait format `+965 XXXX XXXX`), address fields (street, area, city — all required).
3. **Given** a missing required field, **When** the owner taps "Save", **Then** inline validation errors appear below the relevant fields and no API call is made.
4. **Given** a valid form, **When** the owner taps "Save", **Then** a loading indicator appears, the API is called, and on success the owner is returned to the profile view with updated data.
5. **Given** a save failure (network error or API error), **When** the request fails, **Then** an error toast is shown and the form remains open with the entered data intact.
6. **Given** the owner has unsaved changes, **When** they tap the back button, **Then** a discard-changes confirmation dialog appears before navigating away.

---

### User Story 3 — Manage Operating Hours (Priority: P1)

A center owner can set their center's operating hours for each day of the week. They can mark a day as open or closed. For open days, they set an opening and closing time. This data is displayed on the customer app to help customers know when to book.

**Why this priority**: Operating hours are critical scheduling information. Incorrect hours lead to bookings being made when the center is closed, causing cancellations and poor ratings.

**Independent Test**: Set Monday to Open, 8:00 AM – 6:00 PM → save → return to profile → Monday shows "8:00 AM – 6:00 PM".

**Acceptance Scenarios**:

1. **Given** the operating hours editor, **When** opened, **Then** all 7 days of the week are listed with their current open/closed status and hours.
2. **Given** a day marked as "Closed", **When** toggled to "Open", **Then** time pickers for opening and closing time appear for that day.
3. **Given** a day marked as "Open", **When** toggled to "Closed", **Then** the time pickers are hidden and the day shows "Closed".
4. **Given** an opening time that is after the closing time, **When** the owner tries to save, **Then** a validation error is shown: "Closing time must be after opening time".
5. **Given** valid hours for all days, **When** the owner taps "Save", **Then** the hours are persisted and displayed on the profile view.
6. **Given** the hours editor in Arabic, **When** rendered, **Then** day names appear in Arabic and time is displayed in the local format.

---

### User Story 4 — Manage Center Photos (Priority: P2)

A center owner can add, view, and remove photos of their center. Photos are displayed in a gallery on their public profile for customers to browse. They can upload from the device's photo library or camera.

**Why this priority**: Visual content is a key trust signal. Centers with photos receive significantly more bookings than those without.

**Independent Test**: Upload a photo → it appears in the gallery on the profile view. Remove a photo → it disappears from the gallery.

**Acceptance Scenarios**:

1. **Given** the photos management screen, **When** opened, **Then** all existing center photos are shown in a grid.
2. **Given** the photos screen, **When** the owner taps "Add Photo", **Then** a bottom sheet appears with two options: "Camera" and "Photo Library".
3. **Given** a selected photo, **When** confirmed, **Then** it is uploaded to the server and appears in the photo grid on success.
4. **Given** an upload in progress, **When** the photo is being uploaded, **Then** a progress indicator is shown on the uploading photo tile.
5. **Given** an uploaded photo, **When** the owner long-presses it, **Then** a "Remove" option appears.
6. **Given** the remove action, **When** confirmed via a dialog, **Then** the photo is deleted from the server and removed from the grid.
7. **Given** an upload failure, **When** the upload fails, **Then** the failed photo tile shows an error state with a retry button.
8. **Given** the gallery, **When** the owner taps a photo, **Then** it opens in a full-screen viewer with a close button.

---

### User Story 5 — Forgot Password (Priority: P2)

A center owner who has forgotten their password can tap "Forgot Password?" on the login screen. They enter their registered email and receive a password reset link. This is the only self-service recovery flow available.

**Why this priority**: Without password recovery, a locked-out owner must contact support, which is operationally expensive.

**Independent Test**: Tap "Forgot Password" → enter registered email → receive reset email in MailDev → follow link → set new password → log in successfully.

**Acceptance Scenarios**:

1. **Given** the login screen, **When** the owner taps "Forgot Password?", **Then** a screen appears with an email input.
2. **Given** a valid registered email, **When** submitted, **Then** a success message is shown: "If this email is registered, you will receive a reset link shortly."
3. **Given** any email (valid or not), **When** submitted, **Then** the same success message is shown (security — do not reveal if email exists).
4. **Given** an invalid email format, **When** submitted, **Then** an inline validation error is shown before the API call.

---

### Edge Cases

- What if the center owner's account is linked to multiple centers? → Show a center switcher in the profile header. All data operations are scoped to the currently selected center.
- What if a photo exceeds the size limit (e.g., >10 MB)? → Show an error before upload: "Photo is too large. Maximum size is 10 MB."
- What if the owner sets the same opening and closing time? → Show validation error: "Opening and closing time cannot be the same".
- What if the address fields have no Google Maps API key configured? → Manual text fields are used — map preview is hidden, not crashed.
- What if the center's category is unset? → Show "Uncategorized" placeholder — the owner cannot change category from this app (admin-controlled).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Profile tab displaying the center's full public profile.
- **FR-002**: The profile view MUST display: Arabic name, English name, Arabic description, English description, phone, address, category, overall rating, operating hours.
- **FR-003**: The app MUST provide an edit screen for center information (name, description, phone, address).
- **FR-004**: Both Arabic and English name variants MUST be required fields in the edit form.
- **FR-005**: The phone number field MUST validate Kuwait format (`+965 XXXX XXXX`).
- **FR-006**: The app MUST warn the owner with a discard-changes dialog when navigating away from an unsaved edit form.
- **FR-007**: The app MUST provide an operating hours editor for all 7 days of the week.
- **FR-008**: Each day MUST have an open/closed toggle; open days MUST have time pickers for opening and closing times.
- **FR-009**: The app MUST validate that closing time is after opening time.
- **FR-010**: The app MUST provide a photo management screen with grid view.
- **FR-011**: The app MUST support photo upload from both camera and photo library.
- **FR-012**: Photo uploads MUST show a progress indicator.
- **FR-013**: The app MUST support photo removal with a confirmation dialog.
- **FR-014**: The app MUST support full-screen photo viewing.
- **FR-015**: The app MUST provide a "Forgot Password?" flow from the login screen.
- **FR-016**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **MaintenanceCenter**: ID, nameAr, nameEn, descriptionAr, descriptionEn, phone, address (street, area, city), category, overall rating, operating hours, photos.
- **OperatingHours**: Day of week, isOpen, openTime, closeTime — one record per day (7 total).
- **CenterPhoto**: ID, URL, center ID, uploaded date.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The profile view loads within 2 seconds on a standard 4G connection.
- **SC-002**: A center owner can update their center's name and description and save in under 60 seconds.
- **SC-003**: Operating hours for all 7 days can be set and saved in under 2 minutes.
- **SC-004**: A photo upload completes within 10 seconds for a 5 MB image on a standard 4G connection.
- **SC-005**: All Profile screens render correctly in both Arabic (RTL) and English (LTR).
- **SC-006**: 100% of user-facing strings in this phase use i18n keys.

---

## Assumptions

- The backend provides endpoints for: GET center profile, PATCH center info, PUT operating hours, POST photo, DELETE photo.
- Center category is set by the platform admin — the owner cannot change it from this app.
- The maximum number of photos per center is 20 (backend enforced).
- Photo storage is handled by the backend (e.g., S3 or local file server) — the app only sends the binary and receives a URL.
- Password reset is handled via a backend email flow — the reset link points to a web page, not the mobile app.
- Multi-center ownership is possible but uncommon — the center switcher UI is a simple dropdown, not a full navigation redesign.
- Google Maps API integration for address map preview is deferred to a future enhancement.
