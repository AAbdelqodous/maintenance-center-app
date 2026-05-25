# Feature Specification: Self-Claim Booking

**Feature Branch:** `021-self-claim-booking`
**Status:** Approved — ready for `/speckit.plan`
**Created:** 2026-05-24
**Phase:** specify (next: plan → tasks → implement)

> **Spec Kit reminder:** This document describes WHAT the system must do and WHY, not HOW.
> Implementation details (tables, endpoints, framework choices) belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Requires** `specs/020-center-departments` — Department defines the queue boundary. A
  booking is claimable only if it belongs to one of the technician's departments.
- **Requires** `specs/011-center-staff-permissions/spec-amendment.md` — the amendment adds
  `CLAIM_BOOKING` to TECHNICIAN's permission set and defines `ASSIGN_TECHNICIAN_MANUAL` as
  the distinct manager-only counterpart.
- **Required by** nothing at time of writing; this is a leaf spec in the dependency tree.

---

## 1. Summary

Self-claim is the ability for a technician to take an unassigned booking from a queue of
bookings in their department(s), making themselves the assigned technician without any
manager intervention. It is the default assignment path for the majority of bookings at a
well-staffed center.

The alternative path — manager manually assigning a booking to a specific technician — remains
available to OWNER and BRANCH_MANAGER and is the only path that allows cross-department
assignment. Self-claim and manual assignment are complementary, not competing.

---

## 2. Why Now

- Centers reported that managers spending time assigning routine bookings to technicians is
  the biggest daily operational bottleneck — technicians know their own availability and
  specialties better than a manager reviewing a list.
- Self-claim creates an audit trail at the earliest moment of commitment: the technician
  explicitly accepted responsibility for the booking, rather than being told to do it.
- Without self-claim, the technician queue (department queue screen) has no action — it is
  a read-only list with no purpose.

---

## 3. Scope

### In scope

- A TECHNICIAN can browse a queue of unassigned bookings in their department(s).
- A TECHNICIAN can claim one booking at a time by tapping Claim on its detail screen.
- The claim is atomic: if two technicians attempt to claim the same booking simultaneously,
  exactly one succeeds; the other receives a clear error.
- A claimed booking is immediately assigned to the claiming technician; the booking disappears
  from the queue for all other technicians.
- Cross-department claim is forbidden: a technician cannot claim a booking outside their
  department(s), even if they can see it.
- Full audit trail: who claimed, when, from which department context.
- All error states surface with localized messages in Arabic and English.

### Out of scope (explicitly deferred)

- **Auto-assignment** — the system does not automatically assign bookings to technicians
  without human action.
- **Claim capacity limits** — no cap on how many bookings a technician can claim in parallel.
  Workload management is an operational concern, not enforced by the platform in v1.
- **Claim expiry** — a claimed booking does not auto-revert to the queue if the technician
  becomes inactive or fails to start work. Managers handle this via manual reassign.
- **Claim notifications to manager** — a manager is not notified each time a technician claims
  a booking. Managers see assigned vs. unassigned state on the booking list.
- **Priority queue ordering** — the queue is sorted by booking time only (earliest first).
  No priority-weighted ordering in v1.

---

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **Queue** | The list of unassigned, claimable bookings in the technician's department(s). |
| **Claim** | The act of a technician self-assigning to an unassigned booking from the queue. |
| **Claimable** | A booking that meets all preconditions for claim (status, assignment state, department match). See §7. |
| **Manual Assignment** | An OWNER or BRANCH_MANAGER explicitly assigning a booking to a technician. Governed by `specs/011-center-staff-permissions/spec-amendment.md`. Distinct from claim. |
| **Cross-department claim** | An attempt by a technician to claim a booking that belongs to a department they are not assigned to. Forbidden. |
| **Atomic claim** | A claim operation that, under concurrent execution, guarantees exactly one technician succeeds. |

---

## 5. Queue Semantics

### 5.1 What appears in the queue

> **Design choice: server-inferred department filter (Option 1b).**
>
> Rationale: The technician's department assignments are a fact the server already knows from
> the caller's active membership. Making the frontend pass `departmentId` as a query parameter
> duplicates this state and introduces drift risk (the frontend could pass a stale or spoofed
> department). Server inference also makes the audit story clean: "they could see this booking
> because their membership included department X at the moment of access."

The queue contains every booking that satisfies ALL of the following:

1. The booking belongs to the center of the caller's active membership.
2. The booking's department is one of the departments in the caller's `departmentIds`.
3. The booking has no assigned technician (`assignedMembershipId` is null).
4. The booking's status is claimable (see §6).

The backend derives conditions 1 and 2 from the authenticated caller's membership — no
client-supplied filter parameter is required or accepted for these. The client may supply
pagination parameters (page, size).

### 5.2 Multi-department technician view

> **Design choice: combined queue (Option 2a).**
>
> Rationale: Most technicians belong to one department; combined view adds no complexity for
> them. The few who belong to multiple departments are typically senior or cross-trained — they
> want to see everything available and pick the most urgent, not switch views and risk missing
> bookings in a forgotten tab. A per-department picker creates a failure mode where a technician
> switches to Department A and misses an urgent booking in Department B.

A technician in departments [Engine Repair, Electrical] sees a single, chronologically-sorted
list (earliest booking time first) of unassigned claimable bookings from both departments.
Each row displays a department label so the technician can distinguish work types at a glance.

### 5.3 Queue staleness and refresh

The queue is polled on a standard interval. When a booking is claimed by any technician (this
one or another), it disappears from the queue on the next refresh. The technician does not
need to manually refresh; the polling handles it. The implementation interval is defined in
the plan phase.

---

## 6. Claimable Booking Statuses

> The following decisions resolve which booking statuses qualify a booking for self-claim.
> The governing principle: a booking is claimable when (a) the customer has committed to
> having it serviced AND (b) work has not yet started or been permanently blocked.

| Status | Claimable? | Rationale |
|---|---|---|
| `PENDING` | **No** | The center has not yet accepted the booking. Claiming before confirmation binds a technician to a booking that may be rejected. If the center confirms it, it becomes claimable then. |
| `CONFIRMED` | **Yes** | Both customer and center have committed. Work has not started. This is the primary claimable state. |
| `RESCHEDULED` | **Yes** | The booking has been moved to a new date, but both parties remain committed. The new date still needs a technician. Treated identically to CONFIRMED for claim purposes. |
| `IN_PROGRESS` | **No** | Work has started; the booking should already be assigned. If unassigned and in progress, this is a data integrity issue — not resolved by claim. |
| `COMPLETED` | **No** | Terminal state. |
| `CANCELLED` | **No** | Terminal state. |
| `NO_SHOW` | **No** | Terminal state. |

> **Product decision flagged for review:** If a future booking status is added (e.g.,
> AWAITING_PARTS, PENDING_CUSTOMER_APPROVAL), the team MUST explicitly evaluate whether it is
> claimable before shipping. The principle above is the test.

---

## 7. Claim Preconditions and Error Codes

A claim request MUST be rejected if any of the following preconditions is violated. The
backend evaluates them in the order listed; the first violation produces the corresponding
error and evaluation stops.

| Order | Precondition | Error code | Message (English) | Message (Arabic) |
|---|---|---|---|---|
| 1 | The caller has an active membership at the booking's center | `STAFF_INACTIVE` | "Your membership is no longer active at this center." | "عضويتك لم تعد فعّالة في هذا المركز." |
| 2 | The booking exists | `BOOKING_NOT_CLAIMABLE` | "This booking is no longer available." | "هذا الحجز لم يعد متاحاً." |
| 3 | The booking's status is in the claimable set (CONFIRMED or RESCHEDULED) | `BOOKING_NOT_CLAIMABLE` | "This booking cannot be claimed in its current status." | "لا يمكن استلام هذا الحجز بوضعه الحالي." |
| 4 | The booking has no assigned technician (assignedMembershipId is null) | `BOOKING_ALREADY_CLAIMED` | "This booking was just claimed by another technician." | "تم استلام هذا الحجز من قِبل فني آخر للتو." |
| 5 | The booking's department is in the caller's departmentIds | `WRONG_DEPARTMENT` | "This booking is in a different department. Ask your manager to assign it if needed." | "هذا الحجز ينتمي لقسم مختلف. اطلب من مديرك التعيين إذا لزم الأمر." |

> **Note on WRONG_DEPARTMENT:** A technician should not normally encounter this error via the
> queue screen, since the queue already filters to their departments. The error exists to
> defend the backend against direct API calls or stale queue data where a booking moved
> departments after the queue was loaded.

---

## 8. User Scenarios

### 8.1 Technician claims a booking (happy path)

- **Given** Mohammed is an active TECHNICIAN at center #5 assigned to the "Engine Repair"
  department
- **And** booking #1042 is CONFIRMED, unassigned, and belongs to "Engine Repair"
- **When** Mohammed opens his department queue, taps booking #1042, and taps Claim
- **Then** he sees a confirmation prompt: "Claim this booking? It will be assigned to you."
- **When** he confirms
- **Then** booking #1042 is assigned to Mohammed immediately
- **And** booking #1042 disappears from the queue for all technicians
- **And** the booking detail for #1042 shows Mohammed as the assigned technician
- **And** an audit record is created: Mohammed claimed booking #1042 from the Engine Repair
  department queue at [timestamp]

### 8.2 Simultaneous claim — exactly one wins

- **Given** booking #1042 is CONFIRMED and unassigned in "Engine Repair"
- **And** Mohammed and Khaled are both active TECHNICIANs in "Engine Repair"
- **When** Mohammed and Khaled both tap Claim on booking #1042 within milliseconds of each other
- **Then** exactly one of them receives a success response and is assigned to the booking
- **And** the other receives an error with code BOOKING_ALREADY_CLAIMED and the message
  "This booking was just claimed by another technician."
- **And** the booking is assigned to exactly one technician — no double-assignment occurs

### 8.3 Cross-department claim rejected

- **Given** Mohammed is assigned only to "Engine Repair" (not "Body Shop")
- **And** booking #1099 belongs to "Body Shop"
- **When** Mohammed attempts to claim booking #1099 (e.g., via a direct API call — this
  booking would not appear in his queue under normal conditions)
- **Then** the claim is rejected with error code WRONG_DEPARTMENT
- **And** Mohammed is shown the message: "This booking is in a different department. Ask your
  manager to assign it if needed."
- **And** the booking remains unassigned

### 8.4 Booking status changes before claim

- **Given** booking #1042 is CONFIRMED and unassigned in Mohammed's queue
- **And** the customer cancels the booking (changing its status to CANCELLED) before Mohammed
  taps Claim
- **When** Mohammed taps Claim
- **Then** the claim is rejected with error code BOOKING_NOT_CLAIMABLE
- **And** Mohammed is shown the message: "This booking cannot be claimed in its current status."
- **And** booking #1042 disappears from Mohammed's queue on the next refresh

### 8.5 Empty department queue

- **Given** Mohammed is in "Engine Repair" and all bookings in that department are either
  assigned or in a non-claimable status
- **When** Mohammed opens his queue
- **Then** he sees an empty state: "No unassigned bookings in your department."
- **And** no error occurs; the screen renders cleanly

### 8.6 Technician with no department assignments

- **Given** Sara was just added as a TECHNICIAN but her manager has not assigned her to any
  department yet
- **When** Sara opens her booking queue
- **Then** she sees the message: "You are not assigned to any department. Contact your branch
  manager to be added to a department." (per specs/020-center-departments scenario 6.9)
- **And** the queue is empty; no error occurs

### 8.7 Manager visibility — Attention Required panel

- **Given** booking #1050 has been CONFIRMED and unassigned for more than 2 hours and
  its scheduled time is within 2 hours
- **When** Ahmed (OWNER) checks the Attention Required panel on his dashboard
- **Then** booking #1050 appears as an attention item with severity based on time-to-start
- **And** the panel shows "Unassigned booking — [department name] — starts in [relative time]"
- **And** Ahmed can tap the item to open the booking and manually assign a technician

### 8.8 Manager manually assigns instead of waiting for claim

- **Given** no technician has claimed booking #1042 after 30 minutes
- **And** Ahmed (OWNER) wants to assign it to Mohammed directly
- **When** Ahmed opens booking #1042 and uses the "Assign Technician" picker
- **Then** Mohammed is assigned to the booking (this is ASSIGN_TECHNICIAN_MANUAL, not a claim)
- **And** booking #1042 disappears from the department queue
- **And** the audit record reflects: assigned by Ahmed to Mohammed

---

## 9. Functional Requirements

### Queue

- **FR-SC-001** A TECHNICIAN MUST be able to view a paginated list of unassigned, claimable
  bookings scoped to their department(s) and their active center.
- **FR-SC-002** The queue MUST be sorted by booking time, earliest first.
- **FR-SC-003** The queue MUST combine bookings from all of the technician's assigned departments
  into a single list. Each booking row MUST display the department it belongs to.
- **FR-SC-004** The queue MUST be server-filtered by department: the backend derives the
  technician's departments from their active membership. No department identifier is accepted
  as a client-supplied parameter.
- **FR-SC-005** A technician with zero department assignments MUST see an empty queue with an
  explanatory message (not an error).

### Claim

- **FR-SC-006** A TECHNICIAN with `CLAIM_BOOKING` permission MUST be able to initiate a claim
  on an unassigned, claimable booking from the queue.
- **FR-SC-007** Before executing a claim, the system MUST evaluate all preconditions in §7 in
  the listed order and reject with the corresponding error code on the first failure.
- **FR-SC-008** A successful claim MUST atomically set the booking's assigned technician to the
  caller's membership. No other modification to the booking is made by the claim operation.
- **FR-SC-009** The claim MUST be atomic under concurrent access: if two technicians claim the
  same booking simultaneously, exactly one MUST succeed and the other MUST receive
  BOOKING_ALREADY_CLAIMED. No booking MUST end up with two assigned technicians.
- **FR-SC-010** A TECHNICIAN MUST NOT be able to claim a booking outside their department(s),
  regardless of booking status or assignment state.

### Audit

- **FR-SC-011** Every successful claim MUST create an immutable audit record containing: the
  booking identifier, the claiming technician's user and membership identifier, the department
  context at the time of claim, and a server-generated timestamp.
- **FR-SC-012** The audit record MUST NOT be modifiable after creation. If the booking is
  later reassigned by a manager, the original claim audit record is retained alongside the
  reassignment record.

### Error handling

- **FR-SC-013** All five error codes in §7 MUST be returned by the backend as a structured
  error response with the error code as a machine-readable field. The frontend MUST display
  the corresponding localized message for each code.
- **FR-SC-014** An unrecognized error from the backend MUST display a generic bilingual error
  message ("Something went wrong. Please try again.") rather than crashing or showing a
  technical error.

### Manager path

- **FR-SC-015** Unassigned bookings that have been CONFIRMED for more than a configurable
  threshold and whose scheduled time is within a configurable window MUST surface in the
  Attention Required panel as described in `specs/016-attention-required-panel`.
- **FR-SC-016** A manager using ASSIGN_TECHNICIAN_MANUAL MUST be able to assign a booking to
  a technician in a different department with an explicit override confirmation. This is the
  ONLY path for cross-department assignment; there is no cross-department override for
  self-claim.

---

## 10. Non-Functional Requirements

- **NFR-SC-001** A claim operation MUST complete (success or error) in under 500ms p95 under
  normal load. Concurrency locking MUST be implemented server-side and MUST NOT degrade
  performance beyond this threshold for a center with up to 50 concurrent technicians.
- **NFR-SC-002** The queue endpoint MUST return results in under 300ms p95 for a department
  with up to 200 unassigned claimable bookings.
- **NFR-SC-003** The concurrency guarantee (FR-SC-009) MUST hold under a load test simulating
  20 simultaneous claim requests for the same booking. This MUST be verified before the
  backend is declared production-ready.

---

## 11. Edge Cases

- **EC-SC-1** A booking moves from CONFIRMED to CANCELLED between the time it appears in the
  queue and the time the technician taps Claim. → Precondition 3 (status check) rejects the
  claim with BOOKING_NOT_CLAIMABLE. The booking disappears from the queue on next refresh.
- **EC-SC-2** A technician's department assignment is removed by a manager while the technician
  is mid-session viewing the queue. → Bookings from the removed department disappear on next
  queue refresh. If the technician attempts to claim a booking in the removed department before
  refresh, precondition 5 (WRONG_DEPARTMENT) rejects it.
- **EC-SC-3** A technician's membership is suspended mid-session. → Precondition 1
  (STAFF_INACTIVE) rejects any claim attempt. The session's 401-middleware handles the next
  authenticated request; the technician is logged out within the JWT lifetime or the next
  membership-status check, whichever is sooner.
- **EC-SC-4** A booking's department is manually changed by a manager after it appears in a
  technician's queue but before the technician taps Claim. → Precondition 5 (WRONG_DEPARTMENT)
  rejects the claim. No stale claim succeeds.
- **EC-SC-5** The center has no departments (edge case: FR-D-006 prevents this, but direct
  data operations could produce it). → The queue returns empty with an explanatory message.
  No crash. The owner's dashboard surfaces a center-health alert.

---

## 12. Open Questions (to resolve in `/clarify` if needed)

- **OQ-SC-1** Should the Attention Required panel show the department name of the unassigned
  booking? Currently yes (scenario 8.7). Confirm with the Attention Required panel spec owner.
- **OQ-SC-2** Claim capacity limit: should a technician who already has N in-progress bookings
  be blocked from claiming more? v1 spec does not enforce a cap. Flag if managers report
  technicians over-claiming.

---

## 13. Success Criteria

- **SC-SC-1** A technician can claim a booking from their department queue within 3 taps from
  the home screen, with no manager involvement.
- **SC-SC-2** Under a load test of 20 simultaneous claim requests for the same booking, exactly
  one succeeds. Zero double-assignments in 1,000 test runs.
- **SC-SC-3** 100% of claim operations (success and failure) produce an immutable audit record.
- **SC-SC-4** Zero instances of a technician seeing a booking in their queue that belongs to a
  different center or a different department (verified by integration test with real membership
  data).
