# API Contract: Dashboard Snapshot Endpoint

**Feature**: Dashboard Pipeline & KPI Cards  
**Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)  
**Date**: 2026-05-21

---

## Endpoint

```
GET /api/v1/analytics/center/dashboard-snapshot
Authorization: Bearer <jwt>
```

**Authentication**: Required. Token scoped to the authenticated center owner or staff member.  
**Ownership scoping**: Returns data for the center associated with the authenticated user's active session (`activeCenterId`). No `centerId` query param — ownership is derived from JWT, matching the pattern of all `/centers/my/*` and `/analytics/center/*` endpoints.

---

## Response — Success `200 OK`

```json
{
  "pipeline": [
    { "stage": "RECEIVED",          "count": 3 },
    { "stage": "DIAGNOSING",        "count": 1 },
    { "stage": "QUOTE_READY",       "count": 0 },
    { "stage": "IN_PROGRESS",       "count": 7 },
    { "stage": "QUALITY_CHECK",     "count": 2 },
    { "stage": "READY_FOR_PICKUP",  "count": 1 }
  ],
  "kpis": {
    "bookingsToday": {
      "value": 12,
      "baseline": 10,
      "hasSufficientHistory": true
    },
    "avgCompletionTimeHours": {
      "value": 3.2,
      "baseline": 3.5,
      "hasSufficientHistory": true
    },
    "onTimeCompletionRate": {
      "value": 78,
      "baseline": 82,
      "target": 90,
      "hasSufficientHistory": true
    },
    "revenueToday": {
      "value": 45.500,
      "baseline": 40.000,
      "hasSufficientHistory": true
    }
  }
}
```

---

## Field Definitions

### `pipeline[]`

| Field | Type | Description |
|-------|------|-------------|
| `stage` | `PipelineWorkStage` | Enum value — always one of the 6 active stages |
| `count` | `number (int ≥ 0)` | Bookings currently at this stage; 0 is valid |

**Ordering**: Array is always returned in stage-flow order (RECEIVED first, READY_FOR_PICKUP last). Frontend renders in array order (reversed in RTL via `flexDirection: 'row-reverse'`).

**Excluded stages**: PICKED_UP and CANCELLED are never included in the array. The array always has exactly 6 elements.

**Work stage source**: `bookingWorkStage` field on the `booking` table. If a booking has no work stage assigned (Phase 4.0 not yet active), the backend maps `BookingStatus` → `PipelineWorkStage` per the mapping in `research.md`.

---

### `kpis.bookingsToday`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number (int ≥ 0)` | Count of bookings for today (calendar day, Kuwait timezone UTC+3) |
| `baseline` | `number (int ≥ 0) \| null` | Count from the same weekday 7 days prior; `null` if no bookings existed that day AND there is no history |
| `hasSufficientHistory` | `boolean` | `false` if the branch has fewer than 7 days of booking history |

**Delta formula (client-side)**: `((value - baseline) / baseline) * 100`; returns `null` if `baseline === 0 || baseline === null || !hasSufficientHistory`.

---

### `kpis.avgCompletionTimeHours`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number (≥ 0, 1 decimal) \| null` | Average hours from booking confirmation to completion for bookings completed today; `null` if no completions today |
| `baseline` | `number (≥ 0, 1 decimal) \| null` | Rolling 30-day average completion time; `null` if fewer than 5 completed bookings in the window |
| `hasSufficientHistory` | `boolean` | `false` if the branch has fewer than 5 completed bookings in the last 30 days |

**Polarity note**: positive delta = taking longer = bad (red on frontend). Conveyed to frontend via `positiveIsGood: false` in the view model.

---

### `kpis.onTimeCompletionRate`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number (0–100, integer) \| null` | Percentage of bookings in last 7 days completed by their estimated time; `null` if no completions in window |
| `baseline` | `number (0–100, integer) \| null` | Same metric for the 7 days prior to the current window; `null` if insufficient data |
| `target` | `number` | Always `90` — target on-time rate threshold |
| `hasSufficientHistory` | `boolean` | `false` if fewer than 3 bookings with estimated-time data in either window |

**On-time definition**: A booking is on-time if `completedAt ≤ (scheduledAt + typicalDurationMinutes)`. Bookings without `typicalDurationMinutes` are excluded from the rate calculation.

---

### `kpis.revenueToday`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number (≥ 0, 3 decimals) \| null` | KWD total from `PAID` bookings completed today; `null` if payment integration is not active |
| `baseline` | `number (≥ 0, 3 decimals) \| null` | Average daily KWD revenue over the last 30 days; `null` if payment integration inactive or fewer than 5 days of data |
| `hasSufficientHistory` | `boolean` | `false` if payment integration is inactive or fewer than 5 days of revenue data |

---

## Error Responses

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | Missing or expired JWT — triggers auto-logout middleware |
| `403 Forbidden` | JWT valid but user has no affiliated center |
| `500 Internal Server Error` | Unexpected backend error — frontend shows last-good data |

The frontend does not surface backend errors as a blank screen; it retains the last successful snapshot in the RTK Query cache.

---

## RTK Query Integration

```typescript
// store/api/analyticsApi.ts — new endpoint added to existing analyticsApi

getDashboardSnapshot: builder.query<DashboardSnapshot, void>({
  query: () => 'analytics/center/dashboard-snapshot',
  providesTags: ['Analytics'],
}),
```

**Polling**: Configured in `hooks/useDashboardSnapshot.ts` using `pollingInterval: isFocused ? 60_000 : 0`.

**Cache behavior**: Shared cache key (no arg variation) — both owner and staff dashboards that call `useDashboardSnapshot()` share the same cached entry and the same polling timer.

---

## Backend Implementation Notes (for backend developer reference)

These are guidance notes, not frontend concerns. The frontend treats the contract above as authoritative.

- Aggregate `bookingsToday.value` using `WHERE bookingDate = CURRENT_DATE AT TIME ZONE 'Asia/Kuwait'`
- `avgCompletionTimeHours` — compute `AVG(EXTRACT(EPOCH FROM (completedAt - confirmedAt)) / 3600)` for bookings completed today
- `onTimeCompletionRate` — evaluate `completedAt <= (bookingDate + bookingTime + typicalDurationMinutes * INTERVAL '1 minute')`; exclude rows where `typicalDurationMinutes IS NULL`
- `revenueToday` — sum `totalAmount WHERE paymentStatus = 'PAID' AND DATE(completedAt) = CURRENT_DATE`
- Return `hasSufficientHistory: false` whenever the computed window has fewer rows than the minimum sample thresholds defined per metric above
- Return `null` for both `value` and `baseline` when `hasSufficientHistory: false` for value or when payment integration is not active
