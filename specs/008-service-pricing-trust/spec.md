# Feature Specification: Phase 3.5 — Service Pricing & Trust Badges

**Feature Branch**: `002-service-pricing-trust`
**Created**: 2026-04-16
**Status**: ✅ Implemented
**Input**: User description: "Phase 3.5 service pricing and trust badges: center owners manage service price ranges, typical durations, active/paused status per service type, and view earned trust badges to build customer confidence"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Manage Service Pricing List (Priority: P1)

A center owner navigates to the Pricing section from their Profile tab. They see all pricing entries their center has published — each showing the service type, Arabic and English service name, price range in Kuwaiti Dinar, typical duration, and whether the entry is active or paused. From this screen they can add a new entry or tap an existing one to edit it.

**Why this priority**: Pricing transparency is the primary trust signal for customers in the Kuwait market. A center with published pricing attracts more qualified bookings than one with no pricing. The list is also the entry point for all other pricing actions.

**Independent Test**: Navigate to the Pricing screen as a logged-in center owner. Confirm all existing pricing entries are listed with correct Arabic name, English name, price range, duration, and active status. Confirm that pulling to refresh fetches the latest data.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Pricing screen, **Then** all pricing entries for their center are listed, each showing: Arabic service name, English service name, price range (`KD X.XXX – KD Y.YYY`), typical duration (if set), and Active or Paused badge.
2. **Given** a center with no pricing entries yet, **When** the Pricing screen loads, **Then** an empty state is displayed: "No pricing added yet. Add your first service price to build customer trust." with an "Add Service" button.
3. **Given** a paused pricing entry in the list, **When** displayed, **Then** it is visually distinct from active entries (dimmed or greyed) with a "Paused" label.
4. **Given** the Pricing screen in Arabic locale, **When** rendered, **Then** Arabic names are prominent, prices use `KD X.XXX` format, and the layout is right-to-left.
5. **Given** the pricing list, **When** the owner pulls down to refresh, **Then** the list reloads from the server and reflects any recent changes.

---

### User Story 2 - Add a New Pricing Entry (Priority: P1)

A center owner taps the "+" button to add a new pricing entry. They select the service type from the existing service type options, enter the service name in Arabic and English, set a minimum price and maximum price in KD, optionally provide a typical duration in minutes, and optionally add a description in both languages. On saving, the entry is created and immediately appears in the pricing list.

**Why this priority**: This is the primary action of the feature. Without the ability to add pricing, the entire Pricing screen delivers no value.

**Independent Test**: Open the Add Pricing form. Fill all required fields with valid values. Tap Save. Confirm: the new entry appears in the pricing list with the correct names, price range, and active status.

**Acceptance Scenarios**:

1. **Given** the Add Pricing form, **Then** it MUST contain: service type selector (required), Arabic service name (required), English service name (required), minimum price in KD (required, numeric, ≥ 0.000), maximum price in KD (required, numeric, must be ≥ minimum price), typical duration in minutes (optional, positive integer), Arabic description (optional), English description (optional).
2. **Given** a maximum price that is less than the minimum price, **When** the owner attempts to save, **Then** an inline validation error appears: "Maximum price must be greater than or equal to minimum price." No API call is made.
3. **Given** a missing required field, **When** the owner taps "Save", **Then** inline validation errors appear below each invalid field and the form remains open — no API call is made.
4. **Given** all required fields are valid, **When** the owner taps "Save", **Then** a loading indicator is shown, the entry is created, and on success it appears in the pricing list.
5. **Given** an API error during save, **When** the request fails, **Then** an inline error banner is shown (not a blocking dialog) and the form remains open with all entered data intact.
6. **Given** equal minimum and maximum prices, **When** saved, **Then** the entry is accepted and displayed as a fixed price (`KD X.XXX`) rather than a range.
7. **Given** the Add form in Arabic locale, **When** rendered, **Then** all labels and placeholder text appear in Arabic with right-to-left layout.

---

### User Story 3 - Edit or Pause an Existing Pricing Entry (Priority: P1)

A center owner taps an existing pricing entry to edit it. The edit form opens pre-populated with all current values. They can update any field, toggle the entry between active and paused, and save. If they navigate away without saving, a confirmation dialog warns them that unsaved changes will be lost.

**Why this priority**: Prices change over time. Owners must be able to update and temporarily pause entries — stale pricing misleads customers and generates complaints.

**Independent Test**: Open the edit form for an existing entry. Change the minimum price. Tap Save. Confirm: the pricing list reflects the updated minimum price. Open again, toggle Active to Paused, save. Confirm: the entry shows as Paused in the list.

**Acceptance Scenarios**:

1. **Given** a pricing entry in the list, **When** the owner taps it, **Then** the edit form opens with all existing values pre-populated in their respective fields.
2. **Given** the edit form, **When** the owner changes any field and taps "Save", **Then** the entry is updated and the pricing list reflects the new values.
3. **Given** the edit form, **When** the owner toggles the Active switch to Off, **Then** the entry becomes paused — it is no longer visible to customers in the customer-facing app.
4. **Given** the owner has unsaved changes in the edit form, **When** they tap the back button, **Then** a confirmation dialog appears: "Discard changes?" with "Discard" and "Keep Editing" options before navigating away.
5. **Given** an API error during save, **When** the request fails, **Then** an inline error banner is shown and the form remains open.

---

### User Story 4 - Delete a Pricing Entry (Priority: P2)

A center owner permanently removes a pricing entry they no longer offer. The app shows a destructive confirmation before deleting. Once confirmed, the entry is removed from the list and is no longer visible to customers.

**Why this priority**: Catalog hygiene prevents outdated pricing from misleading customers and generating trust complaints. Less critical than add/edit because pausing achieves a similar result without permanent data loss.

**Independent Test**: Open the edit form for a pricing entry. Tap Delete. Confirm the destructive dialog. Verify the entry disappears from the pricing list and does not reappear on refresh.

**Acceptance Scenarios**:

1. **Given** the edit form for a pricing entry, **When** the owner taps "Delete", **Then** a destructive confirmation dialog appears: "Delete this pricing entry? This action cannot be undone."
2. **Given** the confirmation dialog, **When** the owner confirms deletion, **Then** the entry is removed and disappears from the pricing list.
3. **Given** the delete request fails, **When** the API returns an error, **Then** an inline error banner is shown and the entry remains in the list.
4. **Given** a web browser session, **When** the delete confirmation is triggered, **Then** the confirmation uses an inline dialog or `window.confirm` — not a native `Alert.alert` call which has no effect on web.

---

### User Story 5 - View Trust Score and Earned Badges (Priority: P2)

A center owner opens the Trust section from their profile. They see their overall trust score and a set of trust badges — some earned, some locked. Each earned badge is visually highlighted. Each locked badge shows the specific criteria needed to earn it. This gives owners a concrete goal and signals to customers which centers have been validated.

**Why this priority**: Trust badges are the customer-facing output of the Trust MVP. They give owners a measurable improvement target and give customers a shorthand quality signal without reading reviews.

**Independent Test**: Navigate to the Trust Badges screen. Confirm earned badges are visually distinct from locked ones. Confirm a locked badge shows its specific unlock criteria. Confirm the "Verified Pricing" badge is earned when the center has at least one active pricing entry.

**Acceptance Scenarios**:

1. **Given** the Trust Badges screen, **When** it loads, **Then** all badge types are displayed — earned badges are highlighted (e.g., gold/colored) and locked badges are visually greyed out.
2. **Given** an earned badge, **When** displayed, **Then** it shows: badge icon, badge name in the active locale (Arabic or English), and an "Earned" indicator.
3. **Given** a locked badge, **When** displayed, **Then** it shows: badge icon, badge name in the active locale, and the specific unlock criteria in plain language.
4. **Given** a center with at least one active pricing entry, **When** the Trust Badges screen loads, **Then** the "Verified Pricing" badge is shown as earned.
5. **Given** the Trust Badges screen in Arabic locale, **When** rendered, **Then** badge names and criteria text appear in Arabic with right-to-left layout.
6. **Given** the trust score API is unavailable, **When** the screen loads, **Then** the badges section shows a "Could not load trust data" message — the Pricing section above it continues to function normally.

---

### Edge Cases

- What if `minPrice` equals `maxPrice`? → Display as a fixed price (`KD X.XXX`), not a range. Accept and save normally.
- What if a `ServiceType` value returned by the API is not recognized by the client? → Display the entry with the raw service type string rather than filtering it out or crashing.
- What if the owner submits a pricing entry for a service type they have already priced? → The API returns a conflict error. Show an inline error: "A pricing entry for this service already exists."
- What if the duration field is set to zero? → Show a validation error: "Duration must be at least 1 minute." Zero is not a meaningful duration value.
- What if the Trust Score API is slow or times out while the Pricing section is still loading? → The two sections load independently — a delay or failure in trust score data must not block or delay the pricing list.
- What if the owner tries to delete a pricing entry that is referenced in an open booking quote? → The API returns an error. Show an inline message explaining the entry cannot be deleted while it is in use.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Pricing screen listing all service pricing entries for the owner's center, accessible from the Profile tab.
- **FR-002**: Each pricing list item MUST display: Arabic service name, English service name, price range in KD with 3 decimal places, typical duration (if set), and active/paused status badge.
- **FR-003**: When the Pricing screen has no entries, it MUST display an empty state with a prompt to add the first pricing entry.
- **FR-004**: The Add Pricing form MUST include: service type selector (required), Arabic service name (required), English service name (required), minimum price (required, numeric), maximum price (required, numeric, ≥ minimum price), duration in minutes (optional), Arabic description (optional), English description (optional).
- **FR-005**: The app MUST validate that maximum price is greater than or equal to minimum price before submission and show an inline error if violated.
- **FR-006**: The app MUST validate all required fields before making any API call and show inline errors per field.
- **FR-007**: The Edit Pricing form MUST pre-populate all existing values and include an Active/Paused toggle.
- **FR-008**: The app MUST present a discard-changes confirmation when the owner navigates away from an edit form with unsaved changes.
- **FR-009**: The app MUST support deleting a pricing entry with a destructive confirmation dialog before proceeding.
- **FR-010**: On web browsers, error banners and confirmation dialogs MUST use inline UI elements — not native Alert dialogs, which have no effect in a web context.
- **FR-011**: All prices MUST be stored and displayed with exactly 3 decimal places in Kuwaiti Dinar format (e.g., `KD 15.500`).
- **FR-012**: The app MUST provide a Trust Badges screen displaying earned and locked badges with their criteria.
- **FR-013**: The "Verified Pricing" badge MUST be shown as earned when the center has at least one active pricing entry.
- **FR-014**: The Trust Badges section MUST load independently from the Pricing section — a failure in one MUST NOT affect the other.
- **FR-015**: All user-facing strings MUST be delivered via i18n keys — zero hardcoded display strings in any Phase 3.5 screen.

### Key Entities

- **ServicePricingEntry**: Represents a single priced service offered by the center. Contains the service category, a bilingual name pair (Arabic + English), a price range (minimum and maximum in KD), an optional typical duration, an optional bilingual description, and an active/paused status flag.
- **TrustBadge**: Represents a quality achievement signal. Contains a badge type, earned status, the date it was earned (if applicable), and localized display name and unlock criteria text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Pricing screen loads and displays all entries within 2 seconds on a standard mobile connection.
- **SC-002**: A center owner can add a new pricing entry from tapping "+" to seeing it confirmed in the list in under 90 seconds.
- **SC-003**: All prices in the app display with exactly 3 decimal places — no rounding or truncation artifacts (e.g., `KD 15.500`, never `KD 15.5`).
- **SC-004**: The Pricing and Trust Badges screens render correctly in both Arabic (right-to-left) and English (left-to-right) without layout breaks.
- **SC-005**: 100% of user-facing strings in Phase 3.5 screens use i18n keys — confirmed by zero hardcoded Arabic or English display strings in the new screen files.
- **SC-006**: The "Verified Pricing" badge status accurately reflects whether the center has at least one active pricing entry — no stale or incorrect badge state.

## Assumptions

- The backend API for service pricing (list, create, update, delete at `/centers/my/pricing`) is deployed and available before mobile implementation begins.
- The service type values used for pricing match the existing service type options already defined in the system — no new service types are introduced in this phase.
- Trust badge data is served by a backend endpoint. If that endpoint is not yet available, the Trust Badges screen shows a "Coming Soon" placeholder without blocking the pricing feature.
- Prices are stored on the backend as decimal values with 3 decimal places — no currency conversion is needed.
- Pausing a pricing entry does not affect any in-progress bookings or open quotes — it only affects future customer-facing visibility.
- The Pricing screen is added to the Profile tab — no new bottom navigation tab is introduced in this phase.
- i18n translation keys for the `pricing` and `trustBadge` namespaces are added to both Arabic and English locale files as part of this phase.
