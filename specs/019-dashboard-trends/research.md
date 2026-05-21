# Research: Dashboard Historical Trends Section

## 1. Chart Library

**Decision**: Use `react-native-gifted-charts` (already installed, v1.4.76) for all time-series charts.

**Rationale**: It is the only charting library already in `package.json`. Adding a second charting library for this feature would bloat the bundle. `react-native-gifted-charts` provides `BarChart` (booking volume, revenue), `LineChart` (rating trend), and `PieChart` (category mix) — sufficient for four of the five charts.

**Alternatives considered**:
- `victory-native` — richer API, but requires adding a dependency.
- `react-native-chart-kit` — simpler but weaker RTL support.

---

## 2. Peak Hours Heatmap

**Decision**: Build a custom `PeakHoursHeatmap` component using `View` cells arranged in a 7-row (days) × 24-column (hours) grid styled with NativeWind Tailwind classes for color intensity.

**Rationale**: `react-native-gifted-charts` has no heatmap chart. No currently installed library offers one. A custom grid using `View` + `FlatList`-based rows is straightforward and gives full RTL control (flip column order for Arabic if needed).

**Color intensity scheme**: 5 opacity levels (0, 0.2, 0.4, 0.7, 1.0) mapped to quintiles of the booking count distribution across all 168 cells.

**Alternatives considered**:
- `react-native-calendar-heatmap` — not installed, limited to date-based grids, not day×hour.

---

## 3. Period Selector

**Decision**: Three `TouchableOpacity` buttons styled with NativeWind to form a segmented control (selected state: filled background; unselected: bordered ghost).

**Rationale**: React Native has no cross-platform `SegmentedControl` component. The existing codebase uses `TouchableOpacity` + NativeWind for all interactive elements. Building a minimal segmented control from these primitives is consistent with the project's style and avoids adding a dependency.

---

## 4. API Strategy — Consolidated Trends Endpoint

**Decision**: Add one new backend endpoint `GET /analytics/center/trends?startDate=&endDate=` that returns all five data sets in a single response. Wire it as a new query in `analyticsApi.ts` with `keepUnusedDataFor: 3600` (one-hour cache).

**Rationale**:
- The existing `getBookingTrends` (WEEKLY) covers bookings — reusable.
- `getRevenueByCategory` covers category booking mix (using `completedBookings` field) — reusable.
- **Gaps** in existing endpoints:
  - Weekly rating averages: `SatisfactionSummary` returns a single-period average, not a weekly time series.
  - Weekly revenue totals: `getRevenueByCategory` gives per-category revenue but not a weekly rollup.
  - Day-of-week peak hours: `getPeakHoursResponse` has `{hour, bookingCount}` — no `dayOfWeek` field.
- A single consolidated endpoint eliminates 5 independent loading states and caches as one unit, which is simpler to reason about and aligns with the one-hour staleness requirement.

**Alternatives considered**:
- Reuse 5 existing endpoints independently: would require coordinating 5 loading/error states; 3 of the 5 can't serve the required data shape without a new endpoint anyway.
- Extend individual existing endpoints: scatters the weekly breakdown logic across multiple controllers.

---

## 5. Session-Level Expanded/Collapsed State

**Decision**: Store `trendsExpanded: boolean` in local React component state inside `index.tsx`. No Redux, no SecureStore.

**Rationale**: The spec requires "persists for the duration of the app session." The tab navigator in Expo Router keeps tab screens mounted while the app is running, so local component state naturally survives tab switches. Redux would be overkill for a transient UI toggle. The constitution's "no local component state for server data" rule doesn't apply to UI toggle state.

---

## 6. Headline Insight Computation

**Decision**: Compute all five insights client-side in a `useTrendInsights` hook immediately after the trends data loads. No backend involvement.

**Algorithm per chart**:
- **Bookings / Revenue**: Compare the average of the last 2 weeks vs the average of the first 2 weeks (smoothed, spike-resistant). If the difference is ≥ 5%, state "up/down X%". Otherwise "stable around X/week" (or "X KD/week").
- **Rating**: Compute the mean of all non-null weekly ratings. If the max minus min is < 0.3, call it "stable around X". Otherwise describe the direction of the last-vs-first comparison.
- **Category mix**: State the top category name and its share percent.
- **Peak hours**: Find the `(dayOfWeek, hour)` cell with the highest `bookingCount`; format as "Day H–H+1 are your peak."

**Edge cases in insight generation**:
- Fewer than 2 non-null weeks → "Not enough data for a trend yet."
- All weeks identical → "Consistent at X/week."
- First-2-week average is zero (new branch) → compare to last-2-week average only if both are non-zero; else return limited-data message.

---

## 7. Period Calculation

**Decision**: Periods are expressed as lookback windows from "today" (UTC), not calendar month boundaries.

| Period option | Weeks sent to API | Approximate calendar span |
|---------------|-------------------|---------------------------|
| 8 weeks       | 8 ISO weeks       | ~2 months                 |
| 12 weeks      | 12 ISO weeks      | ~3 months                 |
| 6 months      | 26 ISO weeks      | ~6 calendar months        |

Start date = `today - (weeks * 7)`, aligned to the Monday of that ISO week. End date = `today`.

---

## 8. RTL Compliance for Charts

**Decision**: Pass `isRTL={i18n.dir() === 'rtl'}` prop to chart components. For `react-native-gifted-charts`, set `xAxisLabelWidth` and `initialSpacing` as needed; test that x-axis labels render left-to-right in RTL mode (charts data flows are not reversed — only label text direction changes). For the heatmap grid, reverse the hour columns when in RTL mode.

**Alternatives considered**: Wrapping in a mirrored `View` (scaleX: -1) — not used because it reverses text rendering.

---

## 9. Empty State and Limited Data

**Decision**:
- **Empty state (zero weeks of data)**: Each chart slot renders a `ChartEmptyState` component with a friendly icon + localized "No data yet" message.
- **Limited data (1–N weeks where N < selected period)**: Chart renders what exists, and a `ChartLimitedDataCaption` component below the chart shows "Showing X of Y weeks."

These are shared reusable components used across all five chart slots.

---

## 10. Export Button

**Decision**: `ExportReportButton` is rendered in `index.tsx` only when `userType === 'CENTER_OWNER'`. For the initial release, tapping it shows an `Alert` with "Coming soon" on native, and an inline banner on web (consistent with the existing `Alert.alert` web guard pattern documented in project feedback memory). The button always occupies the same layout slot so the dashboard layout is stable when the full export ships.
