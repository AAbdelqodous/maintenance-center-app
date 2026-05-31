import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetCenterBookingStatsQuery, useGetCenterBookingsQuery } from '@/store/api/bookingsApi';
import { useGetMyCenterQuery } from '@/store/api/centerApi';
import { useGetReviewsQuery } from '@/store/api/reviewsApi';
import { useGetTrendsQuery } from '@/store/api/analyticsApi';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { BookingCard } from '@/components/bookings/BookingCard';
import { RatingStars } from '@/components/ui/RatingStars';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { AttentionPanel } from '@/components/dashboard/AttentionPanel';
import { PipelineStrip } from '@/components/dashboard/PipelineStrip';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { StaffPerformanceBoard } from '@/components/dashboard/StaffPerformanceBoard';
import { RebalanceModal } from '@/components/dashboard/RebalanceModal';
import { TrendsSectionHeader } from '@/components/dashboard/trends/TrendsSectionHeader';
import { BookingVolumeChart } from '@/components/dashboard/trends/BookingVolumeChart';
import { RatingTrendChart } from '@/components/dashboard/trends/RatingTrendChart';
import { RevenueTrendChart } from '@/components/dashboard/trends/RevenueTrendChart';
import { CategoryMixChart } from '@/components/dashboard/trends/CategoryMixChart';
import { PeakHoursHeatmap } from '@/components/dashboard/trends/PeakHoursHeatmap';
import { ExportReportButton } from '@/components/dashboard/trends/ExportReportButton';
import { useAttentionItems } from '@/hooks/useAttentionItems';
import { useDashboardSnapshot } from '@/hooks/useDashboardSnapshot';
import { useTrendInsights } from '@/hooks/useTrendInsights';
import { trendPeriodToDateRange } from '@/types/trends';
import type { PipelineWorkStage } from '@/types/dashboard';
import type { RebalanceSuggestion, StaffPerformanceCard as StaffPerformanceCardType } from '@/types/staffPerformance';
import type { TrendPeriod } from '@/types/trends';

function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canViewStaffDrillDown = activePermissions.includes('MANAGE_NON_MANAGER_STAFF');
  const canViewRevenue = activePermissions.includes('VIEW_REVENUE');
  const userType = useAppSelector((state) => state.auth.session?.userType);
  const isAdmin = userType === 'ADMIN';
  const isStaff = userType === 'STAFF';
  const isOwner = userType === 'OWNER';
  const firstname = useAppSelector((state) => state.auth.session?.firstname ?? '');

  // Trends section state (session-level UI state)
  const [trendsExpanded, setTrendsExpanded] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<TrendPeriod>('8_WEEKS');
  const { startDate, endDate } = trendPeriodToDateRange(selectedPeriod);

  const { data: trendsData, isFetching: trendsFetching } = useGetTrendsQuery(
    { startDate, endDate },
    { skip: !trendsExpanded }
  );

  const insights = useTrendInsights(trendsData, selectedPeriod);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetCenterBookingStatsQuery(undefined, { skip: !isOwner || !activeCenterId, refetchOnFocus: true });
  const { data: centerData, isLoading: centerLoading } = useGetMyCenterQuery(undefined, { skip: !isOwner });
  const { data: reviewsData } = useGetReviewsQuery({ size: 1 }, { skip: !isOwner });
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetCenterBookingsQuery(
    { centerId: activeCenterId!, page: 0, size: 5 },
    { skip: !isOwner || !activeCenterId, refetchOnFocus: true }
  );

  const attention = useAttentionItems();
  const { data: snapshot, isFetching: snapshotFetching } = useDashboardSnapshot();

  const [refreshing, setRefreshing] = React.useState(false);
  const [rebalanceSuggestion, setRebalanceSuggestion] = React.useState<RebalanceSuggestion | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchBookings()]);
    attention.refetch();
    setRefreshing(false);
  }, [refetchStats, refetchBookings, attention.refetch]);

  if (isAdmin) return <Redirect href="/(tabs)/admin" />;

  const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
    <View style={[styles.statCard, isRTL && styles.cardRtl]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  if (statsLoading || centerLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.headerRow, isRTL && styles.rowRtl]}>
        <Text style={styles.welcome}>{t('dashboard.welcome', { name: firstname || centerData?.nameEn || '' })}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title={t('dashboard.totalBookings')} value={stats?.total ?? 0} icon="calendar" color="#2196F3" />
        <StatCard title={t('dashboard.pendingBookings')} value={stats?.pending ?? 0} icon="time" color="#FF9800" />
        <StatCard title={t('dashboard.confirmedBookings')} value={stats?.confirmed ?? 0} icon="checkmark-circle" color="#4CAF50" />
        <StatCard title={t('bookings.inProgress')} value={stats?.inProgress ?? 0} icon="construct" color="#9C27B0" />
        <StatCard title={t('bookings.cancelled')} value={stats?.cancelled ?? 0} icon="close-circle" color="#F44336" />
        <View style={[styles.statCard, isRTL && styles.cardRtl, styles.ratingCard]}>
          <View style={[styles.statIcon, { backgroundColor: '#FFD700' + '20' }]}>
            <Ionicons name="star" size={24} color="#FFD700" />
          </View>
          <View style={styles.statContent}>
            <RatingStars rating={centerData?.averageRating ?? 0} />
            <Text style={styles.statTitle}>{reviewsData?.totalElements ?? 0} {t('dashboard.totalReviews')}</Text>
          </View>
        </View>
      </View>

      {isOwner && (
        <>
          <PipelineStrip
            stages={snapshot?.pipeline ?? []}
            isFetching={snapshotFetching}
            onStagePress={(stage: PipelineWorkStage) =>
              router.push({ pathname: '/(tabs)/bookings/' as any, params: { workStage: stage } })
            }
          />
          <KpiGrid
            kpis={snapshot?.kpis}
            isLoading={false}
            isFetching={snapshotFetching}
          />
          <AttentionPanel
            items={attention.items}
            isLoading={attention.isLoading}
            isError={attention.isError}
            lastCheckedAt={attention.lastCheckedAt}
            refetch={attention.refetch}
          />
          <StaffPerformanceBoard
            onCardPress={
              canViewStaffDrillDown
                ? (card: StaffPerformanceCardType) =>
                    router.push(`/(tabs)/staff/performance/${card.membershipId}` as any)
                : undefined
            }
            onRebalancePress={(suggestion: RebalanceSuggestion) =>
              setRebalanceSuggestion(suggestion)
            }
          />
        </>
      )}

      {rebalanceSuggestion && (
        <RebalanceModal
          visible={true}
          suggestion={rebalanceSuggestion}
          onClose={() => setRebalanceSuggestion(null)}
        />
      )}

      <Text style={styles.sectionTitle}>{t('dashboard.recentBookings')}</Text>

      {bookingsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      ) : bookingsData?.content && bookingsData.content.length > 0 ? (
        bookingsData.content.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onPress={() => router.push(`/bookings/${booking.id}` as any)}
          />
        ))
      ) : (
        <Text style={styles.noData}>{t('bookings.noBookings')}</Text>
      )}

      <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>

      <View style={[styles.actionsContainer, isRTL && styles.rowRtl]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/bookings/' as any)}>
          <Ionicons name="calendar" size={24} color="#2196F3" />
          <Text style={styles.actionText}>{t('bookings.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/reviews/index' as any)}>
          <Ionicons name="star" size={24} color="#2196F3" />
          <Text style={styles.actionText}>{t('reviews.title')}</Text>
        </TouchableOpacity>
        {canViewRevenue && (
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(app)/earnings' as any)}>
            <Ionicons name="cash-outline" size={24} color="#2E7D32" />
            <Text style={styles.actionText}>{t('earnings.title')}</Text>
          </TouchableOpacity>
        )}
        {!isStaff && (
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/profile/' as any)}>
            <Ionicons name="business" size={24} color="#2196F3" />
            <Text style={styles.actionText}>{t('profile.title')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Trends Section ── */}
      {isOwner && <ExportReportButton />}

      <TrendsSectionHeader
        expanded={trendsExpanded}
        onToggle={() => setTrendsExpanded((v) => !v)}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {trendsExpanded && (
        <>
          <BookingVolumeChart
            data={trendsData?.bookingsByWeek ?? []}
            insight={insights.bookings}
            isLoading={trendsFetching}
            period={selectedPeriod}
          />
          <RatingTrendChart
            data={trendsData?.ratingsByWeek ?? []}
            insight={insights.rating}
            isLoading={trendsFetching}
            period={selectedPeriod}
          />
          <RevenueTrendChart
            data={trendsData?.revenueByWeek ?? []}
            insight={insights.revenue}
            isLoading={trendsFetching}
            period={selectedPeriod}
          />
          <CategoryMixChart
            data={trendsData?.categoryMix ?? []}
            insight={insights.category}
            isLoading={trendsFetching}
          />
          <PeakHoursHeatmap
            data={trendsData?.peakHours ?? []}
            insight={insights.peakHour}
            isLoading={trendsFetching}
          />
        </>
      )}
    </ScrollView>
  );
}

export default function DashboardScreenWrapper() {
  return (
    <ErrorBoundary>
      <DashboardScreen />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoutBtn: { padding: 6 },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statCard: {
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
  ratingCard: {
    width: '100%',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statContent: {
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginVertical: 12,
  },
  noData: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    marginVertical: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
});
