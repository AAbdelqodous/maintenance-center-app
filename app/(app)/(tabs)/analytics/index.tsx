import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  useGetAnalyticsSummaryQuery, 
  useGetBookingTrendsQuery, 
  useGetRevenueByCategoryQuery, 
  useGetSatisfactionSummaryQuery, 
  useGetPeakHoursQuery 
} from '@/store/api/analyticsApi';
import { periodToDateRange, AnalyticsPeriod, DateRange } from '@/types/analytics';
import { BookingTrendsChart } from '@/components/analytics/BookingTrendsChart';
import { RevenueByCategory } from '@/components/analytics/RevenueByCategory';
import { SatisfactionSummary } from '@/components/analytics/SatisfactionSummary';
import { PeakHoursChart } from '@/components/analytics/PeakHoursChart';
import { RatingStars } from '@/components/ui/RatingStars';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

function AnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('THIS_WEEK');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const dateRange = periodToDateRange(selectedPeriod);
  const daysInRange = Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const granularity = daysInRange > 90 ? 'WEEKLY' : 'DAILY';

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useGetAnalyticsSummaryQuery(dateRange);
  const { data: bookingTrends, isLoading: trendsLoading, refetch: refetchTrends } = useGetBookingTrendsQuery({ 
    ...dateRange, 
    granularity 
  });
  const { data: revenueByCategory, isLoading: revenueLoading, refetch: refetchRevenue } = useGetRevenueByCategoryQuery(dateRange);
  const { data: satisfaction, isLoading: satisfactionLoading, refetch: refetchSatisfaction } = useGetSatisfactionSummaryQuery(dateRange);
  const { data: peakHours, isLoading: peakHoursLoading, refetch: refetchPeakHours } = useGetPeakHoursQuery(dateRange);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSummary(),
      refetchTrends(),
      refetchRevenue(),
      refetchSatisfaction(),
      refetchPeakHours(),
    ]);
    setRefreshing(false);
  }, [refetchSummary, refetchTrends, refetchRevenue, refetchSatisfaction, refetchPeakHours]);

  const isLoading = summaryLoading || trendsLoading || revenueLoading || satisfactionLoading || peakHoursLoading;

  const PeriodButton = ({ period, label }: { period: AnalyticsPeriod; label: string }) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.periodButtonActive,
        isRTL && styles.periodButtonRtl,
      ]}
      onPress={() => {
        if (period === 'CUSTOM') {
          setShowDatePicker(true);
        } else {
          setSelectedPeriod(period);
        }
      }}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === period && styles.periodButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleApplyCustomRange = () => {
    if (customEndDate < customStartDate) {
      return;
    }
    setSelectedPeriod('THIS_WEEK' as AnalyticsPeriod);
    setShowDatePicker(false);
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle,
    onPress 
  }: { 
    title: string; 
    value: string | number; 
    icon: string; 
    color: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.metricCard, isRTL && styles.cardRtl]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>{t('analytics.title')}</Text>

        <View style={[styles.periodSelector, isRTL && styles.periodSelectorRtl]}>
          <PeriodButton period="THIS_WEEK" label={t('analytics.period.thisWeek')} />
          <PeriodButton period="THIS_MONTH" label={t('analytics.period.thisMonth')} />
          <PeriodButton period="LAST_3_MONTHS" label={t('analytics.period.last3Months')} />
          <TouchableOpacity
            style={[
              styles.periodButton,
              isRTL && styles.periodButtonRtl,
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#666666" />
            <Text style={styles.periodButtonText}>
              {t('common.custom')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('analytics.summary.title')}</Text>

        <View style={styles.metricsGrid}>
          <MetricCard 
            title={t('analytics.summary.totalBookings')} 
            value={summary?.totalBookings ?? 0} 
            icon="calendar" 
            color="#2196F3"
            onPress={() => router.push('/(tabs)/bookings/' as any)}
          />
          <MetricCard 
            title={t('analytics.summary.completed')} 
            value={summary?.completedBookings ?? 0} 
            icon="checkmark-circle" 
            color="#4CAF50"
            onPress={() => router.push('/(tabs)/bookings/' as any)}
          />
          <MetricCard 
            title={t('bookings.cancelled')} 
            value={summary?.cancelledBookings ?? 0} 
            icon="close-circle" 
            color="#F44336"
            onPress={() => router.push('/(tabs)/bookings/' as any)}
          />
          <MetricCard 
            title={t('analytics.summary.cancellationRate')} 
            value={`${summary?.cancellationRate?.toFixed(1) ?? 0}%`} 
            icon="trending-down" 
            color="#FF9800"
          />
          <View style={[styles.metricCard, isRTL && styles.cardRtl, styles.fullWidth]}>
            <View style={[styles.metricIcon, { backgroundColor: '#FFD700' + '20' }]}>
              <Ionicons name="star" size={24} color="#FFD700" />
            </View>
            <View style={styles.metricContent}>
              <View style={styles.ratingRow}>
                <RatingStars rating={summary?.averageRating ?? 0} size={20} />
                <Text style={styles.ratingValue}>
                  {summary?.averageRating?.toFixed(1) ?? t('analytics.summary.revenueUnavailable')}
                </Text>
              </View>
              <Text style={styles.metricTitle}>{t('analytics.summary.averageRating')}</Text>
            </View>
          </View>
          {summary?.revenueAvailable !== false && (
            <MetricCard 
              title={t('analytics.summary.revenue')} 
              value={`KD ${summary?.totalRevenue?.toFixed(3) ?? '0.000'}`} 
              icon="cash" 
              color="#9C27B0" 
            />
          )}
        </View>

        <BookingTrendsChart 
          data={bookingTrends?.data ?? []} 
          granularity={granularity}
          isLoading={trendsLoading}
        />

        <RevenueByCategory 
          data={revenueByCategory ?? []}
          isLoading={revenueLoading}
        />

        <SatisfactionSummary 
          data={satisfaction}
          isLoading={satisfactionLoading}
        />

        <PeakHoursChart 
          data={peakHours ?? []}
          isLoading={peakHoursLoading}
        />
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isRTL && styles.modalContentRtl]}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRtl]}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('analytics.period.customRange')}</Text>
              <TouchableOpacity 
                onPress={handleApplyCustomRange}
                disabled={customEndDate < customStartDate}
              >
                <Text style={[
                  styles.modalButtonText,
                  styles.modalButtonActive,
                  customEndDate < customStartDate && styles.modalButtonDisabled
                ]}>
                  {t('common.apply')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerRow}>
                <Text style={styles.datePickerLabel}>{t('analytics.period.startDate')}</Text>
                <Text style={styles.dateValue}>
                  {customStartDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.datePickerRow}>
                <Text style={styles.datePickerLabel}>{t('analytics.period.endDate')}</Text>
                <Text style={styles.dateValue}>
                  {customEndDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {customEndDate < customStartDate && (
              <Text style={styles.errorText}>{t('analytics.period.dateRangeError')}</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function AnalyticsScreenWrapper() {
  return (
    <ErrorBoundary>
      <AnalyticsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  periodSelectorRtl: {
    flexDirection: 'row-reverse',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  periodButtonRtl: {
    marginLeft: 0,
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRtl: {
    marginLeft: 12,
  },
  fullWidth: {
    width: '100%',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricContent: {
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666666',
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalContentRtl: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  modalButtonActive: {
    fontWeight: '600',
  },
  modalButtonDisabled: {
    color: '#CCCCCC',
  },
  datePickerContainer: {
    gap: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666666',
  },
  dateValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
