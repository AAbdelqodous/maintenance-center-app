# Data Model: Dashboard Pipeline & KPI Cards

**Phase**: 1 | **Date**: 2026-05-21 | **Plan**: [plan.md](plan.md)

New types live in `types/dashboard.ts`. They augment existing types — nothing in `types/workProgress.ts` or `store/api/bookingsApi.ts` changes.

---

## Pipeline Stage Enum Subset

Only the six active (non-terminal) work stages appear in the pipeline strip. Terminal stages (PICKED_UP, CANCELLED) are excluded from the pipeline response by the backend.

```typescript
// types/dashboard.ts

export type PipelineWorkStage =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'QUOTE_READY'
  | 'IN_PROGRESS'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP';

export const PIPELINE_STAGE_ORDER: PipelineWorkStage[] = [
  'RECEIVED',
  'DIAGNOSING',
  'QUOTE_READY',
  'IN_PROGRESS',
  'QUALITY_CHECK',
  'READY_FOR_PICKUP',
];
```

---

## PipelineStageData

```typescript
// types/dashboard.ts

export interface PipelineStageData {
  stage: PipelineWorkStage;
  count: number;              // current booking count at this stage; always >= 0
}
```

**Derived at render time** (not stored — computed in `PipelineStrip`):

```typescript
interface PipelineStageViewModel extends PipelineStageData {
  flexWeight: number;         // count / Math.max(totalCount, 1); range [0, 1]
  isBottleneck: boolean;      // count >= 2 * mean(otherStages.map(s => s.count))
}
```

---

## KPI Metric

```typescript
// types/dashboard.ts

export interface KpiMetric {
  value: number | null;       // null = not available (e.g., revenue with no payment data)
  baseline: number | null;    // null = insufficient history
  hasSufficientHistory: boolean;
}

// Consumed by KpiCard; not sent over the wire — constructed from KpiMetric + card config.
export interface KpiCardViewModel {
  labelKey: string;           // i18n key for the metric label
  subtitleKey: string;        // i18n key for the baseline description
  value: number | null;
  baseline: number | null;
  hasSufficientHistory: boolean;
  positiveIsGood: boolean;    // true = up is green; false = up is red
  formatValue: (v: number) => string;   // formatting function (count, hours, %, KD)
  target?: number;            // optional target threshold (e.g., 90 for on-time rate)
}
```

---

## On-Time Rate Metric (extended)

```typescript
// types/dashboard.ts

export interface OnTimeRateMetric extends KpiMetric {
  target: number;             // always 90 — included in API response for forward compatibility
}
```

---

## Dashboard Snapshot (full API response)

```typescript
// types/dashboard.ts

export interface DashboardKpis {
  bookingsToday: KpiMetric;
  avgCompletionTimeHours: KpiMetric;
  onTimeCompletionRate: OnTimeRateMetric;
  revenueToday: KpiMetric;
}

export interface DashboardSnapshot {
  pipeline: PipelineStageData[];   // exactly 6 entries, one per PipelineWorkStage, ordered
  kpis: DashboardKpis;
}
```

---

## Computed Delta Logic (client-side helper)

```typescript
// types/dashboard.ts (or inlined in KpiCard)

/**
 * Returns null if delta cannot be computed (zero/null baseline or no history).
 * Returns a percentage rounded to the appropriate precision.
 */
export function computeDelta(value: number | null, baseline: number | null, hasSufficientHistory: boolean): number | null {
  if (!hasSufficientHistory) return null;
  if (value === null || baseline === null) return null;
  if (baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}
```

---

## i18n Keys (new additions)

All keys added to `lib/i18n/locales/en.json` and `lib/i18n/locales/ar.json`.

```json
// en.json additions under "dashboard" namespace
{
  "dashboard": {
    "pipeline": {
      "title": "Live Pipeline",
      "bottleneck": "Bottleneck: {{stage}}",
      "stages": {
        "RECEIVED": "Rcvd",
        "DIAGNOSING": "Diag",
        "QUOTE_READY": "Quote",
        "IN_PROGRESS": "In Prg",
        "QUALITY_CHECK": "QA",
        "READY_FOR_PICKUP": "Ready"
      },
      "stagesLong": {
        "RECEIVED": "Received",
        "DIAGNOSING": "Diagnosing",
        "QUOTE_READY": "Quote",
        "IN_PROGRESS": "In Progress",
        "QUALITY_CHECK": "Quality Check",
        "READY_FOR_PICKUP": "Ready for Pickup"
      }
    },
    "kpi": {
      "bookingsToday": "Bookings Today",
      "bookingsTodayBaseline": "vs. same day last week",
      "avgCompletionTime": "Avg Completion",
      "avgCompletionTimeBaseline": "vs. 30-day avg",
      "avgCompletionTimeUnit": "{{hours}}h",
      "onTimeRate": "On-Time Rate",
      "onTimeRateBaseline": "vs. prev 7 days",
      "onTimeRateTarget": "Target: {{target}}%",
      "revenueToday": "Revenue Today",
      "revenueTodayBaseline": "vs. 30-day avg",
      "revenueUnavailable": "Revenue tracking not available",
      "notEnoughHistory": "Not enough history yet",
      "noChange": "No change"
    }
  }
}
```

```json
// ar.json additions (Arabic)
{
  "dashboard": {
    "pipeline": {
      "title": "خط الإنتاج المباشر",
      "bottleneck": "اختناق: {{stage}}",
      "stages": {
        "RECEIVED": "استلم",
        "DIAGNOSING": "فحص",
        "QUOTE_READY": "عرض",
        "IN_PROGRESS": "تنفيذ",
        "QUALITY_CHECK": "جودة",
        "READY_FOR_PICKUP": "جاهز"
      },
      "stagesLong": {
        "RECEIVED": "تم الاستلام",
        "DIAGNOSING": "جاري الفحص",
        "QUOTE_READY": "عرض السعر",
        "IN_PROGRESS": "جاري التنفيذ",
        "QUALITY_CHECK": "فحص الجودة",
        "READY_FOR_PICKUP": "جاهز للاستلام"
      }
    },
    "kpi": {
      "bookingsToday": "حجوزات اليوم",
      "bookingsTodayBaseline": "مقارنة بنفس اليوم الأسبوع الماضي",
      "avgCompletionTime": "متوسط وقت الإنجاز",
      "avgCompletionTimeBaseline": "مقارنة بمتوسط 30 يوم",
      "avgCompletionTimeUnit": "{{hours}} س",
      "onTimeRate": "معدل الالتزام بالوقت",
      "onTimeRateBaseline": "مقارنة بالأسبوع السابق",
      "onTimeRateTarget": "الهدف: {{target}}%",
      "revenueToday": "إيرادات اليوم",
      "revenueTodayBaseline": "مقارنة بمتوسط 30 يوم",
      "revenueUnavailable": "تتبع الإيرادات غير متاح",
      "notEnoughHistory": "لا توجد بيانات كافية بعد",
      "noChange": "لا تغيير"
    }
  }
}
```

---

## State Transitions

The `DashboardSnapshot` is read-only — no mutations. The only state transitions are:
- `isLoading → isSuccess`: first successful fetch renders pipeline + KPI sections
- `isSuccess → isFetching` (on 60 s interval): sections retain previous data; no loading spinner shown (silent refresh)
- `isSuccess → isError` (network failure during refresh): sections retain last-good data with optional stale indicator

No write operations. No tag invalidations triggered by this feature.
