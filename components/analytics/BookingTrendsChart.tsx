import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-gifted-charts';
import { BookingTrend } from '@/types/analytics';

interface BookingTrendsChartProps {
  data: BookingTrend[];
  granularity: 'DAILY' | 'WEEKLY';
  isLoading: boolean;
}

export function BookingTrendsChart({ data, granularity, isLoading }: BookingTrendsChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const screenWidth = Dimensions.get('window').width - 32;

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.trends.title')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const completedData = data.map((item) => ({
    label: item.periodLabel,
    value: item.completed,
    labelComponent: () => <Text style={styles.xAxisLabel}>{item.periodLabel}</Text>,
    frontColor: '#4CAF50',
  }));

  const cancelledData = data.map((item) => ({
    label: item.periodLabel,
    value: item.cancelled,
    labelComponent: () => <Text style={styles.xAxisLabel}>{item.periodLabel}</Text>,
    frontColor: '#F44336',
  }));

  const maxValue = Math.max(
    ...data.map(d => d.total),
    1
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('analytics.trends.title')}</Text>
      
      <View style={styles.chartContainer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>{t('analytics.trends.completed')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>{t('analytics.trends.cancelled')}</Text>
          </View>
        </View>

        <BarChart
          data={completedData}
          barWidth={20}
          spacing={Math.max(8, (screenWidth - (data.length * 20)) / (data.length + 1))}
          roundedTop
          roundedBottom
          hideRules
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.xAxisLabel}
          noOfSections={4}
          maxValue={maxValue * 1.1}
          showLine
          lineData={cancelledData.map((d, i) => ({
            value: d.value,
            dataPointText: d.value > 0 ? d.value.toString() : '',
          }))}
          lineConfig={{
            color: '#F44336',
            thickness: 2,
            curved: true,
            hideDataPoints: true,
          }}
          onPress={(item, index) => {
          }}
          height={200}
          width={screenWidth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  axisText: {
    fontSize: 10,
    color: '#999999',
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666666',
  },
});
