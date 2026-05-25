# Data Model: Self-Claim Booking

**Feature**: 021-self-claim-booking  
**Phase**: Phase 1 — Design  
**Date**: 2026-05-25

---

## Backend Entities

### BookingClaimAudit (new entity)

Immutable audit record created on every successful claim. No update or delete path.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Long | PK, auto-increment | |
| `booking` | Booking (FK) | NOT NULL | `booking_id` column; no cascade — audit outlives booking updates |
| `membershipId` | Long | NOT NULL | Claiming technician's `CenterMembership.id` at time of claim |
| `userId` | Long | NOT NULL | Claiming technician's `User.id` at time of claim |
| `departmentId` | Long | NOT NULL | Department context from the booking's `department_id` at claim time |
| `claimedAt` | LocalDateTime | NOT NULL, immutable | `@CreatedDate` — server-generated; no client-supplied value accepted |

**Immutability contract**: `BookingClaimAuditRepository` exposes `save()` only. No `update` method. The entity has no `@LastModifiedDate`. `claimedAt` is set by JPA auditing on insert and never touched again. If the booking is later reassigned by a manager, the original audit row is retained alongside any new reassignment event.

**State transitions**: None — this entity is write-once.

---

### Booking (extension to existing entity)

Two JPA relationships are added (or confirmed) to support the claim feature:

| Relationship | Type | Notes |
|---|---|---|
| `assignedMembership` | `@ManyToOne` CenterMembership, nullable | The technician assigned to this booking. Set to null when unassigned. Claim sets this to the calling technician's membership. |
| `department` | `@ManyToOne` Department | Already added by spec 020. Required for queue filter and WRONG_DEPARTMENT check. |

If `Booking.assignedMembership` already exists as a FK column `assigned_membership_id` in the schema, no new migration is needed — only `BookingResponse` population needs updating. Verify the actual column name against the live schema before writing the migration.

---

### Database Migration

```sql
-- V{n}__create_booking_claim_audit.sql
CREATE TABLE booking_claim_audit (
  id              BIGSERIAL PRIMARY KEY,
  booking_id      BIGINT NOT NULL REFERENCES booking(id),
  membership_id   BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  department_id   BIGINT NOT NULL,
  claimed_at      TIMESTAMP NOT NULL
);

CREATE INDEX idx_claim_audit_booking ON booking_claim_audit(booking_id);
CREATE INDEX idx_claim_audit_membership ON booking_claim_audit(membership_id);
```

**Notes**:
- `membership_id`, `user_id`, `department_id` are stored as plain Long values (not FK constraints) so audit records survive membership or department deactivation.
- Index on `booking_id` for queries like "show me all claim events for booking #1042."
- Index on `membership_id` for queries like "show me all bookings this technician has claimed."

If `booking.assigned_membership_id` column does not yet exist, add it in the same migration:

```sql
-- Only include if column does not already exist in the booking table
ALTER TABLE booking ADD COLUMN IF NOT EXISTS assigned_membership_id BIGINT REFERENCES center_membership(id);
```

---

## Frontend Types (`types/booking.ts` or `store/api/bookingsApi.ts`)

### Updated `Booking` interface (confirm existing, no changes needed)

```typescript
export interface Booking {
  id: number;
  customerName: string;
  customerPhone?: string;
  serviceType: ServiceType;
  bookingStatus: BookingStatus;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  workStage?: string;
  assignedMembershipId: number | null;   // ← already in interface; backend must populate
  assignedStaffName: string | null;       // ← already in interface; backend must populate
  departmentId?: number;                  // ← already in interface; backend must populate
  departmentNameAr?: string;              // ← already in interface; backend must populate
  departmentNameEn?: string;              // ← already in interface; backend must populate
  createdAt: string;
  updatedAt: string;
}
```

These fields are already in `bookingsApi.ts` — no TypeScript change needed. The backend `BookingResponse` DTO needs to populate them.

### Updated `BookingsResponse` interface (confirm noDepartmentMembership)

```typescript
export interface BookingsResponse {
  content: Booking[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  noDepartmentMembership?: boolean;  // ← already in interface; missing from transformResponse
}
```

The `noDepartmentMembership` field is already declared in the interface but not passed through in `getBookingQueue`'s `transformResponse`. The patch adds:
```typescript
noDepartmentMembership: raw.noDepartmentMembership ?? false,
```

### Updated `ClaimBookingErrorCode` union (patch needed)

```typescript
export type ClaimBookingErrorCode =
  | 'BOOKING_ALREADY_CLAIMED'
  | 'BOOKING_NOT_CLAIMABLE'
  | 'STAFF_INACTIVE'
  | 'WRONG_DEPARTMENT';              // ← ADD this
```

---

## Backend Response DTOs

### BookingResponse (extension)

Add these fields to the existing `BookingResponse.java`:

```java
private Long assignedMembershipId;     // null if unassigned
private String assignedStaffName;      // null if unassigned; firstname + " " + lastname
private Long departmentId;             // from booking.getDepartment().getId()
private String departmentNameAr;       // from booking.getDepartment().getNameAr()
private String departmentNameEn;       // from booking.getDepartment().getNameEn()
```

Population in `BookingService` (or a static factory method on the DTO):
```java
if (booking.getAssignedMembership() != null) {
    var user = booking.getAssignedMembership().getUser();
    response.setAssignedMembershipId(booking.getAssignedMembership().getId());
    response.setAssignedStaffName(user.getFirstname() + " " + user.getLastname());
}
if (booking.getDepartment() != null) {
    response.setDepartmentId(booking.getDepartment().getId());
    response.setDepartmentNameAr(booking.getDepartment().getNameAr());
    response.setDepartmentNameEn(booking.getDepartment().getNameEn());
}
```

### Queue-specific PageResponse wrapper

The queue endpoint returns the standard `PageResponse<BookingResponse>` format already used by `GET /bookings`, extended with one extra field:

```json
{
  "content": [...],
  "totalElements": 5,
  "totalPages": 1,
  "number": 0,
  "size": 20,
  "first": true,
  "last": true,
  "noDepartmentMembership": false
}
```

`noDepartmentMembership` is `true` only when the caller has zero department assignments — causes the queue screen to show the "Contact your branch manager" empty state rather than the generic empty state.

---

## Precondition Evaluation Order (Backend Claim Logic)

From spec §7 — evaluated in this exact order, first failure stops evaluation:

| Order | Check | businessErrorCode | HTTP |
|---|---|---|---|
| 1 | `membership.isActive()` | `STAFF_INACTIVE` | 409 |
| 2 | Booking exists | `BOOKING_NOT_CLAIMABLE` | 409 |
| 3 | `booking.status ∈ {CONFIRMED, RESCHEDULED}` | `BOOKING_NOT_CLAIMABLE` | 409 |
| 4 | `booking.assignedMembershipId == null` (checked under PESSIMISTIC_WRITE lock) | `BOOKING_ALREADY_CLAIMED` | 409 |
| 5 | `booking.departmentId ∈ caller.departmentIds` | `WRONG_DEPARTMENT` | 409 |

Precondition 4 is the only one evaluated under the pessimistic lock. Preconditions 1–3 and 5 are evaluated outside the lock transaction to minimize lock hold time.

---

## i18n Gaps (patches to existing locale files)

Add to `lib/i18n/locales/en.json` under `"bookings"`:

```json
"wrongDepartment": "This booking is in a different department. Ask your manager to assign it if needed."
```

Add to `lib/i18n/locales/ar.json` under `"bookings"`:

```json
"wrongDepartment": "هذا الحجز ينتمي لقسم مختلف. اطلب من مديرك التعيين إذا لزم الأمر."
```
