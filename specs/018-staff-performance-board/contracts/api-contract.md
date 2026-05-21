# API Contract: Staff Performance Board (Spec 018)

## New Endpoints

All endpoints require `Authorization: Bearer <jwt>`. Responses follow the existing error shape:
`{ "businessErrorCode": N, "businessErrorDescription": "...", "error": "..." }`.

---

### GET `/analytics/center/staff-performance`

Returns the performance board for the authenticated user's active center.

**Auth**: OWNER, BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN (role-filtered response)

**Role filtering (enforced server-side)**:

| Field | OWNER / BRANCH_MANAGER | TECHNICIAN / other |
|-------|------------------------|-------------------|
| `tier` | Returned | Omitted |
| `trendDirection` | Returned | Omitted |
| `isOverloaded` | Returned | Omitted |
| `avgRatingThisMonth` | Returned | Omitted for peers; returned for self |
| `activeBookings[]` | Returned | Omitted |

**Response 200**:
```json
{
  "staff": [
    {
      "membershipId": 12,
      "userId": 34,
      "firstName": "Ahmed",
      "lastName": "Hassan",
      "avatarUrl": null,
      "role": "TECHNICIAN",
      "status": "OVERLOADED",
      "activeBookingsCount": 6,
      "tier": "ON_TRACK",
      "isNew": false,
      "avgRatingThisMonth": 4.2,
      "avgCompletionTimeMinutes": 95,
      "completedThisMonth": 8,
      "onTimeRateThisMonth": 0.75,
      "trendDirection": "UP",
      "compositeScore": 72.4,
      "previousMonthScore": 68.1,
      "isOverloaded": true,
      "activeBookings": [
        {
          "bookingId": 101,
          "customerName": "Khalid Al-Rashid",
          "serviceType": "REPAIR",
          "bookingDate": "2026-05-21",
          "bookingTime": "10:00:00",
          "bookingStatus": "IN_PROGRESS"
        }
      ]
    }
  ],
  "branchAverageActiveLoad": 2.5,
  "config": {
    "topPerformerMinRating": 4.5,
    "topPerformerMinOnTime": 0.85,
    "topPerformerMinVolume": 5,
    "strongMinRating": 4.0,
    "strongMinOnTime": 0.70,
    "needsAttentionMaxRating": 3.5,
    "needsAttentionMinDecline": 0.5,
    "needsAttentionMaxOnTime": 0.60,
    "trendThreshold": 10.0,
    "overloadMultiplier": 2.0
  },
  "generatedAt": "2026-05-21T09:45:00Z"
}
```

**Response 403**: User does not have access to this center.

---

### GET `/analytics/center/staff/{membershipId}/history`

Returns monthly metrics history for a single technician (drill-down).

**Auth**: OWNER, BRANCH_MANAGER only. Returns 403 for TECHNICIAN accessing a peer's history.

**Query params**:
- `months` (optional, default 6): number of months to return

**Response 200**:
```json
{
  "membershipId": 12,
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "months": [
    {
      "year": 2026,
      "month": 5,
      "completedBookings": 8,
      "avgRating": 4.2,
      "avgCompletionTimeMinutes": 95,
      "onTimeRate": 0.75,
      "complaintCount": 0
    },
    {
      "year": 2026,
      "month": 4,
      "completedBookings": 11,
      "avgRating": 4.0,
      "avgCompletionTimeMinutes": 102,
      "onTimeRate": 0.72,
      "complaintCount": 1
    }
  ],
  "recentBookings": [
    {
      "bookingId": 101,
      "customerName": "Khalid Al-Rashid",
      "serviceType": "REPAIR",
      "bookingDate": "2026-05-21",
      "bookingTime": "10:00:00",
      "bookingStatus": "IN_PROGRESS"
    }
  ]
}
```

**Response 403**: Requester lacks permission or membershipId doesn't belong to their center.
**Response 404**: membershipId not found.

---

## Modified Endpoints

### PUT `/bookings/{bookingId}/assign`

Already exists in `bookingsApi.ts`. No changes to the request/response shape.

**Used by**: Rebalance modal. After a confirmed reassignment, the frontend also invalidates `'StaffPerformance'` tag so the board refreshes.

---

## RTK Query Integration

### New tag type

Add `'StaffPerformance'` to `analyticsApi`'s `tagTypes`.

### New queries in `analyticsApi.ts`

```typescript
getStaffPerformanceBoard: builder.query<StaffPerformanceBoardResponse, void>({
  query: () => 'analytics/center/staff-performance',
  providesTags: ['StaffPerformance'],
}),

getStaffMonthlyHistory: builder.query<StaffHistoryResponse, { membershipId: number; months?: number }>({
  query: ({ membershipId, months = 6 }) => ({
    url: `analytics/center/staff/${membershipId}/history`,
    params: { months },
  }),
  providesTags: (_result, _error, { membershipId }) => [
    { type: 'StaffPerformance', id: membershipId },
  ],
}),
```

### Cross-slice invalidation in `bookingsApi.ts`

After `assignTechnician` mutation succeeds, invalidate `'StaffPerformance'`:

```typescript
// In assignTechnician mutation:
invalidatesTags: (_result, _error, { bookingId }) => [
  { type: 'Booking', id: bookingId },
  'StaffPerformance',   // ← add this
],
```

---

## Error Codes

| Scenario | HTTP Status | BusinessErrorCode |
|----------|------------|------------------|
| Technician requests peer history | 403 | (existing 403 handling) |
| membershipId not in requester's center | 403 | (existing 403 handling) |
| Center has no active staff | 200 | empty `staff: []` |
