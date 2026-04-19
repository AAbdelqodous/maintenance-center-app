# Data Model: Phase 5.0 — Analytics Dashboard

**Branch**: `004-analytics-dashboard` | **Date**: 2026-04-16

---

## Period Selector

```typescript
// types/analytics.ts

export type AnalyticsPeriod = 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_3_MONTHS';

export interface DateRange {
  startDate: string;  // ISO date: 'YYYY-MM-DD'
  endDate: string;    // ISO date: 'YYYY-MM-DD'
}

/** Maps a named period to an explicit date range (computed client-side) */
export function periodToDateRange(period: AnalyticsPeriod): DateRange {
  // Implementation note: compute using Date math in Asia/Kuwait (UTC+3) context
  // THIS_WEEK  → Monday of current week → today
  // THIS_MONTH → 1st of current month   → today
  // LAST_3_MONTHS → today - 90 days     → today
}
```

---

## PerformanceSummary

Returned by `GET /analytics/center/summary`.

```typescript
export interface PerformanceSummary {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;          // 0–100, percentage (e.g., 12.5)
  averageRating: number | null;      // null if no reviews in period
  totalRevenue: number;              // KD, 3 decimal places (e.g., 1250.750)
  revenueAvailable: boolean;         // false when no completed+paid bookings
}
```

**Validation rules**:
- `cancellationRate` = `(cancelledBookings / totalBookings) * 100`; 0 if `totalBookings === 0`
- `averageRating` is `null` (not 0) when there are no reviews — prevents misleading zero display
- `revenueAvailable: false` triggers the "N/A" revenue display instead of `KD 0.000`

---

## BookingTrend

Returned by `GET /analytics/center/booking-trends`.

```typescript
export interface BookingTrend {
  periodLabel: string;       // 'Mon', 'Tue' (week) or 'Jan W1', 'Jan W2' (month/3mo)
  periodStart: string;       // ISO date of the period start
  completed: number;
  cancelled: number;
  total: number;             // completed + cancelled + other statuses
}

export interface BookingTrendsResponse {
  granularity: 'DAILY' | 'WEEKLY';
  data: BookingTrend[];
}
```

**Validation rules**:
- `data` always includes every day/week in the range even if all counts are zero (no gaps)
- `granularity` is `DAILY` for THIS_WEEK, `WEEKLY` for THIS_MONTH and LAST_3_MONTHS

---

## RevenueByCategoryEntry

Returned by `GET /analytics/center/revenue-by-category`.

```typescript
export interface RevenueByCategoryEntry {
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  completedBookings: number;
  revenue: number;           // KD, 3 decimal places
}

export type RevenueByCategoryResponse = RevenueByCategoryEntry[];
// Ordered by revenue DESC (server-side) — client does not re-sort
```

**Validation rules**:
- Only categories with `completedBookings > 0` are returned
- Empty array is a valid response (new center, no completed bookings)

---

## SatisfactionSummary

Returned by `GET /analytics/center/satisfaction`.

```typescript
export interface RatingBucket {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface SatisfactionSummary {
  averageRating: number | null;         // null if no reviews in period
  previousPeriodAverage: number | null; // null if no reviews in previous period
  totalReviews: number;
  distribution: RatingBucket[];         // always 5 entries, stars 1–5, zeros included
}
```

**Derived on client**:
```typescript
const ratingDelta =
  summary.averageRating !== null && summary.previousPeriodAverage !== null
    ? summary.averageRating - summary.previousPeriodAverage
    : null;

// ratingDelta > 0  → positive trend indicator ("↑ 0.3")
// ratingDelta < 0  → negative trend indicator ("↓ 0.5")
// ratingDelta === 0 or null → no indicator shown
```

**Validation rules**:
- `distribution` always has exactly 5 entries (one per star level), even if count is 0
- `averageRating` is `null` (not 0) when `totalReviews === 0`

---

## PeakHourEntry

Returned by `GET /analytics/center/peak-hours`.

```typescript
export interface PeakHourEntry {
  hour: number;          // 0–23 (24-hour clock)
  bookingCount: number;
}

export type PeakHoursResponse = PeakHourEntry[];
// Always 24 entries (hours 0–23), even if bookingCount is 0
```

**Validation rules**:
- Response always contains exactly 24 entries — one per hour of the day
- `hour` values are in Asia/Kuwait (UTC+3) local time

---

## RTK Query Endpoint Arguments

```typescript
export interface AnalyticsQueryArgs {
  startDate: string;  // 'YYYY-MM-DD'
  endDate: string;    // 'YYYY-MM-DD'
}

export interface BookingTrendsQueryArgs extends AnalyticsQueryArgs {
  granularity: 'DAILY' | 'WEEKLY';
}
```

---

## State: Period Selector (local UI state, not Redux)

```typescript
// Inside the analytics screen component
const [period, setPeriod] = useState<AnalyticsPeriod>('THIS_MONTH');
const { startDate, endDate } = periodToDateRange(period);

// All hooks receive { startDate, endDate } — period change triggers automatic re-fetch
```

---

## i18n Keys (analytics namespace)

```json
{
  "analytics": {
    "title": "Analytics",
    "period": {
      "thisWeek": "This Week",
      "thisMonth": "This Month",
      "last3Months": "Last 3 Months"
    },
    "summary": {
      "title": "Performance Summary",
      "totalBookings": "Total Bookings",
      "completed": "Completed",
      "cancellationRate": "Cancellation Rate",
      "averageRating": "Avg. Rating",
      "revenue": "Revenue",
      "revenueUnavailable": "N/A"
    },
    "trends": {
      "title": "Booking Trends",
      "completed": "Completed",
      "cancelled": "Cancelled"
    },
    "revenue": {
      "title": "Revenue by Category",
      "bookings": "bookings",
      "empty": "No completed bookings in this period"
    },
    "satisfaction": {
      "title": "Customer Satisfaction",
      "reviews": "reviews",
      "noReviews": "No reviews in this period",
      "trendUp": "vs last period",
      "trendDown": "vs last period"
    },
    "peakHours": {
      "title": "Peak Hours",
      "bookings": "bookings"
    },
    "loading": "Loading...",
    "errorRetry": "Could not load. Tap to retry."
  }
}
```

(Arabic keys follow the same structure under `ar.json`.)
