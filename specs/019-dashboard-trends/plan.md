# Implementation Plan: Dashboard Historical Trends Section

**Branch**: `019-dashboard-trends` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/019-dashboard-trends/spec.md`

## Summary

Add a collapsible Trends section to the bottom of the owner dashboard (`app/(app)/(tabs)/index.tsx`) that displays five charts — weekly bookings, weekly average rating, weekly revenue, category demand mix, and a peak hours heatmap — for a user-selected period (8 weeks / 12 weeks / 6 months). Each chart is accompanied by a one-sentence automated headline insight. Trend data is cached for one hour. A role-gated Export button is introduced for Center Owners. The section is collapsed by default and its open/closed state persists for the session.

**Technical approach**: One new consolidated backend endpoint (`GET /analytics/center/trends`) serves all five chart datasets in a single RTK Query call with a 3600-second cache. Four charts use `react-native-gifted-charts` (BarChart × 2, LineChart × 1, PieChart × 1). The heatmap is a custom grid component (no library). Headline insights are computed client-side in `hooks/useTrendInsights.ts`.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.81.5, Expo SDK 54  
**Primary Dependencies**: `react-native-gifted-charts` v1.4.76 (already installed), NativeWind (Tailwind CSS), Redux Toolkit + RTK Query, Expo Router, react-i18next  
**Storage**: No persistent storage — collapsed state is local React state (session-level); trend data cached by RTK Query for 3600s  
**Testing**: Manual smoke test per quickstart.md testing scenarios; no automated test suite currently in use for screens  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Performance Goals**: All 5 charts render within 3 seconds of a period change on a standard mobile connection (SC-002)  
**Constraints**: One-hour data staleness acceptable (FR-015); collapsed section occupies ≤ 1 row header when closed (SC-004); full bilingual RTL/LTR support required  
**Scale/Scope**: Single dashboard screen modification; ~12 new components; 1 new hook; 1 new types file; 1 new RTK Query endpoint

---

## Constitution Check

### I. Spec-Driven Development ✅
Spec exists at `specs/019-dashboard-trends/spec.md`. Plan follows spec.

### II. Bilingual First ✅
- All display strings use `i18n.t()` — no hardcoded English or Arabic.
- Category names use `nameAr`/`nameEn` pattern.
- Headline insights are generated with locale-aware day/month names.
- RTL layout verified in checklist inside `quickstart.md`.

### III. Component-Driven UI ✅
- Each chart is an independent component under `components/dashboard/trends/`.
- Shared utility components: `ChartEmptyState`, `ChartLimitedDataCaption`, `ChartHeadline`, `ExportReportButton`.
- Dashboard screen composes these; no monolithic view.
- NativeWind used for all styling.

### IV. API Contract Adherence ✅
- New endpoint consumed via RTK Query (`useGetTrendsQuery`).
- Auth header applied via existing `prepareHeaders` in `analyticsApi`.
- No hardcoded URLs — uses `API_BASE_URL` from env config.
- Error handling follows `BusinessErrorCode` contract via existing RTK Query error middleware.

### V. Owner-Context Awareness ✅
- Trends section visible to both Center Owners and Branch Managers (both are operational roles).
- Export button visible to Center Owners only (`userType === 'CENTER_OWNER'` guard).
- No customer-facing content added.

### VI. Security & Privacy ✅
- JWT stored in SecureStore (unchanged from existing auth flow).
- No PII logged.
- API calls over HTTP locally, HTTPS in production (existing config).

### VII. Production Readiness ✅
- No feature flags.
- No pseudocode.
- `ChartEmptyState` handles the zero-history case (no blank canvases).
- Export button has a defined "Coming soon" state — no broken UI path.

---

## Project Structure

### Documentation (this feature)

```text
specs/019-dashboard-trends/
├── plan.md                   # This file
├── spec.md                   # Feature specification
├── research.md               # Phase 0 output — all decisions documented
├── data-model.md             # Phase 1 output — TypeScript types + state flow
├── quickstart.md             # Phase 1 output — developer guide
├── contracts/
│   └── trends-api.md         # Phase 1 output — API contract for backend
└── tasks.md                  # Phase 2 output (created by /speckit.tasks)
```

### Source Code — New and Modified Files

```text
types/
└── trends.ts                                  NEW — TrendPeriod, TrendsResponse, WeeklyBookingStat,
                                                      WeeklyRatingStat, WeeklyRevenueStat,
                                                      CategoryMixEntry, PeakHourByDayEntry,
                                                      TrendInsights, HeatmapCell, TrendsQueryArgs

store/api/
└── analyticsApi.ts                            MODIFIED — add getTrends endpoint + keepUnusedDataFor:3600
                                                           export useGetTrendsQuery

hooks/
└── useTrendInsights.ts                        NEW — computes TrendInsights from TrendsResponse

components/dashboard/trends/
├── TrendsSectionHeader.tsx                    NEW — chevron toggle + period selector (segmented control)
├── BookingVolumeChart.tsx                     NEW — BarChart + ChartHeadline + empty/limited states
├── RatingTrendChart.tsx                       NEW — LineChart (y:1–5 fixed) + ChartHeadline
├── RevenueTrendChart.tsx                      NEW — BarChart (KWD) + ChartHeadline
├── CategoryMixChart.tsx                       NEW — PieChart + ChartHeadline
├── PeakHoursHeatmap.tsx                       NEW — custom 7×24 grid View + ChartHeadline
├── ChartHeadline.tsx                          NEW — shared one-sentence insight display
├── ChartEmptyState.tsx                        NEW — shared empty-state (icon + message)
├── ChartLimitedDataCaption.tsx               NEW — "Showing X of Y weeks" caption
└── ExportReportButton.tsx                    NEW — owner-only export entry point (Coming Soon)

app/(app)/(tabs)/
└── index.tsx                                  MODIFIED — mount TrendsSection at bottom;
                                                            add ExportReportButton (owner-only);
                                                            add trendsExpanded + selectedPeriod state

lib/i18n/locales/
├── en.json                                    MODIFIED — add trends.* i18n keys
└── ar.json                                    MODIFIED — add trends.* i18n keys (Arabic)
```

---

## Complexity Tracking

No constitution violations — standard complexity for this feature.

---

## Implementation Sequence

The tasks (generated by `/speckit.tasks`) should follow this dependency order:

1. **Types** — `types/trends.ts` (no dependencies)
2. **API** — `analyticsApi.ts` new endpoint (depends on types)
3. **Hook** — `useTrendInsights.ts` (depends on types; can proceed in parallel with step 4 onward)
4. **Shared components** — `ChartHeadline`, `ChartEmptyState`, `ChartLimitedDataCaption` (depends on types)
5. **Chart components** — each independently (depends on steps 2–4)
6. **Heatmap component** — `PeakHoursHeatmap.tsx` (most complex; depends on steps 3–4)
7. **Section header** — `TrendsSectionHeader.tsx` (depends on types; no chart dependency)
8. **Export button** — `ExportReportButton.tsx` (independent of charts)
9. **Dashboard integration** — modify `index.tsx` (depends on all above)
10. **i18n keys** — add to en.json + ar.json (can proceed from step 1 onward)
11. **RTL smoke test** — verify Arabic layout for all charts and the heatmap

---

## Open Questions for Backend

The following must be confirmed with the backend team before implementation begins:

1. **Does `GET /analytics/center/trends` already exist?** If yes, verify the response shape matches `contracts/trends-api.md`. If no, the backend needs to implement it per the contract before the frontend tasks can proceed past step 2.

2. **Does `PeakHourByDayEntry` include `dayOfWeek`?** The existing `PeakHoursResponse` type only has `{hour, bookingCount}`. If the backend's peak-hours response doesn't include `dayOfWeek`, it must be added to the new consolidated endpoint.

3. **What `periodLabel` format does the backend use?** The contract specifies `"MMM d"` (e.g., "Apr 28"). Confirm this is the actual format so the frontend doesn't need to reformat dates.
