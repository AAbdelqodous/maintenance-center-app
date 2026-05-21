import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { ChartHeadline } from './ChartHeadline';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLimitedDataCaption } from './ChartLimitedDataCaption';
import { TREND_PERIOD_WEEKS } from '@/types/trends';
import type { WeeklyRevenueStat, TrendPeriod } from '@/types/trends';

interface RevenueTrendChartProps {
  data: WeeklyRevenueStat[];
  insight: string;
  isLoading: boolean;
  period: TrendPeriod;
}

export function RevenueTrendChart({ data, insight, isLoading, period }: RevenueTrendChartProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chartWidth = width - 64;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.revenue')}</Text>
        <View style={[styles.skeleton, { width: chartWidth }]} />
      </View>
    );
  }

  const totalWeeks = TREND_PERIOD_WEEKS[period];

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>{t('trends.charts.revenue')}</Text>
      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <>
          <BarChart
            data={data.map((w) => ({
              value: w.totalKwd,
              label: w.periodLabel,
              frontColor: '#10B981',
            }))}
            width={chartWidth}
            height={180}
            barWidth={Math.max(8, Math.floor(chartWidth / data.length / 1.5))}
            noOfSections={4}
            barBorderRadius={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor="#E5E7EB"
            hideRules
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            isAnimated
          />
          {data.length < totalWeeks && (
            <ChartLimitedDataCaption actual={data.length} total={totalWeeks} />
          )}
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
  axisText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
