# Developer Quickstart: Dashboard Pipeline & KPI Cards

**Branch**: `017-dashboard-pipeline-kpi` | **Date**: 2026-05-21

## Prerequisites

- Specs 015 (Staff Management Foundation) and 016 (Attention Required Panel) merged to master
- Node / Expo environment working (`npx expo start --web`)
- Backend running locally (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`)

## What This Feature Changes

| File | Change |
|------|--------|
| `types/dashboard.ts` | **NEW** — all new TypeScript types |
| `store/api/analyticsApi.ts` | **MODIFIED** — adds `getDashboardSnapshot` endpoint |
| `hooks/useDashboardSnapshot.ts` | **NEW** — focus-aware polling hook |
| `components/dashboard/PipelineChip.tsx` | **NEW** |
| `components/dashboard/PipelineStrip.tsx` | **NEW** |
| `components/dashboard/KpiCard.tsx` | **NEW** |
| `components/dashboard/KpiGrid.tsx` | **NEW** |
| `app/(app)/staff/dashboard.tsx` | **MODIFIED** — replaces 5 stat cards |
| `app/(app)/(tabs)/index.tsx` | **MODIFIED** — adds pipeline section above AttentionPanel |
| `lib/i18n/locales/en.json` | **MODIFIED** — ~20 new keys |
| `lib/i18n/locales/ar.json` | **MODIFIED** — Arabic translations |

## Implementation Order

Follow this order to avoid missing-type errors:

1. `types/dashboard.ts` — defines all interfaces; nothing else depends on it yet
2. `store/api/analyticsApi.ts` — add `getDashboardSnapshot`; export the hook
3. `hooks/useDashboardSnapshot.ts` — wraps the RTK Query call
4. `components/dashboard/PipelineChip.tsx` — leaf component; no deps on other new files
5. `components/dashboard/PipelineStrip.tsx` — depends on `PipelineChip`
6. `components/dashboard/KpiCard.tsx` — leaf component
7. `components/dashboard/KpiGrid.tsx` — depends on `KpiCard`
8. `lib/i18n/locales/en.json` + `ar.json` — add keys (required before screens compile)
9. `app/(app)/staff/dashboard.tsx` — replace stat card grid
10. `app/(app)/(tabs)/index.tsx` — add `DashboardPipelineSection`

## Key Code Patterns

### Hook (focus-aware polling)
```typescript
// hooks/useDashboardSnapshot.ts
import { useIsFocused } from '@react-navigation/native';
import { useGetDashboardSnapshotQuery } from '@/store/api/analyticsApi';

export function useDashboardSnapshot() {
  const isFocused = useIsFocused();
  return useGetDashboardSnapshotQuery(undefined, {
    pollingInterval: isFocused ? 60_000 : 0,
    refetchOnFocus: true,
  });
}
```

### Bottleneck Detection (in PipelineStrip)
```typescript
function findBottleneck(stages: PipelineStageData[]): PipelineWorkStage | null {
  const total = stages.reduce((s, p) => s + p.count, 0);
  if (total === 0) return null;
  const candidate = stages.reduce((a, b) => (a.count > b.count ? a : b));
  const othersSum = stages.reduce((s, p) => (p.stage !== candidate.stage ? s + p.count : s), 0);
  const mean = othersSum / (stages.length - 1);
  return candidate.count >= 2 * mean ? candidate.stage : null;
}
```

### Chip Proportional Width
```typescript
// In PipelineStrip, compute flexWeight for each stage
const totalCount = stages.reduce((s, p) => s + p.count, 0) || 1;
const stageViewModels = stages.map(s => ({
  ...s,
  flexWeight: s.count / totalCount,
}));
// Each PipelineChip receives flexWeight and uses style={{ flexGrow: flexWeight, minWidth: 44 }}
```

### Delta Badge Color
```typescript
// In KpiCard
function getDeltaColor(delta: number | null, positiveIsGood: boolean): string {
  if (delta === null || delta === 0) return '#9CA3AF'; // grey
  const isGood = positiveIsGood ? delta > 0 : delta < 0;
  return isGood ? '#10B981' : '#EF4444'; // green : red
}
```

### KWD Formatting
```typescript
function formatKwd(value: number | null): string {
  if (value === null) return '—';
  return `KD ${value.toFixed(3)}`;
}
```

## Testing Scenarios

### Pipeline Bottleneck
Manually set booking work stages in the backend so that one stage has ≥ 2× the average of the others. Verify:
- That stage chip is visually highlighted
- Bottleneck caption appears with the correct stage name
- Caption is in the correct language

### Zero-Count Stage
Set all bookings away from "Quote Ready". Verify:
- The Quote Ready chip still renders at minimum width
- Count shows "0"
- No bottleneck flag if no other stage dominates

### KPI Null Baseline
On a fresh branch with < 7 days of history:
- All four KPI delta areas show "—"
- Subtitle reads "Not enough history yet" (in the correct locale)
- No runtime error

### Auto-Refresh
1. Note current pipeline counts
2. Move a booking to a different work stage in the backend
3. Wait up to 60 seconds
4. Verify pipeline counts update without any user gesture

### RTL Layout
Switch app locale to Arabic:
- Pipeline stages display right-to-left (READY_FOR_PICKUP on the left, RECEIVED on the right)
- Delta arrow directions remain semantically correct (↑ = increase, ↓ = decrease in both locales)
- KWD label position follows Arabic typography conventions
- Bottleneck caption aligns to the right edge

### 360 px Width
Run on a narrow device or set browser to 360 px width:
- All 6 stage chips visible without horizontal scroll
- 2×2 KPI grid does not collapse to a single column
- Chip labels use abbreviated form (e.g., "Rcvd", "Diag")

## Backend Dependency

If `GET /analytics/center/dashboard-snapshot` does not yet exist on the backend, the frontend component renders in a graceful loading/error state. To mock locally during development, intercept in RTK Query's `baseQuery` or use the Spring Boot `@Profile("dev")` mock endpoint pattern.
