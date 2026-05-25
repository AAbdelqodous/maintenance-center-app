# Migration Note — Booking Assignment Redesign

**Branch:** 019-dashboard-trends  
**Date:** 2026-05-21  
**Affects:** Backend team, QA

---

## What Changed (Frontend)

The single `ASSIGN_TECHNICIAN` permission and single `PUT /bookings/{id}/assign` endpoint
have been replaced with two separate flows matching how the business actually works.

---

## New Backend Endpoints Required

### Flow A — Self-Claim (Technician)

```
POST /api/v1/bookings/{id}/claim
Authorization: Bearer <jwt>   (caller must be STAFF with CLAIM_BOOKING permission)
Body: (none)

Response 200: full Booking object (same shape as GET /bookings/{id})

Error responses:
  400 { "error": "BOOKING_ALREADY_CLAIMED",    "businessErrorDescription": "..." }
  400 { "error": "BOOKING_NOT_CLAIMABLE",      "businessErrorDescription": "..." }
  403 { "error": "STAFF_INACTIVE",             "businessErrorDescription": "..." }
  403  caller lacks CLAIM_BOOKING permission
  404  booking not found
```

**Business rules the backend must enforce:**
- Booking must be in PENDING status and have no current `assignedMembershipId`
- Caller's membership must be ACTIVE at the booking's center
- Caller must be a TECHNICIAN role
- (Optional, Phase 2) Caller's department must match the booking's department

### Flow B — Manual Assignment (Owner / Branch Manager)

```
PUT /api/v1/bookings/{id}/assign
Authorization: Bearer <jwt>   (caller must have ASSIGN_TECHNICIAN_MANUAL permission)
Content-Type: application/json

Body:
{
  "staffId": 42,                       // number — membership ID of target technician
  "reason": "VIP customer",            // string? — optional, stored for audit log
  "crossDepartmentOverride": true      // boolean? — required when assigning across depts
}

Response 200: full Booking object

Error responses:
  400 { "error": "STAFF_NOT_AT_CENTER",           "businessErrorDescription": "..." }
  400 { "error": "BOOKING_NOT_ASSIGNABLE",        "businessErrorDescription": "..." }
  403 { "error": "CROSS_DEPARTMENT_NOT_ALLOWED",  "businessErrorDescription": "..." }
      → Frontend will show a confirmation dialog then retry with crossDepartmentOverride: true
  403 { "error": "STAFF_INACTIVE",                "businessErrorDescription": "..." }
  403  caller lacks ASSIGN_TECHNICIAN_MANUAL permission
  404  booking not found
```

**Business rules:**
- `staffId` must be an ACTIVE TECHNICIAN membership at the same center
- If technician's department ≠ booking's department AND `crossDepartmentOverride` is absent
  or false → return `CROSS_DEPARTMENT_NOT_ALLOWED`
- Same endpoint handles first-time assignment AND reassignment (idempotent on `staffId`)
- Unassign by sending `staffId: null` is intentionally NOT supported in this flow;
  use a separate unassign endpoint if needed

### Department Queue

```
GET /api/v1/bookings/queue
Authorization: Bearer <jwt>   (caller must be STAFF with CLAIM_BOOKING permission)
Query params: page (default 0), size (default 20)

Response 200: PageResponse<Booking>  (same shape as GET /bookings)

Semantics: returns PENDING bookings with no assignedMembershipId that belong to
           the caller's department. The backend determines department from the
           caller's membership record.
```

---

## Permission Split

| Old permission      | Replaced by                  | Granted to                        |
|---------------------|------------------------------|-----------------------------------|
| `ASSIGN_TECHNICIAN` | `CLAIM_BOOKING`              | TECHNICIAN only                   |
| `ASSIGN_TECHNICIAN` | `ASSIGN_TECHNICIAN_MANUAL`   | OWNER, BRANCH_MANAGER             |

The old `ASSIGN_TECHNICIAN` permission **no longer exists** in the frontend codebase.
If the backend stores permissions per membership record (rather than deriving from role),
those records must be migrated:
- Any `ASSIGN_TECHNICIAN` on a TECHNICIAN membership → replace with `CLAIM_BOOKING`
- Any `ASSIGN_TECHNICIAN` on OWNER / BRANCH_MANAGER membership → replace with `ASSIGN_TECHNICIAN_MANUAL`

---

## Frontend Files to Reference

| File | What it does |
|------|-------------|
| `types/staff.ts` | `CenterPermission` union + `ROLE_PERMISSIONS` matrix |
| `store/api/bookingsApi.ts` | `claimBooking`, `assignBookingManually`, `getBookingQueue` RTK mutations/queries |
| `app/(app)/staff/bookings/[id].tsx` | Claim button (CLAIM_BOOKING gate) + manual-assign section (ASSIGN_TECHNICIAN_MANUAL gate) |
| `app/(app)/(tabs)/bookings/[id].tsx` | Manual-assign section for owner tabs; cross-dept confirm + retry logic |
| `app/(app)/staff/bookings/queue.tsx` | Department queue screen — calls GET /bookings/queue |
| `components/bookings/TechnicianPicker.tsx` | Manual-assign bottom sheet with reason input |
| `components/dashboard/RebalanceModal.tsx` | Dashboard rebalance flow — calls assignBookingManually |

---

## Error Field Contract

The frontend reads `err.data.error` (the machine-readable code string) to branch on
specific error cases. The `businessErrorDescription` is shown directly to the user
as a bilingual fallback. Both fields must be present in every error response.

```json
{
  "businessErrorCode": 4xx,
  "businessErrorDescription": "Human-readable bilingual message",
  "error": "MACHINE_READABLE_CODE"
}
```
