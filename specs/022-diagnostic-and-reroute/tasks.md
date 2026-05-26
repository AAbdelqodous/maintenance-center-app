# Tasks: Diagnostic Department & Booking Re-Route

**Input**: Design documents from `/specs/022-diagnostic-and-reroute/`
**Prerequisites**: [plan.md](plan.md) ✅, [spec.md](spec.md) ✅, [research.md](research.md) ✅, [data-model.md](data-model.md) ✅, [contracts/diagnostic-and-reroute-api.md](contracts/diagnostic-and-reroute-api.md) ✅, [quickstart.md](quickstart.md) ✅

**Tests**: Selected backend tests are included (per quickstart.md §Tests to write). Frontend testing is `tsc --noEmit` plus manual visual smoke test — no component-level test scaffolding requested.

**Scope reminder**: This feature touches 3 repos. Customer app changes are listed as cross-repo dependencies in Phase 9 — they are NOT implemented in this work stream but are tracked so the customer-app session can pick them up after backend ships.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to
- All file paths are absolute from the repo root they live in (`service-center/...` = backend repo, `maintenance-center-app/...` = this repo)

---

## User Story Map

| Story | Priority | Goal | MVP? |
|---|---|---|---|
| US1 | P1 | Owner can configure a diagnostic department with a fee; bookings created without a ServiceCategory route to it; diagnostic-claim captures fee-rate snapshot | ✅ |
| US2 | P1 | Re-route operation: technician/owner/BM moves a booking from one department to another with structured reason, audit record, and customer notification | ✅ |
| US3 | P2 | Diagnostic fee auto-injected as a non-removable line item on the quote built after a diagnostic-routed booking | |
| US4 | P2 | Re-route after a quote was SENT or APPROVED marks the existing quote REVISED; customer is asked to re-approve | |
| US5 | P3 | Re-route history is queryable via API and visible on the booking-detail screen | |

US1 + US2 together = end-to-end working flow (diagnostic intake + handoff to working dept).
US3 makes the fee actually appear on customer quotes. US4 covers the quote-already-sent edge case.
US5 is read-side completeness for the audit log.

---

## Phase 1: Setup (Verification)

**Purpose**: Confirm the upstream specs (020, 021, 009, 011) are implemented in the running schema. These checks prevent the migration from being wrong about what already exists.

- [X] T001 Open `service-center/src/main/java/com/maintainance/service_center/department/Department.java` and verify the entity was created by spec 020 (fields: `id`, `center`, `nameAr`, `nameEn`, `displayOrder`, `isActive`). If the entity is missing, halt — spec 020 is a hard prerequisite per `quickstart.md §Prerequisites`. **RESULT 2026-05-26: HALT. No `department` package exists in the backend repo. Spec 020 backend was never implemented.**
- [X] T002 [P] Open `service-center/src/main/java/com/maintainance/service_center/booking/Booking.java` and verify the `@ManyToOne Department department` field and `assignedMembership` field both exist (added by 020 and 021 respectively). If either is missing, halt. **RESULT 2026-05-26: HALT. `Booking.java` has neither field. Spec 020 and 021 backends were never implemented.**
- [X] T003 [P] Open `service-center/src/main/java/com/maintainance/service_center/quote/QuoteService.java` (or wherever 009's quote service lives) and confirm it exposes a `create()` method and a line-item collection on `BookingQuote`. Record the line-item field name (`amount` vs. `partsCost`/`laborCost` split) — Phase 5 (US3) tasks will reference whichever exists. **RESULT 2026-05-26: HALT. No `quote` package exists in the backend repo. Spec 009 backend was never implemented.**
- [X] T004 [P] Connect to the running PostgreSQL database and run `\d department`, `\d booking`, `\d _user`, `\d center_membership` to record the actual column names referenced by Phase 2 migrations. Note any deviation from the names assumed in `data-model.md §Migration Plan`. **RESULT 2026-05-26: SKIPPED. Tables `department`, `center_membership` do not exist because the prerequisite specs (020, 021, 015) backends were never implemented.**

**Checkpoint**: ❌ **FAILED 2026-05-26**. Specs 009, 015, 020, 021 have frontend code in `maintenance-center-app` but their backend code was never generated in `service-center`. Implementation of 022 is BLOCKED until upstream backends ship. See "Implementation block" note below.

### ⛔ Implementation block (recorded 2026-05-26)

`/speckit.implement` was invoked but Phase 1 verification halted execution. The frontend
of this repo (Department types/components/screens, Quote types/components, etc.) was built
during specs 020 / 021 / 009's frontend phases, but the corresponding backend code in
`service-center` was never generated. This means:

- The frontend already calls endpoints like `GET /centers/my/departments` that 404 today
- The Booking entity has no `department`, `assignedMembership`, `passedThroughDiagnostic`,
  or `diagnosticFeeRateAtClaim` fields
- The Quote entity does not exist

**To unblock 022 implementation, the following upstream work must happen first**, in
order:

1. Implement spec 015 (staff management foundation) backend — CenterMembership entity, role
   model, base permissions
2. Implement spec 011 (center staff permissions) backend — permission enum, role-permission
   mapping, gate annotations
3. Implement spec 020 (center departments) backend — Department entity, departments API,
   booking routing on creation
4. Implement spec 021 (self-claim booking) backend — claim endpoint with pessimistic lock,
   queue endpoint, BookingClaimAudit
5. Implement spec 009 (work-progress-quotes) backend — BookingQuote entity, line items,
   quote API
6. THEN implement spec 022 (this spec)

Steps 1–5 are each their own `/speckit.implement` cycle in the backend repo. Recommended
approach: open separate sessions per spec, since each will be substantial (50–100 tasks).

---

## Phase 2: Foundational (Shared Backend Infrastructure)

**Purpose**: Database migrations and shared entity/DTO additions that ALL user stories depend on. MUST complete before Phase 3 or any later phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Write Flyway migration `service-center/src/main/resources/db/migration/V{next_n}__add_department_diagnostic_columns.sql` per `data-model.md §V{n}`. SQL: `ALTER TABLE department ADD COLUMN is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE; ALTER TABLE department ADD COLUMN diagnostic_fee_amount NUMERIC(11,3); CREATE UNIQUE INDEX uq_dept_one_diagnostic_per_center ON department(center_id) WHERE is_diagnostic = TRUE AND is_active = TRUE;` — replace `{next_n}` with the highest existing Flyway version + 1.
- [ ] T006 Write Flyway migration `service-center/src/main/resources/db/migration/V{next_n+1}__add_booking_diagnostic_columns.sql` per `data-model.md §V{n+1}`. SQL: `ALTER TABLE booking ADD COLUMN passed_through_diagnostic BOOLEAN NOT NULL DEFAULT FALSE; ALTER TABLE booking ADD COLUMN diagnostic_fee_rate_at_claim NUMERIC(11,3);` — no backfill (default `FALSE` is correct for pre-feature rows).
- [ ] T007 Write Flyway migration `service-center/src/main/resources/db/migration/V{next_n+2}__create_reroute_audit.sql` per `data-model.md §V{n+2}` — create `reroute_audit` table with all columns from `data-model.md §RerouteAudit`, plus the three indices (`idx_reroute_booking`, `idx_reroute_from_dept_created`, `idx_reroute_to_dept_created`). Use the verified FK target names from T004.
- [ ] T008 [P] Extend `Department.java` in `service-center/src/main/java/com/maintainance/service_center/department/` — add two fields: `@Column(name = "is_diagnostic", nullable = false) private Boolean isDiagnostic = false;` and `@Column(name = "diagnostic_fee_amount", precision = 11, scale = 3) private BigDecimal diagnosticFeeAmount;`. Add getters/setters via Lombok or manually. Do NOT add validation here — `DepartmentService` enforces invariants.
- [ ] T009 [P] Extend `Booking.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — add two fields: `@Column(name = "passed_through_diagnostic", nullable = false) private Boolean passedThroughDiagnostic = false;` and `@Column(name = "diagnostic_fee_rate_at_claim", precision = 11, scale = 3) private BigDecimal diagnosticFeeRateAtClaim;`. Add getters/setters.
- [ ] T010 [P] Create new package `service-center/src/main/java/com/maintainance/service_center/reroute/` with: `RerouteReason.java` (enum: `WRONG_DIAGNOSIS`, `OUT_OF_SCOPE`, `SPECIALIST_NEEDED`, `STAFF_UNAVAILABLE`, `CUSTOMER_REQUEST`, `OTHER`); `RerouteAudit.java` (`@Entity`, `@Table(name = "reroute_audit")`, all fields per `data-model.md §RerouteAudit`, `@CreatedDate` on `createdAt` with `@EntityListeners(AuditingEntityListener.class)`, NO setter for `createdAt`); `RerouteAuditRepository.java` (extends `JpaRepository<RerouteAudit, Long>`, custom method `List<RerouteAudit> findByBookingIdOrderByCreatedAtAsc(Long bookingId)`).
- [ ] T011 [P] Extend `DepartmentResponse.java` in `service-center/src/main/java/com/maintainance/service_center/department/` — add fields `Boolean isDiagnostic` and `BigDecimal diagnosticFeeAmount`. In the factory method, populate from `dept.getIsDiagnostic()` and `dept.getDiagnosticFeeAmount()` (null-safe).
- [ ] T012 [P] Extend `DepartmentRequest.java` in `service-center/src/main/java/com/maintainance/service_center/department/` — add optional fields `Boolean isDiagnostic` and `@DecimalMin("0.000") BigDecimal diagnosticFeeAmount`. Both nullable on the request DTO.
- [ ] T013 [P] Extend `BookingResponse.java` in `service-center/src/main/java/com/maintainance/service_center/booking/` — add fields `Boolean passedThroughDiagnostic` and `BigDecimal diagnosticFeeRateAtClaim`. Populate from `booking.getPassedThroughDiagnostic()` and `booking.getDiagnosticFeeRateAtClaim()` in the mapping method.
- [ ] T014 [P] Add three new `BusinessErrorCode` constants in `service-center/src/main/java/com/maintainance/service_center/handler/BusinessErrorCodes.java` — `DUPLICATE_DIAGNOSTIC_DEPARTMENT`, `INVALID_DIAGNOSTIC_FEE_TARGET`, `DIAGNOSTIC_TOGGLE_BLOCKED_BY_OPEN_BOOKINGS`. Pick the next unused code numbers and add a one-line `businessErrorDescription` per code. These are used by Phase 3 (US1) tasks.
- [ ] T015 [P] Add seven new `BusinessErrorCode` constants in the same file for re-route errors per `contracts/diagnostic-and-reroute-api.md §Endpoint 3 error codes`: `FORBIDDEN_REROUTE`, `CANNOT_REROUTE_INTO_DIAGNOSTIC`, `NO_OP_REROUTE`, `INVALID_BOOKING_STATUS_FOR_REROUTE`, `REROUTE_CONFLICT`, `INVALID_REROUTE_REASON`, `NOTE_TOO_LONG`. Used by Phase 4 (US2) tasks.

**Checkpoint**: Run `./mvnw test` in `service-center/`. Migrations apply cleanly. Entities map. Response DTOs serialize the new fields as null/false on existing data.

---

## Phase 3: User Story 1 — Diagnostic Department + Null-Category Routing + Fee Snapshot (Priority: P1) 🎯 MVP

**Goal**: An owner can flag one department per center as diagnostic and set a fee. A customer creating a booking with `categoryId = null` is routed to that department, with `passedThroughDiagnostic = true`. When a diagnostic technician claims the booking (via 021), the current fee rate is captured into `diagnosticFeeRateAtClaim`. Subsequent owner edits to the fee do not alter the captured rate on already-claimed bookings.

**Independent Test**:
1. `PUT /centers/my/departments/{id}` with `isDiagnostic: true, diagnosticFeeAmount: 5.000` succeeds.
2. Second `PUT` on a different dept at the same center with `isDiagnostic: true` returns 409 `DUPLICATE_DIAGNOSTIC_DEPARTMENT`.
3. `POST /bookings` with `categoryId: null` returns `passedThroughDiagnostic: true` and `department.id` = the diagnostic dept's id.
4. After a tech claims the booking (per 021), `GET /bookings/{id}` returns `diagnosticFeeRateAtClaim: 5.000`.
5. Owner changes fee to 7.000. The already-claimed booking still shows `diagnosticFeeRateAtClaim: 5.000`.

### Implementation for User Story 1

- [ ] T016 [US1] Extend `DepartmentService.update()` in `service-center/src/main/java/com/maintainance/service_center/department/DepartmentService.java` to enforce three new invariants per `data-model.md §Validation rules`: (1) if `isDiagnostic = true` in the request AND another active dept at the same center already has `isDiagnostic = true` AND it's not this dept → throw with `DUPLICATE_DIAGNOSTIC_DEPARTMENT`; (2) if `diagnosticFeeAmount` set AND `isDiagnostic` is or would be false → throw with `INVALID_DIAGNOSTIC_FEE_TARGET`; (3) if `isDiagnostic` is being toggled (true→false or false→true) AND the dept has any non-terminal bookings (`bookingStatus NOT IN (COMPLETED, CANCELLED, NO_SHOW)`) → throw with `DIAGNOSTIC_TOGGLE_BLOCKED_BY_OPEN_BOOKINGS`. Use the existing exception-throwing pattern from 020's deactivation check. Mark `@Transactional`.
- [ ] T017 [US1] Add `Optional<Department> findDiagnosticByCenterId(Long centerId)` to `DepartmentRepository.java` in the same package. JPQL: `SELECT d FROM Department d WHERE d.center.id = :centerId AND d.isDiagnostic = TRUE AND d.isActive = TRUE`. Returns at most one row (enforced by the unique index from T005).
- [ ] T018 [US1] Extend `BookingService.create()` in `service-center/src/main/java/com/maintainance/service_center/booking/BookingService.java` per `data-model.md §Booking creation flow (modified)`: if the incoming `categoryId` is null, call `departmentRepository.findDiagnosticByCenterId(center.getId())`. If present, set `booking.department = diagnosticDept` and `booking.passedThroughDiagnostic = true`. If not present, fall back to the default-department lookup per 020 FR-D-008 (no diagnostic flag). If `categoryId` is present, existing flow unchanged (`passedThroughDiagnostic = false`). Initialize `diagnosticFeeRateAtClaim = null` always — captured later in claim.
- [ ] T019 [US1] Update the request DTO used by `POST /bookings` to mark `categoryId` as nullable (or remove the `@NotNull` annotation if present). Confirm with `BookingController.java` that no other validation enforces non-null. Document the contract change in the controller's Javadoc / OpenAPI annotation. (This is a non-breaking change — existing callers continue to send `categoryId`.)
- [ ] T020 [US1] Extend `BookingService.claim()` in `BookingService.java` per `data-model.md §Claim flow`: inside the existing pessimistic-locked transaction, after the existing 021 preconditions pass, check `if (booking.getDepartment().getIsDiagnostic() && booking.getDiagnosticFeeRateAtClaim() == null)` and if true, set `booking.setDiagnosticFeeRateAtClaim(booking.getDepartment().getDiagnosticFeeAmount())`. This happens BEFORE the existing audit-write and assignment-set. The IS NULL guard ensures the snapshot is captured at most once per booking.
- [ ] T021 [P] [US1] Extend `Department` TypeScript type in `maintenance-center-app/types/department.ts` per `data-model.md §Frontend types`: add `isDiagnostic: boolean` and `diagnosticFeeAmount: number | null`. Update `UpdateDepartmentRequest` to add optional `isDiagnostic?: boolean` and `diagnosticFeeAmount?: number | null`. If the `types/department.ts` file doesn't exist yet (only `types/department.d.ts` or similar), create it; verify import paths in any consuming files.
- [ ] T022 [P] [US1] Extend `BookingResponse` type in `maintenance-center-app/types/booking.ts` (or wherever the booking type lives — confirm via grep) — add `passedThroughDiagnostic: boolean` and `diagnosticFeeRateAtClaim: number | null`.
- [ ] T023 [US1] Patch `maintenance-center-app/app/(app)/(tabs)/staff/departments/[id].tsx` to render the two new fields per `plan.md §Source Code` and `contracts/diagnostic-and-reroute-api.md §Endpoint 1`: add a `Switch` labeled `departments.diagnostic.toggle` bound to `isDiagnostic`; when ON, render a numeric input labeled `departments.diagnostic.feeLabel` with helper text `departments.diagnostic.feeHelper`, bound to `diagnosticFeeAmount` (numeric input — accept 0 and positive decimals to 3 places). Submit logic: include both fields in the `UpdateDepartmentRequest` payload. Map the three new BusinessErrorCodes from T014 to inline form errors using the existing toast/banner pattern.
- [ ] T024 [P] [US1] Extend `maintenance-center-app/store/api/departmentsApi.ts` — confirm `updateDepartment` mutation already passes the full request body through (it should, per 020); if not, ensure the new fields are included. No new endpoints needed in this story.
- [ ] T025 [P] [US1] Add new i18n keys to `maintenance-center-app/lib/i18n/locales/en.json` and `ar.json` under the `departments` namespace per `contracts/diagnostic-and-reroute-api.md §New i18n keys §Department editor`: `diagnostic.toggle`, `diagnostic.feeLabel`, `diagnostic.feeHelper`. Also add error keys: `errors.duplicateDiagnosticDepartment`, `errors.invalidDiagnosticFeeTarget`, `errors.diagnosticToggleBlockedByOpenBookings`.

**Checkpoint (US1)**:
1. Backend integration test: run T031 from Phase 8 once that test exists, OR manually `curl` per `quickstart.md §Manual smoke test` steps 1–4 and 8.
2. UI test: log in as OWNER, edit a department, toggle "Diagnostic department" ON, enter `5.000` for fee, save. Re-open: values persist. Try to enable it on a second department: error message in correct locale.

---

## Phase 4: User Story 2 — Re-Route Operation (Priority: P1) 🎯 MVP

**Goal**: An assigned technician, owner, or branch manager can re-route any non-terminal booking from its current department to a different active working department at the same center. The operation enforces six validations, writes an immutable audit row, unassigns the previous technician, places the booking back in the target department's queue (per 021), and enqueues a customer notification after commit. Re-routing into a diagnostic department is forbidden.

**Independent Test**:
1. As assigned TECHNICIAN, `POST /bookings/{id}/reroute { targetDepartmentId, reason, note }` returns 200 with audit + updated booking; `RerouteAudit` table has one new row; `booking.department` is target; `booking.assignedMembershipId` is null; target dept's queue (021) shows the booking on next refresh.
2. As OWNER, same call on any booking at their center succeeds.
3. As an unrelated TECHNICIAN, same call returns 403 `FORBIDDEN_REROUTE`.
4. Target = current dept → 400 `NO_OP_REROUTE`.
5. Target = diagnostic dept → 400 `CANNOT_REROUTE_INTO_DIAGNOSTIC`.
6. Booking in COMPLETED status → 400 `INVALID_BOOKING_STATUS_FOR_REROUTE`.
7. Two concurrent re-routes → exactly one 200, one 409 `REROUTE_CONFLICT`.
8. Customer receives a `BOOKING_REROUTED` push notification after the successful re-route commits.

### Implementation for User Story 2

- [ ] T026 [US2] Add the two new permissions to spec 011's permission amendment file (per FR-DR-032). Update `service-center/src/main/java/com/maintainance/service_center/permission/Permission.java` (or wherever the permission enum lives — confirm via grep): add `REROUTE_BOOKING_ASSIGNED` (granted to TECHNICIAN) and `REROUTE_BOOKING_ANY` (granted to OWNER and BRANCH_MANAGER). If 011 uses a role-to-permission map, add these to the appropriate maps. Cross-reference: this change MUST also be reflected in `specs/011-center-staff-permissions/spec-amendment.md` (or a new amendment if one doesn't exist) — append a section describing the two new permissions and which roles get them.
- [ ] T027 [US2] Create `RerouteRequest.java` in `service-center/src/main/java/com/maintainance/service_center/reroute/` — request DTO with `@NotNull Long targetDepartmentId`, `@NotNull RerouteReason reason`, `@Size(max = 500) String note` (nullable).
- [ ] T028 [US2] Create `RerouteResponse.java` in the same package — response DTO with two fields: `RerouteAuditResponse audit` (separate DTO with all `RerouteAudit` fields plus joined department + user display names per `contracts/diagnostic-and-reroute-api.md §Endpoint 3 Response`) and `BookingResponse updatedBooking`. Also create `RerouteAuditResponse.java` as a separate DTO.
- [ ] T029 [US2] Add `findWithLockById(Long id)` to `BookingRepository.java` — same pattern as 021's claim lock: `@Lock(LockModeType.PESSIMISTIC_WRITE)` + `@QueryHints(@QueryHint(name = "javax.persistence.lock.timeout", value = "3000"))`. If 021 already added this method, reuse it — do NOT create a duplicate.
- [ ] T030 [US2] Create `RerouteService.java` in `service-center/src/main/java/com/maintainance/service_center/reroute/`. Implement the full transaction per `data-model.md §Re-route flow`: (1) `@Transactional` boundary; (2) `bookingRepository.findWithLockById(bookingId)` — throw `BOOKING_NOT_FOUND` if absent; (3) permission check (caller is owner/BM with `REROUTE_BOOKING_ANY`, OR caller's membership equals `booking.assignedMembership` with `REROUTE_BOOKING_ASSIGNED`) — else throw `FORBIDDEN_REROUTE`; (4) validate target dept exists, belongs to booking.center, is active — else throw `DEPARTMENT_NOT_FOUND`; (5) validate target dept's `isDiagnostic = false` — else throw `CANNOT_REROUTE_INTO_DIAGNOSTIC`; (6) validate target ≠ current — else throw `NO_OP_REROUTE`; (7) validate booking status not in terminal set — else throw `INVALID_BOOKING_STATUS_FOR_REROUTE`; (8) compute `isInitialDiagnosticClassification = (current.isDiagnostic == TRUE && rerouteAuditRepository.findByBookingIdOrderByCreatedAtAsc(bookingId).isEmpty())`; (9) save new `RerouteAudit` row; (10) `booking.department = target`; `booking.assignedMembership = null`; (11) commit; (12) AFTER COMMIT call `notificationService.notifyBookingRerouted(booking.customerId, booking.id)` using the registered after-commit pattern (e.g., `TransactionSynchronizationManager.registerSynchronization`).
- [ ] T031 [US2] Create `RerouteController.java` in the same package. Endpoint: `@PostMapping("/api/v1/bookings/{id}/reroute")`. Resolve caller's active `CenterMembership` from `SecurityContextHolder`. Call `rerouteService.reroute(id, request, callerMembership)`. Return 200 with `RerouteResponse`. Map service-layer exceptions to `BusinessErrorCode` HTTP status codes via existing `GlobalExceptionHandling` (FORBIDDEN_REROUTE → 403, NO_OP_REROUTE/CANNOT_*/INVALID_BOOKING_STATUS_FOR_REROUTE → 400, REROUTE_CONFLICT → 409, BOOKING_NOT_FOUND/DEPARTMENT_NOT_FOUND → 404).
- [ ] T032 [US2] Add a `BOOKING_REROUTED` value to the existing `NotificationType.java` enum (location: confirm via grep — `service-center/src/main/java/com/maintainance/service_center/notification/`). Add a corresponding bilingual notification template per `contracts/diagnostic-and-reroute-api.md §New i18n keys §Customer notification` — message key `notifications.bookingRerouted.body` parameterized with `{{time}}`. Wire `NotificationService.notifyBookingRerouted(customerId, bookingId)` to enqueue the push notification using the existing infrastructure.
- [ ] T033 [P] [US2] Create `maintenance-center-app/types/reroute.ts` per `data-model.md §types/reroute.ts (NEW)`: export `RerouteReason` union type, `RerouteRequest`, `RerouteAudit`, `RerouteResponse` interfaces exactly as documented. No additional fields.
- [ ] T034 [US2] Extend `maintenance-center-app/store/api/bookingsApi.ts` per `plan.md §Source Code` and `contracts §RTK Query tag invalidation`: add `useRerouteBookingMutation` endpoint — `mutation<RerouteResponse, { id: number; body: RerouteRequest }>` calling `POST bookings/{id}/reroute` with `invalidatesTags: [{ type: 'Bookings', id }, { type: 'RerouteHistory', id }]` (defer the queue-tag invalidation per spec — if a `Queues` tag exists from 021, also invalidate). Update the `tagTypes` array to include `'RerouteHistory'` if not already present.
- [ ] T035 [P] [US2] Create `maintenance-center-app/components/bookings/RerouteForm.tsx` — modal/sheet using React Hook Form + Zod. Fields: target department dropdown (filtered to active depts at the current center, EXCLUDING the current dept AND any dept with `isDiagnostic = true`); reason dropdown (six enum values, labels from `reroute.reason.*` i18n keys); optional note `<TextInput multiline maxLength={500}>`. Submit calls `useRerouteBookingMutation`. Show backend error codes via the existing toast/banner pattern, with localized keys per `contracts §New i18n keys §Re-route errors`.
- [ ] T036 [US2] Patch `maintenance-center-app/app/(app)/(tabs)/bookings/[id].tsx` — add a "Re-route booking" button to the action area, gated by `canReroute = (user.role === 'OWNER' || user.role === 'BRANCH_MANAGER') || (user.membershipId === booking.assignedMembershipId)`. On tap, open `RerouteForm` as a bottom sheet or modal. After successful submit, the existing `Bookings` tag invalidation refreshes the booking detail; the booking shows unassigned and in the new department. (The `RerouteHistoryList` integration happens in Phase 7.)
- [ ] T037 [P] [US2] Add new i18n keys per `contracts/diagnostic-and-reroute-api.md §New i18n keys §Re-route action` and `§Re-route errors`: `reroute.action`, `reroute.targetDept`, `reroute.reason.label`, `reroute.reason.WRONG_DIAGNOSIS` (+ 5 other enum values), `reroute.notePlaceholder`, `reroute.submit`, plus all `errors.reroute.*` keys. Add to BOTH `en.json` and `ar.json`. Match the exact strings in the contracts doc.

**Checkpoint (US2)**:
1. Backend integration test: run T044 from Phase 8 once that test exists, OR manually run quickstart smoke test steps 5–7.
2. UI test: log in as assigned TECHNICIAN, open the booking detail, tap Re-route, fill the form, submit. Booking moves to new dept and becomes unassigned. Log in as a different (non-assigned) technician — Re-route button is hidden. Log in as OWNER — button is always visible.

---

## Phase 5: User Story 3 — Diagnostic Fee on Quote (Priority: P2)

**Goal**: When a technician builds a quote for a booking whose `passedThroughDiagnostic = true` and `diagnosticFeeRateAtClaim` is set, the quote automatically includes a non-removable, non-editable line item with `kind = DIAGNOSTIC_FEE`, descriptionKey `quote.diagnosticFee.label`, and amount equal to the captured snapshot. The line is preserved across quote revisions.

**Independent Test**:
1. Build a quote for a booking with `passedThroughDiagnostic = true`. The response includes a line item with `kind: "DIAGNOSTIC_FEE"`, `editable: false`, `removable: false`, amount = the snapshot.
2. Attempt to DELETE the diagnostic line item via the API → 400 `DIAGNOSTIC_FEE_LOCKED`.
3. Attempt to PATCH the diagnostic line item's amount → 400 `DIAGNOSTIC_FEE_LOCKED`.
4. Build a quote for a booking with `passedThroughDiagnostic = false`. No diagnostic line appears.
5. Frontend: the diagnostic line renders distinctly with the tooltip text from `quote.diagnosticFee.tooltip`.

### Implementation for User Story 3

- [ ] T038 [US3] Add `DIAGNOSTIC_FEE` value to the line-item-kind enum in `service-center/src/main/java/com/maintainance/service_center/quote/QuoteLineItemKind.java` (confirm exact file path with T003's grep result). Update any `QuoteLineItem` entity to include the discriminator. Persist as VARCHAR via `@Enumerated(EnumType.STRING)`.
- [ ] T039 [US3] Add one new `BusinessErrorCode` constant `DIAGNOSTIC_FEE_LOCKED` to `service-center/src/main/java/com/maintainance/service_center/handler/BusinessErrorCodes.java` — used when the technician tries to delete or edit a diagnostic line item.
- [ ] T040 [US3] Extend `QuoteService.create()` in `service-center/src/main/java/com/maintainance/service_center/quote/QuoteService.java` per `data-model.md §BookingQuote (extension)`: after computing the user-submitted line items, if `booking.getPassedThroughDiagnostic() && booking.getDiagnosticFeeRateAtClaim() != null`, prepend a `QuoteLineItem` with `kind = DIAGNOSTIC_FEE`, `descriptionKey = "quote.diagnosticFee.label"`, amount = `booking.getDiagnosticFeeRateAtClaim()` (placed in the line-item amount field per T003's verified shape — split `partsCost = 0, laborCost = snapshot` if the model is parts/labor-only). Mark the line as `editable = false, removable = false`. Re-compute quote totals to include this line.
- [ ] T041 [US3] Extend the quote line-item DELETE and PATCH handlers in `QuoteController.java` (or `QuoteService.java`) to reject operations on lines where `kind == DIAGNOSTIC_FEE` with `DIAGNOSTIC_FEE_LOCKED` (400). Apply this check BEFORE any other validation.
- [ ] T042 [US3] Ensure quote revisions also auto-include the diagnostic fee. Inspect `service-center/src/main/java/com/maintainance/service_center/quote/QuoteService.java` — if `createRevision()` (or equivalent) reuses `create()`, no change needed; otherwise add the same auto-add logic from T040 to the revision codepath. Verify against 009's implementation.
- [ ] T043 [P] [US3] Extend `maintenance-center-app/types/quote.ts` per `data-model.md §QuoteLineItem`: add `'DIAGNOSTIC_FEE'` to the `QuoteLineItemKind` union; add `descriptionKey?: string`, `editable: boolean`, `removable: boolean` fields to `QuoteLineItem`. Confirm existing callers default `editable/removable` to true for backward compat (or backend always returns the booleans now — preferred).
- [ ] T044 [P] [US3] Create `maintenance-center-app/components/quotes/DiagnosticFeeLineItem.tsx` — renders the diagnostic-fee line in a visually distinct row (e.g., subtle background color, lock icon). Reads label from `quote.diagnosticFee.label`. Shows a tooltip/info icon with text from `quote.diagnosticFee.tooltip` on press. No delete or edit affordances rendered.
- [ ] T045 [US3] Patch the existing quote builder / quote view component (locate via grep — likely `maintenance-center-app/components/quotes/QuoteBuilder.tsx` or `app/(app)/(tabs)/bookings/[id]/quote.tsx`) — when iterating line items, render `DiagnosticFeeLineItem` for `kind === 'DIAGNOSTIC_FEE'` and the existing component for other kinds. Place the diagnostic line in its own section above the editable parts/labor lines, separated by a divider.
- [ ] T046 [P] [US3] Add i18n keys to `en.json` and `ar.json` per `contracts §New i18n keys §Quote — diagnostic fee line`: `quote.diagnosticFee.label`, `quote.diagnosticFee.tooltip`. Also add `errors.diagnosticFeeLocked`.

**Checkpoint (US3)**: Build a quote for a diagnostic-flagged booking via the technician UI. The diagnostic fee appears in its own row, can't be edited or deleted, and is included in the quote total.

---

## Phase 6: User Story 4 — Quote Revision on Re-Route (Priority: P2)

**Goal**: When a re-route happens on a booking whose current `BookingQuote` is in status SENT or APPROVED, the quote is automatically marked REVISED. The customer notification for the re-route additionally directs the customer to expect a revised quote. The next technician to claim the booking sees the prior quote as historical context and can build a new version.

**Independent Test**:
1. Create a booking, build a quote, send it (status SENT). Re-route the booking. `GET /bookings/{id}/quotes` shows the prior quote with status REVISED.
2. Approve a quote (status APPROVED). Re-route. Prior quote → REVISED. New technician builds a new quote — appears as version 2.
3. Re-route when no quote exists yet — succeeds, no quote-state change.
4. Customer notification text includes the "revised quote coming" copy when there was an active quote, generic copy otherwise.

### Implementation for User Story 4

- [ ] T047 [US4] Add `markRevisedByBookingId(Long bookingId)` to `QuoteService.java` — finds the active quote for the booking (status in SENT, APPROVED), sets `status = REVISED`, persists. Returns the updated quote or `null` if no active quote exists. Mark `@Transactional(propagation = MANDATORY)` — must be called from within the re-route transaction.
- [ ] T048 [US4] Update `RerouteService.reroute()` (the one created in T030) — between step (10) and (11) of `data-model.md §Re-route flow`, call `quoteService.markRevisedByBookingId(bookingId)` and capture whether a revision occurred. Pass that flag to `notificationService.notifyBookingRerouted(...)` so the notification body can vary.
- [ ] T049 [US4] Update `NotificationService.notifyBookingRerouted(customerId, bookingId, hadActiveQuote)` in `service-center/src/main/java/com/maintainance/service_center/notification/NotificationService.java` (extending the signature added in T032) to accept the new boolean. When `hadActiveQuote = true`, append the `notifications.bookingRerouted.reviseQuote` body to the notification (or send a multi-line notification per the existing template format).
- [ ] T050 [US4] Backend integration test in `service-center/src/test/java/com/maintainance/service_center/reroute/` — `RerouteWithQuoteRevisionTest`: create booking → build quote → send → re-route → assert quote is REVISED → new tech rebuilds → assert version 2 exists. Confirms spec scenario 6.5.
- [ ] T051 [P] [US4] Add i18n key `notifications.bookingRerouted.reviseQuote` to `en.json` and `ar.json` per the strings in `contracts §New i18n keys §Customer notification`. (Customer-app consumes this key; we add it to the locales for parity but it's used in the customer-app session.)

**Checkpoint (US4)**: Repeat US2 smoke test but with an active SENT quote before re-route. After re-route, the prior quote shows REVISED status and the customer notification includes the re-approval copy.

---

## Phase 7: User Story 5 — Re-Route History Visibility (Priority: P3)

**Goal**: A booking's re-route history is queryable via `GET /bookings/{id}/reroute-history` and rendered on the booking-detail screen as a chronological list. Owner-side analytics queries can aggregate re-route counts per department over a time window (the data is queryable; specific dashboards are deferred to Phase 5.0).

**Independent Test**:
1. Re-route a booking three times. `GET /bookings/{id}/reroute-history` returns three entries in chronological order with all fields populated (department names, user display names, reason, note, timestamp, initial-classification flag).
2. Re-route an unflagged booking (originated outside diagnostic) — first audit row has `isInitialDiagnosticClassification = false`.
3. Re-route a booking that originated in diagnostic — first audit row has `isInitialDiagnosticClassification = true`; subsequent rows have `false`.
4. UI: open the booking detail. The Re-route History section shows the three entries.

### Implementation for User Story 5

- [ ] T052 [US5] Add `GET /bookings/{id}/reroute-history` endpoint to `RerouteController.java` from T031. `@GetMapping("/api/v1/bookings/{id}/reroute-history")`. Permission: caller must be OWNER or BRANCH_MANAGER of the booking's center, OR a TECHNICIAN currently or historically assigned to this booking. Call `rerouteAuditRepository.findByBookingIdOrderByCreatedAtAsc(bookingId)`, map to `List<RerouteAuditResponse>`. Return 200 with the array (or empty array).
- [ ] T053 [US5] Add `getBookingRerouteHistory` query endpoint to `maintenance-center-app/store/api/bookingsApi.ts` — `query<RerouteAudit[], number>({ query: (id) => `bookings/${id}/reroute-history`, providesTags: (result, _err, id) => [{ type: 'RerouteHistory', id }] })`.
- [ ] T054 [US5] Create `maintenance-center-app/components/bookings/RerouteHistoryList.tsx` — renders the chronological list. Each row: from-dept → to-dept (icon arrow between), reason label (from `reroute.reason.*` i18n keys), triggered-by display name, optional note, relative timestamp. If `isInitialDiagnosticClassification = true`, show a small badge with `reroute.history.diagnosticClassification` label. Empty array → render nothing (don't show an empty-state heading). RTL-friendly arrow direction (use `i18n.language === 'ar' ? '←' : '→'`).
- [ ] T055 [US5] Patch `maintenance-center-app/app/(app)/(tabs)/bookings/[id].tsx` (the patch from T036) — add `useGetBookingRerouteHistoryQuery(bookingId)` and render `<RerouteHistoryList entries={data} />` in a new section titled `reroute.history.title`, placed below the existing work-progress timeline and above the action area.
- [ ] T056 [P] [US5] Add i18n keys per `contracts §New i18n keys §Re-route action` (the history-specific subset): `reroute.history.title`, `reroute.history.entry`, `reroute.history.diagnosticClassification`. To both `en.json` and `ar.json`.

**Checkpoint (US5)**: Re-route a booking 3 times across different test users. Open the booking detail — the history section shows all three entries with correct from/to dept names, user names, reasons, and the initial-classification badge on the first one (if applicable).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality, tests, and run-through.

- [ ] T057 Run `npx tsc --noEmit` in `maintenance-center-app/` — confirm zero TypeScript errors after all type extensions (T021, T022, T033, T043) and component additions.
- [ ] T058 Backend integration test in `service-center/src/test/java/com/maintainance/service_center/reroute/` — `DiagnosticDepartmentFlowTest`: test spec scenario 6.1 end-to-end (owner configures diagnostic dept → customer books null-category → routed to diagnostic dept → tech claims and snapshot captured → tech re-routes → working tech builds quote with diagnostic fee line item).
- [ ] T059 [P] Backend integration test `service-center/src/test/java/com/maintainance/service_center/reroute/RerouteConcurrencyTest.java` — fire 10 simultaneous re-route requests for the same booking. Assert exactly one returns 200 and the others return 409 `REROUTE_CONFLICT`. Verify zero double-application in 3 runs. Confirms NFR-DR-001 and EC-DR-4.
- [ ] T060 [P] Backend integration test `service-center/src/test/java/com/maintainance/service_center/reroute/DiagnosticFeeSnapshotTest.java` — book → claim (snapshot 5.000) → owner changes fee to 7.000 → tech builds quote → assert line item shows 5.000, not 7.000. Confirms FR-DR-014 and SC-DR-5.
- [ ] T061 [P] Backend integration test `service-center/src/test/java/com/maintainance/service_center/reroute/RerouteNotificationTest.java` — re-route a booking and assert a `BOOKING_REROUTED` notification was enqueued for the customer with the correct parameterized body.
- [ ] T062 Walk through `quickstart.md §Manual smoke test` end-to-end against a fresh test center. Run all 8 curl scenarios. Confirm each returns expected status and body.
- [ ] T063 Walk through `quickstart.md §Visual smoke test` end-to-end against the running Expo app. Confirm all 5 visual checks pass on both web and a mobile target.
- [ ] T064 [P] Update the spec status: change `**Status:** Draft` to `**Status:** Implemented` in `specs/022-diagnostic-and-reroute/spec.md` after all checkpoints pass.

---

## Phase 9: Cross-Repo Dependency Tracker (Customer App)

**Purpose**: Customer-app changes called out for the customer-app session to pick up after the backend ships. NOT implemented in this work stream.

These tasks live in the `maintenance-customer-app/` repo. Reference paths from that repo's root.

- [ ] T065 [DEP] Patch `maintenance-customer-app/app/(tabs)/bookings/new.tsx` — make ServiceCategory optional. Add a "Not sure — let the center diagnose it" option. Hide the option when the selected center has `hasDiagnosticDepartment = false`.
- [ ] T066 [DEP] Patch `maintenance-customer-app/services/centersApi.ts` — extend the center detail response to include `hasDiagnosticDepartment: boolean`. The backend already exposes this implicitly via the departments list; if a dedicated boolean is desired, add it in the customer-facing center DTO.
- [ ] T067 [DEP] Patch `maintenance-customer-app/app/(tabs)/bookings/[id].tsx` — when rendering the quote line items, handle the `DIAGNOSTIC_FEE` kind with distinct styling and the tooltip from `quote.diagnosticFee.tooltip`. Show the diagnostic fee as still owed in the "outstanding balance" area when the customer rejects the repair quote.
- [ ] T068 [DEP] Implement the `BOOKING_REROUTED` notification handler in `maintenance-customer-app/lib/notifications/handlers.ts` (or the equivalent notification-routing module — locate via grep in that repo) — deep-link tap to the booking detail screen. Use the existing notification-handling pattern.
- [ ] T069 [DEP] Add all the i18n keys from `contracts §New i18n keys §Customer notification` and `§Quote — diagnostic fee line` to the customer-app's `en.json` and `ar.json`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies. T001–T004 can run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion. T005 → T006 → T007 (migrations are sequential). T008–T015 are all [P] and can run after migrations.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2. INDEPENDENT of US1 — can be developed in parallel by a different developer.
- **Phase 5 (US3)**: Depends on Phase 2 AND Phase 3 (needs `passedThroughDiagnostic` field populated). Phase 5 can start as soon as US1's backend tasks (T016–T020) are done — frontend T023 not required.
- **Phase 6 (US4)**: Depends on Phase 4 AND Phase 5 (needs reroute service AND quote line-item logic). Can start after T030 and T040 are done.
- **Phase 7 (US5)**: Depends on Phase 4 (needs `RerouteAudit` table populated). Backend (T052) can run as soon as T030 is in place; frontend (T053–T055) needs T034 from US2.
- **Phase 8 (Polish)**: Depends on all desired user stories being complete.
- **Phase 9 (Cross-Repo)**: Tracked but not blocked by this stream.

### Story dependencies (within this work stream)

- US1 (P1): no story-level dependencies.
- US2 (P1): no story-level dependencies. Can run in parallel with US1.
- US3 (P2): depends on US1 backend (specifically T018 + T020 — the field must exist and be populated for the auto-add logic to fire).
- US4 (P2): depends on US2 (needs `RerouteService`) AND US3 (needs the line-item auto-add).
- US5 (P3): depends on US2 (audit rows must exist before history endpoint is meaningful).

### Within each user story

- Backend before frontend (the frontend depends on the API contract being live for end-to-end testing — type definitions can be drafted in parallel).
- Migration tasks before entity-extension tasks (T005-T007 before T008-T010).
- BusinessErrorCode additions (T014, T015, T039) can run in parallel with everything else in their phase.

### Parallel opportunities

- All Phase 1 tasks are independent — full parallelism.
- In Phase 2, T008–T015 (everything except migrations) can run in parallel.
- US1 and US2 are independent — two developers can take one each after Phase 2 completes.
- Within US1: T021, T022, T024, T025 can all run in parallel (different files, no dependencies on each other).
- Within US2: T033, T035, T037 can run in parallel.
- Within US3: T043, T044, T046 can run in parallel.
- Within US5: T056 (i18n) can run in parallel with everything else.

---

## Parallel example: User Story 1 backend

```bash
# After Phase 2 completes, US1's backend work parallelizes:
Task: "Extend DepartmentService.update() with invariants — T016"
Task: "Add findDiagnosticByCenterId repo method — T017"
# Then in sequence (touches BookingService):
Task: "Extend BookingService.create() — T018"
Task: "Make categoryId nullable in BookingRequest — T019"
Task: "Extend BookingService.claim() with snapshot — T020"
```

## Parallel example: Frontend i18n + types

```bash
# Across all US phases, all i18n + type tasks are independent:
Task: "US1 i18n keys — T025"
Task: "US1 types — T021, T022"
Task: "US2 types — T033"
Task: "US2 i18n keys — T037"
Task: "US3 types — T043"
Task: "US3 i18n keys — T046"
Task: "US5 i18n keys — T056"
```

---

## Implementation strategy

### MVP first (US1 + US2)

1. Phase 1: Setup verification (4 tasks).
2. Phase 2: Foundational migrations + entity extensions (11 tasks).
3. Phase 3 (US1) + Phase 4 (US2) in parallel — two developers, or one developer sequentially.
4. **STOP and VALIDATE**: Run US1 and US2 independent tests. Run quickstart smoke test steps 1–7. Demo to stakeholders.
5. Backend can be deployed to staging at this point. Customer app does not yet expose the "let me diagnose" option (cross-repo dependency), but managers can configure diagnostic depts and re-route bookings.

### Incremental delivery

6. US3 makes the diagnostic fee actually appear on customer quotes (P2). Ship after US1.
7. US4 handles re-route after quote was sent (P2). Ship after US2 and US3.
8. US5 adds the history visibility on the booking detail (P3). Ship anytime after US2.

### Cross-repo coordination

After the backend ships V{n}..V{n+2} migrations and the new endpoints are live (end of Phase 2):

- This repo's work stream continues with Phase 3+.
- The customer-app session picks up T065–T069 from Phase 9 in parallel.
- Customer-app changes are non-blocking — the new flow simply becomes available to customers once the customer-app changes ship.

---

## Notes

- The 3 OQ items from `spec.md` are deferred to `/speckit.clarify`. The task list assumes the v1 defaults documented in the spec. If `/clarify` changes any answer, only a small subset of tasks needs revision (notification copy in T032/T049 for OQ-DR-3; possibly a center-detail-response field for OQ-DR-1).
- The cross-repo customer-app tasks (T065–T069) use `[DEP]` instead of a story marker because they fall outside this work stream's story phases.
- Every task references a file path. Where the exact path needs verification (e.g., the quote line-item entity location), the task says so explicitly and references T003's grep output.
- Bilingual i18n keys are added in pairs (en + ar) per Constitution Principle II. Tasks combine both into a single task to avoid the temptation to ship one without the other.
- Per Constitution Principle I (Spec-Driven), no implementation may begin until this task list is reviewed and approved. After approval, the `/speckit.implement` command consumes this file.
