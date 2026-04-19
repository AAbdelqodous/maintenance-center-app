# Feature Specification: Phase 5 — Review Management

**Feature Branch**: `phase-5-review-management`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 5 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View All Reviews with Rating Summary (Priority: P1)

A center owner navigates to the Reviews section. At the top, they see their overall rating (e.g., 4.3 ★) alongside a rating breakdown bar chart showing how many reviews fall into each star level (1–5). Below, the full list of reviews is displayed in reverse chronological order with the reviewer's name, star rating, review text, date, and the service booked.

**Why this priority**: Reviews directly determine a center's discoverability and trustworthiness on the customer app. Owners need full visibility into what customers are saying.

**Independent Test**: Navigate to Reviews → rating summary displays correctly; each review card shows reviewer name, stars, date, and review text.

**Acceptance Scenarios**:

1. **Given** a center with reviews, **When** the Reviews screen loads, **Then** the header shows the overall average rating (1 decimal place) and a 5-row breakdown bar (one per star level showing count and percentage).
2. **Given** the rating breakdown, **When** a star-level bar is tapped, **Then** the list below is filtered to only reviews of that star level.
3. **Given** the reviews list, **Then** each item MUST display: reviewer name, star rating (visual stars), review text, review date, and the service name the review is for.
4. **Given** a center with no reviews, **When** the screen loads, **Then** an empty state is shown: "No reviews yet. Deliver great service to earn your first review!"
5. **Given** the reviews list, **When** the owner scrolls to the bottom, **Then** more reviews are loaded (pagination).
6. **Given** the reviews screen in Arabic, **When** rendered, **Then** review text is displayed as written (Arabic or English — user's language), dates are formatted per the active locale, and layout is RTL.

---

### User Story 2 — Read Full Review and Respond (Priority: P1)

A center owner taps a review to open the detail. They read the full review text. If they have not yet responded, a "Reply" button is visible. They tap it, type their response, and submit. The response is then visible to customers on the customer app alongside the original review.

**Why this priority**: Responding to reviews — especially negative ones — is one of the highest-leverage actions for managing a center's reputation. Unanswered negative reviews deter future customers.

**Independent Test**: Tap a review with no response → type a reply → submit → the reply is displayed below the original review in the detail view.

**Acceptance Scenarios**:

1. **Given** a review in the list, **When** the owner taps it, **Then** a detail screen opens showing the full review text, star rating, date, service name, reviewer name, and — if present — the owner's existing reply.
2. **Given** a review with no reply, **When** the detail screen opens, **Then** a "Reply to this review" button is visible.
3. **Given** the reply button is tapped, **When** the owner taps it, **Then** a text input area expands with a character counter (max 500 characters) and a "Submit Reply" button.
4. **Given** a reply text of 0 characters, **When** the owner taps "Submit Reply", **Then** a validation error is shown: "Reply cannot be empty."
5. **Given** a valid reply, **When** submitted, **Then** the reply is saved via the API, displayed below the original review, and the "Reply" button is replaced by an "Edit Reply" button.
6. **Given** a reply that already exists, **When** the owner taps "Edit Reply", **Then** the existing reply text is loaded into the input and can be modified and resubmitted.
7. **Given** a reply submission failure, **When** the API returns an error, **Then** an error toast is shown and the reply text is preserved in the input.

---

### User Story 3 — Filter and Sort Reviews (Priority: P2)

A center owner can filter their reviews by star rating and sort by date (newest first / oldest first) or by rating (highest first / lowest first). This helps them quickly identify patterns — e.g., see all 1-star reviews to identify recurring complaints.

**Why this priority**: Centers with many reviews need filtering to surface actionable patterns efficiently.

**Independent Test**: Filter to 1-star reviews → only 1-star reviews shown; sort by oldest first → oldest review appears at top.

**Acceptance Scenarios**:

1. **Given** the reviews list, **When** the owner selects a star filter (1–5 or "All"), **Then** the list updates to show only matching reviews.
2. **Given** the reviews list, **When** the owner selects a sort order (Newest First / Oldest First / Highest Rating / Lowest Rating), **Then** the list re-orders accordingly.
3. **Given** an active filter, **When** the count of matching reviews is 0, **Then** an empty state is shown: "No reviews match this filter."
4. **Given** an active filter, **When** the overall rating summary header is displayed, **Then** it always shows the total average (not filtered average).

---

### User Story 4 — Flag a Review (Priority: P3)

A center owner can flag a review they believe violates platform policies (e.g., fake review, abusive language). The flag is submitted to the platform admin for review. The owner receives a confirmation that the report was submitted. The review remains visible until the admin makes a decision.

**Why this priority**: Protects owners from malicious or fraudulent reviews while maintaining trust in the platform.

**Independent Test**: Flag a review → confirmation message shown → review still visible in the list.

**Acceptance Scenarios**:

1. **Given** a review detail screen, **When** the owner taps the "..." menu, **Then** a "Flag as Inappropriate" option appears.
2. **Given** the flag option is tapped, **When** tapped, **Then** a bottom sheet appears with flag reasons: "Fake review", "Abusive / Offensive language", "Spam", "Other".
3. **Given** a selected flag reason, **When** the owner confirms, **Then** the report is submitted via the API and a success message is shown: "Thank you. Our team will review this report."
4. **Given** the owner has already flagged a review, **When** they open the review again, **Then** the flag option shows "Report Submitted" (disabled) instead of "Flag as Inappropriate".

---

### Edge Cases

- What if the reviewer's name is anonymous/hidden? → Display "Anonymous User" as the reviewer name.
- What if a review contains very long text (>1000 characters)? → Show a truncated preview in the list with a "Read more" link; show full text in the detail.
- What if the owner deletes their reply? → Show a "Delete Reply" option in the edit mode with a confirmation dialog.
- What if the backend returns a review for a service that was deleted? → Display the service name as "Service no longer available" — do not crash.
- What if the owner submits a reply that is identical to an existing reply? → Allow it (no duplicate check needed at the client level).
- What if there are more than 500 reviews? → Use infinite scroll pagination — never load all reviews at once.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Reviews screen accessible from the Profile or navigation menu.
- **FR-002**: The Reviews screen header MUST display the overall average rating and a breakdown bar chart (1–5 stars with count and percentage).
- **FR-003**: Tapping a star rating bar MUST filter the list to that star level.
- **FR-004**: Each review list item MUST display: reviewer name, star rating, review text (truncated at 150 chars with "Read more"), review date, and service name.
- **FR-005**: The app MUST support pagination on the reviews list.
- **FR-006**: Tapping a review MUST open a detail screen with the full review text and any existing reply.
- **FR-007**: Reviews with no reply MUST show a "Reply" button on the detail screen.
- **FR-008**: The reply input MUST enforce a maximum of 500 characters with a live character counter.
- **FR-009**: The app MUST validate that a reply is non-empty before submission.
- **FR-010**: After a successful reply submission, the reply text MUST be displayed in the detail view.
- **FR-011**: The app MUST allow editing an existing reply via an "Edit Reply" action.
- **FR-012**: The app MUST support filtering reviews by star rating (1–5 or All).
- **FR-013**: The app MUST support sorting reviews by: Newest First, Oldest First, Highest Rating, Lowest Rating.
- **FR-014**: The app MUST allow flagging a review with a predefined reason list.
- **FR-015**: A previously flagged review MUST show "Report Submitted" (disabled) on the flag option.
- **FR-016**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **Review**: ID, reviewerName (anonymous if hidden), starRating (1–5), text, date, serviceId, serviceName, centerId, ownerReply (nullable), isFlagged.
- **ReviewReply**: reviewId, replyText, repliedAt.
- **ReviewFlag**: reviewId, reason (enum), submittedAt.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The reviews list loads within 2 seconds on a standard 4G connection.
- **SC-002**: A center owner can submit a reply to a review in under 60 seconds from opening the reviews screen.
- **SC-003**: Filtering to a specific star level updates the list within 500ms.
- **SC-004**: All Reviews screens render correctly in both Arabic (RTL) and English (LTR).
- **SC-005**: 100% of user-facing strings in this phase use i18n keys.
- **SC-006**: Long reviews (>1000 chars) display truncated in the list and full in the detail without layout breaking.

---

## Assumptions

- The backend provides paginated review endpoints scoped to the authenticated center.
- The backend provides a POST endpoint for submitting and updating owner replies.
- The backend provides a POST endpoint for flagging reviews.
- Review deletion by the owner is not permitted — only the platform admin can remove reviews.
- The flag report goes to the admin dashboard — there is no in-app admin workflow in this app.
- Anonymous reviews are handled by the backend — the mobile app only displays what the API returns.
- Review text can be in Arabic, English, or a mix — the app displays it as-is without translation.
