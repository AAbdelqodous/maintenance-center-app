import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RevenueByCategoryEntry } from '@/types/analytics';
import { PieChart } from 'react-native-gifted-charts';

interface RevenueByCategoryProps {
  data: RevenueByCategoryEntry[];
  isLoading: boolean;
}

export function RevenueByCategory({ data, isLoading }: RevenueByCategoryProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.revenue.title')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];
  const totalBookings = data.reduce((sum, item) => sum + (item.completedBookings ?? 0), 0);

  const pieData = data.slice(0, 5).map((item, index) => ({
    value: item.completedBookings || 0,
    color: colors[index % colors.length],
    text: totalBookings > 0 ? `${((item.completedBookings / totalBookings) * 100).toFixed(0)}%` : '0%',
    label: isRTL ? item.categoryNameAr : item.categoryNameEn,
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('analytics.revenue.title')}</Text>

      <View style={styles.container}>
        <View style={styles.chartWrapper}>
          <PieChart
            data={pieData}
            donut
            showText
            textColor="#FFFFFF"
            radius={100}
            innerRadius={60}
            textSize={12}
            fontStyle={'bold' as any}
            showTextBackground
            textBackgroundColor="#333333"
            textBackgroundRadius={22}
          />
          <View style={styles.centerText}>
            <Text style={styles.centerValue}>{totalBookings}</Text>
            <Text style={styles.centerLabel}>bookings</Text>
          </View>
        </View>

        <View style={[styles.legend, isRTL && styles.legendRtl]}>
          {data.map((item, index) => {
            const percentage = totalBookings > 0 ? ((item.completedBookings / totalBookings) * 100).toFixed(1) : '0.0';
            return (
              <View key={item.categoryNameEn || index} style={[styles.legendItem, isRTL && styles.legendItemRtl]}>
                <View style={[styles.legendDot, { backgroundColor: colors[index % colors.length] }]} />
                <View style={styles.legendContent}>
                  <Text style={styles.legendName}>{isRTL ? item.categoryNameAr : item.categoryNameEn}</Text>
                  <Text style={styles.legendDetails}>
                    {item.completedBookings} {t('analytics.revenue.bookings')} • {percentage}%
                  </Text>
                </View>
                {item.revenue != null && (
                  <Text style={styles.legendRevenue}>KD {item.revenue.toFixed(3)}</Text>
                )}
              </View>
            );
          })}
        </View>
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
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  centerLabel: {
    fontSize: 14,
    color: '#666666',
  },
  legend: {
    gap: 12,
  },
  legendRtl: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItemRtl: {
    flexDirection: 'row-reverse',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendContent: {
    flex: 1,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  legendDetails: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  legendRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
});
