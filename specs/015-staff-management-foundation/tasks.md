# Tasks: Staff Management Foundation

**Input**: Design documents from `specs/015-staff-management-foundation/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: No test tasks — tests are not requested in the spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

> **Note on pre-existing work**: User Stories 1 (View Staff List) and 2 (Add Staff Member) are fully implemented in the current codebase. Their phases below are checkpoints only. Implementation begins at Phase 4 (US3 gap) and is largest in Phase 5 (US4 — booking assignment).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are absolute from project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend shared types and add i18n strings that all user story phases depend on.

**⚠️ CRITICAL**: Complete before any implementation in Phases 3–6.

- [x] T001 Extend `Booking` interface in `store/api/bookingsApi.ts` — add `assignedMembershipId: number | null` and `assignedStaffName: string | null` after the `workStage` field
- [x] T002 [P] Add English i18n keys to `lib/i18n/locales/en.json` under the `"bookings"` object: `assignTechnician`, `assignedTo`, `unassigned`, `reassign`, `unassignConfirm`, `assignSuccess`, `crossBranchError` (see data-model.md for exact strings)
- [x] T003 [P] Add Arabic i18n keys to `lib/i18n/locales/ar.json` under the `"bookings"` object with the same key names as T002 (see data-model.md for exact Arabic strings)

**Checkpoint**: `Booking` type is extended; all i18n keys are in place. TypeScript compilation still passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the two new RTK Query endpoints that US4 and US5 both depend on.

**⚠️ CRITICAL**: Both endpoints must exist before any screen-level work in Phases 4–6.

- [x] T004 Add `assignTechnician` mutation to `store/api/bookingsApi.ts` endpoints block — `PUT /bookings/{bookingId}/assign` with body `{ membershipId: number | null }`, returns `Booking`, invalidates `['Booking', { type: 'Booking', id: bookingId }]` (see contracts/booking-assignment.md for full shape)
- [x] T005 [P] Add `getMyAssignedBookings` query to `store/api/staffApi.ts` endpoints block — `GET /bookings/assigned` with `page`, `size`, `status` params; same `transformResponse` pattern as `getCenterStaff`; `providesTags: ['Staff']` (see contracts/booking-assignment.md for full shape)
- [x] T006 [P] Export `useAssignTechnicianMutation` from `store/api/bookingsApi.ts` and `useGetMyAssignedBookingsQuery` from `store/api/staffApi.ts`

**Checkpoint**: Both hooks are importable. No existing tests break.

---

## Phase 3: User Story 1 + 2 — Already Implemented ✅

**Goal**: Staff roster management (view list, invite by email, accept invitation).

**Status**: Fully built — `app/(app)/(tabs)/profile/staff/` index, invite, and [id] screens are complete. `staffApi.ts` has all roster endpoints. No tasks needed.

**Independent Test**: Log in as CENTER_OWNER → Profile → Staff tab → list renders with filter tabs; FAB opens invite screen; tapping a member opens detail with role-change, suspend, and remove actions.

---

## Phase 4: User Story 3 — Owner Changes Role or Deactivates Staff (Priority: P3)

**Goal**: The roster management screens already handle role change, suspend, reinstate, and remove. The one gap is surfacing a targeted error when deactivating a staff member who still has active assigned bookings.

**Independent Test**: As owner, attempt to suspend a Technician who has at least one CONFIRMED or IN_PROGRESS booking assigned to them → a specific bilingual error message appears (not a generic "error") and a CTA is visible to navigate to bookings.

- [x] T007 [US3] In `app/(app)/(tabs)/profile/staff/[id].tsx`, update the `handleSuspend` catch block: check `err?.data?.error === 'STAFF_HAS_ACTIVE_ASSIGNMENTS'`; if matched, show a bilingual message `t('staff.member.hasActiveAssignments')` + a "View Bookings" button that calls `router.push('/(app)/(tabs)/bookings')` before closing; otherwise fall through to the existing generic error display
- [x] T008 [P] [US3] In `app/(app)/(tabs)/profile/staff/[id].tsx`, apply the same active-assignment check to the `handleRemove` catch block (same error key, same CTA pattern as T007)
- [x] T009 [P] [US3] Add the `staff.member.hasActiveAssignments` i18n key to `lib/i18n/locales/en.json` (value: `"This staff member has active bookings. Reassign them first."`) and `lib/i18n/locales/ar.json` (value: `"لدى هذا الموظف حجوزات نشطة. يرجى إعادة تعيينها أولاً."`)

**Checkpoint**: Suspend or remove a Technician with active assignments → targeted bilingual error + "View Bookings" CTA appears. Suspend a Technician with no active assignments → succeeds as before.

---

## Phase 5: User Story 4 — Owner/Branch Manager Assigns Booking to Technician (Priority: P4)

**Goal**: Owner and Branch Manager can assign an active Technician to any confirmed booking from the booking detail screen. The assignment is reflected in both assignees' views within one refresh.

**Independent Test**: Owner assigns booking #X to Technician A → booking detail shows Technician A's name; reassign to Technician B → Technician A's name is gone, Technician B's name appears; booking card in list shows the assigned name.

### Build the TechnicianPicker component

- [x] T010 [US4] Create `components/bookings/TechnicianPicker.tsx` — a `Modal`-based bottom sheet that:
  - Calls `useGetCenterStaffQuery({ status: 'ACTIVE' })` and filters results to `role === 'TECHNICIAN'`
  - Props: `visible: boolean`, `currentMembershipId: number | null`, `onSelect: (membershipId: number | null) => void`, `onClose: () => void`
  - First row is "Unassign" (calls `onSelect(null)`) with a muted style
  - Each technician row shows `userFirstname + ' ' + userLastname` and a `<RoleBadge role="TECHNICIAN" />`
  - Current assignee row is highlighted (matches `currentMembershipId`)
  - RTL layout support via `i18n.dir()` check
  - Loading indicator while `getCenterStaff` is fetching
  - Accessible from both owner and staff booking detail screens

### Add "Assign Technician" section to owner booking detail

- [x] T011 [US4] In `app/(app)/(tabs)/bookings/[id].tsx`, inside the `activeTab === 'details'` block after the details card, add a new card wrapped in `<PermissionGate permission="ASSIGN_TECHNICIAN">`:
  - Header label: `t('bookings.assignedTo')`
  - Assignee display: `booking.assignedStaffName` or `t('bookings.unassigned')` (muted text color)
  - "Assign" / "Reassign" button that sets local `showPicker` state to `true`
  - Renders `<TechnicianPicker visible={showPicker} currentMembershipId={booking.assignedMembershipId} onSelect={handleAssign} onClose={() => setShowPicker(false)} />`
  - `handleAssign` calls `assignTechnician({ bookingId: Number(id), membershipId })`, shows `t('bookings.assignSuccess')` on success, shows `err?.data?.businessErrorDescription ?? t('bookings.crossBranchError')` on failure
  - Calls `refetch()` after successful assignment

### Add "Assign Technician" section to staff booking detail

- [x] T012 [US4] In `app/(app)/staff/bookings/[id].tsx`, add the identical "Assign Technician" card using the same `PermissionGate permission="ASSIGN_TECHNICIAN"` pattern as T011 — Branch Managers see this section, Technicians do not

### Show assigned technician on BookingCard

- [x] T013 [US4] In `components/bookings/BookingCard.tsx`, add optional prop `showAssignedTo?: boolean` (default `false`); when `true` and `booking.assignedStaffName` is not null, render an extra row below the date/time row with a person icon and the assignee name; when `true` and `assignedStaffName` is null, render the same row with `t('bookings.unassigned')` in muted grey
- [x] T014 [P] [US4] In `app/(app)/(tabs)/bookings/index.tsx`, pass `showAssignedTo={true}` to every `<BookingCard />` rendered in the owner's booking list
- [x] T015 [P] [US4] In `app/(app)/staff/bookings/index.tsx`, pass `showAssignedTo={true}` only when `activeUserRole !== 'TECHNICIAN'` — Branch Managers and Receptionists see the assignee name, Technicians do not (they know they're the assignee)

**Checkpoint**: Owner opens a CONFIRMED booking → "Assign Technician" section visible → picker opens with active technicians → assignment saves → booking card in list shows the name → same booking detail shows the name on next open.

---

## Phase 6: User Story 5 — Role-Based Navigation Enforcement (Priority: P5)

**Goal**: Technicians and Receptionists cannot access pricing or offers routes within the staff area, even via direct deep link. Technicians see only their assigned bookings, not all branch bookings.

**Independent Test**: Log in as TECHNICIAN → staff bookings list shows only assigned bookings; attempt to deep-link to `/staff/pricing` → redirect to `/staff/dashboard`. Log in as BRANCH_MANAGER → bookings list shows all bookings; `/staff/pricing` loads if that role has MANAGE_PRICING permission.

### Role-conditional bookings query

- [x] T016 [US5] In `app/(app)/staff/bookings/index.tsx`, import `useAppSelector` and `useGetMyAssignedBookingsQuery` from `store/api/staffApi`; read `activeUserRole` from `state.center.activeUserRole`; when `activeUserRole === 'TECHNICIAN'` use `useGetMyAssignedBookingsQuery({ page, size: 20, status: statusParam })` instead of `useGetBookingsQuery`; keep pagination and refresh logic identical for both paths

### Intra-staff route guards

- [x] T017 [US5] In `app/(app)/staff/_layout.tsx`, after the existing `Stack` setup, add two redirect guards:
  - Read `activePermissions` from `useAppSelector(s => s.center.activePermissions)`
  - If current path starts with `/staff/pricing` and `!activePermissions.includes('MANAGE_PRICING')`, return `<Redirect href="/staff/dashboard" />`
  - If current path starts with `/staff/offers` and `!activePermissions.includes('MANAGE_OFFERS')`, return `<Redirect href="/staff/dashboard" />`
  - Use `usePathname()` from expo-router for the current path check

**Checkpoint**: Technician login → bookings tab shows only assigned items (or empty state if none assigned). Direct navigation to `/staff/pricing` (or `/staff/offers`) redirects to `/staff/dashboard` for roles without that permission.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, and RTL spot-check.

- [x] T018 RTL spot-check on `TechnicianPicker` — open the picker in Arabic locale and verify the modal layout, row direction, and text alignment are correct
- [x] T019 [P] Verify `window.confirm` (not `Alert.alert`) is used in all new confirmation dialogs that are already within web-guarded blocks — check `TechnicianPicker` unassign confirm and deactivation error CTA in `profile/staff/[id].tsx`
- [x] T020 [P] Run a full smoke test against quickstart.md scenarios: (1) assign technician → verify booking card updates; (2) reassign → verify previous assignee no longer shows; (3) deactivate with active booking → verify error + CTA; (4) Technician deep-link to `/staff/pricing` → verify redirect

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (uses extended `Booking` type)
- **Phase 4 (US3)**: Depends on Phase 1 (i18n keys) — independent of Phase 2
- **Phase 5 (US4)**: Depends on Phase 2 (both new RTK endpoints must exist)
- **Phase 6 (US5)**: Depends on Phase 2 T005 (`getMyAssignedBookings` must exist)
- **Phase 7 (Polish)**: Depends on all implementation phases complete

### User Story Dependencies

- **US3 (P3)**: Depends on Phase 1 only (i18n key T009)
- **US4 (P4)**: Depends on Phase 2 (T004, T005, T006) — largest phase
- **US5 (P5)**: Depends on Phase 2 T005 for T016; T017 is independent of Phase 2

### Within Each User Story

- US4: T010 (TechnicianPicker) must complete before T011 and T012 (both screens depend on it)
- US4: T013 (BookingCard prop) must complete before T014 and T015
- US5: T016 and T017 are independent of each other (different files)

### Parallel Opportunities

- T002 and T003 (i18n files) run in parallel in Phase 1
- T004, T005, T006 can all be written in parallel in Phase 2 (different endpoint additions to different or same file sections — T004 goes in bookingsApi, T005 in staffApi)
- T007, T008, T009 are parallel in Phase 4 (US3)
- T011 and T012 can run in parallel after T010 (different route files)
- T014 and T015 can run in parallel after T013 (different route files)
- T016 and T017 are parallel in Phase 6 (different files)
- T018, T019, T020 are parallel in Phase 7

---

## Parallel Example: User Story 4 (Booking Assignment)

```
# After T010 (TechnicianPicker) is done:
Parallel: T011 (owner booking detail) + T012 (staff booking detail)

# After T013 (BookingCard prop) is done:
Parallel: T014 (owner list) + T015 (staff list, conditional)
```

---

## Implementation Strategy

### MVP First (US4 — Booking Assignment, the core deliverable)

1. Complete Phase 1: T001, T002, T003
2. Complete Phase 2: T004, T005, T006
3. Build TechnicianPicker: T010
4. Wire owner booking detail: T011
5. **STOP and VALIDATE**: Open a booking as owner → assign a technician → success
6. Continue: T012, T013, T014, T015

### Incremental Delivery

1. Phase 1 + 2 → types and endpoints ready
2. Phase 4 (US3 gap) → deactivation error handling (small, independent)
3. Phase 5 (US4) → booking assignment end-to-end (main deliverable)
4. Phase 6 (US5) → navigation enforcement (hardening)
5. Phase 7 → polish and smoke test

---

## Notes

- [P] tasks = different files or independent sections, no blocking dependency on each other
- [Story] label maps each task to a user story from spec.md
- All screens already use the `StyleSheet.create` pattern — keep consistent
- All error messages use `err?.data?.businessErrorDescription` as primary, i18n key as fallback
- Web platform guard pattern: `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)`
- Commit after each checkpoint to allow rollback to known-good state
