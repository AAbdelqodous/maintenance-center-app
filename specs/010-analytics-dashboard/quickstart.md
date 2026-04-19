# Quickstart: Phase 5.0 — Analytics Dashboard

**Branch**: `004-analytics-dashboard` | **Date**: 2026-04-16

This guide gets a developer from zero to a running Analytics screen with real data in minimal steps.

---

## Prerequisites

- Backend is running (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`)
- The five analytics endpoints are implemented (see `contracts/analytics-api.md`)
- You are on branch `004-analytics-dashboard`

---

## Step 1: Install the Charting Library

```bash
npx expo install react-native-gifted-charts react-native-linear-gradient
```

No native rebuild required — both packages work with Expo managed workflow.

---

## Step 2: Add the TypeScript Types

Create `types/analytics.ts` using the definitions in `data-model.md`.

Key types to implement first:
- `AnalyticsPeriod` union type
- `DateRange` interface
- `periodToDateRange(period: AnalyticsPeriod): DateRange` helper function

```typescript
// lib/utils/analytics.ts  (or add to types/analytics.ts)
export function periodToDateRange(period: AnalyticsPeriod): DateRange {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const endDate = fmt(today);

  if (period === 'THIS_WEEK') {
    const day = today.getDay(); // 0=Sun
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return { startDate: fmt(monday), endDate };
  }
  if (period === 'THIS_MONTH') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: fmt(first), endDate };
  }
  // LAST_3_MONTHS
  const start = new Date(today);
  start.setDate(today.getDate() - 90);
  return { startDate: fmt(start), endDate };
}
```

---

## Step 3: Create the RTK Query Slice

Create `store/api/analyticsApi.ts` injecting into the existing `baseApi`:

```typescript
import { baseApi } from './baseApi';  // adjust import path
import type {
  AnalyticsQueryArgs, BookingTrendsQueryArgs,
  PerformanceSummary, BookingTrendsResponse,
  RevenueByCategoryEntry, SatisfactionSummary, PeakHourEntry,
} from '../../types/analytics';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsSummary: builder.query<PerformanceSummary, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) =>
        `analytics/center/summary?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ['Analytics'],
    }),
    getBookingTrends: builder.query<BookingTrendsResponse, BookingTrendsQueryArgs>({
      query: ({ startDate, endDate, granularity }) =>
        `analytics/center/booking-trends?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`,
      providesTags: ['Analytics'],
    }),
    getRevenueByCategory: builder.query<RevenueByCategoryEntry[], AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) =>
        `analytics/center/revenue-by-category?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ['Analytics'],
    }),
    getSatisfactionSummary: builder.query<SatisfactionSummary, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) =>
        `analytics/center/satisfaction?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ['Analytics'],
    }),
    getPeakHours: builder.query<PeakHourEntry[], AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) =>
        `analytics/center/peak-hours?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetAnalyticsSummaryQuery,
  useGetBookingTrendsQuery,
  useGetRevenueByCategoryQuery,
  useGetSatisfactionSummaryQuery,
  useGetPeakHoursQuery,
} = analyticsApi;
```

Also add `'Analytics'` to the `tagTypes` array in `store/api/baseApi.ts` (it is already listed in CLAUDE.md — just confirm it's present).

---

## Step 4: Create the Analytics Screen

The screen lives at `app/(app)/(tabs)/analytics/index.tsx`.

Key structure:
```tsx
export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('THIS_MONTH');
  const { startDate, endDate } = periodToDateRange(period);
  const granularity = period === 'THIS_WEEK' ? 'DAILY' : 'WEEKLY';

  return (
    <ScrollView>
      <PeriodSelector value={period} onChange={setPeriod} />
      <SummarySection startDate={startDate} endDate={endDate} />
      <BookingTrendsSection startDate={startDate} endDate={endDate} granularity={granularity} />
      <RevenueByCategorySection startDate={startDate} endDate={endDate} />
      <SatisfactionSection startDate={startDate} endDate={endDate} />
      <PeakHoursSection startDate={startDate} endDate={endDate} />
    </ScrollView>
  );
}
```

Each section component calls its own `useGet*Query` hook independently.

---

## Step 5: Add the Analytics Tab

In `app/(app)/(tabs)/_layout.tsx`, add a new tab entry for Analytics. Use a chart icon from the existing icon set.

---

## Step 6: Add i18n Keys

Add the `analytics` namespace keys from `data-model.md` to:
- `lib/i18n/locales/en.json`
- `lib/i18n/locales/ar.json`

---

## Step 7: Wire Up the Error Boundary

Wrap `app/(app)/(tabs)/analytics/index.tsx` in the project's error boundary component (introduced in Phase 2.5) at the tab root level.

---

## Smoke Test Checklist

Once the backend endpoints are ready and the screen is built:

- [ ] Open Analytics screen → summary card shows today's data with no errors
- [ ] Switch to "This Week" → all sections update without manual refresh
- [ ] Switch to "Last 3 Months" → booking trends chart shows weekly bars
- [ ] Tap a bar in the trends chart → tooltip shows completed/cancelled count
- [ ] Revenue section shows categories ranked highest-to-lowest
- [ ] Satisfaction section shows star distribution; trend indicator appears if previous period data exists
- [ ] Peak hours shows 24 bars; tapping one shows exact count
- [ ] Switch app language to Arabic → all text is in Arabic with RTL layout
- [ ] Disable network → each section shows its own inline error banner independently
- [ ] Re-enable network → pull-to-refresh restores all sections
