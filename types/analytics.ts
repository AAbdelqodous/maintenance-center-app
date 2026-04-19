export type AnalyticsPeriod = 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_3_MONTHS';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function periodToDateRange(period: AnalyticsPeriod): DateRange {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'THIS_WEEK':
      start = new Date(now);
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;

    case 'THIS_MONTH':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0);
      break;

    case 'LAST_3_MONTHS':
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export interface AnalyticsQueryArgs {
  startDate: string;
  endDate: string;
}

export interface BookingTrendsQueryArgs extends AnalyticsQueryArgs {
  granularity: 'DAILY' | 'WEEKLY';
}

export interface PerformanceSummary {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  averageRating: number | null;
  totalRevenue: number;
  revenueAvailable: boolean;
}

export interface BookingTrend {
  periodLabel: string;
  periodStart: string;
  completed: number;
  cancelled: number;
  total: number;
}

export interface BookingTrendsResponse {
  granularity: 'DAILY' | 'WEEKLY';
  data: BookingTrend[];
}

export interface RevenueByCategoryEntry {
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  completedBookings: number;
  revenue: number;
}

export type RevenueByCategoryResponse = RevenueByCategoryEntry[];

export interface RatingBucket {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface SatisfactionSummary {
  averageRating: number | null;
  previousPeriodAverage: number | null;
  totalReviews: number;
  distribution: RatingBucket[];
}

export interface PeakHourEntry {
  hour: number;
  bookingCount: number;
}

export type PeakHoursResponse = PeakHourEntry[];
