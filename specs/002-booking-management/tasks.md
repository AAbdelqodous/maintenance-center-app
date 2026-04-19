# Tasks: Phase 2 — Booking Management

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-2-booking-management`

---

## Phase 1: Foundational

- [x] T001 Create `store/api/bookingsApi.ts` — exports `BookingStatus`, `ServiceType` enums; endpoints:
  - `getBookings(params: { page, size, status? })` → `PageResponse<BookingResponse>` (`GET /bookings`)
  - `getBookingById(id: number)` → `BookingResponse` (`GET /bookings/{id}`)
  - `getBookingStats()` → `BookingStats` (`GET /bookings/stats`)
  - `updateBookingStatus({ id, status, reason?, notes? })` → `BookingResponse` (`PUT /bookings/{id}/status`)
  - Tag: `'Bookings'`

---

## Phase 2: User Story 1 + 2 — Bookings List & Detail (P1)

**Goal**: Owner sees filterable paginated list; tapping opens full detail.

- [x] T002 [P] Create `components/bookings/StatusBadge.tsx` — color-coded status pill using NativeWind; maps `BookingStatus` to background/text colors
- [x] T003 [P] Create `components/bookings/BookingCard.tsx` — renders customer name, service type (translated), date/time, `StatusBadge`, overdue badge (amber warning when `status === PENDING` and scheduled time is in the past)
- [x] T004 Create `app/(app)/(tabs)/bookings/_layout.tsx` — Stack navigator for bookings sub-screens
- [x] T005 Create `app/(app)/(tabs)/bookings/index.tsx` — booking list screen:
  - Filter tabs: All / Pending / In Progress / Completed / Cancelled (horizontal scroll tabs)
  - `useGetBookingsQuery({ page, status })` with `FlatList` + `onEndReached` pagination
  - Pull-to-refresh via `refetch()`
  - Empty state per filter
  - Each `BookingCard` navigates to `./[id]` on press
- [x] T006 Create `app/(app)/(tabs)/bookings/[id].tsx` — booking detail screen:
  - `useGetBookingByIdQuery(id)` → renders all fields (customer name, phone, service, date/time, notes, payment method, payment status, status)
  - Conditional action buttons based on `booking.status` (see US3 + US4)
  - Rejection bottom sheet (Modal) with 4 predefined reasons + "Other" free-text

---

## Phase 3: User Story 3 — Accept / Reject (P1)

**Goal**: Accept (with confirmation), reject (with reason selection), both update status in real time.

- [x] T007 Add Accept handler in `[id].tsx` — `Alert.alert` confirmation (platform-aware: `window.confirm` on web) → `updateBookingStatus({ id, status: 'CONFIRMED' })` → success toast → status reflects immediately via RTK cache invalidation
- [x] T008 Add Reject handler in `[id].tsx` — opens `Modal` bottom sheet → `RejectionReasonOption` list (4 predefined + "Other" with `TextInput`) → confirm → `updateBookingStatus({ id, status: 'CANCELLED', reason })` → success toast

---

## Phase 4: User Story 4 — Progress Booking (P2)

**Goal**: Mark Confirmed → In Progress → Completed.

- [x] T009 Add "Mark as In Progress" button in `[id].tsx` (shown when `status === CONFIRMED`) — confirmation + `updateBookingStatus({ id, status: 'IN_PROGRESS' })`
- [x] T010 Add "Mark as Completed" button in `[id].tsx` (shown when `status === IN_PROGRESS`) — confirmation + `updateBookingStatus({ id, status: 'COMPLETED' })`

---

## Phase 5: User Story 5 — Pull-to-Refresh (P2)

- [x] T011 Wire `RefreshControl` on bookings list `FlatList` to `refetch()` from `useGetBookingsQuery`

---

## Phase 6: Polish

- [x] T012 Add i18n keys for bookings: status labels, filter tabs, action button labels, error messages, rejection reasons
- [x] T013 Verify RTL layout: BookingCard, StatusBadge, detail row labels all flip correctly in Arabic
- [x] T014 Verify overdue indicator: appears on PENDING bookings where `scheduledDate + scheduledTime < now()`

---

## Dependencies

- T001 (bookingsApi) must complete before T002–T010
- T003 (BookingCard) depends on T002 (StatusBadge)
- T005 (list screen) depends on T003 (BookingCard) + T001 (API)
- T006 (detail screen) depends on T001 (API)
- T007–T010 extend T006 (detail screen)
