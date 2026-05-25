# Tasks: Self-Claim Booking

**Input**: Design documents from `/specs/021-self-claim-booking/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/self-claim-api.md ✅, quickstart.md ✅

**Note**: The frontend is largely pre-implemented (queue screen, claim button, RTK Query slices). The primary work is the backend. Frontend work is three small patches.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1 = queue, US2 = claim)

---

## Phase 1: Setup (Verification)

**Purpose**: Confirm existing schema and entity state before writing new code. These checks prevent the migration from being wrong about what already exists.

- [X] T001 Open `service-center/src/main/java/com/maintainance/service_center/booking/Booking.java` and verify `@ManyToOne Department department` field exists (added by spec 020). If missing, add the field and `@JoinColumn(name = "department_id")` annotation before proceeding to Phase 2.
- [X] T002 [P] Connect to the running PostgreSQL database and run `\d booking` to confirm whether `assigned_membership_id` column already exists. Record the result — Phase 2 migration is conditional on this finding.

---

## Phase 2: Foundational (Shared Backend Infrastructure)

**Purpose**: Database migration and shared DTO/entity additions that both user stories depend on. MUST complete before Phase 3 or Phase 4 begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Write Flyway migration in `service-center/src/main/resources/db/migration/V{next_version}__create_booking_claim_audit.sql` — create `booking_claim_audit` table with columns `(id, booking_id, membership_id, user_id, department_id, claimed_at)`, two indexes `(idx_claim_audit_booking, idx_claim_audit_membership)`, and — if T002 found the column missing — `ALTER TABLE booking ADD COLUMN IF NOT EXISTS assigned_membership_id BIGINT REFERENCES center_membership(id)`. Exact DDL is in `specs/021-self-claim-booking/data-model.md §Database Migration`. Note: No Flyway — ddl-auto:update used instead. Department.java, CenterMembership departments join, Booking.java new FKs, and BookingClaimAudit.java entity handle schema automatically.
- [X] T004 [P] Create `BookingClaimAudit.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — `@Entity`, `@Table(name = "booking_claim_audit")`, fields: `id (Long PK)`, `booking (@ManyToOne Booking, NOT NULL)`, `membershipId (Long, NOT NULL)`, `userId (Long, NOT NULL)`, `departmentId (Long, NOT NULL)`, `claimedAt (LocalDateTime, @CreatedDate, immutable)`. Apply `@EntityListeners(AuditingEntityListener.class)`. No setter for `claimedAt`.
- [X] T005 Create `BookingClaimAuditRepository.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — extend `JpaRepository<BookingClaimAudit, Long>`. No custom methods needed — `save()` from JPA is sufficient. No update or delete methods.
- [X] T006 [P] Extend `BookingResponse.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — add five new fields: `Long assignedMembershipId`, `String assignedStaffName`, `Long departmentId`, `String departmentNameAr`, `String departmentNameEn`. In the factory/mapping method, populate from `booking.getAssignedMembership()` (null-safe) and `booking.getDepartment()` (null-safe). Exact mapping logic is in `specs/021-self-claim-booking/data-model.md §BookingResponse (extension)`.

**Checkpoint**: Run `./mvnw test` in `service-center/`. Migration applies cleanly; `BookingClaimAudit` maps to `booking_claim_audit` table; `BookingResponse` serializes the five new fields.

---

## Phase 3: User Story 1 — Department Queue (FR-SC-001 to FR-SC-005)

**Goal**: A TECHNICIAN can view a paginated, chronologically sorted list of unassigned claimable bookings scoped to their department(s). A technician with no department assignments sees a clear explanatory message.

**Independent Test**: `GET /bookings/queue` as a TECHNICIAN with one department returns bookings from that department only, sorted by `bookingDate` ASC. `GET /bookings/queue` as a TECHNICIAN with zero department assignments returns `content: []` and `noDepartmentMembership: true`. Queue does not return bookings with status PENDING, IN_PROGRESS, COMPLETED, CANCELLED, or NO_SHOW.

### Implementation for User Story 1

- [X] T007 [US1] Add `findClaimableByDepartments()` JPQL query method to `BookingRepository.java` in `service-center/src/main/java/com/maintainance/service_center/booking/`. Query: `SELECT b FROM Booking b WHERE b.center = :center AND b.department.id IN :departmentIds AND b.assignedMembership IS NULL AND b.bookingStatus IN ('CONFIRMED','RESCHEDULED') ORDER BY b.bookingDate ASC, b.bookingTime ASC`. Return type `Page<Booking>`.
- [X] T008 [US1] Implement `BookingService.getQueue(CenterMembership callerMembership, Pageable pageable)` in `service-center/src/main/java/com/maintainance/service_center/booking/BookingService.java`. Logic: (1) load caller's `departmentIds` from `DepartmentMembershipRepository` or via `callerMembership.getDepartmentIds()`; (2) if list is empty, return `BookingQueueResponse` with empty content and `noDepartmentMembership = true`; (3) call `bookingRepository.findClaimableByDepartments(center, departmentIds, pageable)`; (4) map to `BookingQueueResponse` (page fields + `noDepartmentMembership = false`). Create inner `BookingQueueResponse` class (or a separate DTO) that extends the standard page fields with `boolean noDepartmentMembership`.
- [X] T009 [US1] Add `GET /bookings/queue` endpoint to `BookingController.java` in `service-center/src/main/java/com/maintainance/service_center/booking/`. Signature: `@GetMapping("/queue")` with `@RequestParam(defaultValue = "0") int page` and `@RequestParam(defaultValue = "20") int size`. Resolve the caller's active `CenterMembership` from `SecurityContextHolder`. Require `CLAIM_BOOKING` permission — return 403 if absent. Call `bookingService.getQueue(membership, PageRequest.of(page, size))`. Return the queue response directly.
- [X] T010 [P] [US1] Patch `store/api/bookingsApi.ts` in `maintenance-center-app/` — in the `getBookingQueue` endpoint's `transformResponse`, add `noDepartmentMembership: raw.noDepartmentMembership ?? false` after the `last` field. This passes the backend flag through to the queue screen that already reads `data?.noDepartmentMembership`.
- [X] T011 [P] [US1] Patch `app/(app)/staff/bookings/queue.tsx` in `maintenance-center-app/` — inside `DepartmentQueueScreen`, add a `useEffect` with a 30-second `setInterval` that resets pagination and triggers a fresh fetch: when `page === 0` call `refetch()`; when `page > 0` call `setPage(0)`, `setAllBookings([])`, `setHasMore(true)`. Include `page` and `refetch` in the dependency array. Return `clearInterval` from the cleanup function. Full pattern is in `specs/021-self-claim-booking/contracts/self-claim-api.md §Frontend Patches §3`.

**Checkpoint**: Log in as a TECHNICIAN, open Bookings → Department Queue, confirm assigned bookings do not appear, confirm no-department state shows the right message, and confirm the queue auto-refreshes every 30 seconds when another technician claims a booking.

---

## Phase 4: User Story 2 — Self-Claim (FR-SC-006 to FR-SC-014)

**Goal**: A TECHNICIAN can claim an unassigned booking from the queue. The claim is atomic — concurrent claims on the same booking produce exactly one success and one `BOOKING_ALREADY_CLAIMED` error. All five preconditions are enforced in order. Every successful claim writes an immutable audit record. All five error codes produce correct frontend messages in Arabic and English.

**Independent Test**: `POST /bookings/{id}/claim` assigns `assignedMembershipId`, returns updated `BookingResponse`, and creates one row in `booking_claim_audit`. Two concurrent `POST /bookings/{id}/claim` requests to the same unassigned booking produce exactly one 200 and one 409 `BOOKING_ALREADY_CLAIMED`. Booking outside the caller's department returns 409 `WRONG_DEPARTMENT`. Frontend claim error flow shows `bookings.wrongDepartment` message for `WRONG_DEPARTMENT` code.

### Implementation for User Story 2

- [X] T012 [US2] Add `findWithLockById(Long id)` method to `BookingRepository.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — annotate with `@Lock(LockModeType.PESSIMISTIC_WRITE)` and `@QueryHints(@QueryHint(name = "javax.persistence.lock.timeout", value = "3000"))`. Return type `Optional<Booking>`. This is the only method that should use the pessimistic lock.
- [X] T013 [US2] Implement `BookingService.claim(Long bookingId, CenterMembership callerMembership)` in `BookingService.java` — evaluate all 5 preconditions from spec §7 in exact listed order. Preconditions 1–3 outside the lock. Acquire lock via `bookingRepository.findWithLockById(bookingId)` for precondition 4. Evaluate precondition 5 under the lock. On success: `locked.setAssignedMembership(callerMembership)`, call `bookingClaimAuditRepository.save(new BookingClaimAudit(...))`, return `BookingResponse.from(locked)`. Use `@Transactional`. Throw a custom `ClaimException(businessErrorCode)` for each precondition failure — `GlobalExceptionHandling` maps it to HTTP 409 with the error code string. Pseudocode is in `specs/021-self-claim-booking/contracts/self-claim-api.md §Backend Implementation Notes`.
- [X] T014 [US2] Add `POST /bookings/{id}/claim` endpoint to `BookingController.java` — `@PostMapping("/{id}/claim")`. Resolve caller's `CenterMembership` from `SecurityContextHolder`. Require `CLAIM_BOOKING` permission — return 403 if absent. Call `bookingService.claim(id, membership)`. Return 200 with updated `BookingResponse`. Ensure `ClaimException` subclasses are handled by `GlobalExceptionHandling` and serialized as `{ "businessErrorCode": <code>, "error": "<code>", "businessErrorDescription": "<message>" }` with HTTP 409.
- [X] T015 [P] [US2] Patch `store/api/bookingsApi.ts` in `maintenance-center-app/` — add `'WRONG_DEPARTMENT'` to the `ClaimBookingErrorCode` union type: `| 'BOOKING_ALREADY_CLAIMED' | 'BOOKING_NOT_CLAIMABLE' | 'STAFF_INACTIVE' | 'WRONG_DEPARTMENT'`.
- [X] T016 [P] [US2] Patch `app/(app)/staff/bookings/[id].tsx` in `maintenance-center-app/` — inside `handleClaim`'s `codeToKey` map, add the entry `WRONG_DEPARTMENT: 'bookings.wrongDepartment'` after the existing `STAFF_INACTIVE` entry.
- [X] T017 [P] [US2] Add `bookings.wrongDepartment` i18n key to both locale files in `maintenance-center-app/lib/i18n/locales/`: in `en.json` add `"wrongDepartment": "This booking is in a different department. Ask your manager to assign it if needed."` and in `ar.json` add `"wrongDepartment": "هذا الحجز ينتمي لقسم مختلف. اطلب من مديرك التعيين إذا لزم الأمر."` — both inside the `"bookings"` object.

**Checkpoint**: Open a booking in the queue → tap Claim → confirm dialog → see success toast. Open the same booking in another session simultaneously → see "This booking was just claimed by another technician." Check `booking_claim_audit` — exactly one row. Check the booking row — `assigned_membership_id` set.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T018 Run `npx tsc --noEmit` in `maintenance-center-app/` — confirm zero TypeScript errors after T010, T011, T015, T016, T017 patches.
- [ ] T019 [P] Verify all 5 error codes from spec §7 produce HTTP 409 with the exact `businessErrorCode` string using curl against the running backend — one curl request per precondition. Verify error messages match spec §7 English text verbatim.
- [ ] T020 [P] Run quickstart.md Scenario 2 (concurrent claim test): fire 20 simultaneous `POST /bookings/{id}/claim` requests for the same unassigned booking. Verify `booking_claim_audit` has exactly 1 row. Verify `assigned_membership_id` is set to exactly one membership. Zero double-assignments across 3 runs.
- [ ] T021 [P] Run quickstart.md Scenario 4 (no-department technician): verify `GET /bookings/queue` returns `noDepartmentMembership: true` and the queue screen shows "You are not assigned to any department..." message (not generic empty state).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Verification)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS Phase 3 and Phase 4
- **Phase 3 (US1 — Queue)**: Depends on Phase 2 — can proceed in parallel with Phase 4 once Phase 2 is done
- **Phase 4 (US2 — Claim)**: Depends on Phase 2 — can proceed in parallel with Phase 3 once Phase 2 is done
- **Phase 5 (Polish)**: Depends on Phase 3 AND Phase 4 completion

### User Story Dependencies

- **US1 (Queue)**: Independent — needs foundational DTOs (T006) but not claim logic
- **US2 (Claim)**: Independent — needs `BookingClaimAudit` entity (T004/T005) but not queue endpoint

### Within Each Phase

- Phase 2: T003 (migration) → T004 and T006 can run in parallel → T005 depends on T004
- Phase 3: T007 → T008 (depends on T007) → T009 (depends on T008) | T010 and T011 can run in parallel with T007+
- Phase 4: T012 → T013 (depends on T012) → T014 (depends on T013) | T015, T016, T017 can run in parallel with each other

### Parallel Opportunities

Within a session using the Agent tool, these tasks can be dispatched in parallel:

```
# Phase 2 — after migration runs:
T004 (BookingClaimAudit entity) ← parallel with → T006 (BookingResponse extension)

# Phase 3+4 — after Phase 2 checkpoint:
T007-T009 (queue backend) ← parallel with → T012-T014 (claim backend)
T010-T011 (queue frontend patches) ← parallel with → T015-T017 (claim frontend patches)

# Phase 5:
T019, T020, T021 ← all parallel after T018 passes
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Complete Phase 1: Verify schema
2. Complete Phase 2: Migration + DTO extension
3. Complete Phase 3: Queue endpoint + frontend patch
4. **Validate**: Technician sees their department queue — stop and demo
5. Phase 4 (Claim) adds the action on top of the queue view

### Full Feature (All Phases)

1. Phase 1 → Phase 2 → Phase 3 + Phase 4 (parallel if possible) → Phase 5
2. After Phase 3 checkpoint: queue is live, bookings visible
3. After Phase 4 checkpoint: claim button works, audit trail active, all errors localized
4. Phase 5: type-check, concurrency test, RTL validation

---

## Notes

- `[P]` marks tasks that touch different files and have no unfinished dependencies — safe to run in parallel
- The backend `ClaimException` class must be handled by `GlobalExceptionHandling` — either add a new `@ExceptionHandler(ClaimException.class)` or reuse an existing handler pattern
- Do NOT expose a `findWithLockById` call path from any endpoint other than `claim()` — pessimistic locks held unnecessarily degrade performance
- Confirm the exact Flyway version number (`V{n}`) by checking the latest migration file in `service-center/src/main/resources/db/migration/`
- Spec 020 migration (departments) must be applied before this migration can reference `department_id` FK in `booking_claim_audit`
