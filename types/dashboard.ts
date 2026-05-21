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

export interface PipelineStageData {
  stage: PipelineWorkStage;
  count: number;
}

export interface KpiMetric {
  value: number | null;
  baseline: number | null;
  hasSufficientHistory: boolean;
}

export interface OnTimeRateMetric extends KpiMetric {
  target: number;
}

export interface DashboardKpis {
  bookingsToday: KpiMetric;
  avgCompletionTimeHours: KpiMetric;
  onTimeCompletionRate: OnTimeRateMetric;
  revenueToday: KpiMetric;
}

export interface DashboardSnapshot {
  pipeline: PipelineStageData[];
  kpis: DashboardKpis;
}

export interface KpiCardViewModel {
  labelKey: string;
  subtitleKey: string;
  value: number | null;
  baseline: number | null;
  hasSufficientHistory: boolean;
  positiveIsGood: boolean;
  formatValue: (v: number | null) => string;
  target?: number;
  overrideSubtitleKey?: string;
}

/**
 * Returns null when delta cannot be computed safely (zero/null baseline, insufficient history).
 * Callers display "—" in this case instead of dividing by zero.
 */
export function computeDelta(
  value: number | null,
  baseline: number | null,
  hasSufficientHistory: boolean,
): number | null {
  if (!hasSufficientHistory) return null;
  if (value === null || baseline === null) return null;
  if (baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}
