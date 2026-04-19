# Feature Specification: Phase 2 — Booking Management

**Feature Branch**: `phase-2-booking-management`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 2 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View All Bookings with Filters (Priority: P1)

A center owner opens the Bookings tab. They see a list of all bookings for their center, organized with the most time-sensitive (pending requests) at the top. They can filter by status: Pending, Active (In Progress), Completed, Cancelled. The list shows enough information per item (customer name, service type, scheduled date/time, status) to prioritize actions without tapping into the detail.

**Why this priority**: Booking management is the core operational loop of the center owner's day. Without it, the app has no operational value.

**Independent Test**: Navigate to the Bookings tab → should see a list of bookings with status badges; applying "Pending" filter should show only pending bookings.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Bookings tab, **Then** all bookings for their center are listed, sorted by scheduled date/time descending.
2. **Given** the bookings list, **When** the owner taps a filter tab (Pending / Active / Completed / Cancelled), **Then** the list updates to show only bookings of that status.
3. **Given** the bookings list, **When** there are no bookings matching the active filter, **Then** an empty-state illustration and message are shown ("No bookings yet" / "No pending requests").
4. **Given** a booking list item, **Then** it MUST display: customer name, service type, scheduled date and time, booking status badge, and payment method.
5. **Given** a long list, **When** the owner scrolls, **Then** the list paginates (loads next page) seamlessly without full-screen reload.
6. **Given** the bookings list in Arabic, **When** rendered, **Then** all labels, dates, and status badges appear in Arabic with RTL layout.

---

### User Story 2 — View Booking Detail (Priority: P1)

A center owner taps a booking in the list. They see the full booking detail: customer information, service requested, scheduled date/time, notes from the customer, payment method, payment status, and current booking status. From this screen they can take actions based on status.

**Why this priority**: Owners need the full context of a booking before taking any action on it.

**Independent Test**: Tap any booking in the list → detail screen should show all booking fields without errors.

**Acceptance Scenarios**:

1. **Given** a booking in the list, **When** the owner taps it, **Then** a detail screen opens showing: customer full name, customer phone number, service type, scheduled date/time, customer notes, payment method, payment status, and booking status.
2. **Given** a booking with a `PENDING` status, **When** the detail screen opens, **Then** "Accept" and "Reject" action buttons are displayed.
3. **Given** a booking with an `ACCEPTED` status, **When** the detail screen opens, **Then** a "Mark as In Progress" action button is displayed.
4. **Given** a booking with an `IN_PROGRESS` status, **When** the detail screen opens, **Then** a "Mark as Completed" action button is displayed.
5. **Given** a `COMPLETED` or `CANCELLED` booking, **When** the detail screen opens, **Then** no action buttons are shown — the booking is read-only.

---

### User Story 3 — Accept or Reject a Pending Booking (Priority: P1)

From the booking detail screen, a center owner taps "Accept" to confirm they will handle the booking. Alternatively, they tap "Reject" and must provide a reason from a predefined list. The booking status updates in real time and the customer is notified (via backend).

**Why this priority**: Responding to pending bookings is the most time-sensitive action in the entire app. Delayed responses hurt customer trust and platform reputation.

**Independent Test**: Tap "Accept" on a pending booking → status changes to ACCEPTED in the detail view and the booking moves out of the Pending filter.

**Acceptance Scenarios**:

1. **Given** a PENDING booking, **When** the owner taps "Accept", **Then** a confirmation dialog appears asking "Confirm acceptance of this booking?".
2. **Given** the confirmation dialog, **When** the owner confirms, **Then** the booking status updates to ACCEPTED, the detail screen reflects the new status, and a success toast is shown.
3. **Given** a PENDING booking, **When** the owner taps "Reject", **Then** a bottom sheet appears with a list of rejection reasons: "Fully Booked", "Service Not Available", "Outside Service Area", "Other".
4. **Given** the rejection bottom sheet, **When** the owner selects a reason and confirms, **Then** the booking status updates to CANCELLED, the rejection reason is recorded, and a success toast is shown.
5. **Given** a rejection reason of "Other", **When** selected, **Then** a free-text field appears for the owner to enter a custom reason (max 200 characters).
6. **Given** a network failure during accept/reject, **When** the action is submitted, **Then** an error toast is shown and the booking status remains unchanged.

---

### User Story 4 — Progress a Booking (In Progress → Completed) (Priority: P2)

Once a customer arrives and the work begins, the owner taps "Mark as In Progress". When the work is done, they tap "Mark as Completed". These status transitions keep both parties informed and close the booking lifecycle.

**Why this priority**: Booking lifecycle completeness is required for the backend to track revenue and for customers to leave reviews.

**Independent Test**: Mark an ACCEPTED booking as In Progress → status changes; then mark it Completed → booking appears in Completed filter.

**Acceptance Scenarios**:

1. **Given** an ACCEPTED booking, **When** the owner taps "Mark as In Progress", **Then** a confirmation dialog appears.
2. **Given** the confirmation, **When** confirmed, **Then** the status updates to IN_PROGRESS and the action button changes to "Mark as Completed".
3. **Given** an IN_PROGRESS booking, **When** the owner taps "Mark as Completed", **Then** a confirmation dialog appears.
4. **Given** the confirmation, **When** confirmed, **Then** the status updates to COMPLETED and no further action buttons are shown.
5. **Given** completing a booking, **When** the status update succeeds, **Then** the booking moves to the Completed filter and a success toast is shown.

---

### User Story 5 — Pull-to-Refresh Bookings (Priority: P2)

The center owner can pull down on the bookings list to manually refresh and see the latest bookings. This is important when new booking requests come in while the app is open.

**Why this priority**: New bookings arrive in real time from the customer app. Without a refresh mechanism, the owner won't see them until they re-navigate.

**Independent Test**: Pull down on the bookings list → spinner appears → list updates with latest data.

**Acceptance Scenarios**:

1. **Given** the bookings list, **When** the owner pulls down, **Then** a loading spinner appears and the list refreshes with the latest data from the API.
2. **Given** a refresh while offline, **When** the owner pulls down, **Then** an error toast appears ("Could not refresh — check your connection") and the existing list remains.

---

### Edge Cases

- What if a booking's scheduled time has passed but status is still PENDING? → Display a "Overdue" warning badge on the booking card and detail screen.
- What if two staff members accept the same booking simultaneously? → The backend handles this with optimistic locking; the app should show "This booking was already actioned" and refresh the status.
- What if the customer cancels after the owner accepts? → The booking status will already be CANCELLED when the owner views it — show a banner "Customer cancelled this booking".
- What if the booking has no customer phone number? → The phone field is hidden on the detail screen — do not show an empty placeholder.
- What if there are more than 100 bookings? → Use infinite scroll / pagination — never load all at once.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display a bookings list tab accessible from the bottom navigation.
- **FR-002**: The app MUST load bookings scoped to the authenticated owner's center only.
- **FR-003**: The app MUST provide filter tabs for: All, Pending, Active (In Progress), Completed, Cancelled.
- **FR-004**: The bookings list MUST display per item: customer name, service type, scheduled date/time, status badge, payment method.
- **FR-005**: The app MUST support pull-to-refresh on the bookings list.
- **FR-006**: The bookings list MUST paginate — load more on scroll, not all at once.
- **FR-007**: The app MUST navigate to a booking detail screen on list item tap.
- **FR-008**: The booking detail screen MUST display all booking fields: customer name, phone, service type, scheduled date/time, customer notes, payment method, payment status, booking status.
- **FR-009**: The app MUST show action buttons on the detail screen based on the current booking status (PENDING → Accept/Reject; ACCEPTED → In Progress; IN_PROGRESS → Complete).
- **FR-010**: Accepting a booking MUST require a confirmation dialog before the API call is made.
- **FR-011**: Rejecting a booking MUST require the owner to select a rejection reason before submission.
- **FR-012**: The rejection reason "Other" MUST reveal a free-text input field (max 200 characters).
- **FR-013**: All status transitions MUST be reflected immediately in the UI after a successful API response.
- **FR-014**: Network errors during status transitions MUST show an error toast — the booking state MUST NOT be updated locally on failure.
- **FR-015**: Overdue pending bookings (past their scheduled time) MUST display a visual "Overdue" indicator.
- **FR-016**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **Booking**: ID, customer name, customer phone, service type (`ServiceType` enum), scheduled date/time, customer notes, payment method (`PaymentMethod` enum), payment status (`PaymentStatus` enum), status (`BookingStatus` enum), center ID.
- **BookingStatus**: PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED (existing backend enum).
- **RejectionReason**: Predefined list — Fully Booked, Service Not Available, Outside Service Area, Other + free text.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The bookings list loads within 2 seconds on a standard 4G connection.
- **SC-002**: An owner can accept or reject a booking in under 10 seconds from tapping the booking in the list.
- **SC-003**: Status transitions are reflected in the UI within 1 second of the API response.
- **SC-004**: The bookings list and detail screen render correctly in both Arabic (RTL) and English (LTR).
- **SC-005**: Pagination works correctly — lists of 50+ bookings load progressively with no UI freeze.
- **SC-006**: 100% of user-facing strings in this phase use i18n keys.

---

## Assumptions

- The backend provides a `GET /api/v1/bookings?centerId=&status=&page=&size=` endpoint for paginated booking retrieval.
- The backend provides `PATCH /api/v1/bookings/{id}/status` or equivalent endpoints for status transitions.
- The rejection reason is passed as a field on the status update request.
- Customer phone numbers may not always be populated — the UI must handle null gracefully.
- Real-time push notifications for new bookings are out of scope for Phase 2 (handled in Phase 7).
- The owner cannot edit booking details (date, service type) — only status transitions are allowed.
- Payment processing is handled by the backend and payment gateway — this app only displays payment status.
