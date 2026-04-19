# Research: Phase 2 — Booking Management

**Branch**: `phase-2-booking-management` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Pagination Strategy

**Decision**: RTK Query cursor/page-based pagination using `page` + `size` query params, unwrapped via `transformResponse`.

**Rationale**:
- Backend returns `{ content: [...], totalElements, totalPages, number, size }` (`PageResponse` wrapper).
- `transformResponse` unwraps to just `content[]` + total metadata for clean consumption.
- `FlatList` `onEndReached` triggers loading the next page; appended to local state.
- Pull-to-refresh resets to page 0 and replaces list.

---

## Decision 2: Status Filter Approach

**Decision**: Client sends `status` query param to backend on each filter change; no client-side filtering of a pre-loaded full list.

**Rationale**:
- Centers may have hundreds of bookings — loading all to filter client-side is wasteful.
- `useGetBookingsQuery({ page: 0, size: 20, status })` — each filter tab triggers a new RTK Query key, which caches per (page, status) combination.
- Active filter stored in component state (`useState<BookingStatus | undefined>`).

---

## Decision 3: Overdue Detection

**Decision**: Client-side — compare `booking.bookingDate + booking.bookingTime` to `new Date()`.

**Rationale**:
- No dedicated backend "overdue" flag — the app computes it on render.
- Only meaningful for `PENDING` status bookings (others are already actioned).
- Uses `new Date(\`${bookingDate}T${bookingTime}\`) < new Date()` pattern.

---

## Decision 4: Reject Flow — Bottom Sheet vs. Alert

**Decision**: React Native `Modal` (bottom sheet style) for rejection reason selection. `Alert.alert` used for simple accept confirmation on native; `window.confirm` on web.

**Rationale**:
- Rejection needs a list of options — `Alert.alert` cannot render a scrollable list.
- A `Modal` with `animationType="slide"` and `transparent` gives a native bottom-sheet appearance without a library.
- Simple yes/no confirmations (accept, progress, complete) use `Alert.alert` on native, `window.confirm` on web, per project standard.

---

## Decision 5: `BookingStatus` and `ServiceType` Enum Location

**Decision**: Exported directly from `store/api/bookingsApi.ts`.

**Rationale**:
- These enums are used only by the booking-related screens and components.
- Re-exporting from a shared `types/` file is unnecessary until other features need them.
- Phase 3.5 re-exports `ServiceType` from `bookingsApi.ts` into `types/pricing.ts` when pricing needs it.

---

## Resolved Clarifications

- ✅ Pagination: RTK Query with `transformResponse`, `FlatList.onEndReached`
- ✅ Filter: server-side via `status` param
- ✅ Overdue: client-side date comparison on `PENDING` bookings
- ✅ Reject modal: React Native `Modal` (not `Alert.alert`)
- ✅ Enums: exported from `bookingsApi.ts`
