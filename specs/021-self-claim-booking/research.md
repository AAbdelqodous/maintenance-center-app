# Research: Self-Claim Booking

**Feature**: 021-self-claim-booking  
**Phase**: Phase 0 — Research  
**Date**: 2026-05-25

All questions resolved by reading the existing codebase, dependent spec artifacts, and standard JPA/Spring Boot patterns. No external research required.

---

## Decision 1: Pessimistic vs optimistic locking for atomic claim (FR-SC-009)

**Question**: How do we guarantee that exactly one technician succeeds when two technicians claim the same booking simultaneously?

**Decision**: JPA pessimistic write lock — `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the repository method that fetches the `Booking` row before claim.

**Rationale**: A claim is a read-check-write sequence: read `assignedMembershipId`, check it is null, write the claiming technician's membership. Without a database-level lock, two concurrent transactions can both read `null` and both proceed to write — producing a double-assignment. `PESSIMISTIC_WRITE` translates to `SELECT ... FOR UPDATE` in PostgreSQL, which forces the second transaction to wait until the first commits or rolls back. After the first commit, the second transaction reads the updated `assignedMembershipId` (now non-null), fails precondition 4, and returns `BOOKING_ALREADY_CLAIMED`.

**Alternatives considered**:
- **Optimistic locking (`@Version`)**: Would work but surfaces as `OptimisticLockException` → 409/500 with a raw exception message, not a clean `BOOKING_ALREADY_CLAIMED` code. Pessimistic is cleaner UX-wise and simpler to map to error codes.
- **Application-level check only**: Race condition between read and write — not safe under concurrent load.
- **Unique constraint on `(booking_id, assigned_membership_id)`**: Not applicable — `assignedMembershipId` can be null (unassigned) and can change (reassignment). A partial unique index on `assigned_membership_id IS NOT NULL` doesn't prevent double-assignment during concurrent writes.

**Performance note**: `SELECT ... FOR UPDATE` holds a row lock for <50ms in the fast path (one assignment, one audit insert, commit). Under NFR-SC-003's 20-concurrent-claimers test, 19 transactions queue on the lock and each unblocks in sequence — total tail latency is bounded by 20 × transaction time. With a <50ms transaction, this is well within the 500ms p95 NFR-SC-001 target.

---

## Decision 2: Queue polling interval (spec §5.3)

**Question**: The spec defers the polling interval to the plan phase. What interval balances freshness against API load?

**Decision**: 30 seconds (`pollingInterval = 30_000` ms).

**Rationale**: The spec's primary requirement is that a claimed booking disappears from the queue without manual refresh. A 30s maximum staleness window is acceptable for an internal operations screen. This matches the existing notification polling interval in the app (consistent feel). Lower (15s) would double API calls with little perceptible benefit; higher (60s) creates a noticeable gap where a claimed booking lingers in colleagues' queues.

**Implementation**: The queue screen uses a React `setInterval` (30_000ms) that resets pagination state and triggers a re-fetch of page 0. RTK Query's `pollingInterval` option is not used here because the queue has local pagination state — `pollingInterval` would re-fetch the current page (possibly page 3), not reset to page 0. The manual interval is cleaner for this pattern:

```typescript
useEffect(() => {
  const id = setInterval(() => {
    setAllBookings([]);
    setHasMore(true);
    if (page === 0) refetch();   // already on page 0 — force refetch
    else setPage(0);             // changing page triggers re-fetch via query args change
  }, 30_000);
  return () => clearInterval(id);
}, [page, refetch]);
```

---

## Decision 3: Queue endpoint — server-inferred vs client-supplied department filter (spec §5.1)

**Question**: Does the frontend pass `departmentId(s)` as query params, or does the backend infer them?

**Decision**: Server-inferred only — spec §5.1 Option 1b mandates this. No `departmentId` query parameter is accepted or needed.

**Rationale**: The technician's department assignments are already stored in `department_memberships` as a fact the server knows from their authenticated membership. Accepting a client-supplied filter would duplicate this state, introduce drift risk (stale or spoofed department IDs), and weaken the audit story. The backend loads `departmentIds` from `CenterMembershipRepository.findByUserAndCenter()` → `departmentMemberships` join, then filters the booking queue accordingly.

**noDepartmentMembership flag**: When a technician's `departmentIds` list is empty (no assignments), the backend returns a standard page response with `content: []` plus a `noDepartmentMembership: true` flag so the frontend can show the correct empty-state message ("You are not assigned to any department...") rather than the generic empty-state ("No unassigned bookings...").

---

## Decision 4: Audit entity design (FR-SC-011, FR-SC-012)

**Question**: Where does the claim audit record live — on the `Booking` entity or in a separate table?

**Decision**: Dedicated `booking_claim_audit` table with immutable rows.

**Rationale**: FR-SC-012 forbids modification of audit records after creation. A separate table enforces this structurally — the `BookingClaimAuditRepository` has no `update` method and the entity has no `@LastModifiedDate`. Inline columns on `Booking` (e.g., `claimedAt`, `claimedByMembershipId`) would be overwritten on reassignment, losing the original claim record. A separate table also supports multiple claim events per booking lifetime (claim → manager reassigns → technician re-claims) while retaining the full chain.

**Fields**: `id` (PK), `bookingId` (FK), `membershipId`, `userId`, `departmentId`, `claimedAt` (server-generated, immutable via `@CreatedDate`). All columns NOT NULL — a partial audit record is not a valid audit record.

---

## Decision 5: Error response format — businessErrorCode field name (FR-SC-013)

**Question**: Does the frontend read the error code from `err.data.error` or `err.data.businessErrorCode`?

**Decision**: Read from `err.data.error` — this is the existing pattern in `app/(app)/staff/bookings/[id].tsx`.

**Rationale**: The existing `codeToKey` map in the claim handler uses `err?.data?.error ?? ''`. The `GlobalExceptionHandling` class serializes errors with both `businessErrorCode` (numeric) and `error` (string) — the string field is what the frontend maps. This is consistent with how `assignBookingManually` handles `CROSS_DEPARTMENT_NOT_ALLOWED`. The new `WRONG_DEPARTMENT` entry in `codeToKey` follows the same pattern.

---

## Decision 6: BookingResponse extension for queue and detail screens

**Question**: Which fields does the frontend need on `BookingResponse` that the backend may not currently return?

**Decision**: Add `assignedMembershipId`, `assignedStaffName`, `departmentId`, `departmentNameAr`, `departmentNameEn` to `BookingResponse`.

**Rationale**: The frontend `Booking` TypeScript interface in `bookingsApi.ts` already defines all five fields. The queue screen renders `departmentNameAr`/`departmentNameEn` as a department label on each card. The detail screen uses `assignedMembershipId` to decide whether to show the claim button (null = unassigned). The backend `BookingResponse` DTO needs to populate these from the `Booking` entity's `assignedMembership` and `department` JPA relationships.

**assignedStaffName**: Concatenation of `assignedMembership.user.firstname + " " + assignedMembership.user.lastname`. Null if `assignedMembership` is null.

---

## Decision 7: Queue sort order and pagination (FR-SC-002)

**Question**: How is the queue sorted and paginated?

**Decision**: Sorted by `bookingDate` ASC, `bookingTime` ASC (earliest booking first per FR-SC-002). Standard `PageResponse<BookingResponse>` wrapper (page, size query params). Default page size 20.

**Rationale**: Technicians should work on the most urgent (earliest scheduled) bookings first. Pagination is needed if a busy center has many unassigned bookings. The existing `BookingsResponse` shape (with `content`, `totalElements`, etc.) is reused — the queue screen already handles this shape.
