# API Contract: Booking Assignment

**Feature**: 015-staff-management-foundation  
**Date**: 2026-05-20

---

## New Endpoints

### Assign (or Unassign) a Technician to a Booking

```
PUT /bookings/{id}/assign
Authorization: Bearer <jwt>
Content-Type: application/json

Body:
{
  "membershipId": 42      // number — membership record ID of the technician
                           // null   — clears the assignment (unassign)
}

Response 200:
{
  // full Booking response — same shape as GET /bookings/{id}
  "id": 123,
  "assignedMembershipId": 42,       // NEW field
  "assignedStaffName": "Ahmed Ali", // NEW field — "Firstname Lastname"
  ...
}

Response 400: Invalid membershipId (not a Technician, not at this center, not active)
{
  "businessErrorCode": <code>,
  "businessErrorDescription": "<bilingual message from backend>",
  "error": "..."
}

Response 403: Caller lacks ASSIGN_TECHNICIAN permission
Response 404: Booking not found
Response 409: Staff member has active assigned bookings during deactivation
{
  "businessErrorCode": <code>,
  "businessErrorDescription": "...",
  "error": "STAFF_HAS_ACTIVE_ASSIGNMENTS"
}
```

### Get My Assigned Bookings (Staff — Technician view)

```
GET /bookings/assigned
Authorization: Bearer <jwt>  (must be a STAFF user)
Query params: page, size, status (optional — BookingStatus enum)

Response 200:
{
  "content": [Booking, ...],
  "totalElements": 12,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Note**: The `assignedMembershipId` and `assignedStaffName` fields are new additions to the existing `Booking` response shape. All existing endpoints that return `Booking` objects should include these fields (nullable).

---

## Modified Booking Response Shape

The `Booking` object returned from all booking endpoints gains two new nullable fields:

```typescript
interface Booking {
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
  createdAt: string;
  updatedAt: string;
  // NEW:
  assignedMembershipId: number | null;
  assignedStaffName: string | null;
}
```

---

## RTK Query Mutations / Queries

### In `store/api/bookingsApi.ts`

```typescript
// Add to endpoints:
assignTechnician: builder.mutation<Booking, { bookingId: number; membershipId: number | null }>({
  query: ({ bookingId, membershipId }) => ({
    url: `bookings/${bookingId}/assign`,
    method: 'PUT',
    body: { membershipId },
  }),
  invalidatesTags: (_result, _error, { bookingId }) => [
    'Booking',
    { type: 'Booking', id: bookingId },
  ],
}),
```

### In `store/api/staffApi.ts`

```typescript
// Add to endpoints:
getMyAssignedBookings: builder.query<BookingsResponse, { page?: number; size?: number; status?: string }>({
  query: ({ page = 0, size = 20, status } = {}) => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status) params.append('status', status);
    return `bookings/assigned?${params.toString()}`;
  },
  transformResponse: (raw: any): BookingsResponse => ({
    content: raw.content ?? [],
    totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
    totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
    number: raw.page?.number ?? raw.number ?? 0,
    size: raw.page?.size ?? raw.size ?? 0,
    first: raw.first ?? true,
    last: raw.last ?? true,
  }),
  providesTags: ['Staff'],  // invalidated when assignments change
}),
```

---

## Error Handling Conventions

All error handling follows the existing project pattern:

```typescript
try {
  await assignTechnician({ bookingId, membershipId }).unwrap();
  showFeedback('success', t('bookings.assignSuccess'));
} catch (err: any) {
  const msg = err?.data?.businessErrorDescription ?? t('bookings.crossBranchError');
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert(t('common.error'), msg);
}
```

For the 409 `STAFF_HAS_ACTIVE_ASSIGNMENTS` case on deactivation:

```typescript
} catch (err: any) {
  if (err?.data?.error === 'STAFF_HAS_ACTIVE_ASSIGNMENTS') {
    // Show targeted bilingual message + CTA to view their active bookings
  } else {
    const msg = err?.data?.businessErrorDescription ?? t('common.error');
    // Show generic error
  }
}
```

---

## Tag Invalidation

| Action | Tags Invalidated |
|--------|-----------------|
| `assignTechnician` | `'Booking'`, `{ type: 'Booking', id: bookingId }` |
| `suspendMember` | `'Staff'` |
| `removeMember` | `'Staff'` |
| `updateMembershipRole` | `'Staff'` |

The `'Staff'` tag also covers `getMyAssignedBookings` (which `providesTags: ['Staff']`), so any staff mutation automatically refreshes the technician's assigned bookings list within one RTK Query poll cycle — satisfying SC-002.
