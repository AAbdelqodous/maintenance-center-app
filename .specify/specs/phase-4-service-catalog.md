# Feature Specification: Phase 4 — Service Catalog Management

**Feature Branch**: `phase-4-service-catalog`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 4 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Service Catalog (Priority: P1)

A center owner opens the Services section (accessible from the Profile tab or a dedicated menu). They see a list of all services their center currently offers, grouped by category. Each service shows its name (Arabic + English), price, estimated duration, and whether it is active or paused. This gives them a quick inventory of what their center is selling.

**Why this priority**: The service catalog is what customers browse when choosing a center. An incomplete or inaccurate catalog directly reduces bookings.

**Independent Test**: Navigate to Services → see all active services listed with name, price, duration, and status.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Services screen, **Then** all services for their center are listed, grouped by service category.
2. **Given** a service in the list, **Then** it MUST display: Arabic name, English name, price in KD (3 decimal places), estimated duration (in minutes), category, and active/paused status badge.
3. **Given** no services configured yet, **When** the screen loads, **Then** an empty-state illustration with "No services added yet. Tap '+' to add your first service." is shown.
4. **Given** a paused service, **When** displayed in the list, **Then** it is visually dimmed and labeled "Paused" to distinguish it from active services.
5. **Given** the services list in Arabic, **When** rendered, **Then** Arabic names are shown and the layout is RTL.

---

### User Story 2 — Add a New Service (Priority: P1)

A center owner taps the "+" button and is taken to a form to add a new service to their catalog. They enter the service name in Arabic and English, select a category, set a price, and set an estimated duration. On save, the service appears in their catalog and becomes bookable by customers.

**Why this priority**: Adding services is the fundamental way an owner populates their catalog. Without this, the center cannot be booked.

**Independent Test**: Add a service with all required fields → save → service appears in the catalog list and is marked as Active.

**Acceptance Scenarios**:

1. **Given** the add service form, **Then** it MUST contain: Arabic name (required), English name (required), category (required — dropdown from existing categories), price in KD (required, numeric, min 0.000), estimated duration in minutes (required, numeric, min 1), description in Arabic (optional), description in English (optional), active toggle (defaults to ON).
2. **Given** a missing required field, **When** the owner taps "Save", **Then** inline validation errors appear and no API call is made.
3. **Given** a price field with a non-numeric value, **When** validated, **Then** an inline error is shown: "Price must be a valid number".
4. **Given** a valid form, **When** the owner taps "Save", **Then** the service is created via the API and appears in the catalog list.
5. **Given** a save failure, **When** the API returns an error, **Then** an error toast is shown and the form remains open with entered data intact.
6. **Given** the add service form in Arabic, **When** rendered, **Then** all labels and placeholders appear in Arabic with RTL layout.

---

### User Story 3 — Edit an Existing Service (Priority: P1)

A center owner taps a service in their catalog to edit it. The edit form is pre-populated with the existing values. They can change any field and save. On save, the service details are updated on the backend and the catalog list reflects the changes.

**Why this priority**: Prices, durations, and descriptions change over time. Owners need to keep their catalog accurate.

**Independent Test**: Edit a service's price → save → service in the catalog list shows the updated price.

**Acceptance Scenarios**:

1. **Given** a service in the catalog, **When** the owner taps it, **Then** the edit form opens with all existing values pre-populated.
2. **Given** the edit form, **When** the owner changes any field and taps "Save", **Then** the service is updated via the API and the catalog list reflects the changes.
3. **Given** the owner changes data and then taps the back button, **When** they have unsaved changes, **Then** a discard-changes confirmation dialog appears.
4. **Given** a save failure, **When** the API returns an error, **Then** an error toast is shown and the form remains open.

---

### User Story 4 — Pause or Activate a Service (Priority: P2)

A center owner can temporarily pause a service without deleting it. A paused service is not shown to customers in the booking flow. They can also reactivate a paused service. This is useful for seasonal services or when a technician for a specific service is unavailable.

**Why this priority**: Pausing prevents customers from booking a service the center cannot currently fulfill, reducing cancellations and bad reviews.

**Independent Test**: Pause an active service → it shows "Paused" in the catalog and is no longer bookable; activate it → it shows "Active" again.

**Acceptance Scenarios**:

1. **Given** an active service, **When** the owner toggles its status to "Paused" (either inline on the list or in the edit form), **Then** a confirmation dialog appears: "Pause this service? It will no longer be visible to customers."
2. **Given** the confirmation, **When** confirmed, **Then** the service status changes to Paused and the visual badge updates.
3. **Given** a paused service, **When** the owner toggles it back to "Active", **Then** the service becomes visible to customers again.
4. **Given** the status toggle action, **When** the API call fails, **Then** the toggle reverts to its previous state and an error toast is shown.

---

### User Story 5 — Delete a Service (Priority: P2)

A center owner can permanently delete a service from their catalog. If the service has been used in past bookings, it is soft-deleted (marked as deleted) rather than hard-deleted — historical bookings still reference it correctly.

**Why this priority**: Catalog hygiene — owners need to remove services they no longer offer at all, not just pause them.

**Independent Test**: Delete a service → it no longer appears in the catalog list; past bookings referencing it still display the service name correctly.

**Acceptance Scenarios**:

1. **Given** a service in the edit form, **When** the owner taps "Delete Service", **Then** a destructive confirmation dialog appears: "Delete this service permanently? This cannot be undone."
2. **Given** the confirmation, **When** confirmed, **Then** the service is removed from the catalog list.
3. **Given** a service has associated bookings, **When** deleted, **Then** the service is soft-deleted and existing bookings continue to display the service name correctly.
4. **Given** the delete action fails, **When** the API returns an error, **Then** an error toast is shown and the service remains in the list.

---

### Edge Cases

- What if the category list is empty (no categories configured by admin)? → Disable the "Add Service" button and show a message: "Service categories are not yet configured. Contact support."
- What if the price is entered as 0? → Allow it (free services are valid), but show a confirmation: "You are setting this service as free. Continue?"
- What if the owner tries to save duplicate service names (same Arabic + English)? → Backend returns a conflict error — show: "A service with this name already exists."
- What if the duration is set to more than 480 minutes (8 hours)? → Show a warning (not a hard block): "Duration is unusually long. Please confirm this is correct."
- What if a service is actively being booked while the owner pauses it? → Existing in-progress bookings are not affected. Only new bookings are blocked.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Services screen listing all services for the owner's center, grouped by category.
- **FR-002**: Each service list item MUST display: Arabic name, English name, price (KD, 3 decimals), duration (minutes), category, status badge (Active/Paused).
- **FR-003**: Paused services MUST be visually distinct from active services (dimmed, labeled).
- **FR-004**: The app MUST provide an "Add Service" form with fields: Arabic name (required), English name (required), category (required dropdown), price (required, numeric), duration in minutes (required, numeric), Arabic description (optional), English description (optional), active toggle.
- **FR-005**: The app MUST validate all required fields before making an API call.
- **FR-006**: The app MUST pre-populate the edit form with existing service values.
- **FR-007**: The app MUST warn with a discard-changes dialog when navigating away from an unsaved form.
- **FR-008**: The app MUST support pausing and activating a service, with a confirmation dialog for the pause action.
- **FR-009**: Status toggle failures MUST revert the UI to the previous state and show an error toast.
- **FR-010**: The app MUST support deleting a service with a destructive confirmation dialog.
- **FR-011**: The category dropdown MUST be populated from the backend's service categories list.
- **FR-012**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **Service** (to be built on backend): ID, nameAr, nameEn, descriptionAr, descriptionEn, price (decimal, 3 places), durationMinutes, category (FK → ServiceCategory), isActive, centerId, isDeleted.
- **ServiceCategory**: ID, nameAr, nameEn (existing backend entity).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The service catalog loads within 2 seconds on a standard 4G connection.
- **SC-002**: A center owner can add a new service in under 90 seconds.
- **SC-003**: Pausing or activating a service takes effect within 1 second of the API response.
- **SC-004**: All Services screens render correctly in both Arabic (RTL) and English (LTR).
- **SC-005**: 100% of user-facing strings in this phase use i18n keys.
- **SC-006**: Deleted services do not appear in the catalog but their names remain visible in historical booking records.

---

## Assumptions

- The backend will build a Services CRUD API as part of this phase (not yet implemented).
- Service categories are managed by the platform admin — center owners cannot create or edit categories.
- A center can have an unlimited number of services.
- Price is stored as a decimal with 3 places (KD convention).
- The active toggle is the owner-controlled visibility flag; the platform admin has a separate flag to enable/disable a service globally.
- Booking-in-progress detection for paused services is handled server-side — the app does not need to check this.
- Photo upload per service (e.g., a service photo) is out of scope for this phase.
