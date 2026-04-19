# Feature Specification: Phase 4.0 — Work Progress & Quotes

**Feature Branch**: `phase-4.0-work-progress-and-quotes`
**Created**: 2026-04-15
**Status**: Draft
**Phase**: 4.0 of 10

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Update Work Stage (Priority: P1)

A center owner opens a booking detail screen. They see the current work stage (e.g., "Car Received"). A "Update Stage" button shows only the stages the booking can legally transition to next — not all stages. The owner selects the next stage, adds an optional note for the customer, and confirms. The customer is notified automatically by the backend.

**Why this priority**: Real-time work stage visibility is the core of the "Deep Trust" initiative. Customers who can track their repair's progress cancel less and rate higher.

**Independent Test**: Open a booking in `RECEIVED` stage → tap "Update Stage" → only "Diagnosing" is shown as the next option → select it → stage updates to `DIAGNOSING` on the booking detail.

**Acceptance Scenarios**:

1. **Given** a booking with a current work stage, **When** the owner opens the booking detail, **Then** the current stage is displayed with its label in the active locale (Arabic or English).
2. **Given** a booking in `RECEIVED` stage, **When** the owner taps "Update Stage", **Then** only `DIAGNOSING` is shown as the available next stage (per `WORK_STAGES` transition map).
3. **Given** a stage selector, **When** the owner selects a stage and taps "Confirm", **Then** a note-for-customer input field appears (optional, max 500 chars), followed by a "Save" button.
4. **Given** a valid stage transition, **When** the owner taps "Save", **Then** the API call is made (`PUT /bookings/{id}/work-stage`) and the booking detail reflects the new stage.
5. **Given** the stage is `PICKED_UP`, **When** the booking detail is viewed, **Then** the "Update Stage" button is hidden — there are no further transitions.
6. **Given** the stage selector in Arabic, **When** rendered, **Then** stage names use `displayNameAr` and layout is RTL.
7. **Given** an API failure during stage update, **When** the request fails, **Then** an inline error banner is shown and the stage remains unchanged in the UI.

---

### User Story 2 — Add Work Progress Update with Photos (Priority: P1)

From a booking's Progress tab, the center owner taps "Add Update". They enter notes for the customer, optional internal notes (not visible to the customer), and can attach up to 5 photos. Photos can be taken with the camera or selected from the library. On save, the progress entry is posted and the photo(s) are uploaded.

**Why this priority**: Progress photos are the most powerful trust signal in an auto repair context. A photo of the repaired part eliminates customer doubt and pre-empts disputes.

**Independent Test**: Add a progress update with 2 photos → save → progress timeline shows the new entry with the note and both photos as thumbnails.

**Acceptance Scenarios**:

1. **Given** the booking Progress tab, **When** the owner taps "Add Update", **Then** a form appears with: stage selector (optional override), notes for customer (optional, max 500 chars), internal notes (optional, not customer-visible), photo uploader (max 5 photos).
2. **Given** the photo uploader, **When** the owner taps "Add Photo", **Then** a bottom sheet offers two options: "Camera" and "Gallery".
3. **Given** 5 photos already attached, **When** the owner tries to add a 6th, **Then** the "Add Photo" button is disabled and a message shows "Maximum 5 photos reached."
4. **Given** a valid progress update (with or without photos), **When** the owner taps "Save", **Then** the progress entry is submitted via `POST /bookings/{id}/work-progress` (multipart/form-data) and appears in the progress timeline.
5. **Given** a progress update with photos, **When** submitted, **Then** each photo is individually uploaded via `POST /bookings/{id}/media` — a per-photo progress indicator shows the upload status.
6. **Given** a photo upload failure, **When** one photo fails to upload, **Then** a retry button is shown on the failed photo thumbnail — other photos are not affected.
7. **Given** the form in Arabic locale, **When** rendered, **Then** all labels are in Arabic with RTL layout.

---

### User Story 3 — View Progress Timeline (Priority: P1)

A center owner opens a booking's Progress tab. They see a chronological timeline of all work progress updates: each entry shows the stage, notes for customer, internal notes (visible only to the center), photo thumbnails, timestamp, and the staff member who created the update. Tapping a photo thumbnail opens it in a full-screen viewer.

**Why this priority**: Without a timeline view, progress updates become isolated and lose their sequential narrative value.

**Independent Test**: Open a booking's Progress tab → see all progress entries in order; tap a photo thumbnail → full-screen photo viewer opens.

**Acceptance Scenarios**:

1. **Given** a booking with progress entries, **When** the Progress tab is opened, **Then** all entries are shown in chronological order (oldest first), each with: stage badge, notes (if any), photo thumbnails (if any), timestamp, and author name.
2. **Given** a progress entry with internal notes, **When** displayed, **Then** internal notes are shown with a "Internal only" label — the owner can see them; customers cannot.
3. **Given** a photo thumbnail in the timeline, **When** tapped, **Then** it opens in a full-screen image viewer with a close button and swipe navigation between photos in the same entry.
4. **Given** no progress entries, **When** the Progress tab loads, **Then** an empty state is shown: "No progress updates yet. Add the first update to keep your customer informed."
5. **Given** the progress timeline in Arabic, **When** rendered, **Then** stage labels use Arabic display names and layout is RTL.

---

### User Story 4 — Create a Quote (Priority: P1)

From a booking detail, a center owner taps "Create Quote". They fill in a dynamic list of line items, each with a description, parts cost, and labor cost. They can add or remove line items. The form shows a live-calculated subtotal, optional discount amount, and total (in KD, 3 decimal places). They save the quote as a draft.

**Why this priority**: A structured quote replaces ad-hoc price negotiations in chat, reduces disputes, and builds pricing trust. It is the most requested feature for the Phase 4.0 trust initiative.

**Independent Test**: Create a quote with 2 line items, a discount, and a note → save as draft → the quote appears in the booking's Quotes tab with the correct total.

**Acceptance Scenarios**:

1. **Given** the Create Quote screen, **When** it opens, **Then** it shows: a dynamic line items list (minimum 1), a discount amount field (optional), a discount reason field (optional), an estimated duration field (optional), notes for customer (optional), Arabic notes (optional).
2. **Given** a line item, **Then** it MUST contain: description (required), Arabic description (optional), parts cost (KD, required, numeric ≥ 0), labor cost (KD, required, numeric ≥ 0).
3. **Given** the form, **When** the owner taps "Add Line Item", **Then** a new empty line item row is appended to the list.
4. **Given** a line item, **When** the owner taps "Remove" (only shown when there are ≥ 2 items), **Then** that line item is removed from the list.
5. **Given** any change to line items or discount, **When** values change, **Then** the subtotal and total update in real time: `subtotal = Σ(partsCost + laborCost)`, `total = subtotal − discountAmount`.
6. **Given** a valid form, **When** the owner taps "Save as Draft", **Then** the quote is created via `POST /bookings/{id}/quotes` with status `DRAFT` and the booking Quotes tab shows the new quote.
7. **Given** a form with no line items passing validation, **When** the owner tries to save, **Then** a validation error is shown: "At least one line item is required."

---

### User Story 5 — Send Quote to Customer (Priority: P1)

From the Quotes tab, a center owner reviews a draft quote and taps "Send to Customer". A confirmation dialog summarizes the total. On confirm, the quote is sent to the customer, its status changes to `SENT`, and the customer receives a push notification. The owner can no longer edit this quote version — they must create a revised quote if changes are needed.

**Why this priority**: The send action is the critical handoff moment. The customer must approve or reject the quote for the workflow to continue.

**Independent Test**: Open a `DRAFT` quote → tap "Send to Customer" → confirm → quote status changes to `SENT`; the "Send" button is replaced with a `SENT` status badge.

**Acceptance Scenarios**:

1. **Given** a quote with status `DRAFT`, **When** the owner views it, **Then** a "Send to Customer" button is visible.
2. **Given** the "Send to Customer" button is tapped, **When** tapped, **Then** a confirmation dialog shows: total amount in KD and "Are you sure you want to send this quote to the customer?"
3. **Given** the confirmation, **When** confirmed, **Then** the API call is made (`POST /bookings/{id}/quotes/{qid}/send`) and the quote status changes to `SENT`.
4. **Given** a `SENT` quote, **When** displayed, **Then** the "Send" button is hidden and a `SENT` status badge is shown. An "Edit / Revise" action is available to create a new version.
5. **Given** a quote with status `APPROVED`, **When** displayed, **Then** it shows: total, line items, and an `APPROVED` badge with the approval timestamp.
6. **Given** a quote with status `REJECTED`, **When** displayed, **Then** it shows a `REJECTED` badge, the customer's rejection notes (if any), and a "Create Revised Quote" button.
7. **Given** an API failure during send, **When** the request fails, **Then** an inline error banner is shown and the quote remains in `DRAFT` status.

---

### Edge Cases

- What if the center owner tries to update the stage of a booking that was cancelled? → The "Update Stage" button is hidden for `CANCELLED` bookings. If the API is called directly and returns an error, show an inline error.
- What if a photo selected by the owner exceeds 10 MB? → Show an error before upload: "Photo is too large. Maximum size is 10 MB." The photo is removed from the selection.
- What if the owner uploads a photo and then navigates away before saving the progress update? → Show a discard-changes confirmation dialog. Pending (unsaved) photos are discarded — they are not uploaded until the form is saved.
- What if a quote's `discountAmount` exceeds the `subtotal`? → Show a validation error: "Discount cannot exceed the subtotal." Block form submission.
- What if the customer has already approved a quote and the owner tries to send a revised one? → The booking already has an `APPROVED` quote. A revised quote must go through the same send-and-approval flow. The backend enforces quote versioning.
- What if the WebSocket is disconnected while the customer is reviewing a quote? → Quote approval/rejection is a REST action — it does not depend on WebSocket connectivity. The owner will see the status update on the next page load or pull-to-refresh.
- What if a work stage transition fails because another staff member already progressed it? → The API returns a conflict error. Show an inline error: "Stage has already been updated. Please refresh." and reload the booking.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The booking detail MUST display the current work stage with its localized name (Arabic or English based on active locale).
- **FR-002**: The "Update Stage" button MUST only show legally reachable next stages from the current stage, derived from the `WORK_STAGES` transition map.
- **FR-003**: Stage transitions MUST call `PUT /bookings/{id}/work-stage` with the selected stage and optional customer note.
- **FR-004**: The booking MUST have a "Progress" tab showing all `BookingWorkProgress` entries in chronological order.
- **FR-005**: Each progress timeline entry MUST display: stage badge, customer notes, internal notes (owner-only, labeled), photo thumbnails, timestamp, author name.
- **FR-006**: The "Add Progress Update" form MUST support: stage (optional), customer notes, internal notes, and up to 5 photo attachments.
- **FR-007**: Photos MUST be selectable from the camera (`expo-camera`) or gallery (`expo-image-picker`).
- **FR-008**: The app MUST enforce a maximum of 5 photos per progress update entry.
- **FR-009**: Each photo upload MUST show individual progress indicators and independent retry on failure.
- **FR-010**: Tapping a photo thumbnail in the timeline MUST open a full-screen viewer with swipe navigation.
- **FR-011**: The booking MUST have a "Quotes" tab showing all `BookingQuote` entries with their status badges.
- **FR-012**: The "Create Quote" form MUST support: dynamic line items (min 1), discount amount, discount reason, estimated duration, customer notes, Arabic notes.
- **FR-013**: Each line item MUST have: description (required), Arabic description (optional), parts cost (required, numeric), labor cost (required, numeric).
- **FR-014**: Subtotal and total MUST update in real time as line items or discount values change.
- **FR-015**: Amounts MUST be displayed with exactly 3 decimal places in KD format.
- **FR-016**: Saving a quote MUST call `POST /bookings/{id}/quotes` — the quote starts with `DRAFT` status.
- **FR-017**: Sending a quote MUST require a confirmation dialog and call `POST /bookings/{id}/quotes/{qid}/send`.
- **FR-018**: A `SENT` quote MUST NOT have an editable form — only a "Create Revised Quote" action.
- **FR-019**: On web (`Platform.OS === 'web'`), confirmation dialogs MUST use `window.confirm` — not `Alert.alert`.
- **FR-020**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **BookingWorkProgress**: `id`, `stage` (`WorkStage` enum), `notes` (customer-visible), `notesAr`, `internalNotes` (owner-only), `photoUrl`, `videoUrl`, `estimatedMinutesRemaining`, `createdAt`, `createdByName`.
- **WorkStage**: `RECEIVED` → `DIAGNOSING` → `QUOTE_READY` → `QUOTE_APPROVED | QUOTE_REJECTED` → `PARTS_ORDERED` → `PARTS_RECEIVED` → `WORK_IN_PROGRESS` → `QUALITY_CHECK` → `READY_FOR_PICKUP` → `PICKED_UP` (see `WORK_STAGES` transition map in CLAUDE.md).
- **BookingMedia**: `id`, `mediaType` (PHOTO | VIDEO), `category` (`MediaCategory` enum), `url`, `thumbnailUrl`, `caption`, `captionAr`, `isVisibleToCustomer`, `createdAt`.
- **BookingQuote**: `id`, `bookingId`, `version`, `lineItems` (`QuoteLineItem[]`), `subtotal`, `discountAmount`, `discountReason`, `taxAmount`, `totalAmount`, `estimatedDurationMinutes`, `notes`, `notesAr`, `status` (DRAFT | SENT | APPROVED | REJECTED | REVISED), `sentAt`, `respondedAt`, `responseNotes`, `createdAt`.
- **QuoteLineItem**: `description`, `descriptionAr`, `partsCost`, `laborCost`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A work stage transition is reflected in the booking detail within 1 second of the API response.
- **SC-002**: A center owner can add a progress update with 3 photos in under 3 minutes from tapping "Add Update".
- **SC-003**: Photo thumbnails load in the progress timeline within 2 seconds on a standard 4G connection.
- **SC-004**: Creating and saving a quote with 3 line items takes under 2 minutes.
- **SC-005**: The live subtotal/total calculation updates within 100ms of any input change — no visible lag.
- **SC-006**: All progress and quote screens render correctly in both Arabic (RTL) and English (LTR).
- **SC-007**: 100% of user-facing strings use i18n keys — zero hardcoded strings in any Phase 4.0 screen.
- **SC-008**: Only legally valid next stages appear in the stage selector — no invalid transitions are ever presented to the user.

---

## Assumptions

- Backend endpoints for work progress and quotes (`PUT /work-stage`, `POST/GET /work-progress`, `POST/GET /media`, `GET/POST /quotes`, `POST /quotes/{id}/send`) are built and deployed before this phase is implemented on the mobile side.
- The `WORK_STAGES` transition map is authoritative on the client — the backend also enforces valid transitions and returns a 422 if an invalid transition is attempted.
- Photos are uploaded as `multipart/form-data` — the backend stores them and returns a URL. The app does not handle image storage directly.
- Video upload for work progress is out of scope for this phase — photos only.
- `MediaCategory` enum values are known upfront and match the backend enum.
- Quote versioning is handled by the backend — `version` increments on each revision.
- The customer's quote approval/rejection (on the customer app) changes the quote `status` field — the center owner app polls for this via the Quotes tab or receives a push notification.
- Tax calculation (`taxAmount`) is computed server-side — the client displays it but does not compute it.
- i18n keys for the `progress.*`, `quote.*`, and `workStage.*` namespaces are added to both `en.json` and `ar.json` as part of this phase (keys defined in CLAUDE.md Phase 4.0 i18n section).
- React Hook Form + Zod is used for the QuoteBuilder form — the `useFieldArray` hook manages dynamic line items.
