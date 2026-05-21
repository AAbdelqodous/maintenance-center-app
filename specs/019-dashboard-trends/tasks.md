# Tasks: Dashboard Historical Trends Section

**Input**: Design documents from `/specs/019-dashboard-trends/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story (P1–P6) to enable independent implementation and testing.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, i18n keys, and directory structure — no runtime dependencies; can start immediately.

- [x] T001 Create `types/trends.ts` with all new types: `TrendPeriod`, `TREND_PERIOD_WEEKS`, `WeeklyBookingStat`, `WeeklyRatingStat`, `WeeklyRevenueStat`, `CategoryMixEntry`, `PeakHourByDayEntry`, `TrendsResponse`, `TrendsQueryArgs`, `TrendInsights`, `HeatmapCell`, and the `trendPeriodToDateRange` utility function per `data-model.md`
- [x] T002 [P] Add all `trends.*` i18n keys to `lib/i18n/locales/en.json` — keys listed in `quickstart.md` (section header, period labels, chart titles, empty state messages, limited data caption, export button labels, coming-soon message, insight templates for each chart)
- [x] T003 [P] Add all `trends.*` i18n keys to `lib/i18n/locales/ar.json` with Arabic translations matching every key added in T002

**Checkpoint**: `types/trends.ts` compiles; both locale files have complete `trends.*` key sets.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: RTK Query endpoint and three shared display components that every chart depends on. MUST complete before any user story phase.

**⚠️ CRITICAL**: No chart component can be built until T004–T007 are complete.

- [x] T004 Add `getTrends` query to `store/api/analyticsApi.ts`: endpoint `analytics/center/trends`, params `{ startDate, endDate }`, response type `TrendsResponse` (from `types/trends.ts`), `keepUnusedDataFor: 3600`, `providesTags: ['Analytics']`; export `useGetTrendsQuery`
- [x] T005 [P] Create `components/dashboard/trends/ChartHeadline.tsx`: renders a single-sentence insight string in a styled `<Text>` with `text-right` in RTL; accepts `text: string` prop; uses `AppText` component consistent with existing dashboard components
- [x] T006 [P] Create `components/dashboard/trends/ChartEmptyState.tsx`: renders an icon + localized `t('trends.emptyState')` message centred in a fixed-height container (same height as a chart so the layout doesn't collapse); accepts no data-specific props
- [x] T007 [P] Create `components/dashboard/trends/ChartLimitedDataCaption.tsx`: renders `t('trends.limitedData', { actual: N, total: M })` in muted text below a chart; accepts `actual: number` and `total: number` props

**Checkpoint**: `useGetTrendsQuery` can be called in the app; three shared components render in isolation.

---

## Phase 3: User Story 1 — Weekly Booking Trend (Priority: P1) 🎯 MVP

**Goal**: Deliver the collapsible Trends section with period selector and the bookings chart. Proves the full end-to-end pattern — data fetch → period switch → chart render → session-persistent collapse state.

**Independent Test**: Expand the Trends section on a populated branch. Verify a weekly bar chart renders, the headline matches a manual booking count, switching from 8 to 12 weeks refetches and updates the chart, and collapsing/re-expanding from another tab restores the open state.

- [x] T008 [US1] Create `components/dashboard/trends/TrendsSectionHeader.tsx`: chevron icon (rotates 180° when expanded) + section title (`t('trends.sectionTitle')`) + three-button segmented control for `'8_WEEKS'` / `'12_WEEKS'` / `'6_MONTHS'`; accepts `expanded: boolean`, `onToggle: () => void`, `selectedPeriod: TrendPeriod`, `onPeriodChange: (p: TrendPeriod) => void`; styled with NativeWind, RTL-aware
- [x] T009 [US1] Create `components/dashboard/trends/BookingVolumeChart.tsx`: renders `BarChart` from `react-native-gifted-charts` using `bookingsByWeek` data; x-axis shows `periodLabel` values; y-axis auto-scales to data; renders `ChartEmptyState` when `data.length === 0`; renders `ChartLimitedDataCaption` when `data.length < TREND_PERIOD_WEEKS[period]`; renders `ChartHeadline` below the chart; shows a grey-rectangle skeleton while `isLoading` is true; accepts `data: WeeklyBookingStat[]`, `insight: string`, `isLoading: boolean`, `period: TrendPeriod`
- [x] T010 [US1] Modify `app/(app)/(tabs)/index.tsx`: add `trendsExpanded: boolean` (default `false`) and `selectedPeriod: TrendPeriod` (default `'8_WEEKS'`) local state; compute `{ startDate, endDate }` via `trendPeriodToDateRange(selectedPeriod)`; call `useGetTrendsQuery({ startDate, endDate })`; mount `TrendsSectionHeader` and (when expanded) `BookingVolumeChart` at the very bottom of the main `ScrollView`, below all existing sections

**Checkpoint**: US1 independently functional — bookings chart renders, period switch works, collapse persists.

---

## Phase 4: User Story 2 — Ratings and Revenue Trends (Priority: P2)

**Goal**: Add rating (fixed 1–5 y-axis) and revenue (KWD) weekly charts to the already-expanded trends body.

**Independent Test**: On a branch with 4+ completed rated bookings, expand Trends. Verify the rating chart y-axis never extends below 1 or above 5 even when all ratings are 4.6–4.8. Verify a week with zero rated bookings shows a gap, not zero. Verify the revenue chart shows KWD totals and the headline cites a percentage or "stable" message.

- [x] T011 [P] [US2] Create `components/dashboard/trends/RatingTrendChart.tsx`: renders `LineChart` from `react-native-gifted-charts` using `ratingsByWeek` data; y-axis explicitly clamped to min 1 / max 5; null `average` weeks render as data gaps (not zero); renders `ChartEmptyState`, `ChartLimitedDataCaption`, and `ChartHeadline` following the same pattern as T009; shows skeleton while loading; accepts `data: WeeklyRatingStat[]`, `insight: string`, `isLoading: boolean`, `period: TrendPeriod`
- [x] T012 [P] [US2] Create `components/dashboard/trends/RevenueTrendChart.tsx`: renders `BarChart` using `revenueByWeek` data; y-axis label suffix is `" KD"`; values formatted to 3 decimal places on tooltip/label; renders `ChartEmptyState`, `ChartLimitedDataCaption`, and `ChartHeadline`; shows skeleton while loading; accepts `data: WeeklyRevenueStat[]`, `insight: string`, `isLoading: boolean`, `period: TrendPeriod`
- [x] T013 [US2] Modify `app/(app)/(tabs)/index.tsx`: mount `RatingTrendChart` and `RevenueTrendChart` inside the expanded trends body, in order after `BookingVolumeChart`, passing the appropriate slices of `useGetTrendsQuery` data and placeholder `insight` strings (insights will be wired in US5/T019)

**Checkpoint**: US2 complete — all three time-series charts visible and independently correct.

---

## Phase 5: User Story 3 — Category Demand Mix (Priority: P3)

**Goal**: Add a category-share pie chart showing each service category's portion of total bookings for the selected period.

**Independent Test**: On a branch with bookings across 2+ categories, expand Trends. Verify each category appears with a share label; shares sum visually to 100%. Change the period and verify shares update. Confirm a category with bookings in the earlier part of the period still appears even if it had none in recent weeks.

- [x] T014 [US3] Create `components/dashboard/trends/CategoryMixChart.tsx`: renders `PieChart` from `react-native-gifted-charts` using `categoryMix` data; each slice label uses `i18n.language === 'ar' ? entry.categoryNameAr : entry.categoryNameEn`; renders `ChartEmptyState` when `data.length === 0`; renders `ChartHeadline` below the chart; shows skeleton while loading; accepts `data: CategoryMixEntry[]`, `insight: string`, `isLoading: boolean`
- [x] T015 [US3] Modify `app/(app)/(tabs)/index.tsx`: mount `CategoryMixChart` inside the expanded trends body, in order after `RevenueTrendChart`, passing `trendsData.categoryMix` and a placeholder insight string

**Checkpoint**: US3 complete — category mix chart renders and updates with period changes.

---

## Phase 6: User Story 4 — Peak Hours Heatmap (Priority: P4)

**Goal**: Add the custom 7×24 heatmap grid showing booking intensity by day of week and hour of day.

**Independent Test**: On a branch with bookings spread across days and times, expand Trends. Verify a 7-row × 24-column grid renders. Verify the busiest cell is the darkest shade. Verify all zero-booking cells are the lightest shade (not missing). Verify the headline names the specific day and hour. Switch to Arabic — verify day labels and the hour column order are RTL-correct.

- [x] T016 [US4] Create `components/dashboard/trends/PeakHoursHeatmap.tsx`: builds a `HeatmapCell[]` from `peakHours` by normalising `bookingCount` against the max cell (`intensity = count / maxCount`); renders a `ScrollView`-wrapped grid of 7 rows (Mon–Sun) × 24 columns (0–23h) where each cell is a `View` with NativeWind background-opacity class mapped to one of 5 intensity levels (0 → `opacity-0` fill, 0.2 → `opacity-25`, 0.4 → `opacity-50`, 0.7 → `opacity-75`, 1.0 → `opacity-100` using the primary brand colour); day-of-week labels use locale-aware day names; when `i18n.dir() === 'rtl'` the hour columns are reversed (23 → 0 left-to-right); renders `ChartEmptyState` when `data.length === 0`; renders `ChartHeadline` below the grid; shows skeleton while loading; accepts `data: PeakHourByDayEntry[]`, `insight: string`, `isLoading: boolean`
- [x] T017 [US4] Modify `app/(app)/(tabs)/index.tsx`: mount `PeakHoursHeatmap` inside the expanded trends body as the final (fifth) chart, passing `trendsData.peakHours` and a placeholder insight string

**Checkpoint**: US4 complete — heatmap renders, RTL column ordering works, all five charts now visible in sequence.

---

## Phase 7: User Story 5 — Headline Insights (Priority: P5)

**Goal**: Replace all placeholder insight strings with real computed insights from `useTrendInsights`.

**Independent Test**: On a branch with steady booking growth, verify the bookings headline states "up X%" where X matches a manual calculation of (mean of last 2 weeks ÷ mean of first 2 weeks − 1). Introduce a spike week in test data and verify the booking headline still reports the overall trend, not the spike. Verify the rating headline says "stable around X" when the weekly range is < 0.3 stars.

- [x] T018 [US5] Create `hooks/useTrendInsights.ts`: accepts `data: TrendsResponse | undefined` and `period: TrendPeriod`; returns `TrendInsights`; implements five algorithms per `quickstart.md` (bookings/revenue: smoothed first-vs-last-2-week average delta ≥5% threshold; rating: mean + range < 0.3 → "stable" else directional; category: top entry by `sharePercent`; peak hours: max `bookingCount` cell → named day+hour string); all returned strings use `i18n.t()` with interpolation so they render in the active locale; handles `data` being `undefined` (loading), `bookingsByWeek.length === 0` (empty), or `< 2` valid data points (returns `t('trends.insight.notEnoughData')`)
- [x] T019 [US5] Modify `app/(app)/(tabs)/index.tsx`: call `useTrendInsights(trendsData, selectedPeriod)` and replace all placeholder insight strings with the corresponding `insights.bookings`, `insights.rating`, `insights.revenue`, `insights.category`, `insights.peakHour` values passed to each chart component

**Checkpoint**: US5 complete — all five charts show accurate, spike-resistant, locale-aware headline insights.

---

## Phase 8: User Story 6 — Export Report Button (Priority: P6)

**Goal**: Render a role-gated "Export branch report" button visible only to Center Owners. In the initial release it shows a "Coming soon" message on tap.

**Independent Test**: Log in as Center Owner — button visible. Log in as Branch Manager — button absent. Tap the button as Center Owner on native — `Alert` shows "Coming soon". On web — an inline banner shows instead of an `Alert`.

- [x] T020 [US6] Create `components/dashboard/trends/ExportReportButton.tsx`: renders a styled `TouchableOpacity` with `t('trends.export.label')` text; on press, if `Platform.OS === 'web'` set local `showComingSoonBanner: boolean` state to display an inline banner below the button (no `Alert` on web per project convention); otherwise call `Alert.alert(t('trends.export.comingSoon'), t('trends.export.comingSoonMessage'))`; accepts no external props (self-contained)
- [x] T021 [US6] Modify `app/(app)/(tabs)/index.tsx`: render `<ExportReportButton />` immediately above `TrendsSectionHeader` (top of the trends area) guarded by `userType === 'CENTER_OWNER'`; import `userType` from `useSelector(s => s.auth)`

**Checkpoint**: US6 complete — export button present for owners, absent for managers, Coming Soon state works on both native and web.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integration validation and cross-cutting checks that can only be performed after all six user stories are assembled.

- [x] T022 [P] Verify bilingual parity in `lib/i18n/locales/ar.json` and `lib/i18n/locales/en.json` — every `trends.*` key present in `en.json` must have a corresponding entry in `ar.json` with a non-empty Arabic string; fix any gaps
- [x] T023 [P] Audit all five chart components and `TrendsSectionHeader` for NativeWind RTL correctness: `text-right` on headline text, `flex-row-reverse` where needed for label rows, and that no hardcoded `left`/`right` directional values are used; fix any issues found
- [ ] T024 Run all 11 testing scenarios from `quickstart.md` end-to-end: populated branch all charts; period switch refetch; tab navigation state persistence; new branch empty states; limited data caption; Arabic RTL layout; Center Owner export button visible; Branch Manager export button absent; Coming Soon tap on native; Coming Soon tap on web; headline accuracy spot-check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (needs `types/trends.ts` and i18n keys) — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — first user story to implement
- **Phase 4 (US2)**: Depends on Phase 2 — can start in parallel with Phase 3 (different component files); T013 depends on T010 completing first
- **Phase 5 (US3)**: Depends on Phase 2 — can start after Phase 2; T015 depends on T010
- **Phase 6 (US4)**: Depends on Phase 2 — can start after Phase 2; T017 depends on T010
- **Phase 7 (US5)**: Depends on all chart components existing (T009, T011, T012, T014, T016); T019 depends on T010 and T018
- **Phase 8 (US6)**: Depends only on Phase 2; T021 depends on T010
- **Phase 9 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on other stories
- **US2 (P2)**: Can start after Foundational — T011/T012 parallel with US1; T013 needs T010 done
- **US3 (P3)**: Can start after Foundational — T014 parallel with US1/US2; T015 needs T010 done
- **US4 (P4)**: Can start after Foundational — T016 parallel with US1/US2/US3; T017 needs T010 done
- **US5 (P5)**: Needs T009, T011, T012, T014, T016 before T018; needs T010 before T019
- **US6 (P6)**: Can start after Foundational — T021 needs T010 done

### Within Each User Story

- Chart component (T009/T011/T012/T014/T016/T020) before dashboard integration (T010/T013/T015/T017/T019/T021)
- `TrendsSectionHeader` (T008) before dashboard integration (T010)

### Parallel Opportunities

```
# After Phase 1 completes, run simultaneously:
T004  (analyticsApi endpoint)
T005  (ChartHeadline component)
T006  (ChartEmptyState component)
T007  (ChartLimitedDataCaption component)

# After Phase 2 completes, run simultaneously:
T008  (TrendsSectionHeader)    ← US1
T011  (RatingTrendChart)       ← US2
T012  (RevenueTrendChart)      ← US2
T014  (CategoryMixChart)       ← US3
T016  (PeakHoursHeatmap)       ← US4
T018  (useTrendInsights hook)  ← US5
T020  (ExportReportButton)     ← US6

# T009 (BookingVolumeChart) needed before T010 — do this first in US1 stream
# T010 (index.tsx wiring) unlocks T013, T015, T017, T019, T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (T001–T003)
2. Complete **Phase 2** (T004–T007) — **CRITICAL, blocks all stories**
3. Complete **Phase 3** (T008–T010) — US1
4. **STOP AND VALIDATE**: Booking volume chart renders with real data, period selector works, section collapses and restores state
5. Demo to stakeholders if needed

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. **US1** (T008–T010) → Collapsible section + bookings chart (MVP)
3. **US2** (T011–T013) → Ratings + revenue charts added
4. **US3** (T014–T015) → Category mix added
5. **US4** (T016–T017) → Heatmap added (all 5 charts now visible)
6. **US5** (T018–T019) → Real insights replace placeholders
7. **US6** (T020–T021) → Export button added for owners
8. **Polish** (T022–T024) → RTL check + full smoke test

### Parallel Team Strategy (2 developers)

After Phase 2 completes:
- **Dev A**: US1 (T008–T010) → US5 (T018–T019) → US6 (T020–T021)
- **Dev B**: US2 (T011–T012) → US3 (T014) → US4 (T016); then integrate (T013 → T015 → T017) after T010 is merged

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelise
- No test tasks generated (not requested in spec)
- T010 is the central integration task — once it lands, all other `index.tsx` modifications (T013, T015, T017, T019, T021) add to the expanding trends body sequentially
- All chart components must handle three states: loading skeleton, empty (`data.length === 0`), and populated
- The `alert.alert` web workaround (T020) is established project convention — see project memory
- `useGetTrendsQuery` with `keepUnusedDataFor: 3600` means period changes within the same session will serve cached data if the same date range was queried within the last hour
- Backend `GET /api/v1/analytics/center/trends` must be deployed before T004 can be validated against real data — see open questions in `plan.md`
