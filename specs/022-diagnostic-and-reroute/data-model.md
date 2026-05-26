# Data Model: Diagnostic Department & Booking Re-Route

**Feature**: 022-diagnostic-and-reroute
**Phase**: Phase 1 — Design
**Date**: 2026-05-26

---

## Summary of changes

| Entity | Change | Reason |
|---|---|---|
| `Department` | EXTEND: add `isDiagnostic`, `diagnosticFeeAmount` | Flag one dept per center as diagnostic; hold its fee |
| `Booking` | EXTEND: add `passedThroughDiagnostic`, `diagnosticFeeRateAtClaim` | Determine quote-time fee applicability and lock rate |
| `RerouteAudit` | NEW entity | Append-only audit log of every re-route |
| `BookingQuote` | EXTEND: line item kind enum gains `DIAGNOSTIC_FEE` | Render fee as a non-removable line item |

No tables are dropped. No existing columns are renamed. All changes are additive.

---

## Backend entities

### Department (extension to 020's model)

Two new columns:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `isDiagnostic` | Boolean | NOT NULL, default `false` | Marks this dept as the center's diagnostic dept. |
| `diagnosticFeeAmount` | BigDecimal(11,3) | nullable | KD, 3-decimal precision. NULL when `isDiagnostic = false`; ≥ 0 when `isDiagnostic = true`. Service-layer check enforces this. |

**Uniqueness constraints** (DB-level — additive to 020's existing partial uniques):

```sql
-- At most one diagnostic department per center, among active departments
CREATE UNIQUE INDEX uq_dept_one_diagnostic_per_center
  ON department(center_id)
  WHERE is_diagnostic = TRUE AND is_active = TRUE;
```

**Service-layer invariants** (enforced in `DepartmentService`):

- Setting `isDiagnostic = true` on a department with non-terminal bookings is rejected
  (mirrors 020 FR-D-003's deactivation rule, see FR-DR-003).
- Setting `diagnosticFeeAmount` on a department with `isDiagnostic = false` is rejected
  with `INVALID_DIAGNOSTIC_FEE_TARGET` (FR-DR-002).
- Setting `isDiagnostic = true` when another active dept at the same center already has it
  is rejected with `DUPLICATE_DIAGNOSTIC_DEPARTMENT` (FR-DR-001) — also caught by the
  unique index as a safety net.
- `diagnosticFeeAmount` must be ≥ 0; bean validation `@DecimalMin("0.000")`.

**State transitions** unchanged from 020. Adding/removing the `isDiagnostic` flag follows
the same gate as deactivation (no non-terminal bookings).

---

### Booking (extension to existing schema)

Two new columns on the existing `booking` table:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `passedThroughDiagnostic` | Boolean | NOT NULL, default `false` | Set true when the booking is routed to the diagnostic dept at creation. Preserved across all re-routes (FR-DR-008). |
| `diagnosticFeeRateAtClaim` | BigDecimal(11,3) | nullable | Snapshot of the diagnostic dept's `diagnosticFeeAmount` captured at the moment the booking is claimed by a diagnostic technician (FR-DR-014). NULL until claimed. |

**Population rules** (enforced in `BookingService` and `RerouteService`):

- `passedThroughDiagnostic`:
  - Set to `true` if `BookingService.create()` routes the booking to a dept with
    `isDiagnostic = true`.
  - Set to `false` otherwise.
  - Never updated after creation (the re-route service does NOT touch this column).
- `diagnosticFeeRateAtClaim`:
  - Captured in the claim transaction (per 021 `BookingService.claim()`).
  - Only set when the booking is being claimed in a department where `isDiagnostic = true`.
  - The value is the diagnostic dept's `diagnosticFeeAmount` AT THE MOMENT OF CLAIM, not
    `Booking.department.diagnosticFeeAmount` (which would re-resolve at quote-build time).
  - Once set, never updated (locked rate).

**Constraint logic** (no DB-level CHECK — enforced in service code):

- `passedThroughDiagnostic = false` implies `diagnosticFeeRateAtClaim IS NULL`.
- `passedThroughDiagnostic = true` permits `diagnosticFeeRateAtClaim` to be null until claim,
  then non-null thereafter.

---

### RerouteAudit (new entity)

Append-only audit table.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Long | PK, auto-increment | |
| `booking` | Booking (FK) | NOT NULL | The booking re-routed |
| `fromDepartment` | Department (FK) | NOT NULL | Where the booking was before |
| `toDepartment` | Department (FK) | NOT NULL | Where the booking is now |
| `fromMembership` | CenterMembership (FK) | nullable | The technician unassigned by this re-route. Null if the booking was already unassigned (e.g., owner re-routes a queued booking). |
| `triggeredBy` | User (FK) | NOT NULL | The user who initiated the re-route — could be the technician, owner, or branch manager |
| `reason` | RerouteReason (enum) | NOT NULL | One of: `WRONG_DIAGNOSIS`, `OUT_OF_SCOPE`, `SPECIALIST_NEEDED`, `STAFF_UNAVAILABLE`, `CUSTOMER_REQUEST`, `OTHER` |
| `note` | String(500) | nullable | Optional free-text note (FR-DR-015) |
| `isInitialDiagnosticClassification` | Boolean | NOT NULL, default `false` | TRUE when the re-route is the first one on a booking that originated in the diagnostic dept (FR-DR-023). Computed at write time. |
| `createdAt` | LocalDateTime | NOT NULL, immutable | Server timestamp |

**No `updatedAt`** — this entity is immutable per FR-DR-024.

**Indices**:

```sql
CREATE INDEX idx_reroute_booking ON reroute_audit(booking_id);
CREATE INDEX idx_reroute_from_dept_created ON reroute_audit(from_department_id, created_at);
CREATE INDEX idx_reroute_to_dept_created ON reroute_audit(to_department_id, created_at);
```

The first index supports "show this booking's re-route history" (FR-DR-025).
The second supports the future "re-route reason distribution per dept" analytics (FR-DR-026).
The third supports symmetric "what arrived in this dept via re-route" queries.

**State transitions**: None. Records are written once and never modified.

---

### BookingQuote (extension to 009's model)

Extend the existing line-item kind discriminator:

```java
public enum QuoteLineItemKind {
  // existing
  PARTS,
  LABOR,
  // new
  DIAGNOSTIC_FEE
}
```

Behavior for `DIAGNOSTIC_FEE` line items:

- `partsCost = 0`, `laborCost = diagnosticFeeAmount`, OR a dedicated `amount` field if the
  existing model is part/labor-only (verify in 009's plan; spec assumes the existing model
  has an `amount` or can carry the fee in one of the cost fields).
- `description` is set by the backend to a fixed bilingual i18n key
  (`quote.diagnosticFee.label`).
- Cannot be deleted by the technician building the quote (UI hides delete affordance; backend
  rejects `DELETE` on a line where `kind = DIAGNOSTIC_FEE` with `DIAGNOSTIC_FEE_LOCKED`).
- Cannot be edited by the technician (UI hides edit; backend rejects PATCH on the
  `amount`/`description` of such a line).
- Added automatically when `QuoteService.create()` is called for a booking where
  `passedThroughDiagnostic = true` and `diagnosticFeeRateAtClaim` IS NOT NULL.
- Amount = `Booking.diagnosticFeeRateAtClaim` (the captured snapshot).
- Preserved across quote revisions (FR-DR-021 + the working-tech-rebuild flow in 6.5).

> **Verify with 009's plan**: the exact field shape for line items (parts/labor split vs.
> single `amount` field). If only parts/labor exist, populate `laborCost = fee, partsCost = 0`
> as the conventional placement. This is a small implementation detail; spec 009 is the
> source of truth.

---

## Frontend types

`types/department.ts` (EXTEND existing from 020):

```typescript
export interface Department {
  id: number;
  centerId: number;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  categoryIds: number[];
  memberCount: number;
  // new in 022
  isDiagnostic: boolean;
  diagnosticFeeAmount: number | null;  // KD, 3-decimal; null when isDiagnostic = false
}

export interface UpdateDepartmentRequest {
  nameAr?: string;
  nameEn?: string;
  categoryIds?: number[];
  displayOrder?: number;
  // new in 022 — both optional; backend enforces invariants
  isDiagnostic?: boolean;
  diagnosticFeeAmount?: number | null;
}
```

`types/reroute.ts` (NEW):

```typescript
export type RerouteReason =
  | 'WRONG_DIAGNOSIS'
  | 'OUT_OF_SCOPE'
  | 'SPECIALIST_NEEDED'
  | 'STAFF_UNAVAILABLE'
  | 'CUSTOMER_REQUEST'
  | 'OTHER';

export interface RerouteRequest {
  targetDepartmentId: number;
  reason: RerouteReason;
  note?: string;  // max 500 chars; UI enforces
}

export interface RerouteAudit {
  id: number;
  bookingId: number;
  fromDepartmentId: number;
  fromDepartmentNameAr: string;
  fromDepartmentNameEn: string;
  toDepartmentId: number;
  toDepartmentNameAr: string;
  toDepartmentNameEn: string;
  fromMembershipId: number | null;
  fromMembershipDisplayName: string | null;
  triggeredByUserId: number;
  triggeredByUserDisplayName: string;
  reason: RerouteReason;
  note: string | null;
  isInitialDiagnosticClassification: boolean;
  createdAt: string;  // ISO
}

// Response from POST /bookings/{id}/reroute
export interface RerouteResponse {
  audit: RerouteAudit;
  updatedBooking: BookingResponse;  // re-fetch convenience
}
```

`types/booking.ts` (EXTEND `BookingResponse` shape):

```typescript
export interface BookingResponse {
  // ... existing fields
  passedThroughDiagnostic: boolean;
  diagnosticFeeRateAtClaim: number | null;
}
```

`types/quote.ts` (EXTEND `QuoteLineItem` shape):

```typescript
export type QuoteLineItemKind = 'PARTS' | 'LABOR' | 'DIAGNOSTIC_FEE';

export interface QuoteLineItem {
  id: number;
  kind: QuoteLineItemKind;
  descriptionKey?: string;     // i18n key, set by backend for system lines
  descriptionAr?: string;       // user-authored
  descriptionEn?: string;
  partsCost: number;
  laborCost: number;
  total: number;
  editable: boolean;            // false for DIAGNOSTIC_FEE
  removable: boolean;           // false for DIAGNOSTIC_FEE
}
```

---

## Response DTOs (backend → frontend)

### DepartmentResponse (extension)

```json
{
  "id": 3,
  "centerId": 5,
  "nameAr": "تشخيص الأعطال",
  "nameEn": "Diagnostic Bay",
  "displayOrder": 0,
  "isActive": true,
  "categoryIds": [],
  "memberCount": 2,
  "isDiagnostic": true,
  "diagnosticFeeAmount": 5.000
}
```

For non-diagnostic departments, `isDiagnostic: false` and `diagnosticFeeAmount: null`.

### BookingResponse (extension)

```json
{
  "id": 1042,
  "...": "(existing fields)",
  "passedThroughDiagnostic": true,
  "diagnosticFeeRateAtClaim": 5.000
}
```

### RerouteAudit response shape

(See `types/reroute.ts` above — same shape on the wire.)

---

## Validation rules

Additive to those already enforced in 020.

| Rule | Entity | Enforcement |
|---|---|---|
| At most one active diagnostic dept per center | Department | Partial unique index + service-layer check for friendly error |
| `diagnosticFeeAmount` ≥ 0 | Department | `@DecimalMin("0.000")` on request DTO |
| `diagnosticFeeAmount` settable only when `isDiagnostic = true` | Department | `DepartmentService.update()` check; reject with `INVALID_DIAGNOSTIC_FEE_TARGET` |
| Cannot toggle `isDiagnostic` when dept has non-terminal bookings | Department | `DepartmentService.update()` check |
| Cannot re-route INTO a diagnostic dept | Reroute | `RerouteService.reroute()` validates target's `isDiagnostic = false` |
| Cannot re-route to the same dept | Reroute | `RerouteService.reroute()` check |
| Cannot re-route a booking in terminal status | Reroute | `RerouteService.reroute()` checks `Booking.bookingStatus` not in (COMPLETED, CANCELLED, NO_SHOW) |
| Note ≤ 500 chars | Reroute | `@Size(max=500)` on request DTO |
| Reason required, from enum | Reroute | `@NotNull` + Jackson enum binding |
| Caller permission check | Reroute | `RerouteService.reroute()` enforces: caller is assigned tech OR has `REROUTE_BOOKING_ANY` |
| Concurrent re-route conflict | Reroute | Pessimistic row lock on booking; second submit returns `REROUTE_CONFLICT` |

---

## Booking creation flow (modified)

The existing `BookingService.create()` is extended:

```
1. Parse the booking request.
2. If categoryId is present:
   - Resolve ServiceCategory and route per 020 FR-D-007/008/009.
   - Booking.passedThroughDiagnostic = false.
3. If categoryId is null:
   - Find the center's diagnostic department:
       SELECT d FROM Department d
       WHERE d.center = :center AND d.isDiagnostic = TRUE AND d.isActive = TRUE
     There is at most one (unique index).
   - If found: Booking.department = diagnosticDept; passedThroughDiagnostic = true.
   - If not found: route to the default department per 020 FR-D-008 with
     passedThroughDiagnostic = false. (This case is reachable when the customer app
     allows null categoryId but the center hasn't configured a diagnostic dept.)
4. diagnosticFeeRateAtClaim = NULL (set later, in the claim transaction).
5. Persist and return BookingResponse.
```

---

## Claim flow (extension to 021)

The existing claim transaction (`BookingService.claim()`) is extended:

```
1. Pessimistic-lock the booking (already done per 021).
2. Existing preconditions (per 021 §7).
3. If booking.department.isDiagnostic = true AND booking.diagnosticFeeRateAtClaim IS NULL:
   - Capture: booking.diagnosticFeeRateAtClaim = booking.department.diagnosticFeeAmount
   - This snapshot is the rate that will appear on the eventual quote.
4. Set assignedMembershipId, write claim audit, etc., as in 021.
```

The snapshot is captured at most once per booking (the IS NULL guard). If the booking is
re-routed and re-claimed in a different dept (which by FR-DR-017 cannot be diagnostic), no
additional snapshot is taken — the original is preserved.

---

## Re-route flow (new transaction)

```
RerouteService.reroute(bookingId, request, caller):

1. Open transaction.
2. Pessimistic-lock the booking by id.
3. Permission check:
   - Caller is OWNER or BRANCH_MANAGER of booking.center → allowed.
   - Caller's membership is currently assigned to the booking → allowed.
   - Otherwise: reject FORBIDDEN.
4. Validity checks:
   - Booking status not in terminal set → else reject INVALID_BOOKING_STATUS.
   - Target dept exists, belongs to booking.center, is active → else reject DEPARTMENT_NOT_FOUND.
   - Target dept.isDiagnostic = false → else reject CANNOT_REROUTE_INTO_DIAGNOSTIC.
   - Target dept != current dept → else reject NO_OP_REROUTE.
5. Apply changes:
   - Compute isInitialDiagnosticClassification:
       true if (current dept.isDiagnostic = TRUE)
            AND no prior RerouteAudit exists for this booking
       false otherwise.
   - Save RerouteAudit row (booking, from, to, fromMembership, triggeredBy, reason, note,
     isInitialDiagnosticClassification, createdAt = now).
   - booking.department = target dept.
   - booking.assignedMembershipId = NULL.
   - If booking has an active quote (status SENT or APPROVED): mark it REVISED
     (delegated to QuoteService.markRevised(bookingId)).
6. Commit transaction.
7. AFTER COMMIT:
   - Enqueue customer notification (type BOOKING_REROUTED).
   - RTK Query cache invalidation handled by frontend via 'Bookings' tag.
8. Return RerouteResponse { audit, updatedBooking }.
```

---

## Migration plan

Three Flyway scripts, applied in order:

### V{n}: `add_department_diagnostic_columns`

```sql
ALTER TABLE department
  ADD COLUMN is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN diagnostic_fee_amount NUMERIC(11,3);

CREATE UNIQUE INDEX uq_dept_one_diagnostic_per_center
  ON department(center_id)
  WHERE is_diagnostic = TRUE AND is_active = TRUE;
```

### V{n+1}: `add_booking_diagnostic_columns`

```sql
ALTER TABLE booking
  ADD COLUMN passed_through_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN diagnostic_fee_rate_at_claim NUMERIC(11,3);
```

No backfill: existing bookings are pre-feature and were not routed through diagnostic. The
default `FALSE` is correct for all historical rows.

### V{n+2}: `create_reroute_audit`

```sql
CREATE TABLE reroute_audit (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES booking(id),
  from_department_id BIGINT NOT NULL REFERENCES department(id),
  to_department_id BIGINT NOT NULL REFERENCES department(id),
  from_membership_id BIGINT REFERENCES center_membership(id),
  triggered_by_user_id BIGINT NOT NULL REFERENCES _user(id),
  reason VARCHAR(32) NOT NULL,
  note VARCHAR(500),
  is_initial_diagnostic_classification BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_reroute_booking ON reroute_audit(booking_id);
CREATE INDEX idx_reroute_from_dept_created ON reroute_audit(from_department_id, created_at);
CREATE INDEX idx_reroute_to_dept_created ON reroute_audit(to_department_id, created_at);
```

> **Migration note for backend session**: confirm the table name `center_membership` exists
> (added by 015) and confirm `_user` and `booking` table names match what's currently in the
> schema — these are referenced in the FK declarations.
