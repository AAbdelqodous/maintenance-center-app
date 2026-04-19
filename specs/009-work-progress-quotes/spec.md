# Feature Specification: Phase 4.0 — Work Progress & Quotes

**Feature Branch**: `003-work-progress-quotes`
**Created**: 2026-04-16
**Status**: ✅ Implemented
**Input**: User description: "Phase 4.0 work progress and quotes: center owners update repair work stages with photos, add progress timeline updates visible to customers, create quote line items with parts and labor costs, and send quotes to customers for approval"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Advance a Booking Through Repair Stages (Priority: P1)

A center owner opens a booking detail screen. They see the current repair stage — for example, "Car Received". A button shows only the stages that this booking can legally move to next — not a full list of all stages. The owner selects the next stage, optionally types a note for the customer, and confirms. The booking detail immediately reflects the updated stage and the customer receives an automatic notification.

**Why this priority**: Real-time repair stage visibility is the central goal of Phase 4.0. Customers who can track their repair's progress cancel fewer bookings, submit fewer complaints, and rate centers higher. Everything else in this phase builds on top of stage transitions.

**Independent Test**: Open a booking in the "Car Received" stage. Tap "Update Stage". Confirm only "Diagnosing" is available as the next step. Select it, add a note, confirm. Verify the booking detail now shows "Diagnosing" and the note is saved.

**Acceptance Scenarios**:

1. **Given** a booking with a current repair stage, **When** the owner opens the booking detail, **Then** the current stage is displayed with its name in the active language (Arabic or English).
2. **Given** a booking in "Car Received" stage, **When** the owner taps "Update Stage", **Then** only "Diagnosing" is offered as the available next stage — no other stages are shown.
3. **Given** a stage selector, **When** the owner selects a stage and confirms, **Then** an optional "Note for customer" text field appears (max 500 characters) before the final save action.
4. **Given** a valid stage selection, **When** the owner saves, **Then** the booking detail reflects the new stage and any customer note is visible in the progress timeline.
5. **Given** a booking in the final stage ("Picked Up"), **When** the booking detail is viewed, **Then** the "Update Stage" button is not shown — no further transitions are possible.
6. **Given** the stage selector in Arabic locale, **When** rendered, **Then** stage names appear in Arabic with right-to-left layout.
7. **Given** a stage update API failure, **When** the request fails, **Then** an inline error banner is shown and the booking stage remains unchanged in the UI.

---

### User Story 2 - Add a Progress Update with Photos (Priority: P1)

From a booking's Progress tab, a center owner taps "Add Update". They enter notes for the customer and optional internal notes that only center staff can see. They can attach up to 5 photos by taking them with the camera or selecting from their photo library. On saving, the progress entry and all photos are uploaded and appear in the timeline. Each photo shows an individual upload progress indicator.

**Why this priority**: Progress photos are the single most powerful trust signal in an auto repair context. A photo of the repaired part eliminates customer doubt and pre-empts billing disputes. The internal notes field enables staff coordination without exposing operational details to customers.

**Independent Test**: In the Add Update form, attach 2 photos, enter a customer note and an internal note. Save. Confirm: the progress timeline shows a new entry with the note, both photo thumbnails, the timestamp, and the internal note is labeled "Internal only."

**Acceptance Scenarios**:

1. **Given** the booking Progress tab, **When** the owner taps "Add Update", **Then** a form appears with: notes for customer (optional, max 500 characters), internal notes (optional, not visible to customers), and a photo attachment area.
2. **Given** the photo attachment area, **When** the owner taps "Add Photo", **Then** a menu offers two options: "Camera" and "Gallery".
3. **Given** 5 photos already attached to the form, **When** the owner tries to add a 6th, **Then** the "Add Photo" option is disabled and a message reads: "Maximum 5 photos reached."
4. **Given** a valid progress update, **When** the owner taps "Save", **Then** the progress entry is submitted and appears in the timeline with notes, photo thumbnails, author name, and timestamp.
5. **Given** a progress update with photos, **When** photos are uploading, **Then** each photo shows an individual upload progress indicator — photos upload independently of each other.
6. **Given** one photo fails to upload, **When** other photos succeed, **Then** the failed photo shows a retry button — only the failed photo is affected, not the others.
7. **Given** the form in Arabic locale, **When** rendered, **Then** all labels appear in Arabic with right-to-left layout.

---

### User Story 3 - View the Full Progress Timeline (Priority: P1)

A center owner opens a booking's Progress tab and sees a chronological timeline of all work updates: each entry shows the repair stage at the time of the update, customer-facing notes, internal notes (labeled "Internal only"), photo thumbnails, the timestamp, and the name of the staff member who added the update. Tapping a photo opens it in a full-screen viewer with swipe navigation between photos in the same entry.

**Why this priority**: Without a timeline view, individual progress updates lose their sequential narrative value. The timeline is also the reference center staff use to hand off a job or reconstruct what happened during a repair.

**Independent Test**: Open a booking with 3 progress entries. Confirm they appear in chronological order (oldest first). Tap a photo thumbnail. Confirm a full-screen viewer opens. Swipe to confirm navigation between photos in the same entry.

**Acceptance Scenarios**:

1. **Given** a booking with progress entries, **When** the Progress tab is opened, **Then** all entries appear in chronological order (oldest first), each showing: stage badge, customer notes (if any), photo thumbnails (if any), timestamp, and author name.
2. **Given** a progress entry with internal notes, **When** displayed, **Then** the internal notes section is labeled "Internal only" — it is visible to center owners but not to customers in the customer app.
3. **Given** a photo thumbnail in the timeline, **When** tapped, **Then** it opens in a full-screen image viewer with a close button and swipe navigation between photos in the same progress entry.
4. **Given** a booking with no progress entries yet, **When** the Progress tab loads, **Then** an empty state is shown: "No progress updates yet. Add the first update to keep your customer informed."
5. **Given** the progress timeline in Arabic locale, **When** rendered, **Then** stage labels use Arabic names and layout is right-to-left.

---

### User Story 4 - Create a Quote with Line Items (Priority: P1)

From a booking detail, a center owner taps "Create Quote". They build a structured cost breakdown using line items — each with a service description, parts cost, and labor cost. They can add or remove line items. The form shows a live subtotal that recalculates as they type. They can apply an optional discount and see the final total. They save the quote as a draft before deciding whether to send it.

**Why this priority**: A structured quote replaces ad-hoc price negotiations in chat, reduces billing disputes, and creates a clear approval record. It is the primary deliverable of the Phase 4.0 trust initiative for the Kuwait auto service market.

**Independent Test**: Create a quote with 2 line items, a discount, and a customer note. Save as Draft. Open the Quotes tab. Confirm: the quote appears with status "Draft", correct subtotal, discount, and total in KD with 3 decimal places.

**Acceptance Scenarios**:

1. **Given** the Create Quote screen, **When** it opens, **Then** it shows: a dynamic line items list (starting with one empty row), an optional discount amount field, an optional discount reason field, an optional estimated duration field, and optional notes for the customer in English and Arabic.
2. **Given** a line item row, **Then** it MUST contain: service description (required), optional Arabic description, parts cost in KD (required, numeric ≥ 0), and labor cost in KD (required, numeric ≥ 0).
3. **Given** the "Add Line Item" button, **When** tapped, **Then** a new empty line item row is appended to the list.
4. **Given** a line item, **When** the owner taps "Remove" (shown only when there are 2 or more items), **Then** that line item is removed from the list — the last remaining item cannot be removed.
5. **Given** any change to line items or the discount field, **When** values change, **Then** the subtotal and total update in real time: subtotal equals the sum of all (parts cost + labor cost) values; total equals subtotal minus discount.
6. **Given** a discount amount that exceeds the subtotal, **When** the owner tries to save, **Then** a validation error is shown: "Discount cannot exceed the subtotal."
7. **Given** a valid form, **When** the owner taps "Save as Draft", **Then** the quote is created with "Draft" status and appears in the booking's Quotes tab.

---

### User Story 5 - Send a Quote to the Customer (Priority: P1)

From the Quotes tab, a center owner reviews a draft quote and decides to send it. A confirmation step shows the total amount. On confirming, the quote is sent to the customer, its status changes to "Sent", the customer receives a push notification, and the edit form is replaced with a read-only view. If the customer rejects the quote, the owner can create a revised version.

**Why this priority**: Sending is the critical handoff action — it triggers the customer approval flow. Without it, the quote stays as an internal draft and the repair cannot proceed.

**Independent Test**: Open a Draft quote. Tap "Send to Customer". Confirm the summary dialog shows the correct total. Confirm. Verify the quote status changes to "Sent" and the edit form is no longer shown.

**Acceptance Scenarios**:

1. **Given** a quote with "Draft" status, **When** the owner views it in the Quotes tab, **Then** a "Send to Customer" button is visible.
2. **Given** the "Send to Customer" button is tapped, **When** tapped, **Then** a confirmation step appears showing the total amount and "Are you sure you want to send this quote?"
3. **Given** the confirmation is accepted, **When** confirmed, **Then** the quote status changes to "Sent" and the "Send" button is hidden — a "Sent" status badge is shown instead.
4. **Given** a "Sent" quote, **When** the owner wants to make changes, **Then** an "Edit / Revise" action is available that creates a new draft version — the original sent quote remains unchanged.
5. **Given** a quote with "Approved" status, **When** displayed, **Then** it shows: all line items, total, an "Approved" badge, and the approval timestamp.
6. **Given** a quote with "Rejected" status, **When** displayed, **Then** it shows: a "Rejected" badge, the customer's rejection notes (if any), and a "Create Revised Quote" button.
7. **Given** the send API call fails, **When** the request fails, **Then** an inline error banner is shown and the quote remains in "Draft" status.

---

### Edge Cases

- What if the owner tries to update the stage of a cancelled booking? → The "Update Stage" button is hidden for cancelled bookings. If the API is called directly and returns an error, show an inline error.
- What if a selected photo exceeds 10 MB? → Show a validation error before upload: "Photo is too large. Maximum size is 10 MB per photo." Remove the photo from the selection — do not attempt the upload.
- What if the owner navigates away from the Add Update form while photos are selected but not yet saved? → Show a discard-changes confirmation. Unsaved photos are discarded — they are not uploaded until the form is explicitly saved.
- What if two staff members simultaneously advance the same booking stage? → The second update will fail with a conflict error from the server. Show an inline message: "Stage has already been updated. Please refresh." and reload the booking.
- What if a customer has already approved a quote and the owner tries to send a revised one? → The revised quote follows the same send-and-approval flow. The backend manages quote versioning — the client just creates a new draft and sends it.
- What if the Quotes tab loads but the quote list is empty? → Show an empty state: "No quotes yet. Create a quote to share your pricing with the customer." with a "Create Quote" button.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The booking detail MUST display the current repair stage with its localized name (Arabic or English based on the active locale).
- **FR-002**: The "Update Stage" button MUST show only the stages that the current stage can legally transition to — never all stages.
- **FR-003**: Stage transitions MUST include an optional customer note field (max 500 characters) before the save action.
- **FR-004**: The booking MUST have a Progress tab showing all progress update entries in chronological order (oldest first).
- **FR-005**: Each progress entry MUST display: stage badge, customer notes (if any), internal notes labeled "Internal only" (owner-visible only), photo thumbnails (if any), timestamp, and author name.
- **FR-006**: The Add Update form MUST support: optional customer notes, optional internal notes, and up to 5 photo attachments per entry.
- **FR-007**: Photos MUST be selectable from both the device camera and the photo library.
- **FR-008**: Each photo upload MUST display an individual progress indicator and an independent retry action on failure.
- **FR-009**: Tapping a photo thumbnail in the progress timeline MUST open a full-screen viewer with swipe navigation between photos in the same entry.
- **FR-010**: The booking MUST have a Quotes tab showing all quote entries with their status badges.
- **FR-011**: The Create Quote form MUST support: dynamic line items (minimum 1), optional discount amount, optional discount reason, optional estimated duration, and optional customer notes in English and Arabic.
- **FR-012**: Each line item MUST contain: description (required), optional Arabic description, parts cost (required, numeric ≥ 0), and labor cost (required, numeric ≥ 0).
- **FR-013**: The subtotal and total MUST update in real time as line item values or the discount amount change — no save required to see the updated totals.
- **FR-014**: A discount amount exceeding the subtotal MUST be blocked with a validation error before the form can be saved.
- **FR-015**: All amounts MUST be displayed with exactly 3 decimal places in Kuwaiti Dinar format.
- **FR-016**: Saving a quote MUST create it with "Draft" status — draft quotes are not visible to customers.
- **FR-017**: Sending a quote MUST require a confirmation step and changes the status to "Sent" — sent quotes are visible to customers.
- **FR-018**: A "Sent", "Approved", or "Rejected" quote MUST NOT have an editable form — only a "Create Revised Quote" action is available.
- **FR-019**: On web browsers, confirmation dialogs MUST use inline UI elements or browser confirm dialogs — not native Alert dialogs, which have no effect on web.
- **FR-020**: All user-facing strings MUST be delivered via i18n keys — zero hardcoded display strings in any Phase 4.0 screen.

### Key Entities

- **WorkProgressEntry**: A timestamped update on a booking. Contains the repair stage at time of update, customer-facing notes, internal-only notes, photo attachments, estimated time remaining (optional), author name, and creation timestamp.
- **RepairStage**: A named step in the repair workflow with a defined set of valid next stages. Stages progress from "Car Received" through diagnosis, quoting, parts sourcing, active repair, quality check, and pickup.
- **BookingMedia**: A photo or video attached to a progress entry. Contains media type, a category label (e.g., "Before Repair", "After Repair"), a URL, an optional caption in Arabic and English, customer visibility flag, and creation timestamp.
- **BookingQuote**: A structured cost estimate for a booking. Contains a version number, an ordered list of line items, subtotal, discount amount and reason, tax amount (computed server-side), total, optional duration estimate, optional bilingual customer notes, status (Draft / Sent / Approved / Rejected / Revised), and relevant timestamps.
- **QuoteLineItem**: One row in a quote. Contains a service description, optional Arabic description, parts cost, and labor cost.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A repair stage transition is reflected in the booking detail immediately after the save action completes — no manual refresh required.
- **SC-002**: A center owner can add a progress update with 3 photos in under 3 minutes from tapping "Add Update" to seeing the entry confirmed in the timeline.
- **SC-003**: Photo thumbnails in the progress timeline load within 2 seconds on a standard mobile connection.
- **SC-004**: Creating and saving a quote with 3 line items takes under 2 minutes from tapping "Create Quote" to seeing it in the Quotes tab as a Draft.
- **SC-005**: The subtotal and total fields update within 100 milliseconds of any input change in the quote form — no visible lag.
- **SC-006**: Only valid next repair stages are ever shown in the stage selector — no invalid transitions are presented to the user under any circumstances.
- **SC-007**: All Phase 4.0 screens render correctly in both Arabic (right-to-left) and English (left-to-right) without layout breaks.
- **SC-008**: 100% of user-facing strings in Phase 4.0 screens use i18n keys — confirmed by zero hardcoded Arabic or English display strings in the new screen files.

## Assumptions

- Backend endpoints for work progress and quotes are deployed and available before mobile implementation begins.
- The valid stage transition map is defined on the client side and also enforced by the server — a client presenting only valid options is a UX safeguard, not the sole enforcement point.
- Photos are uploaded as multipart form data — the backend stores them and returns a URL. The mobile app does not handle image storage directly.
- Video upload for work progress is out of scope for this phase — photos only.
- Quote tax calculation is computed server-side — the client displays the tax amount returned by the server but does not calculate it.
- Customer quote approval or rejection happens in the customer-facing app — the center owner app displays the resulting status change on next load or pull-to-refresh.
- Quote versioning is managed by the backend — each revision increments a version number automatically.
- i18n translation keys for the `progress`, `quote`, and `workStage` namespaces are added to both Arabic and English locale files as part of this phase.
