# Research: Dashboard Pipeline & KPI Cards

**Phase**: 0 | **Date**: 2026-05-21 | **Plan**: [plan.md](plan.md)

---

## Decision 1 — Polling Pattern for Auto-Refresh

**Decision**: Use RTK Query `pollingInterval` option set to `60_000` when the screen is focused and `0` when it is not, using `useIsFocused()` from `@react-navigation/native`.

**Rationale**: This is the established pattern already used in `hooks/useAttentionItems.ts`:
```typescript
const isFocused = useIsFocused();
const pollingInterval = isFocused ? 60_000 : 0;
// passed to: useGetXxxQuery(arg, { pollingInterval })
```
RTK Query handles the timer internally, re-fetches on interval expiry, and merges the fresh response into the cache without triggering a full loading state. Setting `pollingInterval: 0` suspends polling cleanly — no manual `clearInterval` needed.

**Alternatives considered**:
- `setInterval` + manual `refetch()` call: More boilerplate, harder to pause on navigation, risk of memory leaks.
- `AppState` change detection: Covers background/foreground transitions but not tab-switch within the app; `useIsFocused` covers both.
- WebSocket push: Overcomplicated for a 60-second staleness requirement; no existing WS channel for analytics data.

---

## Decision 2 — Where to Place the New Endpoint

**Decision**: Add `getDashboardSnapshot` to the existing `store/api/analyticsApi.ts` (inject into the existing `analyticsApi` `createApi` instance).

**Rationale**: The existing `analyticsApi.ts` already owns all `analytics/center/*` endpoints with the same auth header setup and `'Analytics'` tag type. Adding a sixth endpoint here keeps cohesion and reuses the `baseUrl`, `prepareHeaders`, and tag plumbing without creating a new API slice.

**URL chosen**: `GET analytics/center/dashboard-snapshot`

**Alternatives considered**:
- New file `dashboardApi.ts`: Unnecessary proliferation; the store already has 13 API slices, and this endpoint fits the existing analytics domain.
- Add to `staffApi.ts`: Rejected — this data is center-wide, not staff-scoped. Both owner and staff dashboards call it.
- Add to `bookingsApi.ts`: Rejected — the endpoint aggregates multiple data sources (bookings, revenue, ratings); it belongs to the analytics domain.

---

## Decision 3 — Bottleneck Detection: Client-Side vs. Server-Side

**Decision**: Compute bottleneck detection **client-side** from the pipeline counts returned by the snapshot endpoint.

**Algorithm**:
```
const nonBottleneck = stages.filter(s => s !== candidate);
const mean = nonBottleneck.reduce((sum, s) => sum + s.count, 0) / nonBottleneck.length;
const isBottleneck = candidate.count >= 2 * mean;
```
Applied to each stage; the stage with the highest count is the bottleneck candidate. If that stage satisfies the 2× condition, it is flagged.

**Rationale**: The computation is O(n) on 6 elements — trivially fast. Doing it client-side avoids backend coupling and lets the UI experiment with different thresholds without API changes. The backend just returns raw counts.

**Alternatives considered**:
- Server-side flag on each stage: Would require the backend to know the threshold and compute it; threshold could later become configurable — better kept in UI layer.

---

## Decision 4 — Work Stage Prerequisite Handling

**Decision**: The endpoint contract assumes `workStage` is a field on each booking (Phase 4.0 prerequisite). The frontend type model uses `WorkStage` enum values (RECEIVED, DIAGNOSING, QUOTE_READY, IN_PROGRESS, QUALITY_CHECK, READY_FOR_PICKUP). If the backend does not yet expose this field, the dashboard snapshot endpoint falls back to mapping from `BookingStatus`:

| BookingStatus | Pipeline Stage |
|---------------|----------------|
| PENDING       | RECEIVED       |
| CONFIRMED     | DIAGNOSING     |
| IN_PROGRESS   | IN_PROGRESS    |
| *(terminal)*  | excluded       |

This mapping is lossy (no QUOTE_READY, QUALITY_CHECK, READY_FOR_PICKUP distinction), but allows the pipeline strip to render something meaningful without full Phase 4.0 work stage tracking.

**Implementation note**: The fallback mapping is handled **server-side in the dashboard-snapshot endpoint**, not in the frontend. The frontend always receives `WorkStage` enum values in the pipeline array — the backend decides how to map.

---

## Decision 5 — Proportional Chip Width Algorithm

**Decision**: Use `flexGrow` proportional to count in a `ScrollView`-free horizontal container, with a hard `minWidth` floor.

**Algorithm**:
```
totalCount = sum of all 6 stage counts (treat 0-count stages as contributing to denominator)
chipFlex   = stage.count / Math.max(totalCount, 1)   // always [0, 1]
minWidth   = 44 (px) — enough for a 2-digit count + label on smallest screen
```

Each chip uses `flexGrow: chipFlex` inside a `flex: 1` row. When all counts are 0, all chips share equal space (uniform flexGrow of ~0.167). The container does NOT scroll — all 6 chips always fit.

**Rationale**: Native flex layout handles proportional sizing without measuring container width or using Animated values. Stage labels are abbreviated (≤4 chars) for the 360 px constraint:
- Received → Rcvd
- Diagnosing → Diag
- Quote → Quot
- In Progress → InPrg
- Quality Check → QA
- Ready for Pickup → Ready

**Alternatives considered**:
- `useWindowDimensions` + manual pixel math: Works, but couples the component to device width and requires re-computation on orientation change.
- `Animated.Value` proportional to count: Enables smooth transitions between refreshes but adds complexity that isn't called for in the spec.

---

## Decision 6 — KPI Delta Sign Convention

**Decision**: Each KPI card has a hard-coded `positiveIsGood: boolean` flag in the component's data model. The badge is colored green when `delta > 0 && positiveIsGood` or `delta < 0 && !positiveIsGood`, and red otherwise.

| KPI | positiveIsGood | Reasoning |
|-----|---------------|-----------|
| Bookings Today | true | More bookings = more revenue |
| Avg Completion Time | false | Longer duration = worse throughput |
| On-Time Rate | true | Higher rate = better service |
| Revenue Today | true | Higher revenue = better |

**Zero-delta and null-delta handling**:
- `delta === 0`: No arrow, neutral grey badge
- `delta === null` (insufficient history or zero baseline): "—" badge, no color, subtitle "Not enough history yet"

---

## Decision 7 — Currency Formatting

**Decision**: Format KWD values as `KD X.XXX` (3 decimal places) using `toFixed(3)` + the string prefix `"KD "`. No native `Intl.NumberFormat` with locale-specific patterns — the constitution specifies the exact format `KD X.XXX` and the app does not currently use Intl.NumberFormat elsewhere.

**Alternatives considered**:
- `Intl.NumberFormat('ar-KW', { style: 'currency', currency: 'KWD' })`: Would produce locale-appropriate formatting but outputs `د.ك.‏` in Arabic locale — inconsistent with the app's existing `KD X.XXX` pattern.

---

## Decision 8 — Owner Dashboard Integration

**Decision**: Extract the pipeline + KPI sections into a `DashboardPipelineSection` composite component and add it to the owner dashboard (`app/(app)/(tabs)/index.tsx`) above the existing AttentionPanel. The owner's existing stat cards (Total, Pending, Confirmed, In Progress, Cancelled, Rating) are **not removed** — the pipeline provides complementary stage-level view while the stat cards provide status-level counts.

**Rationale**: The spec says owner sees the "same view" as branch manager. The cleanest interpretation: the owner dashboard gains the same pipeline + KPI section that the staff dashboard now has. The owner's existing cards stay because they show status (PENDING = not yet confirmed) rather than work stages, which are a different dimension.

**Alternatives considered**:
- Replace owner stat cards with pipeline: Owner-specific booking statuses (PENDING, CONFIRMED) are actionable for the owner but not shown in the pipeline; removing them would reduce operational visibility.
- Separate route for the "manager view": Overcomplicates navigation; owner already has the dashboard open.

---

## Decision 9 — Revenue KPI Unavailability Fallback

**Decision**: When `revenue.value === null` in the snapshot response (payment integration not active), the Revenue KPI card renders the value field as `"—"` and the delta field as `"—"` with a subtitle sourced from the new i18n key `dashboard.kpi.revenueUnavailable`.

The backend is responsible for returning `null` when revenue data is unavailable — the frontend treats `null` as "not available" rather than 0.

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---------|-----------|
| Where to add the polling endpoint | `analyticsApi.ts`, endpoint `analytics/center/dashboard-snapshot` |
| How to pause polling when unfocused | `pollingInterval: useIsFocused() ? 60_000 : 0` (existing pattern) |
| Bottleneck detection location | Client-side, O(6) computation |
| Work stage availability | Assumed available (Phase 4.0 prerequisite); backend fallback from `BookingStatus` if needed |
| Chip proportional sizing | `flexGrow` with `minWidth: 44` floor |
| KPI directional coloring | `positiveIsGood` flag per metric, embedded in component data |
| Currency format | `KD X.XXX` matching existing app convention |
| Owner dashboard scope | Additive — pipeline section inserted above AttentionPanel |
| Revenue unavailability | `null` value → "—" display with unavailability subtitle |
