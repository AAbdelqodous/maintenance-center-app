# API Contract: Self-Claim Booking

**Feature**: 021-self-claim-booking  
**Base paths**: `/api/v1/bookings/queue`, `/api/v1/bookings/{id}/claim`  
**Auth**: All endpoints require `Authorization: Bearer <jwt>`. Center and department context are resolved server-side from the authenticated caller's active membership.  
**Permission gate**: `GET /bookings/queue` and `POST /bookings/{id}/claim` require `CLAIM_BOOKING` permission (TECHNICIAN role only).

---

## Endpoints

### GET /bookings/queue

Returns the paginated list of unassigned, claimable bookings in the calling technician's department(s). Department filter is server-inferred from the caller's active membership — no `departmentId` query parameter is accepted.

**Query parameters**:

| Parameter | Required | Default | Notes |
|---|---|---|---|
| `page` | No | 0 | Zero-indexed page number |
| `size` | No | 20 | Page size |

**Response**: `200 OK` — `PageResponse<BookingResponse>` with `noDepartmentMembership` extension

```json
{
  "content": [
    {
      "id": 1042,
      "customerName": "Ahmad Al-Mansouri",
      "customerPhone": "+965 9999 1234",
      "serviceType": "REPAIR",
      "bookingStatus": "CONFIRMED",
      "bookingDate": "2026-05-26",
      "bookingTime": "10:00:00",
      "notes": "Strange noise from engine",
      "assignedMembershipId": null,
      "assignedStaffName": null,
      "departmentId": 3,
      "departmentNameAr": "ورشة المحرك",
      "departmentNameEn": "Engine Repair",
      "createdAt": "2026-05-25T08:30:00",
      "updatedAt": "2026-05-25T08:30:00"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20,
  "first": true,
  "last": true,
  "noDepartmentMembership": false
}
```

**noDepartmentMembership semantics**:
- `false` (default): Caller has at least one department assignment. `content` may be empty (all bookings assigned or none match claimable status).
- `true`: Caller has zero department assignments. `content` is always empty. Frontend displays the "Contact your branch manager" empty state (spec §8.6).

**Sort order**: `bookingDate` ASC, `bookingTime` ASC (earliest scheduled booking first, FR-SC-002).

**Claimable filter**: Only bookings with `bookingStatus IN ('CONFIRMED', 'RESCHEDULED')` and `assignedMembershipId IS NULL` appear in the queue (spec §6, §5.1).

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 403 | (standard) | Caller does not have CLAIM_BOOKING permission |

---

### POST /bookings/{id}/claim

Claims an unassigned booking, assigning it to the calling technician. Atomic under concurrent access — exactly one caller succeeds when two technicians claim the same booking simultaneously.

**Path parameters**:

| Parameter | Required | Notes |
|---|---|---|
| `id` | Yes | Booking ID |

**Request body**: none

**Response**: `200 OK` — the updated `BookingResponse` with `assignedMembershipId` set to the caller's membership ID.

```json
{
  "id": 1042,
  "customerName": "Ahmad Al-Mansouri",
  "bookingStatus": "CONFIRMED",
  "bookingDate": "2026-05-26",
  "bookingTime": "10:00:00",
  "assignedMembershipId": 44,
  "assignedStaffName": "Mohammed Al-Rashidi",
  "departmentId": 3,
  "departmentNameAr": "ورشة المحرك",
  "departmentNameEn": "Engine Repair"
}
```

**Side effects**:
- `booking.assignedMembershipId` is set to the caller's membership ID atomically.
- An immutable `BookingClaimAudit` record is created with the booking ID, membership ID, user ID, department ID, and server timestamp.
- The booking disappears from `GET /bookings/queue` for all technicians on the next poll.

**Precondition errors** (evaluated in spec §7 order, first failure returned):

| HTTP | businessErrorCode | English message | Arabic message |
|---|---|---|---|
| 409 | `STAFF_INACTIVE` | "Your membership is no longer active at this center." | "عضويتك لم تعد فعّالة في هذا المركز." |
| 409 | `BOOKING_NOT_CLAIMABLE` | "This booking is no longer available." (booking not found) | "هذا الحجز لم يعد متاحاً." |
| 409 | `BOOKING_NOT_CLAIMABLE` | "This booking cannot be claimed in its current status." | "لا يمكن استلام هذا الحجز بوضعه الحالي." |
| 409 | `BOOKING_ALREADY_CLAIMED` | "This booking was just claimed by another technician." | "تم استلام هذا الحجز من قِبل فني آخر للتو." |
| 409 | `WRONG_DEPARTMENT` | "This booking is in a different department. Ask your manager to assign it if needed." | "هذا الحجز ينتمي لقسم مختلف. اطلب من مديرك التعيين إذا لزم الأمر." |
| 403 | (standard) | Caller does not have CLAIM_BOOKING permission | — |

**businessErrorCode field location**: The frontend reads `err.data.error` (the string code), consistent with the existing `CROSS_DEPARTMENT_NOT_ALLOWED` handling in `[id].tsx`.

---

## Backend Implementation Notes

### BookingRepository — new methods

```java
// Used for queue endpoint — no lock needed (read-only list)
@Query("""
  SELECT b FROM Booking b
  WHERE b.center = :center
    AND b.department.id IN :departmentIds
    AND b.assignedMembership IS NULL
    AND b.bookingStatus IN ('CONFIRMED', 'RESCHEDULED')
  ORDER BY b.bookingDate ASC, b.bookingTime ASC
""")
Page<Booking> findClaimableByDepartments(
    @Param("center") MaintenanceCenter center,
    @Param("departmentIds") List<Long> departmentIds,
    Pageable pageable
);

// Used for claim endpoint — pessimistic lock to prevent double-assignment
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<Booking> findWithLockById(Long id);
```

### BookingService.claim() — pseudocode

```java
@Transactional
public BookingResponse claim(Long bookingId, CenterMembership callerMembership) {
    // Precondition 1 — outside lock
    if (!callerMembership.isActive()) throw new ClaimException(STAFF_INACTIVE);

    // Precondition 2+3 — outside lock (optimistic read, re-checked under lock)
    Booking booking = bookingRepository.findById(bookingId)
        .orElseThrow(() -> new ClaimException(BOOKING_NOT_CLAIMABLE));
    if (!CLAIMABLE_STATUSES.contains(booking.getBookingStatus()))
        throw new ClaimException(BOOKING_NOT_CLAIMABLE);

    // Acquire row lock for precondition 4
    Booking locked = bookingRepository.findWithLockById(bookingId)
        .orElseThrow(() -> new ClaimException(BOOKING_NOT_CLAIMABLE));

    // Precondition 4 — under lock (the only concurrent-safe check)
    if (locked.getAssignedMembership() != null)
        throw new ClaimException(BOOKING_ALREADY_CLAIMED);

    // Precondition 5 — under lock
    List<Long> callerDeptIds = callerMembership.getDepartmentIds();
    if (!callerDeptIds.contains(locked.getDepartment().getId()))
        throw new ClaimException(WRONG_DEPARTMENT);

    // Assign and audit
    locked.setAssignedMembership(callerMembership);
    bookingClaimAuditRepository.save(new BookingClaimAudit(
        locked, callerMembership.getId(), callerMembership.getUser().getId(),
        locked.getDepartment().getId()
    ));

    return BookingResponse.from(locked);
}
```

---

## Frontend Patches

### 1. `store/api/bookingsApi.ts` — three changes

**Change A**: Add `WRONG_DEPARTMENT` to error union type:
```typescript
export type ClaimBookingErrorCode =
  | 'BOOKING_ALREADY_CLAIMED'
  | 'BOOKING_NOT_CLAIMABLE'
  | 'STAFF_INACTIVE'
  | 'WRONG_DEPARTMENT';    // ← add
```

**Change B**: Add `noDepartmentMembership` to `getBookingQueue` transformResponse:
```typescript
transformResponse: (raw: any): BookingsResponse => ({
  content: raw.content ?? [],
  totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
  totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
  number: raw.page?.number ?? raw.number ?? 0,
  size: raw.page?.size ?? raw.size ?? 0,
  first: raw.first ?? true,
  last: raw.last ?? true,
  noDepartmentMembership: raw.noDepartmentMembership ?? false,  // ← add
}),
```

### 2. `app/(app)/staff/bookings/[id].tsx` — error map patch

```typescript
const codeToKey: Record<string, string> = {
  BOOKING_ALREADY_CLAIMED: 'bookings.alreadyClaimed',
  BOOKING_NOT_CLAIMABLE:   'bookings.notClaimable',
  STAFF_INACTIVE:          'bookings.staffInactive',
  WRONG_DEPARTMENT:        'bookings.wrongDepartment',  // ← add
};
```

### 3. `app/(app)/staff/bookings/queue.tsx` — automatic 30s polling

Add inside `DepartmentQueueScreen`, after existing state declarations:

```typescript
// Automatic 30-second refresh — resets to page 0 so claimed bookings disappear
useEffect(() => {
  const id = setInterval(() => {
    setAllBookings([]);
    setHasMore(true);
    if (page === 0) refetch();
    else setPage(0);
  }, 30_000);
  return () => clearInterval(id);
}, [page, refetch]);
```

### 4. i18n patches

`lib/i18n/locales/en.json` — add inside `"bookings"` object:
```json
"wrongDepartment": "This booking is in a different department. Ask your manager to assign it if needed."
```

`lib/i18n/locales/ar.json` — add inside `"bookings"` object:
```json
"wrongDepartment": "هذا الحجز ينتمي لقسم مختلف. اطلب من مديرك التعيين إذا لزم الأمر."
```

---

## businessErrorCode → i18n key map (frontend)

```typescript
const CLAIM_ERROR_MAP: Record<string, string> = {
  BOOKING_ALREADY_CLAIMED: 'bookings.alreadyClaimed',
  BOOKING_NOT_CLAIMABLE:   'bookings.notClaimable',
  STAFF_INACTIVE:          'bookings.staffInactive',
  WRONG_DEPARTMENT:        'bookings.wrongDepartment',
};
```

Unrecognized codes fall back to `err?.data?.businessErrorDescription ?? t('common.error')` (already implemented in `[id].tsx` — no change needed).
