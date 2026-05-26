# Research: Diagnostic Department & Booking Re-Route

**Feature**: 022-diagnostic-and-reroute
**Phase**: Phase 0 — Research
**Date**: 2026-05-26

All decisions below were resolved by reading the existing codebase (specs 009, 011, 015,
020, 021) and the project's CLAUDE.md. No external research was required.

The three Open Questions on `spec.md` (OQ-DR-1..3) are PRODUCT questions, not technical
ones — they are intentionally deferred to `/speckit.clarify`. The plan proceeds with the v1
defaults already stated in the spec.

---

## Decision 1: Extend `Department` vs. introduce a new `DiagnosticDepartment` subtype

**Question**: A diagnostic department behaves slightly differently (receives unclassified
bookings, holds a fee). Should it be a subtype (JPA inheritance / separate entity) or a flag
on `Department`?

**Decision**: A boolean flag (`isDiagnostic`) plus an optional `diagnosticFeeAmount` field
on the existing `Department` entity.

**Rationale**:
- Subtyping forces every consumer of `Department` (routing logic, list endpoint, owner UI,
  queue filter from 021) to be aware of a polymorphic type and pattern-match on it. A flag
  is invisible to consumers that don't care.
- The constraint "at most one diagnostic department per center" is a partial-unique index, a
  one-line database guarantee. Equivalent enforcement on a subtype is more invasive.
- The default ("General") department might also be the diagnostic department (FR-DR-004); a
  subtype would force us to choose, while a flag composes naturally.
- 020's data model already supports adding columns to `Department` (the entity isn't sealed).

**Alternatives considered**:
- JPA `@Inheritance(strategy = JOINED)` with `DiagnosticDepartment` as a subclass: rejected
  for added query complexity and the "default-is-diagnostic" composition issue above.
- A separate `DiagnosticConfig` entity keyed by `centerId`: rejected because then routing
  has to consult two entities and the relationship between "the diagnostic department" and
  "this Department row" is implicit rather than enforced.

---

## Decision 2: Fee rate locking — capture-on-claim vs. capture-on-booking

**Question**: The diagnostic fee rate can change over time. When should we lock the rate
for a given booking — at booking creation, at diagnostic claim, or at quote-build time?

**Decision**: Capture at the moment the booking is **claimed by a diagnostic technician**
(spec FR-DR-014). Stored as `Booking.diagnosticFeeRateAtClaim`.

**Rationale**:
- Capturing at booking creation overcharges a customer who books today for a slot next
  month if the owner lowers the fee in between (centers run discounts; rate changes are
  common).
- Capturing at quote-build is too late: a diagnostic tech could spend 30 minutes diagnosing
  before the working tech builds the quote, and the owner could change the fee in between —
  again opaque to the customer.
- The diagnostic-claim moment is "we have committed time to this customer's problem" — the
  cleanest accountability point.
- This adds only the existing claim path (021) — the same write transaction. No new
  endpoint, no extra round-trip.

**Alternatives considered**:
- Lock at booking creation: rejected; mismatched with refund/discount mental model.
- Lock at quote-build: rejected; opens a fee-bait window.
- Always use current rate at quote-build: rejected per spec FR-DR-014.

---

## Decision 3: Where re-route logic lives on the backend

**Question**: Re-route mutates `Booking`, may mutate `BookingQuote`, writes `RerouteAudit`,
and triggers a notification. Which service owns it?

**Decision**: A new `RerouteService` in a new `reroute/` package.

**Rationale**:
- Re-route is a cross-cutting operation that touches three other domains (booking, quote,
  notification). Putting it in `BookingService` would inflate that service and create
  reverse dependencies (booking → quote → booking).
- A new package isolates the audit entity and lets us add a re-route-rate analytics query
  later without polluting `BookingService`.
- This matches the existing pattern: `chat/`, `notification/`, `complaint/` each own their
  cross-cutting domain.
- The audit table is append-only and self-contained — pairs naturally with its own
  repository.

**Alternatives considered**:
- Add to `BookingService`: rejected for size and reverse-dependency reasons.
- Add a `BookingActionsService` for booking-level operations broadly: rejected as
  speculative — we have one operation today; promoting it to a generic actions service is
  premature.

---

## Decision 4: Concurrency control on re-route

**Question**: Two valid re-route attempts (assigned tech + owner) can hit the same booking
in the same millisecond. How do we prevent split-brain?

**Decision**: Pessimistic row lock on `Booking` for the duration of the re-route
transaction. The second submitter receives a 409 with `BUSINESS_ERROR_CODE_REROUTE_CONFLICT`
and the current booking state, and must re-evaluate before resubmitting.

**Rationale**:
- 021 already uses pessimistic locking on `Booking` for claim (per `BookingRepository`
  `@Lock(PESSIMISTIC_WRITE)`). Reusing the same pattern keeps the model uniform.
- Re-route is rare (operationally <1% of bookings re-route). Lock contention is not a
  scalability concern.
- Optimistic locking with `@Version` would work too, but it forces the client to handle the
  version round-trip. Pessimistic is simpler and matches existing code.

**Alternatives considered**:
- Optimistic locking via `@Version`: rejected for matching-existing-pattern reasons.
- Idempotency key from the client: rejected; re-route isn't naturally idempotent (the second
  request would re-route from the new state, not the old one — semantically different).

---

## Decision 5: Customer notification mechanism

**Question**: Re-route triggers a customer notification. How do we wire that?

**Decision**: Enqueue a notification message via the existing `NotificationService` after
the re-route transaction commits. Use a new notification type `BOOKING_REROUTED`. Push +
in-app per the existing infrastructure.

**Rationale**:
- The existing notification infrastructure already supports parameterized bilingual
  messages and push delivery (per CLAUDE.md notifications domain).
- Enqueueing **after commit** ensures we don't send a "your booking moved" notification for
  a re-route that later rolls back. The pattern is already in use elsewhere (per 021's
  notification handling in `BookingClaimAudit`).
- A new `NotificationType` is additive — no schema change beyond extending the enum.

**Alternatives considered**:
- Send inside the same transaction: rejected; commit-or-rollback semantics matter for
  customer trust.
- Use the websocket/STOMP channel directly: rejected; customers may be offline. Push is
  the right delivery primitive.

---

## Decision 6: Surfacing the diagnostic fee on quotes — line item vs. summary field

**Question**: The diagnostic fee is non-editable and must appear distinctly on the customer's
quote view. Is it a regular line item flagged "non-removable," or a separate summary line?

**Decision**: A line item with `kind = DIAGNOSTIC_FEE` (an extension to the existing line
item enum on `BookingQuote`). The frontend renders it in a visually distinct section.

**Rationale**:
- Modeling it as a line item keeps quote totals computed by summing line items — no parallel
  total-calculation path.
- The `kind` discriminator lets the frontend hide the delete and edit affordances for
  diagnostic lines without a separate code path.
- Audit and history work for free — the line is part of the quote like any other.
- The fee amount is the snapshot captured on the booking, not the current value on the
  department — frontend never needs to look it up.

**Alternatives considered**:
- Separate `diagnosticFee` field on `BookingQuote`: rejected; would require parallel total
  calculations and the customer UI would have a separate rendering path.
- A "system line items" array distinct from "user line items": rejected as premature
  generalization for a feature that has one system line item type.

---

## Decision 7: Permission model for re-route

**Question**: Who can call the re-route endpoint?

**Decision**:
- TECHNICIAN: can re-route only the booking they are currently assigned to. New permission
  `REROUTE_BOOKING_ASSIGNED`.
- OWNER and BRANCH_MANAGER: can re-route any booking at their center. New permission
  `REROUTE_BOOKING_ANY`.
- The permission additions are codified in an amendment to spec 011 (per FR-DR-032), not
  inside this spec's implementation. Backend uses the existing permission-check framework
  from 011/015.

**Rationale**:
- Mirrors 021's split: `CLAIM_BOOKING` for technicians (self-scope) vs.
  `ASSIGN_TECHNICIAN_MANUAL` for managers (any-scope).
- Per CLAUDE.md, permission changes go through 011's amendment file, never silently.
- This keeps fine-grained authorization in the permission domain, not embedded as ad-hoc
  `if` statements in the re-route controller.

**Alternatives considered**:
- Single permission `REROUTE_BOOKING` with role-based scope check inside the service:
  rejected as harder to grep for and audit.
- Allow any technician at the booking's center: rejected — encourages drive-by re-routes,
  weakens accountability.

---

## Decision 8: Where the diagnostic indicator lives on `Booking`

**Question**: Should `Booking.passedThroughDiagnostic` be a boolean, or implied by querying
the `RerouteAudit` table for an entry where `from_department.is_diagnostic = true`?

**Decision**: Materialized boolean column on `Booking` (`passedThroughDiagnostic`).

**Rationale**:
- Quote build time needs this answer constantly (every quote checks "should I add the fee
  line"). A boolean lookup is O(1); a multi-join query into audit history is not.
- The state never changes after creation (re-routing INTO diagnostic is forbidden per
  FR-DR-017). So denormalization risk is zero.
- The audit table is the source of truth for *why* and *when* the routing happened;
  `passedThroughDiagnostic` is a cached "did this happen at all" answer.

**Alternatives considered**:
- Derive from `RerouteAudit.fromDept.isDiagnostic`: rejected for query cost and the
  edge case of "booking started in diagnostic but was never re-routed" (no audit row exists,
  yet the booking did pass through diagnostic).
- Store as `originatingDepartmentId` (a FK rather than a boolean): rejected as more
  general than needed; FR-DR-008 explicitly says "an indicator" is enough.

---

## Decision 9: Customer-app cross-repo coordination

**Question**: The spec requires the customer app to make ServiceCategory optional. How do
we coordinate without blocking this stream?

**Decision**: Backend ships first with `categoryId` made nullable in the booking-create
contract. Customer app's existing flow continues working (always sends `categoryId`); the
new "let me diagnose" option ships when the customer-app team picks it up.

**Rationale**:
- Backend change is non-breaking: `categoryId: Long?` accepts both null and a value.
- Customer-app and owner-app sessions can proceed in parallel after backend ships.
- The new owner-app diagnostic-dept toggle is useful even before the customer can opt into
  diagnosis — owners can still re-route bookings into the diagnostic dept's queue (no, wait
  — FR-DR-017 forbids this). Actually: owners can configure the diagnostic dept and assign
  technicians ahead of time, but real bookings only arrive once the customer-app change
  ships.
- Document the dependency in `quickstart.md` so the customer-app team has a checklist.

**Alternatives considered**:
- Block this stream on customer-app change: rejected; the customer-app session is a
  separate repo with its own cadence.
- Backend rejects `categoryId = null` until the customer-app change ships: rejected;
  adds a flag to deprecate later.

---

## Open Questions Deferred to `/speckit.clarify`

The spec contains three OQ items. These are not technical decisions and do not block plan
execution:

| OQ | Topic | v1 Default |
|---|---|---|
| OQ-DR-1 | Pre-booking disclosure of diagnostic fee on center detail | No (fee shown at quote time) |
| OQ-DR-2 | Fee owed if customer cancels after diagnosis but before quote | Yes (workshop convention) |
| OQ-DR-3 | Re-route notification includes structured reason | No (generic phrasing per FR-DR-028) |

Tasks generated from this plan assume the v1 defaults. If `/clarify` changes any answer,
the task list will need a minor revision — none of the changes would require ripping up
the data model.
