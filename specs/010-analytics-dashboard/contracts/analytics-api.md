# API Contract: Analytics Endpoints

**Feature**: Phase 5.0 — Analytics Dashboard
**Base path**: `/api/v1/analytics/center`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scoping**: All endpoints return data for the authenticated owner's **active center only** (`MaintenanceCenter` resolved via `findFirstByOwnerId`). No `centerId` path parameter is needed — it is derived from the JWT.

---

## Shared Query Parameters

All five endpoints accept:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | `string` | Yes | ISO date `YYYY-MM-DD` (inclusive, Asia/Kuwait) |
| `endDate` | `string` | Yes | ISO date `YYYY-MM-DD` (inclusive, Asia/Kuwait) |

Validation: `startDate ≤ endDate`. If violated, return `400 Bad Request`.

---

## GET /analytics/center/summary

Returns aggregated performance metrics for the period.

### Response `200 OK`

```json
{
  "totalBookings": 48,
  "completedBookings": 40,
  "cancelledBookings": 5,
  "cancellationRate": 10.42,
  "averageRating": 4.3,
  "totalRevenue": 2150.500,
  "revenueAvailable": true
}
```

| Field | Type | Notes |
|-------|------|-------|
| `totalBookings` | `int` | All bookings with `bookingDate` in range |
| `completedBookings` | `int` | Status = `COMPLETED` |
| `cancelledBookings` | `int` | Status = `CANCELLED` |
| `cancellationRate` | `double` | `(cancelledBookings / totalBookings) * 100`; 0.0 if `totalBookings = 0` |
| `averageRating` | `double \| null` | Average of all reviews in period; `null` if no reviews |
| `totalRevenue` | `double` | Sum of `bookingPrice` for `COMPLETED` bookings; 3 decimal places |
| `revenueAvailable` | `boolean` | `false` when no completed bookings exist for the period |

---

## GET /analytics/center/booking-trends

Returns time-series booking counts for the period.

### Additional Query Parameter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `granularity` | `DAILY \| WEEKLY` | Yes | `DAILY` for This Week; `WEEKLY` for This Month / Last 3 Months |

### Response `200 OK`

```json
{
  "granularity": "DAILY",
  "data": [
    { "periodLabel": "Mon", "periodStart": "2026-04-14", "completed": 5, "cancelled": 1, "total": 6 },
    { "periodLabel": "Tue", "periodStart": "2026-04-15", "completed": 3, "cancelled": 0, "total": 3 },
    { "periodLabel": "Wed", "periodStart": "2026-04-16", "completed": 0, "cancelled": 0, "total": 0 }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `granularity` | `DAILY \| WEEKLY` | Echoes the request parameter |
| `data[].periodLabel` | `string` | Day abbreviation (Mon–Sun) for DAILY; ISO week string for WEEKLY |
| `data[].periodStart` | `string` | ISO date of the period start |
| `data[].completed` | `int` | Bookings with status `COMPLETED` |
| `data[].cancelled` | `int` | Bookings with status `CANCELLED` |
| `data[].total` | `int` | All bookings regardless of status |

**Guarantee**: Every day (DAILY) or every week (WEEKLY) in the `[startDate, endDate]` range is represented — no gaps. Zero-count periods are included.

---

## GET /analytics/center/revenue-by-category

Returns revenue breakdown grouped by service category.

### Response `200 OK`

```json
[
  {
    "categoryId": 1,
    "categoryNameAr": "صيانة السيارات",
    "categoryNameEn": "Car Maintenance",
    "completedBookings": 25,
    "revenue": 1250.750
  },
  {
    "categoryId": 3,
    "categoryNameAr": "الأجهزة المنزلية",
    "categoryNameEn": "Home Appliances",
    "completedBookings": 10,
    "revenue": 450.000
  }
]
```

| Field | Type | Notes |
|-------|------|-------|
| `categoryId` | `int` | Service category ID |
| `categoryNameAr` | `string` | Arabic category name |
| `categoryNameEn` | `string` | English category name |
| `completedBookings` | `int` | Count of `COMPLETED` bookings in this category for the period |
| `revenue` | `double` | Sum of `bookingPrice` for completed bookings; 3 decimal places |

**Ordering**: Sorted by `revenue DESC` server-side. Client does not re-sort.
**Empty response**: Returns `[]` (not null) when no completed bookings exist in any category.

---

## GET /analytics/center/satisfaction

Returns customer satisfaction metrics including trend comparison.

### Response `200 OK`

```json
{
  "averageRating": 4.3,
  "previousPeriodAverage": 4.0,
  "totalReviews": 18,
  "distribution": [
    { "stars": 1, "count": 0 },
    { "stars": 2, "count": 1 },
    { "stars": 3, "count": 2 },
    { "stars": 4, "count": 6 },
    { "stars": 5, "count": 9 }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `averageRating` | `double \| null` | Average of all ratings in period; `null` if `totalReviews = 0` |
| `previousPeriodAverage` | `double \| null` | Average for equivalent prior period; `null` if no reviews then |
| `totalReviews` | `int` | Count of reviews in the period |
| `distribution` | `array` | Always exactly 5 entries (stars 1–5), including zeros |

**Previous period mapping**:
- THIS_WEEK → previous calendar week (same 7-day span)
- THIS_MONTH → previous calendar month
- LAST_3_MONTHS → the 3-month period immediately before startDate

---

## GET /analytics/center/peak-hours

Returns booking count distribution by hour of day.

### Response `200 OK`

```json
[
  { "hour": 0, "bookingCount": 0 },
  { "hour": 8, "bookingCount": 3 },
  { "hour": 9, "bookingCount": 12 },
  { "hour": 10, "bookingCount": 18 }
]
```

*(All 24 entries are shown — abbreviated above for readability.)*

| Field | Type | Notes |
|-------|------|-------|
| `hour` | `int` | 0–23, local time (Asia/Kuwait, UTC+3) |
| `bookingCount` | `int` | Total bookings (any status) created in this hour during the period |

**Guarantee**: Always returns exactly 24 entries (hours 0–23). Zero-count hours are included.

---

## Error Responses

All endpoints share the same error contract as the existing backend:

```json
{
  "businessErrorCode": 400,
  "businessErrorDescription": "Invalid date range",
  "error": "startDate must not be after endDate",
  "validationErrors": []
}
```

| HTTP Status | Condition |
|-------------|-----------|
| `400` | Invalid date format or `startDate > endDate` |
| `401` | Missing or expired JWT |
| `403` | JWT does not belong to a OWNER or the center is inactive |
| `500` | Unexpected server error |
