import { useTranslation } from 'react-i18next';
import { TREND_PERIOD_WEEKS } from '@/types/trends';
import type { TrendsResponse, TrendPeriod, TrendInsights } from '@/types/trends';

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function useTrendInsights(
  data: TrendsResponse | undefined,
  period: TrendPeriod
): TrendInsights {
  const { t, i18n } = useTranslation();
  const weeks = TREND_PERIOD_WEEKS[period];
  const notEnough = t('trends.insight.notEnoughData');

  if (!data) {
    return { bookings: notEnough, rating: notEnough, revenue: notEnough, category: notEnough, peakHour: notEnough };
  }

  // --- Bookings ---
  let bookingsInsight: string;
  const bw = data.bookingsByWeek;
  if (bw.length < 2) {
    bookingsInsight = notEnough;
  } else {
    const firstAvg = mean(bw.slice(0, 2).map((w) => w.total));
    const lastAvg = mean(bw.slice(-2).map((w) => w.total));
    if (firstAvg === 0 && lastAvg === 0) {
      bookingsInsight = notEnough;
    } else if (firstAvg === 0) {
      bookingsInsight = t('trends.insight.bookingsStable', { count: Math.round(lastAvg) });
    } else {
      const delta = ((lastAvg - firstAvg) / firstAvg) * 100;
      if (Math.abs(delta) < 5) {
        bookingsInsight = t('trends.insight.bookingsStable', { count: Math.round(lastAvg) });
      } else if (delta > 0) {
        bookingsInsight = t('trends.insight.bookingsUp', { pct: Math.round(delta), weeks });
      } else {
        bookingsInsight = t('trends.insight.bookingsDown', { pct: Math.round(Math.abs(delta)), weeks });
      }
    }
  }

  // --- Rating ---
  let ratingInsight: string;
  const validRatings = data.ratingsByWeek.filter((w) => w.average !== null);
  if (validRatings.length < 2) {
    ratingInsight = notEnough;
  } else {
    const values = validRatings.map((w) => w.average as number);
    const avg = mean(values);
    const range = Math.max(...values) - Math.min(...values);
    if (range < 0.3) {
      ratingInsight = t('trends.insight.ratingStable', { value: avg.toFixed(1) });
    } else {
      const first = values[0];
      const last = values[values.length - 1];
      if (last >= first) {
        ratingInsight = t('trends.insight.ratingImproving', { value: last.toFixed(1) });
      } else {
        ratingInsight = t('trends.insight.ratingDeclining', { value: last.toFixed(1) });
      }
    }
  }

  // --- Revenue ---
  let revenueInsight: string;
  const rw = data.revenueByWeek;
  if (rw.length < 2) {
    revenueInsight = notEnough;
  } else {
    const firstAvg = mean(rw.slice(0, 2).map((w) => w.totalKwd));
    const lastAvg = mean(rw.slice(-2).map((w) => w.totalKwd));
    if (firstAvg === 0 && lastAvg === 0) {
      revenueInsight = notEnough;
    } else if (firstAvg === 0) {
      revenueInsight = t('trends.insight.revenueStable', { amount: lastAvg.toFixed(3) });
    } else {
      const delta = ((lastAvg - firstAvg) / firstAvg) * 100;
      if (Math.abs(delta) < 5) {
        revenueInsight = t('trends.insight.revenueStable', { amount: lastAvg.toFixed(3) });
      } else if (delta > 0) {
        revenueInsight = t('trends.insight.revenueUp', { pct: Math.round(delta), weeks });
      } else {
        revenueInsight = t('trends.insight.revenueDown', { pct: Math.round(Math.abs(delta)), weeks });
      }
    }
  }

  // --- Category mix ---
  let categoryInsight: string;
  if (data.categoryMix.length === 0) {
    categoryInsight = notEnough;
  } else {
    const top = [...data.categoryMix].sort((a, b) => b.sharePercent - a.sharePercent)[0];
    const name = i18n.language === 'ar' ? top.categoryNameAr : top.categoryNameEn;
    categoryInsight = t('trends.insight.topCategory', { name, pct: Math.round(top.sharePercent) });
  }

  // --- Peak hours ---
  let peakHourInsight: string;
  if (data.peakHours.length === 0) {
    peakHourInsight = notEnough;
  } else {
    const peak = [...data.peakHours].sort((a, b) => b.bookingCount - a.bookingCount)[0];
    const day = t(`trends.daysFull.${peak.dayOfWeek}`);
    peakHourInsight = t('trends.insight.peakHour', {
      day,
      startHour: peak.hour,
      endHour: peak.hour + 1,
    });
  }

  return {
    bookings: bookingsInsight,
    rating: ratingInsight,
    revenue: revenueInsight,
    category: categoryInsight,
    peakHour: peakHourInsight,
  };
}
