# Feature Specification: Phase 3.5 — Service Pricing & Trust Badges

**Feature Branch**: `phase-3.5-service-pricing`
**Created**: 2026-04-15
**Status**: Draft
**Phase**: 3.5 of 10

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Service Pricing List (Priority: P1)

A center owner navigates to the Pricing section (under Profile or a dedicated tab). They see a list of all service pricing entries their center has published — each entry shows the service type, the service name in Arabic and English, a price range (min KD – max KD), typical duration, and whether the entry is active. This gives customers a transparent overview of what to expect before booking.

**Why this priority**: Pricing transparency is the #1 trust signal for customers in the Kuwait market. A center with published pricing ranges receives significantly more qualified bookings than one with no pricing information.

**Independent Test**: Navigate to Pricing → all existing `CenterServicePricing` entries appear with nameAr, nameEn, minPrice, maxPrice, duration, and active status.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Pricing screen, **Then** all pricing entries for their center are listed, each showing: Arabic service name, English service name, price range (`KD X.XXX – KD Y.YYY`), typical duration (if set), and Active/Paused badge.
2. **Given** no pricing entries yet, **When** the screen loads, **Then** an empty-state illustration is shown: "No pricing added yet. Add your first service price to build customer trust."
3. **Given** a paused pricing entry, **When** displayed in the list, **Then** it is visually dimmed and labeled "Paused" — it is not shown to customers in the customer app.
4. **Given** the pricing list in Arabic locale, **When** rendered, **Then** Arabic names are prominent, prices use `KD X.XXX` format, and layout is RTL.
5. **Given** the pricing list, **When** the owner pulls down to refresh, **Then** the list refreshes from the API.

---

### User Story 2 — Add a Pricing Entry (Priority: P1)

A center owner taps "+" to add a new pricing entry. They select a service type (from the existing `ServiceType` enum), enter the service name in Arabic and English, set a minimum and maximum price, optionally set a typical duration in minutes, and optionally add descriptions in Arabic and English. On save, the entry is created via the API and appears in the list.

**Why this priority**: This is the primary action of the screen. Without it, the pricing feature has no value.

**Independent Test**: Add a new pricing entry with all required fields → save → entry appears in the pricing list with correct nameAr, nameEn, minPrice, maxPrice values.

**Acceptance Scenarios**:

1. **Given** the add pricing form, **Then** it MUST contain: service type selector (required — from `ServiceType` enum), Arabic service name (required), English service name (required), minimum price in KD (required, numeric, ≥ 0.000), maximum price in KD (required, numeric, ≥ minPrice), typical duration in minutes (optional, numeric), Arabic description (optional), English description (optional).
2. **Given** a `maxPrice` less than `minPrice`, **When** the owner tries to save, **Then** an inline validation error is shown: "Maximum price must be greater than or equal to minimum price."
3. **Given** a missing required field, **When** the owner taps "Save", **Then** inline validation errors appear below each invalid field and no API call is made.
4. **Given** a valid form, **When** the owner taps "Save", **Then** a loading indicator appears, the API is called (`POST /centers/my/pricing`), and on success the entry appears in the list.
5. **Given** an API failure during save, **When** the request fails, **Then** an inline error banner is shown (not `Alert.alert` on web) and the form remains open with entered data intact.
6. **Given** the add form in Arabic, **When** rendered, **Then** all labels and placeholders appear in Arabic with RTL layout.

---

### User Story 3 — Edit a Pricing Entry (Priority: P1)

A center owner taps an existing pricing entry to edit it. The edit form is pre-populated with all existing values. They can change any field. On save, the entry is updated via the API and the list reflects the change. They can also toggle the entry's active status from the edit form.

**Why this priority**: Prices change over time. Owners must keep their pricing current — stale pricing erodes customer trust.

**Independent Test**: Edit an existing entry's `minPrice` → save → the pricing list shows the updated min price.

**Acceptance Scenarios**:

1. **Given** a pricing entry in the list, **When** the owner taps it, **Then** the edit form opens with all existing values pre-populated.
2. **Given** the edit form, **When** the owner changes any field and taps "Save", **Then** the entry is updated via `PUT /centers/my/pricing/{id}` and the list reflects the changes.
3. **Given** the edit form, **When** the owner toggles the "Active" switch to OFF, **Then** the entry is paused — it is no longer visible to customers.
4. **Given** the owner has unsaved changes, **When** they tap the back button, **Then** a discard-changes confirmation dialog appears before navigating away.
5. **Given** an API failure during save, **When** the request fails, **Then** an inline error banner is shown and the form remains open.

---

### User Story 4 — Delete a Pricing Entry (Priority: P2)

A center owner can permanently delete a pricing entry they no longer offer. A destructive confirmation dialog is shown before the deletion proceeds. Once deleted, the entry is removed from the list and is no longer visible to customers.

**Why this priority**: Catalog hygiene — outdated pricing entries that can no longer be honored mislead customers and cause trust complaints.

**Independent Test**: Delete a pricing entry → it disappears from the pricing list; refreshing the list does not bring it back.

**Acceptance Scenarios**:

1. **Given** a pricing entry in the edit form, **When** the owner taps "Delete", **Then** a destructive confirmation dialog appears: "Delete this pricing entry? This cannot be undone."
2. **Given** the confirmation, **When** confirmed, **Then** the entry is deleted via `DELETE /centers/my/pricing/{id}` and removed from the list.
3. **Given** the delete API call fails, **When** it fails, **Then** an inline error banner is shown and the entry remains in the list.

---

### User Story 5 — View Trust Score & Badges (Priority: P2)

A center owner opens the Trust section (on their Profile or a dedicated badges screen). They see their current trust score and a set of earned trust badges: "Verified Pricing", "Fast Responder", "High Completion Rate", "Top Rated". Each badge shows whether it is earned or locked, and the criteria needed to earn locked badges. This motivates owners to improve their service quality.

**Why this priority**: Trust badges are the visible output of the Trust MVP. They give owners a concrete goal and give customers a shorthand quality signal.

**Independent Test**: Navigate to Trust Badges → a locked badge shows its unlock criteria; an earned badge shows as awarded with a distinct visual treatment.

**Acceptance Scenarios**:

1. **Given** the Trust Badges screen, **When** it loads, **Then** all badge types are displayed — earned badges are highlighted (gold/colored) and locked badges are greyed out.
2. **Given** an earned badge, **When** displayed, **Then** it shows: badge icon, badge name (Arabic + English), and "Earned" label.
3. **Given** a locked badge, **When** displayed, **Then** it shows: badge icon, badge name (Arabic + English), and the unlock criteria (e.g., "Add at least 5 service pricing entries to earn 'Verified Pricing'").
4. **Given** the "Verified Pricing" badge, **When** the center has ≥ 1 active pricing entry, **Then** the badge is shown as earned.
5. **Given** the Trust Badges screen in Arabic, **When** rendered, **Then** badge names and criteria are in Arabic with RTL layout.

---

### Edge Cases

- What if `minPrice` and `maxPrice` are equal? → Allow it (fixed price). Display as `KD X.XXX` (not a range) in the list.
- What if a `ServiceType` has no label in the i18n file? → Fall back to the enum value name (e.g., `CAR_WASH` → "CAR_WASH") — do not crash.
- What if the owner tries to add a duplicate entry (same service type + same name)? → Backend returns a conflict error. Show an inline error: "A pricing entry for this service already exists."
- What if the duration is 0 minutes? → Reject with validation: "Duration must be at least 1 minute." Zero duration is not a valid value.
- What if the backend returns pricing entries for a service type the local enum doesn't recognize? → Display the entry with the raw service type string — do not filter it out or crash.
- What if the Trust Score API is unavailable? → Show the badges section in a degraded state with a "Could not load trust score" message — do not block the pricing section.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Pricing screen listing all `CenterServicePricing` entries for the owner's center.
- **FR-002**: Each pricing list item MUST display: Arabic service name, English service name, price range (`KD X.XXX – KD Y.YYY`), typical duration (if set), and active status badge.
- **FR-003**: The app MUST provide an "Add Pricing" form with fields: service type (required selector), Arabic name (required), English name (required), min price (required, numeric), max price (required, numeric, ≥ min price), duration in minutes (optional), Arabic description (optional), English description (optional).
- **FR-004**: The app MUST validate that `maxPrice ≥ minPrice` before submission.
- **FR-005**: The app MUST validate all required fields before making an API call.
- **FR-006**: The edit form MUST pre-populate all existing values and include an Active/Paused toggle.
- **FR-007**: The app MUST warn with a discard-changes dialog when navigating away from an unsaved form.
- **FR-008**: The app MUST support deleting a pricing entry with a destructive confirmation dialog.
- **FR-009**: On web (`Platform.OS === 'web'`), error and confirmation dialogs MUST use inline banners or `window.confirm` — not `Alert.alert`.
- **FR-010**: The app MUST display a Trust Badges screen showing earned and locked badges with their criteria.
- **FR-011**: The "Verified Pricing" badge MUST be shown as earned when the center has ≥ 1 active pricing entry.
- **FR-012**: All prices MUST be displayed with exactly 3 decimal places in KD format.
- **FR-013**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **CenterServicePricing**: `id`, `serviceType` (`ServiceType` enum), `serviceNameAr`, `serviceNameEn`, `minPrice` (decimal, 3 places), `maxPrice` (decimal, 3 places), `typicalDurationMinutes` (optional), `descriptionAr` (optional), `descriptionEn` (optional), `isActive`, `createdAt`, `updatedAt`.
- **TrustBadge**: `badgeType` (enum — VERIFIED_PRICING, FAST_RESPONDER, HIGH_COMPLETION, TOP_RATED), `isEarned`, `earnedAt` (optional), `criteria` (localized string).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The pricing list loads within 2 seconds on a standard 4G connection.
- **SC-002**: A center owner can add a new pricing entry in under 90 seconds from tapping "+".
- **SC-003**: The pricing list and edit form render correctly in both Arabic (RTL) and English (LTR).
- **SC-004**: All prices display with exactly 3 decimal places — no rounding artifacts (e.g., `KD 15.500`, not `KD 15.5`).
- **SC-005**: 100% of user-facing strings use i18n keys — zero hardcoded strings in any Phase 3.5 screen.
- **SC-006**: The Trust Badges screen loads and correctly distinguishes earned vs. locked badges based on backend data.

---

## Assumptions

- The backend API for `CenterServicePricing` (`GET/POST/PUT/DELETE /centers/my/pricing`) is built and deployed before this phase is implemented on the mobile side.
- `ServiceType` enum values used in pricing match the existing backend `ServiceType` enum — no new enum values are introduced in this phase.
- The Trust Score / Trust Badges data is served by a backend endpoint (`GET /centers/my/trust`) — if not yet available, the Trust Badges screen shows a placeholder "Coming soon" state.
- Price is stored as a decimal with 3 decimal places on the backend (KD convention) — no currency conversion is needed.
- The active/paused toggle controls customer-side visibility — pausing a pricing entry does not affect existing bookings.
- i18n keys for the `pricing.*` and `trustBadge.*` namespaces are added to both `en.json` and `ar.json` as part of this phase.
- The Pricing screen is accessible from the Profile tab — no new bottom tab is added for this phase.
