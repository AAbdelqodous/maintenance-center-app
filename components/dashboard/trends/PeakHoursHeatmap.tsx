import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChartHeadline } from './ChartHeadline';
import { ChartEmptyState } from './ChartEmptyState';
import type { PeakHourByDayEntry } from '@/types/trends';

const CELL_SIZE = 22;
const DAY_LABEL_WIDTH = 42;
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

// 5-step blue intensity palette (lightest → darkest)
const INTENSITY_COLORS = ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'];

function intensityToColor(intensity: number): string {
  if (intensity === 0) return INTENSITY_COLORS[0];
  if (intensity <= 0.25) return INTENSITY_COLORS[1];
  if (intensity <= 0.5) return INTENSITY_COLORS[2];
  if (intensity <= 0.75) return INTENSITY_COLORS[3];
  return INTENSITY_COLORS[4];
}

function formatHour(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

interface PeakHoursHeatmapProps {
  data: PeakHourByDayEntry[];
  insight: string;
  isLoading: boolean;
}

export function PeakHoursHeatmap({ data, insight, isLoading }: PeakHoursHeatmapProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.peakHours')}</Text>
        <View style={styles.skeleton} />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.peakHours')}</Text>
        <ChartEmptyState />
      </View>
    );
  }

  // Build lookup: "day-hour" → bookingCount
  const lookup = new Map<string, number>();
  let maxCount = 0;
  for (const entry of data) {
    lookup.set(`${entry.dayOfWeek}-${entry.hour}`, entry.bookingCount);
    if (entry.bookingCount > maxCount) maxCount = entry.bookingCount;
  }

  const hours = isRTL ? [...ALL_HOURS].reverse() : ALL_HOURS;

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>{t('trends.charts.peakHours')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Hour header */}
          <View style={[styles.row, isRTL && styles.rowRtl]}>
            <View style={{ width: DAY_LABEL_WIDTH }} />
            {hours.map((h) => (
              <View key={h} style={styles.headerCell}>
                {h % 6 === 0 && (
                  <Text style={styles.hourLabel}>{formatHour(h)}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Day rows */}
          {ALL_DAYS.map((day) => (
            <View key={day} style={[styles.row, isRTL && styles.rowRtl]}>
              <View style={[styles.dayLabelCell, { width: DAY_LABEL_WIDTH }]}>
                <Text style={styles.dayText}>{t(`trends.days.${day}`)}</Text>
              </View>
              {hours.map((hour) => {
                const count = lookup.get(`${day}-${hour}`) ?? 0;
                const intensity = maxCount > 0 ? count / maxCount : 0;
                return (
                  <View
                    key={hour}
                    style={[styles.cell, { backgroundColor: intensityToColor(intensity) }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <ChartHeadline text={insight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  skeleton: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  headerCell: {
    width: CELL_SIZE,
    height: 16,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  hourLabel: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  dayLabelCell: {
    justifyContent: 'center',
    paddingRight: 4,
  },
  dayText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
    marginHorizontal: 1,
  },
});
