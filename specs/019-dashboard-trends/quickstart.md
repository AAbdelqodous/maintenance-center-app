# Quickstart: Dashboard Historical Trends Section

## What's being built

A collapsible "Trends" section at the bottom of the owner dashboard (`app/(app)/(tabs)/index.tsx`) containing five charts — bookings, ratings, revenue, category mix, and peak hours heatmap — with a period selector and automated headline insights per chart.

---

## Prerequisites

- Specs 015–018 implemented (staff foundation, attention panel, pipeline KPIs, staff board)
- Backend endpoint `GET /api/v1/analytics/center/trends` deployed (see `contracts/trends-api.md`)
- `react-native-gifted-charts` already installed (v1.4.76)

---

## Key Files at a Glance

| File | Role |
|------|------|
| `types/trends.ts` | All new TypeScript types for this feature |
| `store/api/analyticsApi.ts` | Add `getTrends` query + `keepUnusedDataFor: 3600` |
| `hooks/useTrendInsights.ts` | Computes 5 headline insight strings from `TrendsResponse` |
| `components/dashboard/trends/TrendsSectionHeader.tsx` | Chevron toggle + period selector |
| `components/dashboard/trends/BookingVolumeChart.tsx` | Bar chart + headline |
| `components/dashboard/trends/RatingTrendChart.tsx` | Line chart (y:1–5) + headline |
| `components/dashboard/trends/RevenueTrendChart.tsx` | Bar chart + headline |
| `components/dashboard/trends/CategoryMixChart.tsx` | Pie chart + headline |
| `components/dashboard/trends/PeakHoursHeatmap.tsx` | Custom 7×24 grid + headline |
| `components/dashboard/trends/ChartEmptyState.tsx` | Shared empty-state component |
| `components/dashboard/trends/ChartLimitedDataCaption.tsx` | Limited-history notice |
| `components/dashboard/trends/ExportReportButton.tsx` | Owner-only export entry point |
| `app/(app)/(tabs)/index.tsx` | Mount `TrendsSection` at bottom, add `ExportReportButton` |
| `lib/i18n/locales/en.json` | Add `trends.*` keys |
| `lib/i18n/locales/ar.json` | Add `trends.*` keys (Arabic) |

---

## Adding a New Chart (pattern guide)

If a sixth chart needs to be added later, follow this pattern:

1. **Define the data shape** in `types/trends.ts` and add the field to `TrendsResponse`.
2. **Add the backend field** to `GET /analytics/center/trends` and update `contracts/trends-api.md`.
3. **Add the insight** to `useTrendInsights.ts` and the `TrendInsights` type.
4. **Create a new component** in `components/dashboard/trends/` following the `BookingVolumeChart.tsx` pattern:
   - Accept `data: YourWeeklyType[]`, `insight: string`, `isLoading: boolean`, `period: TrendPeriod`
   - Render `ChartEmptyState` when `data.length === 0`
   - Render `ChartLimitedDataCaption` when `data.length < TREND_PERIOD_WEEKS[period]`
   - Render the chart + `<ChartHeadline text={insight} />`
5. **Mount it** inside `TrendsSectionBody` between the existing charts.
6. **Add i18n keys** to both `en.json` and `ar.json`.

---

## Period Selector → API Flow

```
User taps "12 weeks"
  ↓
selectedPeriod = '12_WEEKS'  (local state in index.tsx)
  ↓
trendPeriodToDateRange('12_WEEKS')
  → startDate = Monday of (today - 84 days)
  → endDate   = today
  ↓
useGetTrendsQuery({ startDate, endDate })
  → fetches GET /api/v1/analytics/center/trends?startDate=...&endDate=...
  → RTK Query caches for 3600s
  ↓
All chart components receive new `data` prop → re-render
useTrendInsights(data) → new insight strings
```

---

## Headline Insight Algorithm

Implemented in `hooks/useTrendInsights.ts`:

### Booking & Revenue (smoothed first-vs-last comparison)

```
firstAvg = mean(data.slice(0, 2).map(w => w.total))
lastAvg  = mean(data.slice(-2).map(w => w.total))
delta    = ((lastAvg - firstAvg) / firstAvg) * 100

if abs(delta) < 5 → "Stable around X/week"
if delta >= 5     → "Bookings up X% vs N weeks ago"
if delta <= -5    → "Bookings down X% vs N weeks ago"
```

### Rating (mean + variance check)

```
validWeeks = data.filter(w => w.average !== null)
if validWeeks.length < 2 → "Not enough data yet"

mean = avg(validWeeks.map(w => w.average))
range = max - min

if range < 0.3 → "Rating stable around X"
else compute slope: "Rating improving" or "Rating declining toward X"
```

### Category Mix

```
top = categoryMix.sort by sharePercent desc [0]
→ "top.categoryNameEn represent X% of bookings"
```

### Peak Hours

```
maxCell = peakHours.sort by bookingCount desc [0]
dayName = ISO weekday name (1=Monday … 7=Sunday)
→ "dayName maxCell.hour:00–(hour+1):00 is your busiest slot"
```

**Spike resistance**: The first-vs-last 2-week averaging prevents a single outlier week from distorting the delta calculation. The rating range check prevents a one-week spike from being described as a trend.

---

## RTL Compliance Checklist

When implementing each chart:

- [ ] Chart labels render using i18n strings (no hardcoded English)
- [ ] Category names use `i18n.language === 'ar' ? nameAr : nameEn`
- [ ] `PeakHoursHeatmap` reverses hour column order when `i18n.dir() === 'rtl'`
- [ ] Day-of-week labels in heatmap use locale-appropriate day names
- [ ] `ChartHeadline` text aligns right in RTL (`textAlign: 'right'` via NativeWind `text-right`)
- [ ] `TrendsSectionHeader` chevron icon mirrors direction in RTL

---

## Empty State Handling

| Condition | Component rendered | Trigger |
|-----------|-------------------|---------|
| `data.length === 0` | `ChartEmptyState` | New branch with no bookings |
| `data.length < TREND_PERIOD_WEEKS[period]` | Chart + `ChartLimitedDataCaption` below | Branch with partial history |
| API error | Inline error state with retry button | Network/server failure |
| Loading | Skeleton placeholder (e.g., grey rect same height as chart) | First fetch in progress |

---

## Export Button Behavior

```tsx
// Owner-only rendering in index.tsx:
{userType === 'CENTER_OWNER' && <ExportReportButton />}

// ExportReportButton.tsx — Coming Soon state:
if (Platform.OS === 'web') {
  // Show inline banner (no Alert on web — see project memory)
  setShowComingSoonBanner(true);
} else {
  Alert.alert(t('trends.export.comingSoon'), t('trends.export.comingSoonMessage'));
}
```

---

## Testing Scenarios

| Scenario | What to verify |
|----------|---------------|
| Populated branch, 8-week period | All 5 charts render, all 5 headlines visible and non-empty |
| Switch to 12 weeks | Charts re-fetch and update; headlines recalculate |
| Navigate away (to Bookings tab) and back | Trends section remains in same expanded/collapsed state |
| Collapse section | Only header row visible; no chart data fetched until re-expanded |
| New branch (zero bookings) | Each chart slot shows `ChartEmptyState`, no blank canvas |
| Branch with 3 weeks of data, 8-week period | Charts render 3 data points + `ChartLimitedDataCaption` |
| Arabic language | All labels, axes, and insights render in Arabic; heatmap columns reversed |
| Center Owner login | Export button visible |
| Branch Manager login | Export button absent |
| Export button tap (Coming Soon) | "Coming soon" message shown; no error |
