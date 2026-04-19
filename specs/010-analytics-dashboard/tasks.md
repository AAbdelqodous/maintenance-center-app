---
description: "Task list for Phase 5.0 — Analytics Dashboard"
---

# Tasks: Phase 5.0 — Analytics Dashboard

**Input**: Design documents from `specs/004-analytics-dashboard/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/analytics-api.md ✅ | quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks (no shared file dependencies)
- **[Story]**: Maps to a user story from spec.md (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependency, define all TypeScript types, i18n keys, and the utility helper. These tasks block nothing and can all proceed in parallel after T001.

- [ ] T001 Install react-native-gifted-charts and react-native-linear-gradient via `npx expo install react-native-gifted-charts react-native-linear-gradient` and verify both appear in package.json
- [ ] T002 [P] Create `types/analytics.ts` with: `AnalyticsPeriod` union type, `DateRange` interface, `AnalyticsQueryArgs`, `BookingTrendsQueryArgs`, `PerformanceSummary`, `BookingTrend`, `BookingTrendsResponse`, `RevenueByCategoryEntry`, `RatingBucket`, `SatisfactionSummary`, `PeakHourEntry` — all per `data-model.md`
- [ ] T003 [P] Create `lib/utils/analytics.ts` with `periodToDateRange(period: AnalyticsPeriod): DateRange` helper using the implementation in `quickstart.md` Step 2
- [ ] T004 [P] Add `analytics.*` i18n namespace to `lib/i18n/locales/en.json` using the English keys from `data-model.md` i18n section
- [ ] T005 [P] Add `analytics.*` i18n namespace to `lib/i18n/locales/ar.json` using the Arabic translations corresponding to the English keys in T004

**Checkpoint**: All types, utilities, and strings are in place — no runtime code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the RTK Query API slice, the analytics screen shell, and the tab navigation entry. Every user story phase builds on top of these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Confirm `'Analytics'` exists in the `tagTypes` array in `store/index.ts` (or wherever baseApi is defined); add it if missing — per CLAUDE.md RTK Query Tag Types
- [ ] T007 Create `store/api/analyticsApi.ts` with `baseApi.injectEndpoints()` shell (empty `endpoints` object) and export hooks file — the 5 individual endpoints are added per user story phase
- [ ] T008 Create `app/(app)/(tabs)/analytics/index.tsx` with: `useState<AnalyticsPeriod>('THIS_MONTH')` period state, `periodToDateRange()` call to derive `{ startDate, endDate }`, a `ScrollView` root with `PeriodSelector` slot and 5 labelled `{/* section slot */}` comments (one per user story), RTL-aware NativeWind layout
- [ ] T009 Add the analytics tab entry to `app/(app)/(tabs)/_layout.tsx` pointing to `analytics/index` with an appropriate chart icon and i18n `analytics.title` label

**Checkpoint**: App launches with a new Analytics tab showing an empty scrollable screen — no data yet, no crashes.

---

## Phase 3: User Story 1 — View Business Performance Summary (Priority: P1) 🎯 MVP

**Goal**: Center owner can open the Analytics screen, see a summary card for the default period (This Month), and switch periods to see updated metrics.

**Independent Test**: Open Analytics tab → Summary card renders total bookings, completed count, cancellation rate %, avg rating, and revenue in KD. Switch to "This Week" → all numbers update. New center (no data) → card shows zeros/N/A with no layout breaks.

- [ ] T010 [P] [US1] Create `components/analytics/PeriodSelector.tsx`: segmented control with three options (This Week / This Month / Last 3 Months) using i18n keys `analytics.period.*`; calls `onChange(period)` on selection; highlights active period; supports RTL layout
- [ ] T011 [P] [US1] Add `getAnalyticsSummary` endpoint to `store/api/analyticsApi.ts`: `GET analytics/center/summary?startDate=&endDate=`, typed response `PerformanceSummary`, `providesTags: ['Analytics']`; export `useGetAnalyticsSummaryQuery`
- [ ] T012 [US1] Create `components/analytics/SummaryCard.tsx`: calls `useGetAnalyticsSummaryQuery({ startDate, endDate })`; shows loading skeleton when `isLoading`; shows inline error banner (not Alert.alert) when `isError`; renders 5 metric rows (total bookings, completed, cancellation rate, avg rating, revenue); displays `averageRating` as `null` → "N/A"; displays `revenueAvailable: false` → "N/A" instead of `KD 0.000`; all amounts formatted `KD X.XXX`; all labels via i18n keys
- [ ] T013 [US1] Mount `PeriodSelector` and `SummaryCard` in `app/(app)/(tabs)/analytics/index.tsx`, replacing the US1 section slot; pass `period`/`setPeriod` to selector, `{ startDate, endDate }` to card

**Checkpoint**: Analytics tab shows working period selector and summary metrics. Changing the period updates the card. Ready to demo as MVP.

---

## Phase 4: User Story 2 — Understand Booking Trends Over Time (Priority: P1)

**Goal**: Center owner can see a stacked bar chart of completed vs. cancelled bookings over the selected period, with daily granularity for "This Week" and weekly for longer periods. Tapping a bar shows exact counts.

**Independent Test**: Open Analytics tab with "This Week" → chart shows 7 daily bars. Switch to "This Month" → bars switch to weekly granularity. Tap any bar → tooltip shows completed and cancelled count. Period with zero bookings on a day → bar shows as zero (not omitted).

- [ ] T014 [P] [US2] Add `getBookingTrends` endpoint to `store/api/analyticsApi.ts`: `GET analytics/center/booking-trends?startDate=&endDate=&granularity=`, typed response `BookingTrendsResponse`, `providesTags: ['Analytics']`; export `useGetBookingTrendsQuery`
- [ ] T015 [US2] Create `components/analytics/BookingTrendsChart.tsx`: calls `useGetBookingTrendsQuery({ startDate, endDate, granularity })`; uses `BarChart` from `react-native-gifted-charts` with stacked bars (completed series + cancelled series in distinct colors); x-axis shows `periodLabel` values; `onPress` on a bar shows a tooltip/label with exact completed and cancelled counts; loading skeleton and inline error banner states; section title via `analytics.trends.title` i18n key; RTL-compatible axis layout
- [ ] T016 [US2] Mount `BookingTrendsChart` in `app/(app)/(tabs)/analytics/index.tsx`, replacing the US2 section slot; derive `granularity` from current `period` (`'THIS_WEEK'` → `'DAILY'`, others → `'WEEKLY'`); pass `{ startDate, endDate, granularity }`

**Checkpoint**: Booking trends chart renders beneath the summary card and responds to period changes and bar taps.

---

## Phase 5: User Story 3 — Track Revenue by Service Category (Priority: P2)

**Goal**: Center owner sees a ranked list of service categories by revenue for the selected period. Each row shows the category name (in active locale), number of completed bookings, and revenue in KD.

**Independent Test**: Open Analytics tab with bookings in multiple categories → list appears ranked highest-to-lowest revenue. Categories with zero revenue are not shown. Empty period → "No completed bookings in this period" empty state renders. Category names switch language when app locale changes.

- [ ] T017 [P] [US3] Add `getRevenueByCategory` endpoint to `store/api/analyticsApi.ts`: `GET analytics/center/revenue-by-category?startDate=&endDate=`, typed response `RevenueByCategoryEntry[]`, `providesTags: ['Analytics']`; export `useGetRevenueByCategoryQuery`
- [ ] T018 [US3] Create `components/analytics/RevenueByCategoryList.tsx`: calls `useGetRevenueByCategoryQuery({ startDate, endDate })`; renders a flat list of `RevenueByCategoryEntry` items; each row shows `categoryNameAr` or `categoryNameEn` based on `i18n.language`; shows completed booking count and revenue formatted `KD X.XXX`; shows `analytics.revenue.empty` i18n string when array is empty; loading skeleton and inline error banner; section title via `analytics.revenue.title`; RTL-compatible row layout
- [ ] T019 [US3] Mount `RevenueByCategoryList` in `app/(app)/(tabs)/analytics/index.tsx`, replacing the US3 section slot; pass `{ startDate, endDate }`

**Checkpoint**: Revenue by category list renders beneath booking trends, updates on period change, and correctly picks Arabic/English category names based on app locale.

---

## Phase 6: User Story 4 — Understand Customer Satisfaction (Priority: P2)

**Goal**: Center owner sees average rating, star distribution (1–5 rows), total reviews, and a trend indicator comparing current period to the previous equivalent period.

**Independent Test**: Open Analytics tab with reviews in the current period → average rating, 5-row distribution, and review count are shown. Previous period average exists → trend indicator appears (↑ or ↓). No reviews in period → "No reviews in this period" message. Average improved vs last period → positive indicator. Average declined → negative indicator.

- [ ] T020 [P] [US4] Add `getSatisfactionSummary` endpoint to `store/api/analyticsApi.ts`: `GET analytics/center/satisfaction?startDate=&endDate=`, typed response `SatisfactionSummary`, `providesTags: ['Analytics']`; export `useGetSatisfactionSummaryQuery`
- [ ] T021 [US4] Create `components/analytics/SatisfactionSection.tsx`: calls `useGetSatisfactionSummaryQuery({ startDate, endDate })`; computes `ratingDelta = averageRating - previousPeriodAverage` (null-safe); renders: average rating (null → "N/A"), total reviews count, 5-row star distribution (one row per star level, always all 5 rows even if count = 0), trend indicator (↑ / ↓) with delta value and `analytics.satisfaction.trendUp` / `trendDown` i18n label when delta is non-null and non-zero; `analytics.satisfaction.noReviews` empty state when `totalReviews === 0`; loading skeleton and inline error banner; section title via `analytics.satisfaction.title`; RTL-compatible layout
- [ ] T022 [US4] Mount `SatisfactionSection` in `app/(app)/(tabs)/analytics/index.tsx`, replacing the US4 section slot; pass `{ startDate, endDate }`

**Checkpoint**: Satisfaction section renders beneath revenue breakdown and shows live trend comparison when previous-period data is available.

---

## Phase 7: User Story 5 — Identify Peak Operating Hours (Priority: P3)

**Goal**: Center owner sees a bar chart with 24 bars (one per hour of the day, 0–23) showing booking volume. The tallest bar is visually the most prominent. Tapping a bar shows the exact booking count for that hour.

**Independent Test**: Open Analytics tab → peak hours chart shows 24 bars. The hour with the most bookings has the tallest bar. Tap any bar → label shows exact count. All bars show for a zero-booking period (flat baseline, no missing bars). Period switch → chart updates.

- [ ] T023 [P] [US5] Add `getPeakHours` endpoint to `store/api/analyticsApi.ts`: `GET analytics/center/peak-hours?startDate=&endDate=`, typed response `PeakHourEntry[]`, `providesTags: ['Analytics']`; export `useGetPeakHoursQuery`
- [ ] T024 [US5] Create `components/analytics/PeakHoursChart.tsx`: calls `useGetPeakHoursQuery({ startDate, endDate })`; uses `BarChart` from `react-native-gifted-charts` with 24 bars indexed by `hour` (0–23); x-axis labels show hour in `HH:00` format; `onPress` on a bar shows tooltip with exact `bookingCount` and `analytics.peakHours.bookings` i18n label; bar height proportional to `bookingCount`; loading skeleton and inline error banner; section title via `analytics.peakHours.title`; RTL-compatible layout (x-axis direction)
- [ ] T025 [US5] Mount `PeakHoursChart` in `app/(app)/(tabs)/analytics/index.tsx`, replacing the US5 section slot; pass `{ startDate, endDate }`

**Checkpoint**: All 5 analytics sections render and respond to period changes. Full screen is functionally complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Production-readiness, error resilience, RTL audit, and final smoke test.

- [ ] T026 [P] Add per-section loading skeleton UI to each of the 5 section components (`SummaryCard`, `BookingTrendsChart`, `RevenueByCategoryList`, `SatisfactionSection`, `PeakHoursChart`) when `isLoading === true` — confirm sections render skeletons independently (not a full-screen spinner)
- [ ] T027 [P] Add inline error banner with "Tap to retry" (calling `refetch()`) to each of the 5 section components when `isError === true` — confirm one section's error does not affect other sections
- [ ] T028 Wrap `app/(app)/(tabs)/analytics/index.tsx` in the project error boundary at the tab-screen level in `app/(app)/(tabs)/_layout.tsx` (required by constitution Principle VII and Phase 2.5)
- [ ] T029 [P] Audit all 6 analytics components (`PeriodSelector`, `SummaryCard`, `BookingTrendsChart`, `RevenueByCategoryList`, `SatisfactionSection`, `PeakHoursChart`) for RTL compliance: confirm NativeWind direction utilities are used (no hardcoded `textAlign: 'left'`, no hardcoded `marginLeft`), switch app to Arabic and visually verify each component
- [ ] T030 Run the smoke test checklist from `quickstart.md` end-to-end: summary loads, period switch works, chart tooltips work, Arabic locale renders correctly, offline error banners appear independently per section

**Checkpoint**: Analytics screen is production-ready — error-resilient, RTL-correct, covered by error boundary, smoke-tested.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — all tasks start immediately; T002–T005 run in parallel after T001
- **Phase 2 (Foundational)**: Depends on T002 (types), T003 (utils) — blocks all user story phases
- **Phase 3–7 (User Stories)**: All depend on Phase 2 completion; can proceed in priority order or in parallel by story
- **Phase 8 (Polish)**: Depends on all desired user story phases being complete

### User Story Dependencies

| Story | Priority | Depends On | Notes |
|-------|----------|------------|-------|
| US1 Performance Summary | P1 | Phase 2 | No story dependency — can start first |
| US2 Booking Trends | P1 | Phase 2 | Parallel with US1 after Phase 2 |
| US3 Revenue by Category | P2 | Phase 2 | Parallel with US1/US2 after Phase 2 |
| US4 Customer Satisfaction | P2 | Phase 2 | Parallel with any P1/P2 story |
| US5 Peak Hours | P3 | Phase 2 | Can start last or in parallel |

### Within Each User Story

- API endpoint task [P] and component creation task can run in parallel (different files)
- Mount task in `index.tsx` must wait for both the endpoint and the component to be complete
- Each story is independently testable at its own checkpoint before moving to the next

### Parallel Opportunities Per Story

**US1 (T010–T013)**:
```
Parallel: T010 (PeriodSelector.tsx) + T011 (analyticsApi.ts endpoint)
Then sequential: T012 (SummaryCard.tsx) → T013 (mount in index.tsx)
```

**US2 (T014–T016)**:
```
Parallel: T014 (analyticsApi.ts endpoint) + T015 (BookingTrendsChart.tsx)
Then sequential: T016 (mount in index.tsx)
```

**US3 (T017–T019)**:
```
Parallel: T017 (analyticsApi.ts endpoint) + T018 (RevenueByCategoryList.tsx)
Then sequential: T019 (mount in index.tsx)
```

**US4 (T020–T022)**:
```
Parallel: T020 (analyticsApi.ts endpoint) + T021 (SatisfactionSection.tsx)
Then sequential: T022 (mount in index.tsx)
```

**US5 (T023–T025)**:
```
Parallel: T023 (analyticsApi.ts endpoint) + T024 (PeakHoursChart.tsx)
Then sequential: T025 (mount in index.tsx)
```

**Phase 8 (T026–T030)**:
```
Parallel: T026 (skeletons) + T027 (error banners) + T029 (RTL audit)
Then sequential: T028 (error boundary) → T030 (smoke test)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T009)
3. Complete Phase 3: US1 Performance Summary (T010–T013)
4. **STOP and VALIDATE**: Analytics tab shows period selector and working summary card
5. Demo or ship the MVP increment

### Incremental Delivery

1. Phase 1 + Phase 2 → Analytics tab exists but is empty
2. Phase 3 (US1) → Summary card + period selector ✅ MVP
3. Phase 4 (US2) → Booking trends chart added
4. Phase 5 (US3) → Revenue by category added
5. Phase 6 (US4) → Customer satisfaction + trend indicator added
6. Phase 7 (US5) → Peak hours chart added — full screen complete
7. Phase 8 → Production-ready polish applied

### Parallel Team Strategy

With two developers after Phase 2 is done:
- **Dev A**: US1 (T010–T013) then US3 (T017–T019)
- **Dev B**: US2 (T014–T016) then US4 (T020–T022)
- Both: US5 (T023–T025) and Phase 8 together

---

## Notes

- All `analyticsApi.ts` endpoint additions (T011, T014, T017, T020, T023) modify the same file — do not run these in parallel; run each in its respective story phase
- Never use `Alert.alert` in any analytics component — use inline banners (feedback rule: no-op on web)
- All amounts: `KD X.XXX` format (3 decimal places, per constitution regional standards)
- `averageRating: null` must display as "N/A" not "0" or "0.0"
- `react-native-gifted-charts` import: `import { BarChart } from 'react-native-gifted-charts'`
- Commit after each checkpoint (conventional commits: `feat(analytics): ...`)
