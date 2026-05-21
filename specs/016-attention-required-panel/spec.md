# Feature Specification: Attention Required Panel

**Feature Branch**: `016-attention-required-panel`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Add the highest-value section of the new branch manager dashboard to the maintenance center owner mobile app: an Attention Required panel that surfaces every operational item needing the manager's intervention right now, eliminating the need to dig through multiple screens."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Spot Overdue and Stalled Bookings at a Glance (Priority: P1)

A branch manager opens the dashboard first thing in the morning. Instead of navigating to the bookings list and manually scanning for problems, the Attention Required panel immediately shows a prioritized list of every booking that is overdue or has not been updated in over two hours during business hours. Each item shows the booking ID, how long it has been overdue or stalled, and the name of the assigned technician (if any). The manager taps an item and lands directly on the booking detail screen.

**Why this priority**: Overdue and stalled bookings directly harm the customer experience and are the highest-urgency operational problem a branch manager faces. Surfacing them instantly is the core value of the panel.

**Independent Test**: Can be fully tested by creating a booking with an estimated completion time set to two hours ago and verifying it appears in the panel within one refresh cycle, with the correct title, subtitle, and navigation target.

**Acceptance Scenarios**:

1. **Given** a booking whose estimated completion time has passed and it is not yet marked complete, **When** the dashboard screen is in focus, **Then** the booking appears in the "Overdue" category within 60 seconds, showing the booking ID, the elapsed overdue time, and the assigned technician's name (or "Unassigned" if none).
2. **Given** a booking with an active status that has not been updated for over two hours during branch business hours, **When** the dashboard is viewed, **Then** it appears in the "Stalled" category.
3. **Given** a booking is both overdue and stalled, **When** the panel renders, **Then** it appears only once, in the Overdue category.
4. **Given** a previously overdue booking is marked complete by a technician, **When** the panel next refreshes, **Then** that booking no longer appears.
5. **Given** the branch is outside business hours, **When** the panel renders, **Then** stalled bookings are not shown (detection pauses), but overdue bookings continue to appear.

---

### User Story 2 — Act on Unassigned Bookings Before They Start (Priority: P2)

A branch manager sees an unassigned booking in the panel whose scheduled start time is 25 minutes away. The item is highlighted as high severity. The manager taps it, is taken to the booking detail screen, and assigns a technician immediately.

**Why this priority**: Unassigned bookings that are about to start create a customer-facing failure if not caught. The 30-minute high-severity threshold gives the manager enough time to act.

**Independent Test**: Can be tested by creating a confirmed booking with no assigned technician, scheduled to start 20 minutes from now, and verifying it appears as a high-severity item in the Unassigned category.

**Acceptance Scenarios**:

1. **Given** a confirmed booking with no technician assigned, scheduled to start within the next 2 hours, **When** the dashboard renders, **Then** the booking appears in the "Unassigned" category at medium severity.
2. **Given** a confirmed booking with no technician assigned, scheduled to start within the next 30 minutes, **When** the dashboard renders, **Then** the booking appears in the "Unassigned" category at high severity.
3. **Given** an unassigned booking that just had a technician assigned, **When** the panel next refreshes, **Then** the item disappears from the panel.

---

### User Story 3 — Catch Unanswered Chats and Pending Quotes (Priority: P3)

A branch manager glances at the Attention panel and sees one unanswered customer chat message and one quote that was sent six hours ago with no reply. They tap the chat item, respond to the customer, then tap the quote item and follow up.

**Why this priority**: Delayed responses to chats and pending quotes represent potential lost revenue and poor service perception. Surfacing them in the dashboard reduces the need to check dedicated screens repeatedly.

**Independent Test**: Can be tested by sending a chat message from the customer side, waiting 31 minutes without a center reply, and verifying the conversation appears in the "Unanswered Chats" category on the dashboard.

**Acceptance Scenarios**:

1. **Given** a customer has sent a message in a conversation and more than 30 minutes have elapsed with no reply from the center, **When** the dashboard renders, **Then** the conversation appears in the "Unanswered Chats" category.
2. **Given** a quote was sent to a customer more than 4 hours ago and no response has been received, **When** the dashboard renders, **Then** the quote appears in the "Pending Quotes" category.
3. **Given** a center staff member replies to a chat or the customer responds to a quote, **When** the panel next refreshes, **Then** the resolved item disappears.

---

### User Story 4 — See Low-Rated Reviews That Need a Response (Priority: P4)

A manager opens the dashboard and sees a 2-star review has come in. The item is marked high severity. The manager taps it and is taken to the reviews screen where they can write a reply.

**Why this priority**: Unanswered negative reviews damage the center's public reputation. Surfacing them immediately keeps the manager from missing them.

**Independent Test**: Can be tested by posting a 3-star review (with no center reply) on a booking belonging to the active branch and verifying it appears in "Low-Rated Reviews."

**Acceptance Scenarios**:

1. **Given** a review with a rating of 3 stars or fewer has been posted and the center has not replied, **When** the dashboard renders, **Then** the review appears in the "Low-Rated Reviews" category.
2. **Given** a review with a rating of 2 stars or fewer, **When** the dashboard renders, **Then** the item is flagged as high severity.
3. **Given** a review with a rating of 4 stars or higher, **When** the dashboard renders, **Then** it does not appear in the panel.
4. **Given** the center has replied to a low-rated review, **When** the panel next refreshes, **Then** that review disappears.

---

### User Story 5 — Confirm Everything Is Under Control (Priority: P5)

The manager opens the dashboard after a productive morning. All six attention categories are empty. Instead of wondering whether they missed something, the panel shows a green "All clear" indicator with the timestamp of the last successful check.

**Why this priority**: Without an explicit all-clear signal, the absence of items in the panel is ambiguous — the manager cannot tell if the data loaded or if there truly is nothing to do.

**Independent Test**: Can be tested by resolving all open issues (complete bookings, assign staff, reply to chats) and verifying the panel transitions to the all-clear state within one refresh cycle.

**Acceptance Scenarios**:

1. **Given** all six attention categories have zero items, **When** the dashboard renders, **Then** the panel collapses into a small "All clear" success card showing the timestamp of the last check.
2. **Given** the panel is in "All clear" state and a new stalled booking appears, **When** the next automatic refresh fires, **Then** the panel expands back to show the new item.

---

### Edge Cases

- The branch is outside business hours: stalled-booking detection pauses; overdue and unassigned detection continues unaffected.
- A booking is simultaneously overdue and stalled: it appears exactly once, in the Overdue category. It does not appear in Stalled.
- A review is rated exactly 3 stars: it appears in the panel (threshold is ≤ 3). A 4-star review does not.
- A category has more than 5 matching items: exactly 5 are shown with a "See all" link that navigates to the relevant screen filtered to that state.
- The attention data fetch fails: an inline error banner is shown inside the panel with a Retry button. The rest of the dashboard (stats cards, recent bookings, etc.) continues to load normally.
- The user manages multiple branches: only items belonging to the currently active branch appear. Items from other branches are not shown.
- The screen loses focus (user navigates to another tab): automatic polling pauses. It resumes when the screen returns to focus.
- Pull-to-refresh is triggered while a poll is already in progress: the in-progress request completes; only one concurrent fetch runs at a time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST include an "Attention Required" panel as a distinct, clearly labelled section.
- **FR-002**: The panel MUST surface items across six categories: Overdue Bookings, Stalled Bookings, Unassigned Bookings, Pending Quotes, Low-Rated Reviews, and Unanswered Customer Chats.
- **FR-003**: Each attention item MUST display: a short title (e.g., "Booking #2418"), a contextual subtitle (e.g., "2h overdue · Assigned to Ahmed Khaled"), a severity indicator (High or Medium), and the time the condition first occurred.
- **FR-004**: Each attention item MUST be tappable and navigate directly to the relevant screen (booking detail, quote detail, review, or chat thread) for the manager to take action.
- **FR-005**: Overdue Bookings MUST be items whose estimated completion time has passed and whose status is not a terminal completed state. Items overdue by more than 2 hours MUST be flagged High severity; all others Medium.
- **FR-006**: Stalled Bookings MUST be active bookings whose status has not changed for more than 2 hours during the branch's business hours. Outside business hours, stalled detection MUST be suspended.
- **FR-007**: Unassigned Bookings MUST be confirmed bookings with no technician assigned, scheduled to start within the next 2 hours. Items within 30 minutes of start MUST be flagged High severity; all others Medium.
- **FR-008**: Pending Quotes MUST be quotes sent to a customer more than 4 hours ago with no customer response recorded.
- **FR-009**: Low-Rated Reviews MUST be reviews posted with a rating of 3 stars or fewer that have received no reply from the center. Ratings of 2 stars or below MUST be flagged High severity; 3-star items Medium.
- **FR-010**: Unanswered Customer Chats MUST be conversations where the customer's most recent message is more than 30 minutes old and no subsequent center reply exists.
- **FR-011**: When a booking qualifies for both Overdue and Stalled categories, it MUST appear only in the Overdue category.
- **FR-012**: Each category MUST display at most 5 items. When more than 5 items exist, a "See all" link MUST appear that navigates to the corresponding screen pre-filtered to that state.
- **FR-013**: The panel MUST refresh automatically every 60 seconds while the dashboard screen is in focus.
- **FR-014**: Automatic polling MUST pause when the dashboard screen loses focus and resume when it regains focus.
- **FR-015**: The panel MUST support manual pull-to-refresh.
- **FR-016**: When all six categories have zero items, the panel MUST collapse into an "All clear" success state displaying the timestamp of the last successful data check.
- **FR-017**: If the attention data fetch fails, the panel MUST display an inline error banner with a Retry button. The rest of the dashboard MUST continue to render normally.
- **FR-018**: The panel MUST display only items belonging to the currently active branch. Items from other branches the user manages MUST NOT appear.
- **FR-019**: All visible labels, category names, severity indicators, and action labels MUST be available in both Arabic and English, switching based on the user's selected language.
- **FR-020**: The panel MUST render correctly in right-to-left layout when Arabic is selected and left-to-right when English is selected.

### Key Entities

- **Attention Item**: A single actionable entry surfaced in the panel. Attributes: category (one of six types), title, subtitle, severity (High | Medium), occurred-at timestamp, navigation target (screen name + entity ID).
- **Attention Panel State**: The aggregated set of all attention items across all six categories for the active branch, plus metadata (last-fetched timestamp, fetch status).
- **Branch Business Hours**: The opening and closing times recorded on the active branch's profile, used to determine whether stalled-booking detection is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager who previously spent 5+ minutes scanning multiple screens to find problems can identify all urgent operational issues in under 30 seconds by looking only at the dashboard.
- **SC-002**: A newly created overdue booking appears in the panel within 60 seconds of the screen being in focus, without requiring any manual action from the manager.
- **SC-003**: Tapping any attention item reaches the correct downstream screen 100% of the time with no dead-end navigations or wrong-screen outcomes.
- **SC-004**: The panel transitions to "All clear" within one 60-second refresh cycle after the last attention item is resolved.
- **SC-005**: The panel correctly shows zero cross-branch items — no items from a different branch appear regardless of how many branches the user manages.
- **SC-006**: The panel loads and becomes interactive within 3 seconds on a standard mobile data connection; a failed fetch is communicated to the user within 5 seconds via the error banner.
- **SC-007**: The panel renders correctly (labels, layout, severity indicators) in both Arabic (RTL) and English (LTR) with no overlapping or truncated text.

## Assumptions

- The Staff Management Foundation (previous spec, branch `015-staff-management-foundation`) is fully implemented: staff exist, roles exist, and bookings can be assigned to specific technicians. The assigned technician field on a booking is available via the existing bookings API.
- The backend already exposes sufficient data on existing endpoints (bookings, reviews, chats, quotes) to derive all six attention categories client-side. The client fetches the relevant lists and applies the time-based thresholds locally, without requiring a new dedicated backend "attention" endpoint.
- "Estimated completion time" for overdue detection refers to a field derivable from the booking's scheduled date/time plus a duration, or a dedicated field on the booking. If this field is absent from the current backend response, the Overdue category will be blocked pending a backend addition; this will be surfaced during planning.
- Business hours for stalled-booking detection are read from the active branch's profile data already available in the app (openingTime / closingTime fields).
- "Terminal completed state" for overdue booking filtering means any booking status indicating work is finished (e.g., COMPLETED, CANCELLED). Active statuses (CONFIRMED, IN_PROGRESS, etc.) remain eligible.
- A "center reply" on a review means the ownerReply field is non-null and non-empty.
- An "unanswered chat" means no message with a center sender exists after the customer's latest message timestamp.
- The panel is a new section added to the existing dashboard screen and coexists with the current stat cards; it does not replace them.
- Items within each category are sorted by severity (High first) then by occurred-at time (oldest first), placing the most urgent items at the top.
- The "See all" link navigates to the existing screen best suited to that category (bookings list, reviews, conversations) with appropriate pre-filtering; no new dedicated list screen is required by this spec.
- Pull-to-refresh on the dashboard triggers a refetch of all attention data in addition to any other dashboard data.
