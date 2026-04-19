import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PeakHourEntry } from '@/types/analytics';
import { BarChart } from 'react-native-gifted-charts';

interface PeakHoursChartProps {
  data: PeakHourEntry[];
  isLoading: boolean;
}

export function PeakHoursChart({ data, isLoading }: PeakHoursChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.peakHours.title')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const maxBookings = Math.max(...data.map(d => d.bookingCount), 1);
  const peakHour = data.reduce((max, item) => 
    item.bookingCount > max.bookingCount ? item : max, 
    data[0]
  );

  const chartData = data.map((item) => ({
    label: item.hour.toString(),
    value: item.bookingCount,
    frontColor: item.hour === peakHour.hour ? '#2196F3' : '#90CAF9',
    showVerticalLine: true,
    verticalLineColor: '#E0E0E0',
    verticalLineThickness: 1,
  }));

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('analytics.peakHours.title')}</Text>

      <View style={styles.container}>
        <View style={styles.peakInfo}>
          <Text style={styles.peakLabel}>{t('analytics.peakHours.peakHour')}</Text>
          <Text style={styles.peakValue}>
            {formatHour(peakHour.hour)} ({peakHour.bookingCount} {t('analytics.peakHours.bookings')})
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              barWidth={20}
              spacing={8}
              roundedTop
              roundedBottom
              hideRules
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.xAxisLabel}
              noOfSections={4}
              maxValue={maxBookings * 1.1}
              height={180}
              width={Math.max(300, data.length * 28)}
              renderTooltip={(item, index) => {
                return (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{formatHour(item.hour)}</Text>
                    <Text style={styles.tooltipText}>
                      {item.bookingCount} {t('analytics.peakHours.bookings')}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
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
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  peakInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  peakLabel: {
    fontSize: 14,
    color: '#666666',
  },
  peakValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  chartContainer: {
    paddingHorizontal: 8,
  },
  axisText: {
    fontSize: 10,
    color: '#999999',
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666666',
  },
  tooltip: {
    backgroundColor: '#333333',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});
