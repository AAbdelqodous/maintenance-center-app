# Tasks: Attention Required Panel

**Input**: Design documents from `/specs/016-attention-required-panel/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story. Each phase is independently testable.  
**Tests**: Not requested — no test tasks included.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependency)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types and i18n keys that every subsequent phase depends on.

- [x] T001 Create `types/attention.ts` with `AttentionCategory`, `AttentionSeverity`, and `AttentionItem` interfaces as defined in `data-model.md`
- [x] T002 [P] Add all `attention.*` i18n keys (English) to `lib/i18n/locales/en.json` — include keys for: title, allClear, allClearSubtitle, retry, errorMessage, seeAll, unassigned, categories (all 5), severity (HIGH/MEDIUM), bookingTitle, overdue.subtitle, stalled.subtitle, unassignedBooking.subtitle, review.subtitle, chat.subtitle
- [x] T003 [P] Add all `attention.*` i18n keys (Arabic) to `lib/i18n/locales/ar.json` — parallel to T002, translate all keys to Arabic

**Checkpoint**: `AttentionItem` type is importable; both locale files have `attention.*` keys with no missing entries.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hook skeleton and shared UI components that all user story phases build on. No derivation logic yet — the hook returns an empty array at this stage.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `hooks/useAttentionItems.ts` skeleton — wire `useGetCenterBookingsQuery({ page: 0, size: 50 })` with `pollingInterval: isFocused ? 60_000 : 0` (using `useIsFocused` from `@react-navigation/native`), also wire `useGetMyCenterQuery` for business hours; return `{ items: [], isLoading, isError, lastCheckedAt, refetch }` with no derivation logic yet
- [x] T005 [P] Create `components/dashboard/AttentionItem.tsx` — TouchableOpacity row with: colored left-border severity indicator (red for HIGH, orange for MEDIUM), `AppText` for title + subtitle, relative time display for `occurredAt`, right-aligned chevron icon; supports RTL via `I18nManager.isRTL`; calls `router.push(item.navigateTo)` on press
- [x] T006 [P] Create `components/dashboard/AttentionPanel.tsx` — container component that accepts `{ items, isLoading, isError, lastCheckedAt, refetch }` props and renders: ActivityIndicator (loading, no items yet), inline error banner with Retry button (error state), items grouped by category with a category header and 5-item cap + "See all" link (items state), `AllClearState` placeholder (all clear state — will be wired in Phase 7); renders category groups in the fixed order: OVERDUE_BOOKING, STALLED_BOOKING, UNASSIGNED_BOOKING, LOW_RATED_REVIEW, UNANSWERED_CHAT
- [x] T007 Add `<AttentionPanel />` to `app/(app)/(tabs)/index.tsx` — import `useAttentionItems` hook, pass its return value to `<AttentionPanel />`, add it as a section below the existing stat cards; wire `refetch` into the screen's existing `RefreshControl` `onRefresh` handler so pull-to-refresh triggers all attention queries

**Checkpoint**: Dashboard renders with the AttentionPanel section showing a loading spinner then an empty state (no items yet, no "All clear" card). Pull-to-refresh works. No derivation logic is active.

---

## Phase 3: User Story 1 — Overdue & Stalled Booking Detection (Priority: P1) 🎯 MVP

**Goal**: Branch managers see overdue and stalled bookings the moment they open the dashboard.

**Independent Test**: Create a `CONFIRMED` booking with `bookingDate`/`bookingTime` set to 3 hours ago → it appears in "Overdue" (HIGH severity) in the panel. Set `updatedAt` to 3 hours ago on an `IN_PROGRESS` booking during business hours → it appears in "Stalled" (MEDIUM severity). Mark the booking COMPLETED → it disappears on the next poll.

- [x] T008 [US1] Add `isWithinBusinessHours(now, openingTime, closingTime)` pure helper function inside `hooks/useAttentionItems.ts` — parses `"HH:mm:ss"` strings, compares against Asia/Kuwait wall-clock time (UTC+3 offset applied manually), returns boolean; handles missing/null `openingTime`/`closingTime` by returning `true` (fail-open)
- [x] T009 [US1] Add overdue booking derivation to `hooks/useAttentionItems.ts` — filter bookings where `bookingStatus NOT IN ['COMPLETED', 'CANCELLED', 'NO_SHOW']` AND `parseDateTime(bookingDate + bookingTime) < now()`; compute severity: HIGH if overdue > 2h, MEDIUM otherwise; build `AttentionItem` with `category: 'OVERDUE_BOOKING'`, title using `attention.bookingTitle` key, subtitle using `attention.overdue.subtitle` key (duration + assignedStaffName or `attention.unassigned`), `occurredAt = scheduledTime`, `navigateTo = /bookings/${id}`
- [x] T010 [US1] Add stalled booking derivation to `hooks/useAttentionItems.ts` — filter bookings where `bookingStatus IN ['CONFIRMED', 'IN_PROGRESS']` AND NOT already in overdue list AND `(now - updatedAt) > 2h` AND `isWithinBusinessHours(now, openingTime, closingTime)`; severity always MEDIUM; subtitle uses `attention.stalled.subtitle` key; deduplicate against overdue list by booking ID

**Checkpoint**: User Story 1 is fully functional. Overdue and stalled bookings appear with correct severity, subtitle, and navigation.

---

## Phase 4: User Story 2 — Unassigned Booking Detection (Priority: P2)

**Goal**: Unassigned bookings starting within 2 hours surface in the panel before it's too late to assign a technician.

**Independent Test**: Create a `CONFIRMED` booking with `assignedMembershipId: null` starting 45 minutes from now → appears at MEDIUM severity in "Unassigned". Change the scheduled time to 20 minutes from now → severity becomes HIGH on the next poll. Assign a technician → booking disappears on the next poll.

- [x] T011 [US2] Add unassigned booking derivation to `hooks/useAttentionItems.ts` — filter bookings where `bookingStatus === 'CONFIRMED'` AND `assignedMembershipId === null` AND `scheduledTime > now()` (future start) AND `scheduledTime < now() + 2h`; severity: HIGH if `scheduledTime < now() + 30min`, MEDIUM otherwise; subtitle uses `attention.unassignedBooking.subtitle` key with `timeUntil` formatted as relative time; `navigateTo = /bookings/${id}`

**Checkpoint**: User Stories 1 AND 2 both work independently. Unassigned bookings appear and disappear correctly.

---

## Phase 5: User Story 3 — Unanswered Chat Detection (Priority: P3)

**Goal**: Conversations where the customer has been waiting more than 30 minutes for a reply appear in the panel.

**Independent Test**: Send a message from the customer side in any conversation. Wait 31 minutes (or set DB timestamp). Open the dashboard → conversation appears in "Unanswered Chats" (MEDIUM severity). Reply from the center → conversation disappears on the next poll.

- [x] T012 [US3] Add conversations query and unanswered chat derivation to `hooks/useAttentionItems.ts` — add `useGetConversationsQuery({ page: 0, size: 20 }, { pollingInterval })` alongside existing queries; filter conversations where `unreadCount > 0` AND `lastMessageAt !== null` AND `(now - parseISO(lastMessageAt)) > 30 min`; severity always MEDIUM; title = `customerName`; subtitle uses `attention.chat.subtitle` key with `time` and `count`; `navigateTo = /chat/${id}`

**Checkpoint**: User Story 3 works. Unanswered conversations surface and resolve correctly. Polling covers all three query types now.

---

## Phase 6: User Story 4 — Low-Rated Review Detection (Priority: P4)

**Goal**: Unanswered reviews rated 3 stars or below appear in the panel so the manager can reply.

**Independent Test**: Post a 3-star review with no `ownerReply` → appears in "Low-Rated Reviews" (MEDIUM severity). Post a 2-star review → appears at HIGH severity. Reply to a review via the Reviews tab → it disappears on the next poll. A 4-star review never appears.

- [x] T013 [US4] Add reviews query and low-rated review derivation to `hooks/useAttentionItems.ts` — add `useGetReviewsQuery({ page: 0, size: 20 }, { pollingInterval })` alongside existing queries; filter reviews where `rating <= 3` AND `(ownerReply === null || ownerReply === '')`; severity: HIGH if `rating <= 2`, MEDIUM if `rating === 3`; title = `userFirstname + ' ' + userLastname`; subtitle uses `attention.review.subtitle` key with `rating` and relative `createdAt`; `navigateTo = /reviews`

**Checkpoint**: User Story 4 works. Low-rated reviews surface and disappear correctly. The panel now covers all four active derivation categories.

---

## Phase 7: User Story 5 — All Clear State (Priority: P5)

**Goal**: When all four active categories are empty, the panel collapses to an explicit "All clear" card with the last-checked timestamp.

**Independent Test**: With all existing attention items resolved (no overdue/stalled/unassigned bookings, no unread chats >30min, no unanswered low-rated reviews), wait for a poll cycle or pull to refresh → panel collapses to the "All clear" card showing the current timestamp. Create a new stalled booking → on the next poll the panel expands back to the item list.

- [x] T014 [US5] Create `components/dashboard/AllClearState.tsx` — small card component rendering a success icon (e.g., lucide `CheckCircle` in green), `t('attention.allClear')` as the title in `AppText`, `t('attention.allClearSubtitle', { time: formattedLastCheckedAt })` as the subtitle; supports RTL
- [x] T015 [US5] Wire `AllClearState` into `components/dashboard/AttentionPanel.tsx` — replace the placeholder from T006: when `items.length === 0 && !isLoading && !isError`, render `<AllClearState lastCheckedAt={lastCheckedAt} />` instead of nothing; when `items.length > 0`, render the category groups as before

**Checkpoint**: User Story 5 works. All five user stories are independently functional. The panel shows the all-clear card when empty and transitions back to items on the next poll when a new issue appears.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: RTL verification, navigation smoke test, and final end-to-end validation.

- [ ] T016 [P] RTL verification — switch app language to Arabic, open the dashboard, and verify: AttentionPanel title is right-aligned, AttentionItem text flows RTL (title/subtitle on the right, chevron on the left, severity indicator on the right border), AllClearState card mirrors correctly, "See all" link aligns to the left in RTL; fix any layout issues in the affected component files
- [ ] T017 Verify "See all" navigation for each active category — tap "See all" on Overdue Bookings, Stalled Bookings, Unassigned Bookings, Low-Rated Reviews, and Unanswered Chats; confirm each reaches the correct screen; fix any broken `router.push` targets in `components/dashboard/AttentionPanel.tsx`
- [ ] T018 Poll pause/resume verification — with the dashboard open and items showing, switch to the Bookings tab and back; confirm in Expo dev tools / Metro that network requests to `/bookings`, `/reviews/center`, and `/conversations/center` stop while unfocused and resume within 5 seconds of returning; fix `pollingInterval` wiring in `hooks/useAttentionItems.ts` if polling does not pause
- [ ] T019 Full smoke test — follow all five test scenarios in `quickstart.md` in sequence; confirm each attention item appears, shows correct severity and subtitle, navigates to the right screen, and disappears after resolution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T002 and T003 (i18n) are parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1. T005 and T006 are parallel (different component files). T007 depends on T004, T005, T006.
- **Phase 3 (US1)**: Depends on Phase 2. T008 must complete before T009 and T010. T009 and T010 are sequential (T010 depends on the overdue list from T009 to deduplicate).
- **Phase 4 (US2)**: Depends on Phase 2. Can start in parallel with Phase 3 — adds only one task to the same hook file, so coordinate if pairing.
- **Phase 5 (US3)**: Depends on Phase 2. Can start in parallel with Phases 3 and 4.
- **Phase 6 (US4)**: Depends on Phase 2. Can start in parallel with Phases 3, 4, and 5.
- **Phase 7 (US5)**: Depends on Phases 3–6 being complete (all derivation logic must be in place for the all-clear state to be meaningful). T014 and T015 are sequential.
- **Phase 8 (Polish)**: Depends on Phase 7. T016 and T017 are parallel. T018 and T019 must run after T016 and T017.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 (foundational).
- **US2 (P2)**: Depends only on Phase 2. Independently testable alongside US1.
- **US3 (P3)**: Depends only on Phase 2. Independently testable alongside US1/US2.
- **US4 (P4)**: Depends only on Phase 2. Independently testable alongside US1/US2/US3.
- **US5 (P5)**: Depends on US1 + US2 + US3 + US4 being complete (all-clear requires all derivation logic present).

### Within Each Phase

- Types before services (T001 before T004).
- i18n keys before components that use them (Phase 1 before Phase 2).
- Hook skeleton before component wiring (T004 before T007).
- Overdue derivation before stalled deduplication (T009 before T010).

---

## Parallel Opportunities

### Phase 1

```
T002 (en.json) ║ T003 (ar.json)   — different files
```

### Phase 2

```
T004 (hook skeleton)  ║ T005 (AttentionItem)  ║ T006 (AttentionPanel)
         └────────────────────────────────────────┘
              T007 (dashboard integration) — depends on all three above
```

### Phases 3–6 (after Phase 2)

```
Phase 3 (US1: overdue+stalled)   ║ Phase 5 (US3: chats)
Phase 4 (US2: unassigned)        ║ Phase 6 (US4: reviews)
```
Note: Phases 3–6 all modify `hooks/useAttentionItems.ts`. If working solo, do them sequentially in priority order. If pairing, coordinate edits to avoid merge conflicts in the hook file.

### Phase 8

```
T016 (RTL verification) ║ T017 (See all navigation)
         └────────────────────┘
              T018 (poll pause) → T019 (smoke test)
```

---

## Implementation Strategy

### MVP First (US1 Only — Phases 1–3)

1. Complete Phase 1 (Setup — types + i18n)
2. Complete Phase 2 (Foundational — hook, components, dashboard wiring)
3. Complete Phase 3 (US1 — overdue + stalled derivation)
4. **STOP and VALIDATE**: Overdue and stalled bookings appear in the dashboard. Navigation works. Polish later.

### Incremental Delivery

```
Phase 1+2 → Foundation visible (panel renders, no items yet)
Phase 3   → US1 live: overdue + stalled bookings ← MVP demo point
Phase 4   → US2 live: unassigned bookings
Phase 5   → US3 live: unanswered chats
Phase 6   → US4 live: low-rated reviews
Phase 7   → US5 live: all-clear state
Phase 8   → RTL, navigation, poll pause, smoke test
```

---

## Notes

- All hook derivation tasks (T008–T013) modify the same file (`hooks/useAttentionItems.ts`). Complete them sequentially or coordinate carefully if pairing.
- Pending Quotes (`PENDING_QUOTE` category) is intentionally absent — deferred to Phase 4.0. No stub, no placeholder task.
- The "See all" links in `AttentionPanel.tsx` navigate to existing screens. If a screen needs a route param to pre-filter (e.g., bookings list), add that param during T007 and update the target screen's filter logic as a sub-task within the same task.
- `useIsFocused` is from `@react-navigation/native`, which is already a transitive dependency of Expo Router — no new package install required.
- Commit after each phase checkpoint for clean rollback points.
