# Research: Attention Required Panel

**Branch**: `016-attention-required-panel` | **Date**: 2026-05-21

---

## Decision 1: Data Fetching Strategy — Client-Side Derivation vs. Dedicated Backend Endpoint

**Decision**: Derive all attention items client-side from existing RTK Query endpoints. No new backend endpoint is required for this feature.

**Rationale**: All six attention categories can be computed from fields already present in `BookingResponse`, `ReviewResponse`, and `ConversationResponse`. Adding a dedicated `/dashboard/attention` backend endpoint would require Spring Boot changes outside the current scope and would duplicate logic already expressible from existing data. Client-side derivation ships faster, keeps the backend boundary clean, and the data volumes (50–100 active bookings per center) are small enough that fetching them entirely is not a concern.

**Alternatives Considered**:
- Dedicated backend endpoint returning pre-computed attention items. Rejected: requires backend work that is not in scope for this phase; the attention logic (time thresholds, business-hours gating) is presentation-layer logic that naturally lives in the frontend.
- Server-Sent Events / WebSocket push for real-time attention updates. Rejected: the 60-second polling interval specified in the requirements is sufficient; the WebSocket channel is already used for chat and adding attention push is Phase 4+ scope.

---

## Decision 2: Overdue Detection — Using Scheduled Booking Time as Proxy

**Decision**: A booking is considered "overdue" if its `bookingDate + bookingTime` (scheduled start time) has passed and its `bookingStatus` is not a terminal state (COMPLETED, CANCELLED, NO_SHOW). The overdue duration is calculated as `now - scheduledStartTime`.

**Rationale**: The current `BookingResponse` does not include an `estimatedCompletionTime` field (confirmed via codebase inspection). The scheduled booking time is the closest available proxy for "when the work was expected to be done." For a service center, a booking past its start time that is still not complete represents a genuine delay requiring attention. If the backend later adds `estimatedCompletionTime`, the derivation logic in the hook can be enhanced without changing the component layer.

**Alternatives Considered**:
- Block the Overdue category entirely until backend adds `estimatedCompletionTime`. Rejected: delays value delivery; the booking date+time proxy is directionally correct for the problem.
- Use `updatedAt` as an overdue signal. Rejected: `updatedAt` reflects when data was last changed, not when the job was scheduled to finish.

**Backend Gap Note**: The spec mentioned `estimatedCompletionTime` — this field does not exist yet. The chosen proxy (`bookingDate + bookingTime`) is documented here as a conscious tradeoff. A future backend addition of this field should be surfaced as a follow-up task.

---

## Decision 3: Stalled Detection — Using `updatedAt` Staleness

**Decision**: A booking is stalled if its `bookingStatus` is an active non-terminal status (CONFIRMED or IN_PROGRESS) AND its `updatedAt` timestamp is more than 2 hours old AND the current wall-clock time falls within the branch's `openingTime`–`closingTime` window.

**Rationale**: `updatedAt` is available on `BookingResponse` and accurately reflects the last time any field on the booking changed, which in practice means the last status update, assignment change, or note addition. A 2-hour staleness threshold during business hours is the requirement's definition of stalled.

**Business hours check**: Use `openingTime` and `closingTime` from the center profile (already available via `useGetMyCenterQuery`). Parse both as `HH:mm:ss` strings and compare against local wall-clock time in Asia/Kuwait (UTC+3) per the constitution's regional standard.

**Alternatives Considered**:
- Only check staleness by status (e.g., has status been CONFIRMED for >2h). Rejected: status transitions are what `updatedAt` tracks; checking `updatedAt` directly is equivalent and requires no extra field.

---

## Decision 4: Unassigned Detection — Using `assignedMembershipId`

**Decision**: A booking is unassigned if `assignedMembershipId === null` AND `bookingStatus === 'CONFIRMED'` AND the scheduled start time is within the next 2 hours from now.

**Rationale**: `assignedMembershipId` and `assignedStaffName` are both present on `BookingResponse` (confirmed via codebase). A null `assignedMembershipId` reliably indicates no technician has been assigned. Restricting to CONFIRMED (not PENDING) avoids surfacing bookings not yet accepted. The 2-hour look-ahead window matches the requirement.

---

## Decision 5: Unanswered Chats — Using `unreadCount` + `lastMessageAt`

**Decision**: A conversation is flagged as unanswered if `unreadCount > 0` AND `lastMessageAt` is more than 30 minutes before now.

**Rationale**: From the center's perspective, `unreadCount > 0` means there are customer messages the center has not read (and by extension, not replied to). `lastMessageAt` provides the timestamp. The 30-minute threshold is the requirement. This combination correctly captures "customer sent a message, center hasn't replied in 30+ minutes" without needing to load individual message threads.

**Limitation acknowledged**: `unreadCount` tracks unread messages from any sender, not exclusively customers. In practice for a center conversation, unread messages are predominantly from customers. The approach may occasionally surface a conversation where an internal system message is unread; the cost is a false-positive that disappears on the next refresh once the center opens the chat. This is acceptable.

---

## Decision 6: Low-Rated Reviews — Client-Side Filter on Existing Query

**Decision**: Fetch reviews using the existing `useGetReviewsQuery` (page 0, size 20). Flag reviews where `rating <= 3` AND `ownerReply` is null or empty.

**Rationale**: The existing reviews endpoint already supports this. 20 reviews per page is sufficient to catch all recently posted low-rated unanswered reviews. The `ownerReply` field is the canonical "has the center replied" signal.

---

## Decision 7: Pending Quotes — Deferred (Phase 4.0 Dependency)

**Decision**: The Pending Quotes category is deferred. The Quotes API (`/bookings/{id}/quotes`) is a Phase 4.0 feature not yet implemented in the backend or frontend. The AttentionPanel component will reserve the slot for Pending Quotes but render zero items until Phase 4.0 ships.

**Rationale**: Building placeholder logic now against a non-existent API would require mocking, which violates the constitution's "no pseudocode or placeholder UI" principle. The panel delivers value across five of six categories without quotes.

---

## Decision 8: Polling Strategy — RTK Query `pollingInterval` + `useIsFocused`

**Decision**: Use RTK Query's `pollingInterval: 60000` option on each query consumed by the attention hook. Set `pollingInterval: 0` (disabling polling) when the dashboard screen is not focused, using `useIsFocused` from `@react-navigation/native`.

```typescript
const isFocused = useIsFocused();
useGetCenterBookingsQuery(params, { pollingInterval: isFocused ? 60_000 : 0 });
```

**Rationale**: RTK Query's built-in polling is the idiomatic approach in this codebase. Setting `pollingInterval: 0` pauses polling without clearing the cache or triggering a re-mount. `useIsFocused` is already available via Expo Router's dependency on React Navigation. This pattern conserves battery and bandwidth as required.

**Alternatives Considered**:
- `useFocusEffect` + `setInterval`. Rejected: manual interval management is error-prone and not idiomatic for this RTK Query codebase.
- `skipToken` when unfocused. Rejected: `skipToken` clears the cache and triggers a full re-fetch on focus return, causing a flash of loading state every time the user switches tabs.

---

## Decision 9: Component Architecture — Standalone Failable Section

**Decision**: `AttentionPanel` is a self-contained component that owns its own loading and error states. If its data fetch fails, it renders an inline error banner with a Retry button. The parent dashboard `ScrollView` is unaffected.

**Rationale**: The spec explicitly requires that a failing attention fetch must not block the rest of the dashboard. Isolating the error boundary at the component level (not the screen level) achieves this.

---

## Decision 10: Item Cap + "See All" Navigation Targets

| Category | "See All" navigates to |
|----------|------------------------|
| Overdue Bookings | `/bookings` (list pre-filtered to overdue by passing a query param) |
| Stalled Bookings | `/bookings` (filtered to in-progress) |
| Unassigned Bookings | `/bookings` (filtered to unassigned) |
| Low-Rated Reviews | `/reviews` (existing reviews tab) |
| Unanswered Chats | `/chat` (existing conversations tab) |
| Pending Quotes | Deferred |

**Note**: The existing bookings list screen (`app/(app)/(tabs)/bookings/index.tsx`) already supports status tab filtering. The "See All" links for booking categories will navigate there; deep filter pre-selection may require a small enhancement to the bookings list screen (passing an initial filter via route params).

---

## Resolved Gaps Summary

| Gap | Resolution |
|----|-----------|
| No `estimatedCompletionTime` on Booking | Use `bookingDate + bookingTime` as proxy |
| No dedicated attention endpoint | Client-side derivation from 3 existing endpoints |
| Quotes API not yet built | Deferred — Pending Quotes category ships with Phase 4.0 |
| Business hours timezone | Asia/Kuwait (UTC+3) per constitution regional standard |
| Stalled bookings outside business hours | Check current local time against `openingTime`/`closingTime` from center profile |
