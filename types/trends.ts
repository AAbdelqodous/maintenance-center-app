export type TrendPeriod = '8_WEEKS' | '12_WEEKS' | '6_MONTHS';

export const TREND_PERIOD_WEEKS: Record<TrendPeriod, number> = {
  '8_WEEKS': 8,
  '12_WEEKS': 12,
  '6_MONTHS': 26,
};

export interface WeeklyBookingStat {
  isoWeek: string;
  periodLabel: string;
  total: number;
}

export interface WeeklyRatingStat {
  isoWeek: string;
  periodLabel: string;
  average: number | null;
  reviewCount: number;
}

export interface WeeklyRevenueStat {
  isoWeek: string;
  periodLabel: string;
  totalKwd: number;
}

export interface CategoryMixEntry {
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  bookingCount: number;
  sharePercent: number;
}

export interface PeakHourByDayEntry {
  dayOfWeek: number;
  hour: number;
  bookingCount: number;
}

export interface TrendsResponse {
  bookingsByWeek: WeeklyBookingStat[];
  ratingsByWeek: WeeklyRatingStat[];
  revenueByWeek: WeeklyRevenueStat[];
  categoryMix: CategoryMixEntry[];
  peakHours: PeakHourByDayEntry[];
}

export interface TrendsQueryArgs {
  startDate: string;
  endDate: string;
}

export interface TrendInsights {
  bookings: string;
  rating: string;
  revenue: string;
  category: string;
  peakHour: string;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  bookingCount: number;
  intensity: number;
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - daysToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function trendPeriodToDateRange(period: TrendPeriod): { startDate: string; endDate: string } {
  const today = new Date();
  const weeks = TREND_PERIOD_WEEKS[period];
  const msPerDay = 24 * 60 * 60 * 1000;
  const rawStart = new Date(today.getTime() - weeks * 7 * msPerDay);
  const alignedStart = startOfIsoWeek(rawStart);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(alignedStart), endDate: fmt(today) };
}
