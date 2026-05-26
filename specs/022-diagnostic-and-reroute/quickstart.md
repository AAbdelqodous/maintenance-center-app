# Quickstart: Diagnostic Department & Booking Re-Route

**Feature**: 022-diagnostic-and-reroute
**Phase**: Phase 1 — Design
**Date**: 2026-05-26

This guide gives an implementing developer everything needed to start work in under 10 minutes.

---

## What this feature adds

Three capabilities layered on top of 020 (departments) and 021 (self-claim):

1. **Diagnostic department** — a Department flagged `isDiagnostic = true` that receives
   bookings whose ServiceCategory the customer couldn't specify. At most one per center.
2. **Diagnostic fee** — a center-configured monetary amount stored on the diagnostic
   department; snapshotted onto the booking at diagnostic claim; injected into the final
   quote as a non-removable line item.
3. **Re-route** — a formal mechanism to move a booking from one department to another, with
   structured reason, audit log, quote-revision linkage (per 009), and customer notification.

---

## Prerequisites

Before starting implementation:

- [ ] `specs/020-center-departments` is implemented — the Department entity, partial
      unique indices, and routing-by-category logic must exist.
- [ ] `specs/021-self-claim-booking` is implemented — the claim transaction with pessimistic
      lock is the integration point for the fee-rate snapshot.
- [ ] `specs/009-work-progress-quotes` is implemented — `BookingQuote` and its line-item
      enum exist; this feature extends the enum.
- [ ] `specs/011-center-staff-permissions/spec-amendment.md` is updated to add
      `REROUTE_BOOKING_ASSIGNED` (TECHNICIAN) and `REROUTE_BOOKING_ANY` (OWNER, BRANCH_MANAGER).
- [ ] Local PostgreSQL running (Docker: `docker-compose up -d` in the backend repo).
- [ ] Spring Boot backend running (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`).
- [ ] Expo dev server running (`npx expo start --web` in this repo).

---

## Build order

Ship in this order to keep each step independently verifiable:

1. **Backend — entity extensions + migration** (V{n}, V{n+1}, V{n+2}).
2. **Backend — `DepartmentService` update**: enforce the new invariants. Existing tests for
   020 keep passing; add tests for the new diagnostic-flag rules.
3. **Backend — `BookingService.create()` update**: allow null `categoryId`, route to
   diagnostic department when present.
4. **Backend — `BookingService.claim()` extension**: capture `diagnosticFeeRateAtClaim`
   inside the existing claim transaction. Add a unit test that asserts the snapshot value.
5. **Backend — new `reroute/` package**: `RerouteService`, `RerouteController`,
   `RerouteAudit`, `RerouteAuditRepository`. Includes the permission check via the
   amended 011 permissions.
6. **Backend — `QuoteService` extension**: auto-add the `DIAGNOSTIC_FEE` line item.
   Existing quote tests keep passing; add a test for the auto-injection and the
   non-removable / non-editable guards.
7. **Backend — verify with integration test**: end-to-end flow per `User Scenarios 6.1` in
   the spec.
8. **Frontend (this repo) — extend `Department` types and `departmentsApi`**: surface the
   two new fields. Update the department editor screen to show the diagnostic toggle and
   fee input.
9. **Frontend — extend `Booking` types and `bookingsApi`**: add reroute and
   reroute-history endpoints, plus the two new BookingResponse fields.
10. **Frontend — components**: `RerouteForm`, `RerouteHistoryList`, `DiagnosticFeeLineItem`.
11. **Frontend — booking detail screen patch**: integrate the Re-route action (permission
    gated) and the history list.
12. **Frontend — i18n**: add new keys per the contracts doc.
13. **Cross-repo — customer app**: make ServiceCategory optional in booking form; show
    diagnostic-fee line item in quote view; handle `BOOKING_REROUTED` notification deep link.
    Tracked separately; no blocker on this repo's work after the backend ships.

---

## Manual smoke test (after step 7)

Using `curl` or the Swagger UI at `http://localhost:8080/api/v1/swagger-ui/index.html`:

1. As OWNER of a test center, create a new department, then `PUT` it with
   `isDiagnostic: true, diagnosticFeeAmount: 5.000`. Confirm 200 response.
2. As OWNER, try to flag a second department as diagnostic. Confirm 409
   `DUPLICATE_DIAGNOSTIC_DEPARTMENT`.
3. As CUSTOMER, `POST /bookings` with `categoryId: null` on that center. Confirm the
   response has `passedThroughDiagnostic: true` and `department.id` = the diagnostic dept.
4. As TECHNICIAN (member of the diagnostic dept), self-claim the booking per 021.
   Re-fetch the booking. Confirm `diagnosticFeeRateAtClaim: 5.000`.
5. As that TECHNICIAN, `POST /bookings/{id}/reroute` with another department.
   Confirm 200, the audit row exists, the booking is unassigned, and a `BOOKING_REROUTED`
   notification is enqueued.
6. As the next TECHNICIAN (member of the target dept), self-claim. Build a quote.
   Confirm the quote includes a `DIAGNOSTIC_FEE` line item for 5.000 KD that is non-editable
   and non-removable.
7. Try to `POST /bookings/{id}/reroute` with the diagnostic dept as the target. Confirm
   400 `CANNOT_REROUTE_INTO_DIAGNOSTIC`.
8. As OWNER, change `diagnosticFeeAmount` to 7.000. Re-fetch the existing booking. Confirm
   `diagnosticFeeRateAtClaim` is still 5.000 (rate-lock guarantee).

---

## Visual smoke test (after step 12)

1. Log in as OWNER. Open Departments → edit a department → toggle "Diagnostic department",
   set fee to 5.000. Save. Re-open: the toggle and fee persist.
2. Log in as TECHNICIAN (assigned to a booking). Open the booking detail. See the
   "Re-route booking" button. Tap it, pick target dept, pick reason, optionally type a note.
   Submit. The screen refreshes; the booking is unassigned and the history list shows the
   new entry.
3. Try to re-route while logged in as a technician NOT assigned to this booking. The
   button is hidden.
4. Log in as OWNER. Open any booking detail. See the Re-route button (always visible for
   OWNER). Re-route succeeds and audit entry shows the OWNER as `triggeredBy`.
5. Open a quote where the source booking has `passedThroughDiagnostic = true`. The
   diagnostic fee line item renders in a visually distinct section with no edit / delete
   affordances.

---

## Cross-repo dependency: customer-app

The customer-app session needs to land these three changes in their repo
(`maintenance-customer-app/`) AFTER the backend ships V{n}..V{n+2}:

| Task | File | Notes |
|---|---|---|
| Make ServiceCategory optional in booking form | `app/(tabs)/bookings/new.tsx` | Add a "Not sure — let the center diagnose it" option; hide when `center.hasDiagnosticDepartment = false`. |
| Show diagnostic-fee line item | `app/(tabs)/bookings/[id].tsx` | Render the `DIAGNOSTIC_FEE` kind with the new i18n key. |
| Handle `BOOKING_REROUTED` notification deep-link | (notification handler) | Route to booking detail; copy uses the new i18n keys from this contract. |

Add `hasDiagnosticDepartment` to the center detail response (`services/centersApi.ts`) so
the customer app can hide the option without a separate lookup.

---

## Files this work stream touches

See `plan.md` §Source Code for the full list. Summary:

**Backend** — 1 new package, ~12 files (entity + service + controller + audit + DTOs +
migration scripts).

**This app** — 2 new types files, 4 new components, 2 screen patches, 1 RTK Query slice
extension, i18n key additions.

**Customer app** — tracked separately; ~3 file patches.

---

## Tests to write

| Layer | Test | What it asserts |
|---|---|---|
| Backend (unit) | `DepartmentServiceTest.setIsDiagnosticOnDeptWithOpenBookings_rejected` | FR-DR-003 enforcement |
| Backend (unit) | `DepartmentServiceTest.setFeeOnNonDiagnosticDept_rejected` | FR-DR-002 enforcement |
| Backend (unit) | `BookingServiceTest.createWithNullCategoryRoutesToDiagnostic` | FR-DR-007 happy path |
| Backend (unit) | `BookingServiceTest.claimInDiagnosticDeptCapturesFeeSnapshot` | FR-DR-014 |
| Backend (unit) | `RerouteServiceTest.permissionMatrix` | Allowed/denied matrix per the contracts doc |
| Backend (unit) | `RerouteServiceTest.cannotRerouteIntoDiagnostic` | FR-DR-017 |
| Backend (unit) | `RerouteServiceTest.concurrentReroutesSerialized` | EC-DR-4 / NFR-DR-001 |
| Backend (unit) | `QuoteServiceTest.diagnosticFeeAutoAddedNonRemovable` | FR-DR-010, FR-DR-011 |
| Backend (integration) | `EndToEndDiagnosticFlowTest` | Scenario 6.1 in spec |
| Backend (integration) | `EndToEndRerouteWithQuoteRevisionTest` | Scenario 6.5 in spec |
| Frontend (tsc) | `tsc --noEmit` passes after type extensions | Type safety |
| Frontend (manual) | Visual smoke test above | Owner / technician / quote UX |

---

## What's intentionally NOT in this stream

- Analytics dashboard for re-route rate by department (per FR-DR-026; the data is
  queryable, the dashboard is Phase 5.0 work).
- Refund/waiver of the diagnostic fee when the customer approves the repair quote
  (out of scope per spec §3; can be added later if business asks for it).
- Per-ServiceCategory diagnostic fees (one fee per center for v1).
- Customer-initiated re-route (out of scope per spec §3).
- Re-route rate limiting / hard cap per booking (no system limit for v1; analytics surfaces
  the signal).
