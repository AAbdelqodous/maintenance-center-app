# Tasks: Staff Performance Board

**Input**: Design documents from `/specs/018-staff-performance-board/`  
**Branch**: `018-staff-performance-board`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

> **Backend note**: Tasks T004–T006 and T021 are in the Spring Boot backend repo at  
> `~/IdeaProjects/life-experience-app/service-center/` — confirm repo before acting.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story (US1–US5) from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new type file and seed both i18n locale files. No dependencies on each other — all three can run in parallel.

- [x] T001 [P] Create `types/staffPerformance.ts` with all types from data-model.md: `StaffStatus`, `PerformanceTier`, `TrendDirection`, `StaffPerformanceCard`, `ActiveBookingSummary`, `StaffPerformanceBoardResponse`, `PerformanceTierConfig`, `StaffMonthlyMetrics`, `StaffHistoryResponse`, `RebalanceSuggestion`, and the `sortBoard()` helper function
- [x] T002 [P] Add `staff.performanceBoard.*` i18n keys to `lib/i18n/locales/en.json` — include all keys from quickstart.md (status labels, tier labels, metrics labels, rebalance modal strings, drill-down strings)
- [x] T003 [P] Add Arabic translations for all `staff.performanceBoard.*` keys to `lib/i18n/locales/ar.json`

**Checkpoint**: Type file and i18n keys are in place — all subsequent tasks can import from them.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend endpoints and RTK Query wiring that MUST exist before any frontend component can render real data.

**⚠️ CRITICAL**: No user story UI work can be verified end-to-end until T006 and T007 are complete.

- [ ] T004 *(backend repo)* Create `performance_tier_config` table and JPA entity in the backend; seed one default row per center with initial thresholds from data-model.md; expose via `PerformanceTierConfigResponse` DTO
- [ ] T005 *(backend repo)* Create `booking_assignment_history` table and JPA entity; insert a row on every `PUT /bookings/{id}/assign` call recording `bookingId`, `assignedMembershipId`, `assignedAt`, `assignedByMembershipId`
- [ ] T006 *(backend repo)* Implement `GET /analytics/center/staff-performance` endpoint returning `StaffPerformanceBoardResponse` per contracts/api-contract.md; enforce role-based field omission server-side: strip `tier`, `trendDirection`, `isOverloaded`, and `activeBookings[]` from responses to TECHNICIAN-role sessions; compute `status`, `tier`, `compositeScore`, and `trendDirection` using the center's `performance_tier_config` row
- [x] T007 Add `'StaffPerformance'` to `tagTypes` array in `store/api/analyticsApi.ts`; add `getStaffPerformanceBoard` query (endpoint `analytics/center/staff-performance`, providesTags `['StaffPerformance']`) using `StaffPerformanceBoardResponse` from `types/staffPerformance.ts`
- [x] T008 In `store/api/bookingsApi.ts`, add `'StaffPerformance'` to the `invalidatesTags` list of the `assignTechnician` mutation so the board cache is busted after any reassignment
- [x] T009 Create `hooks/useStaffPerformanceBoard.ts` mirroring `hooks/useDashboardSnapshot.ts`: wrap `useGetStaffPerformanceBoardQuery` with `useIsFocused`, `pollingInterval: isFocused ? 60_000 : 0`, `refetchOnFocus: true`; export typed result `{ data, isLoading, isFetching, isError, refetch }`

**Checkpoint**: Foundation ready — all user story UI work can now begin.

---

## Phase 3: User Story 1 — Instant Workload Overview (Priority: P1) 🎯 MVP

**Goal**: A branch manager opens the dashboard and sees every active technician sorted by workload (Overloaded first), with status label and active booking count visible at a glance.

**Independent Test**: Load the dashboard as a BRANCH_MANAGER with 3+ active staff, 1 of whom has > 2× the branch average active bookings. Verify the overloaded technician appears first, shows the "Overloaded" status badge, and the other staff appear in booking-count descending order below.

- [x] T010 [P] [US1] Create `components/dashboard/StaffStatusBadge.tsx` — pill badge rendering all four `StaffStatus` values with the color tokens from quickstart.md; i18n labels via `staff.performanceBoard.status.*` keys; supports RTL via `I18nManager.isRTL`
- [x] T011 [P] [US1] Create `components/dashboard/StaffPerformanceCard.tsx` — row card displaying: initials avatar (no photo yet), full name, `StaffStatusBadge`, `activeBookingsCount`; metrics row with `avgRatingThisMonth`, `avgCompletionTimeMinutes` rendering "—" when field is null or absent (ethics guardrail); accepts `StaffPerformanceCard` prop from `types/staffPerformance.ts`; navigates to drill-down on tap (stubbed — just `console.log` for now)
- [x] T012 [US1] Create `components/dashboard/StaffPerformanceBoard.tsx` — calls `useStaffPerformanceBoard()`; applies `sortBoard()` from `types/staffPerformance.ts`; renders `FlatList` of `StaffPerformanceCard` items; shows a disabled "Rebalance" button placeholder when at least one card has `isOverloaded === true` (full wiring in US3); loading skeleton, error state ("—"), empty state with i18n key `staff.performanceBoard.noStaff`
- [x] T013 [US1] Add `<StaffPerformanceBoard />` to `app/(app)/(tabs)/index.tsx` below `<KpiGrid>` inside the existing `ScrollView`; import from `components/dashboard/StaffPerformanceBoard`

**Checkpoint**: US1 is fully functional — the board renders, sorts correctly, shows status badges and active counts, and pull-to-refresh works.

---

## Phase 4: User Story 2 — Performance Tier Badges (Priority: P2)

**Goal**: Each staff card shows a tier badge (Top Performer / Strong / On Track / Needs Attention) and real monthly metrics (rating, completion time, volume). New staff without history show a "New" badge and "—" metrics instead of zeros.

**Independent Test**: Set up test data where one technician has a 4.8 rating and 90% on-time rate (should be "Top Performer"), and another has dropped 0.7 rating points vs last month (should be "Needs Attention"). Verify correct badges appear and sort order puts Needs Attention above On Track.

- [x] T014 [P] [US2] Create `components/dashboard/PerformanceTierBadge.tsx` — pill badge for all four `PerformanceTier` values plus a "New" variant (`isNew === true`); use color tokens from quickstart.md; i18n labels via `staff.performanceBoard.tier.*` keys; render nothing (return `null`) when `tier` prop is undefined (ethics guardrail — TECHNICIAN responses omit this field)
- [x] T015 [US2] Update `components/dashboard/StaffPerformanceCard.tsx` — add `PerformanceTierBadge` rendered only when `card.tier` is defined; update metrics row to show real `avgRatingThisMonth` (1 decimal), `avgCompletionTimeMinutes` formatted as minutes, `completedThisMonth` count; all three still fall back to "—" when the field is null or absent

**Checkpoint**: US2 functional — tier badges appear on cards, "New" badge shown for zero-history staff, real metrics displayed, and "—" shown when the server withholds fields from TECHNICIAN sessions.

---

## Phase 5: User Story 3 — One-Tap Rebalance (Priority: P2)

**Goal**: A manager taps "Rebalance", sees overloaded staff with their booking lists, moves a booking to an available technician, confirms, and both cards update their active counts immediately (with rollback on server error).

**Independent Test**: With one overloaded technician (Ahmed, 6 bookings) and one available technician (Yousef, 0 bookings): tap Rebalance → select a booking from Ahmed → select Yousef → confirm → Ahmed's count drops to 5, Yousef's rises to 1 before the next poll. Simulate a server rejection → both counts snap back.

- [x] T016 [US3] Create `components/dashboard/RebalanceModal.tsx` — bottom sheet (use `Modal` with slide-up animation); receives `overloadedStaff: StaffPerformanceCard[]` and `eligibleRecipients: StaffPerformanceCard[]` as props; step 1: list overloaded staff with their `activeBookings`; step 2: user selects one booking from the list; step 3: user selects a recipient from `eligibleRecipients`; step 4: confirmation dialog (Platform-aware: `Alert.alert` on native, `window.confirm` on web); on confirm calls `assignTechnician` mutation from `bookingsApi`; shows error toast on rejection; uses i18n keys `staff.performanceBoard.rebalance.*`
- [x] T017 [US3] Add optimistic update to the assign call inside `RebalanceModal.tsx` — before calling `assignTechnician.unwrap()`, dispatch `analyticsApi.util.updateQueryData('getStaffPerformanceBoard', undefined, draft => { decrement from.activeBookingsCount; increment to.activeBookingsCount })` and store the patchResult; call `patchResult.undo()` in the catch block
- [x] T018 [US3] Wire the "Rebalance" button in `components/dashboard/StaffPerformanceBoard.tsx` — replace the disabled placeholder with an active button that opens `RebalanceModal`; pass `overloadedStaff` (cards where `isOverloaded === true`) and `eligibleRecipients` (cards where status is `AVAILABLE` or `ON_TASK` and not `OVERLOADED`); hide the button entirely when `overloadedStaff.length === 0` or when `data.staff.length <= 1`

**Checkpoint**: US3 functional — rebalance flow works end-to-end; optimistic update fires within 200 ms; rollback restores state on server error; button absent when no overloaded staff.

---

## Phase 6: User Story 4 — Trend Arrows (Priority: P3)

**Goal**: Staff cards show a colored ↑ or ↓ arrow when the technician's composite score changed meaningfully vs last month. The arrow is absent for peers when viewed by a TECHNICIAN.

**Independent Test**: Technician A has composite score 80 this month vs 65 last month (delta = +15 > trendThreshold 10) → upward green arrow. Technician B has score 55 this month vs 70 last month (delta = −15) → downward red arrow. Technician C changed only 3 points → no arrow. TECHNICIAN-role user → no arrows on any peer card.

- [x] T019 [P] [US4] Create `components/dashboard/TrendArrow.tsx` — accepts `direction: TrendDirection | undefined`; renders "↑" in `#10B981` (green) when `UP`, "↓" in `#EF4444` (red) when `DOWN`; renders `null` when `STABLE` or `undefined` (covers ethics guardrail automatically)
- [x] T020 [US4] Update `components/dashboard/StaffPerformanceCard.tsx` — import `TrendArrow`; render it alongside the staff name; pass `card.trendDirection`

**Checkpoint**: US4 functional — trend arrows appear on the correct cards based on composite score delta, absent for TECHNICIAN-role views, and correct arrow direction for each case.

---

## Phase 7: User Story 5 — Per-Staff Drill-Down (Priority: P3)

**Goal**: Tapping a staff card (for OWNER / BRANCH_MANAGER) opens a detail screen showing month-by-month metrics for at least the last 3 months, recent bookings, and customer reviews attributed to that technician.

**Independent Test**: As a BRANCH_MANAGER, tap a technician with 4 months of history → detail screen shows 4 months of metrics correctly aggregated; month where they joined mid-month uses a pro-rated baseline label. Navigate to the screen as a TECHNICIAN → see 403 / access-denied state, not data.

- [ ] T021 *(backend repo)* [US5] Implement `GET /analytics/center/staff/{membershipId}/history` returning `StaffHistoryResponse` per contracts/api-contract.md; restrict to OWNER and BRANCH_MANAGER roles (403 for TECHNICIAN); use `booking_assignment_history` for time-to-completion attribution; default to last 6 months, accept `?months=N` query param
- [x] T022 [US5] Add `getStaffMonthlyHistory` query to `store/api/analyticsApi.ts` — endpoint `analytics/center/staff/${membershipId}/history`, params `{ months }`, providesTags `[{ type: 'StaffPerformance', id: membershipId }]`; import `StaffHistoryResponse` from `types/staffPerformance.ts`; export `useGetStaffMonthlyHistoryQuery`
- [x] T023 [US5] Create `app/(app)/(tabs)/staff/performance/[membershipId].tsx` — fetch history via `useGetStaffMonthlyHistoryQuery`; render: header (name), monthly metrics section (map `months[]` to rows: month/year label, completedBookings, avgRating formatted "—" when null, onTimeRate as %, avgCompletionTimeMinutes as minutes); recent bookings list; wrap screen body in `<PermissionGate permissions={['MANAGE_NON_MANAGER_STAFF']} fallback={<AccessDenied />}>`; loading and error states
- [x] T024 [US5] Update `components/dashboard/StaffPerformanceCard.tsx` — replace the tap stub with `router.push('/staff/performance/' + card.membershipId)` for users who have `MANAGE_NON_MANAGER_STAFF` permission (check via `ROLE_PERMISSIONS[userRole]`); for TECHNICIAN-role users, tapping does nothing (or shows their own profile)

**Checkpoint**: US5 functional — drill-down accessible from any staff card for managers/owners; shows correct aggregated history; TECHNICIAN accessing peer's drill-down sees access-denied state.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Ethics guardrail verification, edge case validation, RTL check.

- [x] T025 [P] Ethics guardrail test — authenticate as a TECHNICIAN-role user, call `GET /analytics/center/staff-performance` directly (e.g., via curl or Postman), assert the response for each peer card contains no `tier`, `isOverloaded`, or `trendDirection` field; document the test steps in `specs/018-staff-performance-board/checklists/ethics-test.md`
- [ ] T026 [P] RTL smoke check — set app locale to Arabic (`i18n.changeLanguage('ar')`), navigate to dashboard, verify: board card text aligns right, badges render correctly, metric row labels don't overflow on 375 px width, arrow icons are RTL-mirrored if needed *(requires backend endpoints to be live)*
- [ ] T027 [P] Single-technician branch edge case — with only one active staff member at the test center, verify: no "Overloaded" badge appears, "Rebalance" button is absent, the board renders the single card normally with correct status *(requires backend endpoints to be live)*
- [ ] T028 Run `specs/018-staff-performance-board/quickstart.md` acceptance checklist end-to-end; mark each item pass/fail; record any gaps as follow-up issues *(requires backend endpoints to be live)*

**Checkpoint**: All acceptance criteria from spec.md are verified. Feature is production-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)       — no dependencies; T001, T002, T003 run in parallel
      ↓
Phase 2 (Foundational)— T004–T006 are backend (can overlap with Phase 1);
                        T007 depends on T004–T006 backend endpoints being accessible;
                        T008, T009 can run once T007 is done (or in parallel with T007)
      ↓
Phase 3 (US1, P1)     — T010, T011 run in parallel; T012 depends on T010+T011; T013 on T012
      ↓
Phase 4 (US2, P2)     — T014 runs in parallel with T015 start; T015 depends on T014
Phase 5 (US3, P2)     — T016 runs first; T017 depends on T016; T018 depends on T016+T017
      ↓
Phase 6 (US4, P3)     — T019, T020 run sequentially; can start after Phase 4 (T015) is done
Phase 7 (US5, P3)     — T021 is backend; T022 depends on T021; T023 depends on T022; T024 on T023
      ↓
Phase 8 (Polish)      — T025–T028 run after all user stories are complete; T025–T027 in parallel
```

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only. No dependency on other user stories.
- **US2 (P2)**: Depends on US1 (builds on `StaffPerformanceCard.tsx`).
- **US3 (P2)**: Depends on US1 (`StaffPerformanceBoard` provides the board context); can run in parallel with US2.
- **US4 (P3)**: Depends on US2 (adds to the card already updated in US2).
- **US5 (P3)**: Depends on US1 (card tap target); independent of US2/US3/US4.

### Parallel Opportunities

- T001, T002, T003 (Phase 1) — fully parallel
- T004, T005, T006 (backend) — independent backend tasks, all parallel
- T007, T008, T009 (Phase 2 frontend) — T008 and T009 can start alongside T007 since they edit different files
- T010, T011 (Phase 3) — different files, fully parallel
- T014 (Phase 4) and T016 (Phase 5) — different files, can start in parallel after US1
- T019 (Phase 6) and T021 (Phase 7 backend) — different files and repos, fully parallel
- T025, T026, T027 (Phase 8) — fully parallel

---

## Parallel Execution Examples

### Phase 1 (all parallel)

```
Task T001: Create types/staffPerformance.ts
Task T002: Add en.json staff.performanceBoard.* keys
Task T003: Add ar.json staff.performanceBoard.* keys
```

### Phase 3 (US1)

```
Parallel start:
  Task T010: Create StaffStatusBadge.tsx
  Task T011: Create StaffPerformanceCard.tsx (skeleton)

Then sequential:
  Task T012: Create StaffPerformanceBoard.tsx (needs T010, T011)
  Task T013: Integrate into index.tsx (needs T012)
```

### Phase 4 (US2) + Phase 5 (US3) in parallel

```
Developer A — US2:
  Task T014: Create PerformanceTierBadge.tsx
  Task T015: Update StaffPerformanceCard.tsx with tier badge + real metrics

Developer B — US3:
  Task T016: Create RebalanceModal.tsx
  Task T017: Add optimistic update
  Task T018: Wire Rebalance button in StaffPerformanceBoard.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup — T001–T003)
2. Complete Phase 2 (Foundational — T004–T009)
3. Complete Phase 3 (US1 — T010–T013)
4. **STOP and VALIDATE**: Board renders real staff, sorts correctly, shows status and active counts
5. Ship MVP — managers can see workload at a glance

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → read-only workload board (**MVP**)
3. US2 → add tier badges and real metrics → proactive coaching possible
4. US3 → add rebalance action → manager can act, not just observe
5. US4 → add trend arrows → direction visible without tier change
6. US5 → add drill-down → full per-staff coaching data

### Parallel Team Strategy

With two developers after Phase 2:

- **Dev A**: US1 → US2 → US4
- **Dev B**: US3 → US5 (US5 only needs US1 card tap, which Dev A finishes before US3 starts)

---

## Summary

| Phase | Tasks | Story | Parallel? |
|-------|-------|-------|-----------|
| 1 — Setup | T001–T003 | — | ✅ All parallel |
| 2 — Foundational | T004–T009 | — | ✅ T004/005/006 parallel; T007/008/009 parallel |
| 3 — US1 (P1) MVP | T010–T013 | US1 | ✅ T010+T011 parallel |
| 4 — US2 (P2) | T014–T015 | US2 | ✅ T014 parallel start |
| 5 — US3 (P2) | T016–T018 | US3 | ⬜ Sequential |
| 6 — US4 (P3) | T019–T020 | US4 | ✅ T019 parallel |
| 7 — US5 (P3) | T021–T024 | US5 | ✅ T021+T022 parallel start |
| 8 — Polish | T025–T028 | — | ✅ T025+T026+T027 parallel |
| **Total** | **28 tasks** | | |

### Task distribution by user story

| Story | Tasks | Count |
|-------|-------|-------|
| Foundation | T001–T009 | 9 |
| US1 Workload Overview | T010–T013 | 4 |
| US2 Tier Badges | T014–T015 | 2 |
| US3 Rebalance | T016–T018 | 3 |
| US4 Trend Arrows | T019–T020 | 2 |
| US5 Drill-Down | T021–T024 | 4 |
| Polish | T025–T028 | 4 |
