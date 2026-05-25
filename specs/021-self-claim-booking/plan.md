# Implementation Plan: Self-Claim Booking

**Branch**: `021-self-claim-booking` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/021-self-claim-booking/spec.md`

---

## Summary

Enable technicians to self-assign unassigned bookings from a department queue — no manager intervention required. The backend delivers two new endpoints: `GET /bookings/queue` (department-filtered, server-inferred from caller's membership) and `POST /bookings/{id}/claim` (atomic via JPA pessimistic write lock, audit-logged). The frontend is largely pre-built — queue screen, claim button, RTK Query slices, and most i18n keys are already in place — but has three small gaps: `WRONG_DEPARTMENT` error code not in the claim error map, `noDepartmentMembership` missing from `transformResponse`, and no automatic queue polling. The primary implementation work is the backend claim service with pessimistic locking to satisfy FR-SC-009 (concurrent claim atomicity) and FR-SC-011/012 (immutable audit trail).

---

## Technical Context

**Language/Version**: TypeScript (React Native 0.81.5, Expo SDK 54) — frontend; Java 17, Spring Boot 3.5.6 — backend  
**Primary Dependencies**: RTK Query + Redux Toolkit (frontend state/API); Spring Data JPA + Hibernate (backend ORM); Expo Router (file-based navigation)  
**Storage**: PostgreSQL 15 (backend); RTK Query cache (frontend)  
**Testing**: `tsc --noEmit` type-check (frontend); Spring Boot test slices (backend)  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Project Type**: Mobile app (frontend patches) + REST API extension (backend new work)  
**Performance Goals**: Claim <500ms p95 (NFR-SC-001); queue endpoint <300ms p95 for 200 bookings (NFR-SC-002); 20-concurrent-claimers test with zero double-assignments (NFR-SC-003)  
**Constraints**: Bilingual Ar/En; RTL layout; JWTs in SecureStore; pessimistic DB lock for claim atomicity; center-scoped data — no cross-center or cross-department read leakage  
**Scale/Scope**: Up to 50 concurrent technicians per center; up to 200 unassigned bookings per queue

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md approved; dependencies 020 (departments) and 011-amendment (CLAIM_BOOKING permission) are both approved |
| II. Bilingual First | ✅ Pass | All 5 error messages are bilingual in spec §7. `departmentNameAr`/`departmentNameEn` in queue response. `bookings.wrongDepartment` i18n key added in both locales. |
| III. Component-Driven UI | ✅ Pass | No new UI components required — queue and claim UI use existing `BookingCard`, `StatusBadge`, `PermissionGate`. Patches to three existing files only. |
| IV. API Contract Adherence | ✅ Pass | All data via RTK Query endpoints. JWT auth header. `businessErrorCode` field returned by backend for all 5 precondition failures, matching the `GlobalExceptionHandling` pattern. |
| V. Owner-Context Awareness | ✅ Pass | Queue scoped to technician's active center via JWT; department filter derived server-side from membership — no client-supplied center or department parameter accepted. Cross-center access structurally impossible. |
| VI. Security & Privacy | ✅ Pass | JWTs in SecureStore. Pessimistic lock prevents concurrent-claim race. Audit trail is immutable (no update/delete endpoint). No PII beyond what's already in `BookingResponse`. |
| VII. Production Readiness | ✅ Pass | No feature flags. Error boundaries already wrap queue and detail screens. Concurrency load test (NFR-SC-003) required before backend is declared production-ready. |

**No violations.** Proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/021-self-claim-booking/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── self-claim-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code

This is a **backend-primary** feature. The frontend requires three small patches only.

**Frontend (`maintenance-center-app/`) — patches only, no new files**

```text
store/api/
└── bookingsApi.ts
    ├── PATCH: add 'WRONG_DEPARTMENT' to ClaimBookingErrorCode union type
    ├── PATCH: add noDepartmentMembership: raw.noDepartmentMembership ?? false
    │         to getBookingQueue transformResponse
    └── (pollingInterval handled in queue.tsx, not the API slice)

app/(app)/staff/bookings/
└── [id].tsx
    └── PATCH: add WRONG_DEPARTMENT → 'bookings.wrongDepartment' to codeToKey map

app/(app)/staff/bookings/
└── queue.tsx
    └── PATCH: add 30s automatic refresh via setInterval + reset-to-page-0 pattern

lib/i18n/locales/
├── en.json    ← PATCH: add bookings.wrongDepartment
└── ar.json    ← PATCH: add bookings.wrongDepartment
```

**Backend (`service-center/`) — all new**

```text
src/main/java/com/maintainance/service_center/
└── booking/
    ├── BookingClaimAudit.java             ← NEW: @Entity audit record (append-only)
    ├── BookingClaimAuditRepository.java   ← NEW: JPA repo, save() only
    ├── BookingResponse.java               ← EXTEND: add assignedMembershipId,
    │                                                 assignedStaffName,
    │                                                 departmentId,
    │                                                 departmentNameAr,
    │                                                 departmentNameEn
    ├── BookingService.java                ← EXTEND: add getQueue(), claim()
    ├── BookingController.java             ← EXTEND: GET /bookings/queue,
    │                                                POST /bookings/{id}/claim
    └── BookingRepository.java             ← EXTEND: add findClaimableByDepartments()
                                                      with @Lock(PESSIMISTIC_WRITE)
                                                      on findById-for-claim

db/migration/ (Flyway)
└── V{n}__create_booking_claim_audit.sql   ← NEW: booking_claim_audit table
```

**Structure Decision**: All backend additions go into the existing `booking/` package — no new packages. Frontend is three file patches; no new files or components needed.

---

## Complexity Tracking

No constitution violations — this section left intentionally empty.
