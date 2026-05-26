# Feature Specification: Diagnostic Department & Booking Re-Route

**Feature Branch:** `022-diagnostic-and-reroute`
**Status:** Approved
**Created:** 2026-05-26
**Phase:** specify (next: plan → tasks → implement)

> **Spec Kit reminder:** This document describes WHAT the system must do and WHY, not HOW.
> Implementation details (tables, endpoints, framework choices) belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Requires** `specs/020-center-departments` — Department is the unit of routing; a diagnostic
  department is a regular Department with a flag.
- **Requires** `specs/021-self-claim-booking` — re-routed bookings re-enter the target department's
  queue and are claimed by self-claim, not auto-assigned.
- **Requires** `specs/011-center-staff-permissions` — TECHNICIAN gains a `REROUTE_BOOKING`
  permission scoped to bookings they are currently assigned to; OWNER and BRANCH_MANAGER may
  re-route any booking at their center.
- **Requires** `specs/009-work-progress-quotes` — when a re-route occurs after a quote has been
  sent, the existing quote is marked REVISED; the new technician creates a new version.
- **Required by** nothing at time of writing.

---

## 1. Summary

This spec adds three interlocking capabilities on top of the department model from 020 and the
self-claim model from 021:

1. **Diagnostic department**: a special department that receives bookings the customer could
   not classify themselves. A diagnostic technician examines the work, classifies it into a
   ServiceCategory, then re-routes the booking to the appropriate working department.
2. **Diagnostic fee**: a center-configurable charge that is added to the eventual quote when a
   booking passed through the diagnostic department. The fee is owed regardless of whether the
   customer approves the repair quote (workshop-standard "we charged you for our time").
3. **Booking re-route**: a formal, audited mechanism for moving a booking from one department
   to another after it has been routed. This is the same mechanism the diagnostic technician
   uses to hand a booking off, and the same mechanism a working technician uses when they
   discover the booking belongs to a different department.

Together they let centers run a realistic intake-and-routing flow that matches how physical
workshops actually operate, while preserving the self-claim model already approved in 021.

---

## 2. Why Now

- The current booking flow forces customers to pick a ServiceCategory at booking time. Many
  customers do not know what their car needs — they know what is broken ("the AC isn't cold,"
  "there's a clicking sound") but not which trade-skill is responsible. Forcing a guess at
  booking time produces wrong-department arrivals that managers must reassign manually.
- 020 covers routing by ServiceCategory but assumes the category is known. There is no
  modeled path for "the center figures it out."
- Bookings that arrive in the wrong department today are handled by ad-hoc manager
  reassignment with no audit, no quote-revision linkage, and no customer notification. This
  hides operational issues (high re-route rate per department signals a diagnostic problem)
  and frustrates customers who get silent delays.
- Centers consistently asked for the ability to charge for diagnostic time, even when the
  customer ultimately declines the repair. Without this, diagnostic work is unpaid and
  centers either skip it or refuse customers who "shop around" diagnoses.

---

## 3. Scope

### In scope

- A Department MAY be flagged as diagnostic at creation or edit time (subject to constraints
  in §7). At most one diagnostic department per center.
- A diagnostic department MAY have a configurable fee amount (denominated in KD, 3 decimals).
  Zero is permitted (a center may choose not to charge for diagnosis).
- The customer booking flow allows the customer to skip ServiceCategory selection. A booking
  created without a ServiceCategory routes to the center's diagnostic department if one exists;
  otherwise to the default department per existing 020 rules.
- A diagnostic technician, after diagnosing the booking, performs a re-route to the appropriate
  working department, optionally setting a ServiceCategory at the same time. The re-route is
  the formal classification action.
- An assigned technician at any department MAY re-route the booking they are working on to a
  different department when they discover the work belongs elsewhere.
- An OWNER or BRANCH_MANAGER MAY re-route any booking at their center at any time (override).
- Every re-route requires a structured reason and an optional free-text note, both recorded
  in an immutable audit trail.
- Re-route after quote creation triggers a quote revision per 009.
- Customers are notified of re-routes that change the expected timeline.
- When a booking passed through the diagnostic department, the diagnostic fee is included as
  a non-removable line item on the final quote and is owed regardless of customer approval
  of the repair quote.

### Out of scope (explicitly deferred)

- **Multiple diagnostic departments per center.** v1 enforces at most one.
- **Per-ServiceCategory diagnostic fees** (different fee for electrical vs. body work). v1 has
  one fee per center.
- **Diagnostic fee refund/waiver workflow** when the customer approves the repair quote.
  Current policy: the fee is always owed. Operationally, an owner can discount the final quote
  by the fee amount if they choose, but the system does not automate this.
- **Cross-center re-route** (moving a booking from one center to a sister center).
- **Auto-classification by ML/historical inference.** Classification is always a human action
  by the diagnostic technician.
- **Customer-initiated re-route** ("I'd actually like a different department to handle this").
  Out of scope; if the customer wants a different center entirely, they cancel and re-book.
- **Re-route rate limiting** (e.g., refusing to re-route a booking more than N times). v1
  records all re-routes and surfaces high re-route rates in analytics; no hard cap.
- **Modifications to 020's department-config-time category coverage.** A re-route on an existing
  booking is independent of a manager later changing which categories a department covers.

---

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **Diagnostic Department** | A Department with `isDiagnostic = true`. At most one per center. Receives bookings whose ServiceCategory is unknown at booking creation. |
| **Diagnostic Fee** | A center-configured monetary amount, in KD, charged when a booking is routed through the diagnostic department. Always added to the final quote as a non-removable line item. Owed regardless of repair-quote approval. |
| **Re-route** | The act of changing a booking's `department` after it has been routed, with a structured reason and an audit record. Distinct from the initial routing at booking creation. |
| **Re-route Trigger** | The user who initiated the re-route: the currently assigned technician, the OWNER, or a BRANCH_MANAGER. |
| **Reroute Reason** | One of the structured enum values: `WRONG_DIAGNOSIS`, `OUT_OF_SCOPE`, `SPECIALIST_NEEDED`, `STAFF_UNAVAILABLE`, `CUSTOMER_REQUEST`, `OTHER`. |
| **Diagnostic Classification** | The first re-route on a booking that originated in the diagnostic department. Distinguished in the audit trail but uses the same mechanism. |
| **Quote Revision** | A new version of a `BookingQuote` (per spec 009) issued after a re-route, when a quote already existed. The prior quote is marked REVISED. |

---

## 5. Booking Creation Flow Changes

The booking creation flow defined elsewhere is amended as follows:

1. The customer MAY now create a booking without selecting a ServiceCategory. The form
   presents "Not sure — let the center diagnose it" as an explicit option, distinct from "no
   selection."
2. When the booking is created:
   - **If the customer selected a ServiceCategory:** routing proceeds per 020 (match the
     category against active department coverage; fall back to default).
   - **If the customer chose "let the center diagnose":** if the center has a diagnostic
     department, the booking is routed there. Otherwise the booking is routed to the default
     department per 020 FR-D-008.
3. The booking record retains an indicator of whether it passed through the diagnostic
   department (used to determine fee applicability at quote time, see §7).
4. No diagnostic fee is shown to the customer at booking time. The booking confirmation
   message MAY inform the customer that "if diagnosis is required, a separate fee may apply."
   Exact wording is a copy decision, not a spec decision.

---

## 6. User Scenarios

### 6.1 Customer books without picking a service (happy path through diagnostic)

- **Given** Khaled has a strange noise from his car but doesn't know which system is at fault
- **And** his chosen center has a diagnostic department with a 5 KD fee
- **When** Khaled opens the booking form and selects "Not sure — let the center diagnose it,"
  picks a date/time, and submits
- **Then** the booking is created in CONFIRMED state and routed to the Diagnostic department
- **And** Khaled receives a confirmation indicating the booking is scheduled
- **When** Ali (TECHNICIAN, Diagnostic department) opens his queue, sees Khaled's booking, and
  taps Claim
- **Then** Ali is assigned to the booking per 021
- **When** Ali completes the diagnosis and identifies the issue as electrical, he re-routes
  the booking to the Electrical department with reason SPECIALIST_NEEDED and notes
  "Alternator likely failing"
- **Then** the booking is reassigned to the Electrical department, becomes unassigned, and
  appears in the Electrical-department self-claim queue
- **And** an audit record is created: Ali re-routed booking from Diagnostic to Electrical,
  reason SPECIALIST_NEEDED, at [timestamp]
- **And** Khaled is notified: "Our diagnostic team identified the issue. Your booking has
  moved to the Electrical team. Expected start time has been updated."
- **When** Omar (TECHNICIAN, Electrical) self-claims the booking, completes the work, and
  builds the quote
- **Then** the quote includes a non-removable line item "Diagnostic Fee: 5 KD" alongside the
  parts and labor lines

### 6.2 Customer rejects the repair quote — diagnostic fee still owed

- **Given** Khaled's booking (per 6.1) reached the quote-ready stage and Omar built a quote
  for 80 KD parts + 25 KD labor + 5 KD diagnostic fee = 110 KD total
- **When** Khaled reviews the quote and declines the repair
- **Then** the booking moves to QUOTE_REJECTED per 009
- **And** the diagnostic fee of 5 KD is recorded as owed
- **And** the customer is informed at decline time that the diagnostic fee remains due
- **And** the center can collect the diagnostic fee through whatever payment flow they normally
  use (out of scope for this spec — billing flow exists elsewhere)

### 6.3 Customer picks a service — no diagnostic, no fee

- **Given** Khaled knows he needs an oil change and the center has a diagnostic department
- **When** he creates a booking with ServiceCategory = "Oil Change"
- **Then** the booking is routed directly to the department that covers Oil Change (e.g.,
  General Maintenance) per existing 020 rules
- **And** the booking does NOT pass through the diagnostic department
- **And** no diagnostic fee is charged
- **And** the quote contains parts and labor only

### 6.4 Working technician discovers wrong department mid-work

- **Given** booking #2050 was routed to "Engine Repair" and Omar (Engine) self-claimed it
- **And** Omar has started work and begun diagnosis under DIAGNOSING work-stage per 009
- **When** Omar determines the issue is actually electrical and not engine-related
- **Then** Omar opens the booking and uses the Re-route action with target = "Electrical,"
  reason = WRONG_DIAGNOSIS, notes = "Compression normal; failure pattern matches alternator"
- **Then** the booking's department changes to Electrical
- **And** Omar is removed as the assigned technician (assignedMembershipId becomes null)
- **And** the booking re-enters the Electrical queue
- **And** the audit record is created
- **And** Khaled (customer) is notified of the re-route

### 6.5 Working technician re-routes after a quote was already sent

- **Given** Omar (Engine) had self-claimed booking #2050, completed diagnosis, sent a quote
  for engine work, and the customer had APPROVED the quote
- **And** mid-repair, Omar discovers an unrelated electrical fault is the root cause
- **When** Omar re-routes the booking to Electrical with reason WRONG_DIAGNOSIS
- **Then** the existing approved quote is marked REVISED per 009
- **And** the customer is notified that a revised quote will follow and is asked to re-approve
- **And** the booking enters the Electrical queue with no current quote in force
- **When** the next Electrical technician (Tariq) self-claims and builds a new quote
- **Then** the new quote is version 2 of the original quote; the customer must approve it before
  work continues
- **And** the diagnostic fee line item is preserved on the new quote if the booking originally
  passed through Diagnostic; otherwise it is not present

### 6.6 Manager-initiated re-route (override)

- **Given** booking #2075 is in the Body Shop queue but Ahmed (OWNER) wants to assign it to
  Electrical because Body Shop is overloaded
- **When** Ahmed opens the booking and uses Re-route with target = "Electrical," reason =
  STAFF_UNAVAILABLE, notes = "Body Shop fully booked through Tuesday"
- **Then** the re-route succeeds even though Ahmed is neither the diagnostic nor the assigned
  technician
- **And** the audit record records Ahmed as the trigger (distinct from the assigned tech case)
- **And** if anyone was already self-claimed on the booking, they are unassigned and notified
  (their session loses the booking on next refresh per 021)

### 6.7 Re-route into the diagnostic department — rejected

- **Given** booking #2080 is in Engine Repair
- **When** Omar attempts to re-route it back to the Diagnostic department
- **Then** the action is rejected with a bilingual error: "Bookings cannot be re-routed into
  the diagnostic department. Re-route to a working department instead."
- **And** the booking remains in Engine Repair

### 6.8 Center has no diagnostic department — customer cannot skip service selection

- **Given** Khaled's chosen center has no diagnostic department configured
- **When** Khaled opens the booking form
- **Then** the "Not sure — let the center diagnose it" option is hidden or disabled with an
  explanatory note ("This center requires selecting a service.")
- **And** Khaled must pick a ServiceCategory to proceed

### 6.9 Diagnostic department deactivated while bookings are in its queue

- **Given** the Diagnostic department has 3 unassigned bookings in its queue
- **When** Ahmed (OWNER) attempts to deactivate the Diagnostic department
- **Then** deactivation is blocked per 020 FR-D-003 (open bookings)
- **And** the bilingual error message specifies these are diagnostic bookings: "This department
  has open bookings. Reassign or complete them before deactivating."
- **And** Ahmed has two options: re-route each booking manually, or wait for the diagnostic
  technicians to clear the queue

### 6.10 High re-route rate as a quality signal

- **Given** the Engine Repair department has had 30% of its incoming bookings re-routed out
  with reason WRONG_DIAGNOSIS over the last 30 days
- **When** Ahmed views the Department Management screen
- **Then** the department row surfaces a warning: "30% of bookings have been re-routed out.
  Review diagnostic accuracy."
- **And** Ahmed can drill into the audit log to see which bookings were re-routed and why
- **Note:** the threshold and exact UI are deferred to the plan phase; this scenario establishes
  that the data MUST be queryable.

---

## 7. Functional Requirements

### Diagnostic department

- **FR-DR-001** A Department MAY be flagged as `isDiagnostic = true`. At most one diagnostic
  department per center MUST be enforced; any attempt to flag a second department as diagnostic
  MUST be rejected with a bilingual error.
- **FR-DR-002** A diagnostic department MAY have a configurable diagnostic fee amount, in KD,
  with 3-decimal precision. Permitted values: zero or any positive amount. The fee MUST be
  settable only on a department flagged as diagnostic; setting it on a non-diagnostic
  department is rejected.
- **FR-DR-003** The diagnostic-flag value MUST NOT be toggleable while the department has any
  non-terminal bookings assigned to it. The owner must drain the department first. (Same
  pattern as 020 FR-D-003.)
- **FR-DR-004** The diagnostic department MAY be the same department as the default ("General")
  department or a separate one. If a center configures the default department as diagnostic,
  unroutable bookings and "let the center diagnose" bookings both land there.
- **FR-DR-005** The diagnostic department MUST NOT be set as deactivated while the center is
  the customer's selected center AND the customer has chosen "let the center diagnose."
  Operationally, 020 FR-D-003 already blocks deactivation with open bookings, which covers
  this case.

### Booking creation flow

- **FR-DR-006** The customer booking form MUST allow the customer to create a booking without
  selecting a ServiceCategory. The UI MUST present this as an explicit option ("Not sure — let
  the center diagnose it"), not as "no selection."
- **FR-DR-007** A booking created with no ServiceCategory MUST route to the center's diagnostic
  department if one exists. If no diagnostic department exists at the center, the booking MUST
  route to the default department per 020 FR-D-008.
- **FR-DR-008** A booking record MUST include an indicator (e.g., a boolean or a foreign key
  to the original diagnostic department) that the booking passed through diagnostic. This
  indicator MUST be set when the booking is created in the diagnostic department AND MUST be
  preserved across all subsequent re-routes. It is used to determine fee applicability at
  quote time.
- **FR-DR-009** The "let the center diagnose" booking option MUST be hidden or disabled in the
  customer app for centers that have no diagnostic department configured.

### Diagnostic fee

- **FR-DR-010** When a technician builds a quote (per 009) for a booking whose diagnostic
  indicator is true, the quote MUST include a non-removable, non-editable line item labeled
  "Diagnostic Fee" with the amount equal to the diagnostic fee configured on the center's
  diagnostic department AT THE TIME THE BOOKING WAS DIAGNOSED. (The fee amount is locked to the
  rate at the time of diagnostic claim, not the rate at quote-build time. Otherwise an owner
  could raise the fee mid-job.)
- **FR-DR-011** The diagnostic fee line item MUST be visually distinct from parts/labor lines
  on the customer-facing quote view (e.g., a different section, a tooltip explaining the
  charge).
- **FR-DR-012** A booking quote that includes a diagnostic fee MUST surface the fee as still
  owed when the customer rejects the repair quote (QUOTE_REJECTED per 009). The customer's
  outstanding balance for the booking equals the diagnostic fee in this case.
- **FR-DR-013** The diagnostic fee MUST NOT be charged for bookings whose diagnostic indicator
  is false, even if a re-route later moves the booking through a diagnostic step. (Re-routing
  INTO diagnostic is forbidden per §7 re-route below.)
- **FR-DR-014** The diagnostic fee amount in effect at the moment of diagnostic-claim MUST be
  recorded on the booking (or in a related record) so that subsequent fee-rate changes by the
  owner do not alter what the customer owes.

### Re-route — general

- **FR-DR-015** A re-route operation MUST require: target department (within the same center),
  a reason from the structured enum (§4 Glossary), and an optional free-text note (max 500
  characters).
- **FR-DR-016** A re-route MUST be permitted when the trigger is one of:
  - The technician currently assigned to the booking
  - An OWNER of the booking's center
  - A BRANCH_MANAGER of the booking's center
  Any other caller MUST receive a permission error.
- **FR-DR-017** A re-route into the diagnostic department MUST be rejected. Re-route targets
  MUST be working departments only. (Diagnostic is an intake step, not a re-route destination.)
- **FR-DR-018** A re-route from a department to the same department MUST be rejected as a
  no-op with a bilingual error.
- **FR-DR-019** A re-route on a booking in a terminal status (COMPLETED, CANCELLED, NO_SHOW)
  MUST be rejected with a bilingual error.
- **FR-DR-020** Upon successful re-route:
  - The booking's department MUST change to the target.
  - The booking's `assignedMembershipId` MUST be set to null.
  - The booking re-enters the target department's self-claim queue per 021.
  - The target department's queue refresh MUST surface the booking on the next poll.
  - The previously assigned technician's queue (if any) MUST lose the booking on next poll.
- **FR-DR-021** If the booking had an active quote (status SENT or APPROVED) at the time of
  re-route, the quote MUST be marked REVISED per 009. The customer MUST be notified that a
  new quote will follow. Work-in-progress MUST be paused until the new quote is approved.
- **FR-DR-022** The booking's work-progress history (per 009) MUST be preserved across
  re-routes. The new assigned technician sees the prior history (diagnosis notes, photos,
  prior stage entries) as read-only context.

### Re-route — audit

- **FR-DR-023** Every re-route, including the initial diagnostic classification, MUST create
  an immutable audit record containing:
  - Booking identifier
  - From-department identifier
  - To-department identifier
  - From-technician membership identifier (null if booking was unassigned at re-route time —
    e.g., owner re-routes a queued unclaimed booking)
  - Triggering user identifier
  - Reason enum value
  - Free-text note (nullable)
  - Server-generated timestamp
  - A flag distinguishing initial-diagnostic-classification from subsequent re-routes
- **FR-DR-024** Audit records MUST NOT be modifiable or deletable after creation, including
  by the owner.
- **FR-DR-025** A booking's re-route history MUST be queryable by:
  - The booking detail screen (showing the chronological list)
  - Owner-side department analytics (counting re-routes per from-department over a time window)
- **FR-DR-026** The audit record format MUST support a future "re-route reason distribution"
  analytics view; the structured `reason` field is the primary axis. Specific analytics UI is
  out of scope for this spec.

### Customer notification

- **FR-DR-027** A re-route MUST trigger a customer notification (push + in-app, per existing
  notification infrastructure) when the re-route changes the expected timeline. The
  notification MUST be bilingual.
- **FR-DR-028** The notification MUST NOT reveal internal department names if the customer
  app does not surface departments to customers (per 020 §4 out-of-scope). Instead, the message
  uses a generic phrasing: "Our team has updated your booking. Estimated start time: [time]."
- **FR-DR-029** When the re-route requires re-approval of a new quote (per FR-DR-021), the
  notification MUST direct the customer to the booking detail screen to review the upcoming
  revised quote.

### Permissions

- **FR-DR-030** A new permission `REROUTE_BOOKING_ASSIGNED` MUST be added to the TECHNICIAN
  role's permission set, scoped to bookings the technician is currently assigned to.
- **FR-DR-031** A new permission `REROUTE_BOOKING_ANY` MUST be added to OWNER and
  BRANCH_MANAGER role sets, scoped to bookings at their center.
- **FR-DR-032** Updates to permission definitions MUST be made via an amendment to spec 011
  (or via the same amendment file 011 already references), not silently in this spec's
  implementation.

---

## 8. Non-Functional Requirements

- **NFR-DR-001** A re-route operation MUST complete in under 800ms p95 under normal load. The
  operation involves: writing the audit row, updating the booking, possibly updating quote
  status, queuing the notification, and invalidating relevant caches.
- **NFR-DR-002** Querying a booking's re-route history MUST return in under 200ms p95 for a
  booking with up to 10 re-routes. (A booking with more than 3 re-routes is operationally
  unusual; the upper bound is set conservatively.)
- **NFR-DR-003** Department-level re-route-rate analytics queries MUST return in under 500ms
  p95 for a center with up to 5,000 bookings in the queried window.
- **NFR-DR-004** Locking the diagnostic fee rate at the moment of diagnostic claim (FR-DR-014)
  MUST NOT add more than 20ms p95 to the claim operation in 021.

---

## 9. Key Entities (conceptual — schema deferred to plan phase)

- **Department (modified)** — adds an `isDiagnostic` flag and an optional `diagnosticFeeAmount`
  (KD, 3-decimal). Constrained per FR-DR-001 and FR-DR-002.
- **Booking (modified)** — adds an indicator that this booking passed through diagnostic
  (sufficient for fee applicability), and a captured `diagnosticFeeRateAtClaim` snapshot for
  fee-rate stability across owner edits.
- **RerouteAudit** — append-only record per FR-DR-023. One per re-route operation.
- **BookingQuote (referenced; defined in 009)** — gains a "diagnostic fee line item" concept:
  a non-removable line on quotes whose source booking had the diagnostic indicator true. The
  fee amount is the captured snapshot, not the current rate.

---

## 10. Edge Cases

- **EC-DR-1** A re-route is initiated by a technician whose assignment was just removed by a
  manager. → Permission check fails (caller is no longer the assigned technician). Re-route
  rejected with permission error. The technician's session learns of the un-assignment on next
  poll.
- **EC-DR-2** A diagnostic technician re-routes a booking, and the target department has no
  active technicians. → The booking enters an empty queue. Per 020 the queue-empty state is
  valid. The booking will sit until a technician is added or the manager manually assigns.
  Attention Required panel SHOULD surface this (per 016) but enforcement is in that spec.
- **EC-DR-3** A booking is re-routed by a manager while a quote is in flight from the
  technician's app (network round-trip). → The technician's quote-submit fails with a
  "booking no longer assigned to you" error; the technician's session refreshes and the
  booking disappears from their queue. The manager's re-route succeeds.
- **EC-DR-4** Two re-routes are submitted near-simultaneously (e.g., the assigned tech and
  the owner both submit). → Concurrency strategy: the first to acquire the booking-level
  lock wins; the second receives a conflict error and is shown the current state. Re-route
  is not idempotent — the second submitter must re-evaluate before resubmitting.
- **EC-DR-5** Diagnostic fee amount is changed by the owner after a booking has been diagnosed
  but before its quote is built. → The quote uses the captured snapshot rate, not the current
  rate. Confirmed in scenario 6.1 and FR-DR-014.
- **EC-DR-6** A booking that did NOT pass through diagnostic is re-routed to a different
  department. → No diagnostic fee is added; FR-DR-013 governs. The diagnostic indicator is
  false at creation and remains false; re-route does not change it.
- **EC-DR-7** The diagnostic department is also flagged as the default department, and a
  booking arrives whose ServiceCategory is not covered by any other department. → The booking
  routes there for both reasons (default-fallback and diagnostic). The booking IS treated as a
  diagnostic booking (the diagnostic indicator is set true). This is the intended unified
  behavior of FR-DR-004.
- **EC-DR-8** A booking is re-routed three times in succession by a technician trying to "find
  the right department." → All three re-routes are recorded. No system-side cap (per scope §3
  out-of-scope). Owner-side analytics will reveal the pattern.

---

## 11. Open Questions (to resolve in `/clarify` if needed)

- **OQ-DR-1** Should the customer be able to see the diagnostic-fee amount BEFORE booking
  (i.e., on the center detail screen), so they know the cost of choosing "let the center
  diagnose" up front? Current spec says no (fee is shown at quote time). Centers may prefer
  pre-disclosure for trust. Defer to product/UX.
- **OQ-DR-2** What happens to the diagnostic fee if the customer cancels the booking AFTER
  diagnosis but BEFORE a repair quote is built? v1 says the fee is owed (per the "we charged
  you for our time" principle). Confirm with finance / customer ops.
- **OQ-DR-3** Should re-route notifications to the customer include the structured reason
  (e.g., "moved to Electrical because SPECIALIST_NEEDED") or stay generic? v1 says generic
  (FR-DR-028). Specific reasons could feel reassuring (transparency) or alarming (admitting
  mistakes). UX decision.

---

## 12. Success Criteria

- **SC-DR-1** A center owner can configure a diagnostic department with a fee and have it
  receive incoming "let me diagnose" bookings within 60 seconds of first opening the
  Department Management screen.
- **SC-DR-2** 100% of bookings created without a ServiceCategory at a center with a configured
  diagnostic department land in the diagnostic department's queue (no null department, no
  routing-error fallbacks).
- **SC-DR-3** 100% of re-routes (technician-initiated, manager-initiated, and initial
  diagnostic classification) produce an immutable audit record.
- **SC-DR-4** Zero instances of a quote omitting the diagnostic fee line item when the source
  booking's diagnostic indicator is true. (Verified by integration test.)
- **SC-DR-5** Diagnostic fee rate changes by an owner do not retroactively alter any
  already-quoted or already-diagnosed booking. (Verified by integration test exercising the
  snapshot capture.)
- **SC-DR-6** A re-route from one department to another completes within 800ms p95 under
  normal load and within 1500ms p95 under a load test simulating 10 concurrent re-routes on
  different bookings at the same center.

---

## 13. Assumptions

- The customer app currently REQUIRES ServiceCategory selection at booking time; this is a
  documented behavior change. The customer-app team will need to update the booking form per
  FR-DR-006 and FR-DR-009.
- The Booking entity already supports a "current department" field (added by spec 020). This
  spec assumes that field exists and adds only the diagnostic-indicator and fee-snapshot
  fields.
- Spec 009's `BookingQuote` model supports versioning and a `REVISED` status. This spec relies
  on that contract; if 009 has shipped without versioning, an amendment is required first.
- The existing notification infrastructure (per the notifications domain) supports sending
  parameterized bilingual messages to customers. This spec adds new notification message
  templates but does not introduce a new delivery mechanism.
- Centers operate in Kuwait and use KD with 3-decimal precision; the diagnostic fee field
  follows the same currency convention used elsewhere in the system for booking pricing.
- The role system from 011 supports adding new fine-grained permissions to existing roles
  without disruptive migrations; the two new REROUTE_BOOKING permissions are additive.
