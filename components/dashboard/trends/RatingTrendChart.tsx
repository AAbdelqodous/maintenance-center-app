import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { ChartHeadline } from './ChartHeadline';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLimitedDataCaption } from './ChartLimitedDataCaption';
import { TREND_PERIOD_WEEKS } from '@/types/trends';
import type { WeeklyRatingStat, TrendPeriod } from '@/types/trends';

interface RatingTrendChartProps {
  data: WeeklyRatingStat[];
  insight: string;
  isLoading: boolean;
  period: TrendPeriod;
}

export function RatingTrendChart({ data, insight, isLoading, period }: RatingTrendChartProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chartWidth = width - 64;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.rating')}</Text>
        <View style={[styles.skeleton, { width: chartWidth }]} />
      </View>
    );
  }

  const validData = data.filter((w) => w.average !== null);
  const totalWeeks = TREND_PERIOD_WEEKS[period];

  if (validData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>{t('trends.charts.rating')}</Text>
        <ChartEmptyState />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>{t('trends.charts.rating')}</Text>
      <LineChart
        data={validData.map((w) => ({ value: w.average as number, label: w.periodLabel }))}
        width={chartWidth}
        height={180}
        maxValue={5}
        noOfSections={5}
        stepValue={1}
        curved
        color="#F59E0B"
        thickness={2}
        hideDataPoints={false}
        dataPointsColor="#F59E0B"
        dataPointsRadius={3}
        startFillColor="#F59E0B"
        endFillColor="#FFFFFF"
        startOpacity={0.15}
        endOpacity={0}
        isAnimated
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor="#E5E7EB"
        hideRules
      />
      {validData.length < totalWeeks && (
        <ChartLimitedDataCaption actual={validData.length} total={totalWeeks} />
      )}
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
    height: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  axisText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
