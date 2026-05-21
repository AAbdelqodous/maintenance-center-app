# API Contract: Dashboard Trends Endpoint

## Overview

This contract defines the single new backend endpoint required by the Dashboard Historical Trends feature. All other analytics endpoints already exist and are consumed without modification.

---

## `GET /api/v1/analytics/center/trends`

### Authentication
`Authorization: Bearer <jwt>` — required. Returns 401 if missing or expired.

### Query Parameters

| Parameter   | Type   | Required | Description                            |
|-------------|--------|----------|----------------------------------------|
| `startDate` | string | Yes      | ISO date `YYYY-MM-DD` — inclusive      |
| `endDate`   | string | Yes      | ISO date `YYYY-MM-DD` — inclusive      |

### Request Example

```
GET /api/v1/analytics/center/trends?startDate=2026-03-23&endDate=2026-05-18
Authorization: Bearer eyJ...
```

### Response — 200 OK

```json
{
  "bookingsByWeek": [
    {
      "isoWeek": "2026-W13",
      "periodLabel": "Mar 23",
      "total": 14
    },
    {
      "isoWeek": "2026-W14",
      "periodLabel": "Mar 30",
      "total": 18
    }
  ],
  "ratingsByWeek": [
    {
      "isoWeek": "2026-W13",
      "periodLabel": "Mar 23",
      "average": 4.5,
      "reviewCount": 9
    },
    {
      "isoWeek": "2026-W14",
      "periodLabel": "Mar 30",
      "average": null,
      "reviewCount": 0
    }
  ],
  "revenueByWeek": [
    {
      "isoWeek": "2026-W13",
      "periodLabel": "Mar 23",
      "totalKwd": 425.500
    },
    {
      "isoWeek": "2026-W14",
      "periodLabel": "Mar 30",
      "totalKwd": 612.750
    }
  ],
  "categoryMix": [
    {
      "categoryId": 1,
      "categoryNameAr": "سيارات",
      "categoryNameEn": "Cars",
      "bookingCount": 48,
      "sharePercent": 62.3
    },
    {
      "categoryId": 2,
      "categoryNameAr": "إلكترونيات",
      "categoryNameEn": "Electronics",
      "bookingCount": 29,
      "sharePercent": 37.7
    }
  ],
  "peakHours": [
    { "dayOfWeek": 2, "hour": 14, "bookingCount": 8 },
    { "dayOfWeek": 2, "hour": 15, "bookingCount": 6 },
    { "dayOfWeek": 1, "hour": 10, "bookingCount": 5 }
  ]
}
```

### Response — Empty Branch (zero history)

All arrays return empty (`[]`). The frontend handles this with `ChartEmptyState` components.

```json
{
  "bookingsByWeek": [],
  "ratingsByWeek": [],
  "revenueByWeek": [],
  "categoryMix": [],
  "peakHours": []
}
```

### Response — 401 Unauthorized

```json
{
  "businessErrorCode": 302,
  "businessErrorDescription": "Incorrect current password",
  "error": "Unauthorized"
}
```

### Response — 400 Bad Request

Returned when `startDate` or `endDate` is missing or not a valid ISO date.

```json
{
  "validationErrors": ["startDate: must not be null"]
}
```

---

## Field Semantics

### `bookingsByWeek`

- One entry per ISO week (Monday–Sunday) that falls within the query range.
- `total` counts all bookings regardless of status (pending, confirmed, completed, cancelled).
- Weeks with zero bookings are included with `total: 0` (not omitted).
- `isoWeek` format: `YYYY-Www` (e.g., `2026-W18`).
- `periodLabel` is the date string of the Monday of that week, formatted as `"MMM d"` in the server's default locale (the frontend re-formats using the device locale if needed).

### `ratingsByWeek`

- `average` is `null` (not `0`) when no reviews were submitted for that week.
- `reviewCount` is the count of reviews with a numeric star rating submitted in that week.
- Weeks with `reviewCount: 0` are still included with `average: null`.

### `revenueByWeek`

- `totalKwd` is the sum of revenue from **completed** bookings in that week only (not pending/cancelled).
- Returned with 3 decimal places (Kuwaiti Dinar precision).
- Weeks with no completed revenue return `totalKwd: 0.000`.

### `categoryMix`

- Covers the **entire** query date range (not broken down by week).
- Includes every category that had at least one booking in the date range.
- `sharePercent` values sum to 100.0 across all entries (floating-point rounding may cause `99.9` or `100.1` — the frontend rounds to 1 decimal).
- Categories with zero bookings in the range are **omitted** (the spec requires showing categories with true share — if share is 0, they had no bookings in the period and are correctly excluded).

### `peakHours`

- `dayOfWeek` follows ISO 8601: 1 = Monday, 7 = Sunday.
- `hour` is 0–23 (24-hour clock).
- Only entries with `bookingCount > 0` need to be included (the frontend fills in zero for missing cells).
- Based on the booking's **scheduled time** (not completion time).
- Aggregated across the full query date range.

---

## Caching Guidance

The frontend sets `keepUnusedDataFor: 3600` on this query. The backend MAY add:

```
Cache-Control: max-age=3600, private
```

but this is optional — the 1-hour staleness is enforced client-side regardless.

---

## Scope

This contract covers **only** the new `/analytics/center/trends` endpoint. The following existing endpoints are consumed unchanged by this feature:

| Endpoint | How used |
|----------|----------|
| `GET /analytics/center/dashboard-snapshot` | Existing KPI section (unchanged) |
| `GET /analytics/center/staff-performance` | Existing staff board (unchanged) |

No modifications to existing endpoints are required.
