# Research: Phase 5.0 — Analytics Dashboard

**Branch**: `004-analytics-dashboard` | **Date**: 2026-04-16

---

## Decision 1: Charting Library

**Decision**: `react-native-gifted-charts`

**Rationale**:
- Pure JavaScript — no native module compilation required, works out-of-the-box with Expo managed workflow and SDK 54.
- Supports all needed chart types: bar charts (booking trends, peak hours), line charts (trends over time), and horizontal bar charts (revenue by category).
- Built-in support for stacked bars (completed vs. cancelled booking series) and interactive tooltips on tap.
- Actively maintained, good TypeScript types, reasonable bundle size.
- No additional Expo plugin or `expo prebuild` step needed — critical for a managed workflow project.

**Alternatives Considered**:
- `victory-native` v36+ (Skia-based): Better performance for large datasets, but requires `@shopify/react-native-skia` which needs custom native builds — incompatible with Expo managed workflow without an expo-modules plugin. Ruled out.
- `victory-native` v35.x (SVG-based): Works with Expo but is in maintenance mode, SVG performance can lag on low-end Android devices. Ruled out.
- `recharts`: React DOM only — does not run on React Native. Ruled out.

**Install command**: `npx expo install react-native-gifted-charts react-native-linear-gradient`
(Linear gradient is an optional peer dependency for gradient-filled bars; safe to include.)

---

## Decision 2: Period Selector Date Calculation

**Decision**: Compute ISO date strings (`YYYY-MM-DD`) on the client; send as `startDate` and `endDate` query parameters to the analytics API.

**Rationale**:
- Deterministic: the frontend knows exactly what date range the user selected, and the backend aggregates only within those bounds.
- Simple to implement: use `date-fns` (already available transitively via RTK Query) or plain `Date` math.
- Named period enums (e.g., `THIS_WEEK`) would require the backend to know the server's timezone and calendar — error-prone for Kuwait (UTC+3). Sending explicit date strings is more reliable.

**Period → Date range mapping**:
| Period label | `startDate` | `endDate` |
|---|---|---|
| This Week | Monday of current week | today |
| This Month | 1st of current month | today |
| Last 3 Months | today − 90 days | today |

**Timezone**: All dates are in Asia/Kuwait (UTC+3). The frontend sends date-only strings — the backend interprets them in the center's local timezone (Asia/Kuwait per constitution).

---

## Decision 3: Independent Section Loading Strategy

**Decision**: Separate RTK Query endpoints per analytics section, all called in parallel from the same screen, each rendering independently.

**Rationale**:
- FR-010 requires that a slow or failed section must not block others — this is only achievable if each section has its own loading/error state.
- RTK Query's `useQuery` hook gives each section its own `isLoading`, `isError`, and `data` state automatically.
- A single combined endpoint would serialize loading and violate FR-010.

**Pattern**:
```
useGetAnalyticsSummaryQuery({ startDate, endDate })   → PerformanceSummary
useGetBookingTrendsQuery({ startDate, endDate })       → BookingTrend[]
useGetRevenueByCategoryQuery({ startDate, endDate })   → RevenueByCategoryEntry[]
useGetRatingDistributionQuery({ startDate, endDate })  → SatisfactionSummary
useGetPeakHoursQuery({ startDate, endDate })           → PeakHourEntry[]
```
All hooks run simultaneously. Each section shows its own skeleton loader until its data resolves.

---

## Decision 4: Period Change Triggers Re-fetch

**Decision**: When the owner changes the selected period, update a React state variable (`selectedPeriod`) which recomputes `{ startDate, endDate }`. All five RTK Query hooks receive the new params and automatically re-fetch via cache-key invalidation.

**Rationale**:
- RTK Query re-fetches automatically when query arguments change — no manual `refetch()` calls needed.
- Centralizing the period state in the screen component (or a tiny local state near the selector) keeps the logic simple.
- No Redux slice needed for the period selector — it is ephemeral UI state, not persistent app state.

---

## Decision 5: Skeleton Loading Pattern

**Decision**: Each analytics section shows a section-specific skeleton (`<SkeletonCard />`) while `isLoading` is true, and an inline error banner when `isError` is true.

**Rationale**:
- Matches the existing app pattern (bookings list, chat list all use skeleton loaders).
- Avoids full-screen spinner which would violate independent-loading requirement.
- `Alert.alert` is a no-op on web — inline banners are required per existing project feedback.

---

## Decision 6: Revenue Figure Source

**Decision**: Revenue is the sum of `bookingPrice` for all bookings with status `COMPLETED` in the period.

**Rationale**:
- `COMPLETED` status is the only status that represents a confirmed, delivered service.
- Bookings in `PENDING`, `ACCEPTED`, or `IN_PROGRESS` states have not yet been fulfilled — including them would overstate revenue.
- The backend analytics query filters on `bookingStatus = COMPLETED` before aggregating.
- For bookings where payment status is `UNPAID` or `PENDING_PAYMENT`, revenue is still counted (the service was delivered) but an assumption note is included for the backend team.

---

## Decision 7: Backend Endpoint Structure

**Decision**: Four dedicated analytics endpoints under `/analytics/center`:

```
GET /analytics/center/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /analytics/center/booking-trends?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&granularity=DAILY|WEEKLY
GET /analytics/center/revenue-by-category?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /analytics/center/satisfaction?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /analytics/center/peak-hours?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Rationale**: Separate endpoints allow the mobile client to load sections in parallel and allow the backend to optimize each query independently (different join patterns, different indexes). A single combined endpoint would be simpler to build but creates a performance bottleneck.

---

## Decision 8: Trend Comparison (Satisfaction Section)

**Decision**: The backend computes the previous-period average and returns it alongside the current-period average in the satisfaction response. The client computes the delta and determines the trend direction.

**Rationale**:
- The backend has the booking/review data; computing both averages server-side is more efficient than a second client API call.
- The client only needs: `currentAverage`, `previousAverage`, `totalReviews`, `distribution[1..5]`.
- Delta = `currentAverage - previousAverage`. Positive → up arrow. Negative → down arrow. Zero or null → no indicator.

---

## Resolved Clarifications

All items from the spec assumptions are now resolved:
- ✅ Charting library chosen: `react-native-gifted-charts`
- ✅ Period filtering: explicit `startDate`/`endDate` ISO strings
- ✅ Backend aggregation: dedicated analytics controller, 5 endpoints
- ✅ Revenue source: `COMPLETED` bookings only
- ✅ Independent loading: separate RTK Query hooks per section
- ✅ Trend comparison: backend returns both current and previous period average
