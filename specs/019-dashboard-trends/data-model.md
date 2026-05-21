# Data Model: Dashboard Historical Trends Section

## New Types (`types/trends.ts`)

### TrendPeriod

The three observation windows offered by the period selector.

```typescript
export type TrendPeriod = '8_WEEKS' | '12_WEEKS' | '6_MONTHS';

export const TREND_PERIOD_WEEKS: Record<TrendPeriod, number> = {
  '8_WEEKS':  8,
  '12_WEEKS': 12,
  '6_MONTHS': 26,
};
```

### Weekly Time-Series Types

```typescript
export interface WeeklyBookingStat {
  isoWeek: string;       // e.g. "2026-W18" — ISO 8601 week label from backend
  periodLabel: string;   // human label e.g. "Apr 28" (start of the week)
  total: number;         // total bookings (all statuses)
}

export interface WeeklyRatingStat {
  isoWeek: string;
  periodLabel: string;
  average: number | null; // null if no rated bookings that week
  reviewCount: number;
}

export interface WeeklyRevenueStat {
  isoWeek: string;
  periodLabel: string;
  totalKwd: number;       // KWD with 3 decimal places
}
```

### Category Mix Type

```typescript
export interface CategoryMixEntry {
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  bookingCount: number;
  sharePercent: number;   // 0–100, computed server-side; sums to 100 across all entries
}
```

### Peak Hours Type

```typescript
export interface PeakHourByDayEntry {
  dayOfWeek: number;    // 1=Monday … 7=Sunday (ISO 8601 day of week)
  hour: number;         // 0–23
  bookingCount: number;
}
```

### Consolidated Trends Response

```typescript
export interface TrendsResponse {
  bookingsByWeek:  WeeklyBookingStat[];
  ratingsByWeek:   WeeklyRatingStat[];
  revenueByWeek:   WeeklyRevenueStat[];
  categoryMix:     CategoryMixEntry[];
  peakHours:       PeakHourByDayEntry[];
}
```

### RTK Query Argument

```typescript
export interface TrendsQueryArgs {
  startDate: string;  // ISO date "YYYY-MM-DD"
  endDate:   string;  // ISO date "YYYY-MM-DD"
}
```

---

## Computed Types (client-side only, not persisted)

### Headline Insights

Produced by `hooks/useTrendInsights.ts` from a `TrendsResponse`.

```typescript
export interface TrendInsights {
  bookings: string;     // e.g. "Bookings up 22% vs 8 weeks ago"
  rating:   string;     // e.g. "Rating stable around 4.6"
  revenue:  string;     // e.g. "Revenue up 14% vs 8 weeks ago"
  category: string;     // e.g. "Car services represent 62% of bookings"
  peakHour: string;     // e.g. "Tuesdays 2–3pm are your busiest slot"
}
```

### Heatmap Cell (derived from PeakHourByDayEntry)

```typescript
export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  bookingCount: number;
  intensity: number;  // 0.0–1.0, normalized relative to the max cell in the dataset
}
```

---

## Period → Date Range Calculation

Utility function to be added alongside `TrendPeriod`:

```typescript
// Returns the ISO Monday of the week containing `date`
function startOfIsoWeek(date: Date): Date

// Main conversion function
export function trendPeriodToDateRange(period: TrendPeriod): { startDate: string; endDate: string }
// today = current date (UTC)
// end = today formatted as "YYYY-MM-DD"
// start = startOfIsoWeek(today - (TREND_PERIOD_WEEKS[period] * 7) days)
//          formatted as "YYYY-MM-DD"
```

---

## Modified Types

### `analyticsApi.ts` — New Endpoint

Add to the existing `analyticsApi` (keeps the same `reducerPath: 'analyticsApi'`):

```typescript
getTrends: builder.query<TrendsResponse, TrendsQueryArgs>({
  query: ({ startDate, endDate }) => ({
    url: 'analytics/center/trends',
    params: { startDate, endDate },
  }),
  keepUnusedDataFor: 3600,  // 1-hour cache — aligns with spec FR-015
  providesTags: ['Analytics'],
}),
```

Export: `useGetTrendsQuery`

---

## Validation Rules

| Field | Rule |
|-------|------|
| `sharePercent` values in `categoryMix` | Must sum to 100 across all entries (backend responsibility; frontend handles floating-point rounding gracefully) |
| `average` in `WeeklyRatingStat` | Must be `null` (not 0) when no ratings exist for the week — prevents false "zero rating" rendering |
| `intensity` in `HeatmapCell` | Client-side: max cell in dataset gets 1.0; all other cells are `count / maxCount`; if all cells are 0, all get 0.0 |
| `dayOfWeek` | 1–7 only (ISO 8601); client renders Mon–Sun regardless of locale |

---

## State Transitions

### Period Selector

```
selectedPeriod: TrendPeriod (local state, default '8_WEEKS')
  ↓ change
trendPeriodToDateRange(selectedPeriod) → { startDate, endDate }
  ↓ passed as args
useGetTrendsQuery({ startDate, endDate }) → triggers fresh fetch
  ↓ data returned
All five chart components re-render with new data
useTrendInsights(data) → new headline strings
```

### Collapsed/Expanded Toggle

```
trendsExpanded: boolean (local state, default false)
  ↓ chevron press
setTrendsExpanded(!trendsExpanded)
  → Animated expand/collapse of the charts container
  → Chevron rotates 180° to indicate state
```
