# Implementation Plan: Diagnostic Department & Booking Re-Route

**Branch**: `022-diagnostic-and-reroute` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-diagnostic-and-reroute/spec.md`

---

## Summary

Layer three capabilities on top of the department model (020) and self-claim model (021):

1. A **diagnostic-flagged Department** (one per center) that receives bookings whose
   ServiceCategory the customer could not specify.
2. A **diagnostic fee** stored on that department and snapshotted onto the booking at the
   moment a diagnostic technician claims it, then injected as a non-removable line item on
   the final quote.
3. A **formal Re-route operation** with structured reason, audit log, quote-revision linkage
   (per 009), and customer notification. The same operation covers both the diagnostic
   technician's "classify and hand off" action and a working technician's "wrong department,
   send it elsewhere" action.

Backend changes are additive: extend `Department` and `Booking`, add `RerouteAudit`. Frontend
changes are mostly patches: extend the Department form, add a Re-route action and history on
the booking detail, and add a non-removable diagnostic-fee line item rendering on the quote
builder. The customer app (separate repo) needs its booking form updated to make
ServiceCategory optional — that work is called out but tracked as a cross-repo dependency,
not implemented here.

---

## Technical Context

**Language/Version**: TypeScript (React Native 0.81.5, Expo SDK 54) — frontend;
Java 17, Spring Boot 3.5.6 — backend
**Primary Dependencies**: RTK Query + Redux Toolkit (frontend state/API);
Spring Data JPA + Hibernate (backend ORM); Expo Router (frontend nav);
React Hook Form + Zod (form validation)
**Storage**: PostgreSQL 15 (backend); RTK Query cache (frontend)
**Testing**: `tsc --noEmit` type-checking (frontend); Spring Boot test slice (backend)
**Target Platform**: iOS, Android, Web (react-native-web)
**Project Type**: Mobile app (frontend) + REST API extension (backend) + cross-repo customer-app change
**Performance Goals**: Re-route ≤800ms p95; re-route history fetch ≤200ms p95; department-level
re-route-rate analytics ≤500ms p95; fee-rate-snapshot capture adds ≤20ms p95 to the claim
operation in 021
**Constraints**: All user-facing strings bilingual (Ar/En); KD with 3-decimal precision for
the diagnostic fee; re-route audit is append-only (no UPDATE / DELETE); concurrent re-routes
serialized by a booking-level lock to prevent split-brain
**Scale/Scope**: At most one diagnostic department per center; ≤10 re-routes per booking
expected (no system cap); 1–20 departments per center; up to 5,000 bookings per center in a
typical analytics window

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md exists; Open Questions are flagged for `/clarify` with v1 defaults so plan can proceed. |
| II. Bilingual First | ✅ Pass | Re-route error messages, customer notifications, diagnostic-fee label, and all new screen copy required bilingual per spec FR-DR-027/028 and the new i18n keys in §Source Code. |
| III. Component-Driven UI | ✅ Pass | New small components: `RerouteForm`, `RerouteHistoryList`, `DiagnosticFeeLineItem`, `DiagnosticDepartmentFields` (extends the existing `DepartmentForm`). Screens compose them. |
| IV. API Contract Adherence | ✅ Pass | New endpoints exposed via a `rerouteApi.ts` RTK Query slice; existing slices extended (departmentsApi, bookingsApi, quotesApi). JWT auth. BusinessErrorCode for validation errors. |
| V. Owner-Context Awareness | ✅ Pass | Re-route endpoint center-scoped via JWT; permission checks enforce assigned-technician / OWNER / BRANCH_MANAGER roles. No customer-app surface in this repo. |
| VI. Security & Privacy | ✅ Pass | Audit log captures user IDs but no PII text beyond the optional 500-char note (technician-authored, not customer data). Fee snapshot prevents retroactive price changes — a customer-trust safeguard. |
| VII. Production Readiness | ✅ Pass | No feature flags. The Re-route action ships behind a permission check, not a flag. Error boundary wraps the booking detail screen (existing). |

**No violations.** Proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/022-diagnostic-and-reroute/
├── plan.md                              ← this file
├── research.md                          ← Phase 0 output
├── data-model.md                        ← Phase 1 output
├── quickstart.md                        ← Phase 1 output
├── contracts/
│   └── diagnostic-and-reroute-api.md    ← Phase 1 output
├── checklists/
│   └── requirements.md                  ← from /speckit.specify
├── spec.md
└── tasks.md                             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code

This feature touches three repos. **Backend and this app** are implemented in this work
stream. **Customer app** changes are tracked as a cross-repo dependency and split into a
sibling task list owned by the customer-app session.

**Frontend (`maintenance-center-app/`) — extensions and small additions**

```text
types/
├── department.ts                          ← EXTEND: add isDiagnostic, diagnosticFeeAmount
└── reroute.ts                             ← NEW: RerouteReason enum, RerouteAudit,
                                                   RerouteRequest, RerouteResponse

store/api/
├── departmentsApi.ts                      ← EXTEND: updateDepartment payload now accepts
│                                                    isDiagnostic + diagnosticFeeAmount
├── bookingsApi.ts                         ← EXTEND: BookingResponse adds
│                                                    passedThroughDiagnostic,
│                                                    diagnosticFeeRateAtClaim;
│                                                    add useRerouteBookingMutation,
│                                                    useGetBookingRerouteHistoryQuery
├── quotesApi.ts                           ← EXTEND: QuoteResponse line items may include
│                                                    a non-editable DIAGNOSTIC_FEE line
└── index.ts                               ← (no change if slices already registered)

app/(app)/(tabs)/staff/departments/
└── [id].tsx                               ← PATCH: add isDiagnostic toggle + diagnosticFee
                                                    field (visible only when toggle is on)

app/(app)/(tabs)/bookings/
└── [id].tsx                               ← PATCH: add Re-route button (permission-gated),
                                                    add RerouteHistoryList section

components/departments/
└── DepartmentForm.tsx                     ← PATCH: render isDiagnostic + fee fields when in
                                                    "edit" mode and prior state allows

components/bookings/
├── RerouteForm.tsx                        ← NEW: modal/sheet with target-dept picker,
                                                  reason enum, optional note (500 char max)
└── RerouteHistoryList.tsx                 ← NEW: chronological list of audit entries on
                                                  the booking detail

components/quotes/
└── DiagnosticFeeLineItem.tsx              ← NEW: distinct visual rendering for the
                                                  non-removable diagnostic fee line

lib/i18n/locales/
├── en.json                                ← EXTEND: reroute.*, departments.diagnostic.*,
│                                                    quote.diagnosticFee.* keys
└── ar.json                                ← EXTEND: same keys in Arabic
```

**Backend (`service-center/`) — additive entity changes + one new entity + endpoint**

```text
src/main/java/com/maintainance/service_center/
├── department/
│   ├── Department.java                    ← EXTEND: add isDiagnostic boolean,
│   │                                                diagnosticFeeAmount BigDecimal(11,3)
│   ├── DepartmentRequest.java             ← EXTEND: optional isDiagnostic + fee fields
│   ├── DepartmentResponse.java            ← EXTEND: expose isDiagnostic + fee
│   └── DepartmentService.java             ← EXTEND: enforce single-diagnostic-per-center;
│                                                    block fee field on non-diagnostic depts;
│                                                    expose resolveDiagnosticDepartment(center)
├── booking/
│   ├── Booking.java                       ← EXTEND: add passedThroughDiagnostic boolean,
│   │                                                diagnosticFeeRateAtClaim BigDecimal(11,3) nullable
│   ├── BookingResponse.java               ← EXTEND: expose the two new fields
│   ├── BookingService.java                ← EXTEND: create() now allows null categoryId;
│   │                                                routes null-category bookings to the
│   │                                                center's diagnostic dept if it exists;
│   │                                                claim() captures fee snapshot when the
│   │                                                target dept is the diagnostic dept
│   └── BookingClaimAudit.java             ← (existing from 021 — no change)
├── reroute/                               ← NEW PACKAGE
│   ├── RerouteAudit.java                  ← NEW: @Entity, append-only audit row
│   ├── RerouteAuditRepository.java        ← NEW: JPA repo, save() + center-scoped finders
│   ├── RerouteReason.java                 ← NEW: enum
│   ├── RerouteRequest.java                ← NEW: request DTO (targetDeptId, reason, note?)
│   ├── RerouteResponse.java               ← NEW: response DTO (audit row + updated booking)
│   ├── RerouteService.java                ← NEW: permission check, dept-validity check,
│   │                                              quote-revision call to QuoteService,
│   │                                              notification queue, transactional with
│   │                                              booking-level lock
│   └── RerouteController.java             ← NEW: POST /bookings/{id}/reroute,
│                                                  GET /bookings/{id}/reroute-history
└── quote/                                 ← (existing per 009)
    └── QuoteService.java                  ← EXTEND: addDiagnosticFeeLineItem() helper;
                                                     called automatically when the booking's
                                                     passedThroughDiagnostic = true

db/migration/ (Flyway)
├── V{n}__add_department_diagnostic_columns.sql  ← NEW: isDiagnostic, diagnosticFeeAmount
├── V{n+1}__add_booking_diagnostic_columns.sql   ← NEW: passedThroughDiagnostic,
│                                                         diagnosticFeeRateAtClaim
└── V{n+2}__create_reroute_audit.sql             ← NEW: reroute_audit table + indices
```

**Customer app (`maintenance-customer-app/`) — out of scope here, listed for the dependency**

```text
app/(tabs)/bookings/
├── new.tsx                                ← needs PATCH: ServiceCategory becomes optional;
│                                                          add "Not sure" option gated on
│                                                          center.hasDiagnosticDepartment

app/(tabs)/bookings/
└── [id].tsx                               ← needs PATCH: show diagnostic-fee line item in
                                                           the quote breakdown when present;
                                                           handle re-route notification deep-link

services/centersApi.ts                     ← needs EXTEND: include hasDiagnosticDepartment
                                                           on the center detail response
```

**Structure Decision**: A dedicated `reroute/` package on the backend mirrors the existing
domain-per-package layout (auth/, booking/, department/, etc.). Frontend follows the
established `createApi`-per-domain pattern: rather than introducing a `rerouteApi.ts`, we
extend `bookingsApi.ts` because the re-route is conceptually a booking operation and reusing
the existing `Bookings` tag will trigger the right re-fetches for free.

---

## Complexity Tracking

No constitution violations — this section left intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | _(n/a)_ | _(n/a)_ |

---

## Post-Design Constitution Re-Check

*Filled after Phase 1 artifacts are written.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | All Phase 1 artifacts derive from FRs in spec.md. No new requirements introduced during design. |
| II. Bilingual First | ✅ Pass | Contracts and quickstart both enumerate the new i18n keys. Notification copy is parameterized to keep raw strings out of code. |
| III. Component-Driven UI | ✅ Pass | The four new frontend components are each single-responsibility and independently testable. |
| IV. API Contract Adherence | ✅ Pass | Single new endpoint pair (`POST /bookings/{id}/reroute`, `GET /bookings/{id}/reroute-history`) defined in `contracts/diagnostic-and-reroute-api.md`. Errors follow BusinessErrorCode. |
| V. Owner-Context Awareness | ✅ Pass | All endpoints derive center from JWT. Permission matrix codified in the contracts doc. |
| VI. Security & Privacy | ✅ Pass | Snapshot pattern (`diagnosticFeeRateAtClaim`) protects customer from retroactive billing. Audit log captures actor for accountability. |
| VII. Production Readiness | ✅ Pass | No flags, no placeholders. Error boundary wraps the booking detail. The new endpoint returns full validation errors per existing BusinessErrorCode pattern. |

**No new violations introduced by Phase 1 design.** Plan is ready for `/speckit.tasks`.
