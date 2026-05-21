import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { ChartHeadline } from './ChartHeadline';
import { ChartEmptyState } from './ChartEmptyState';
import type { CategoryMixEntry } from '@/types/trends';

const SLICE_COLORS = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#00BCD4'];

interface CategoryMixChartProps {
  data: CategoryMixEntry[];
  insight: string;
  isLoading: boolean;
}

export function CategoryMixChart({ data, insight, isLoading }: CategoryMixChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.categoryMix')}</Text>
        <View style={styles.skeleton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>{t('trends.charts.categoryMix')}</Text>
      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <>
          <View style={[styles.chartRow, isRTL && styles.chartRowRtl]}>
            <PieChart
              data={data.map((entry, idx) => ({
                value: entry.sharePercent,
                color: SLICE_COLORS[idx % SLICE_COLORS.length],
                text: `${Math.round(entry.sharePercent)}%`,
                textColor: '#FFFFFF',
                textSize: 11,
              }))}
              donut
              radius={80}
              innerRadius={50}
              showText
            />
            <View style={styles.legend}>
              {data.map((entry, idx) => (
                <View key={entry.categoryId} style={[styles.legendItem, isRTL && styles.legendItemRtl]}>
                  <View
                    style={[styles.legendDot, { backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }]}
                  />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {i18n.language === 'ar' ? entry.categoryNameAr : entry.categoryNameEn}
                  </Text>
                  <Text style={styles.legendPct}>{Math.round(entry.sharePercent)}%</Text>
                </View>
              ))}
            </View>
          </View>
          <ChartHeadline text={insight} />
        </>
      )}
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
    height: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  chartRowRtl: {
    flexDirection: 'row-reverse',
  },
  legend: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendItemRtl: {
    flexDirection: 'row-reverse',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  legendPct: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 4,
  },
});
