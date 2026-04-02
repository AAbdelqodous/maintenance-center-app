import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetBookingStatsQuery, useGetBookingsQuery } from '../../store/api/bookingsApi';
import { useGetMyCenterQuery } from '../../store/api/centerApi';
import { BookingCard } from '../../components/bookings/BookingCard';
import { RatingStars } from '../../components/ui/RatingStars';

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetBookingStatsQuery();
  const { data: centerData, isLoading: centerLoading } = useGetMyCenterQuery();
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetBookingsQuery({ page: 0, size: 5 });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchBookings()]);
    setRefreshing(false);
  }, [refetchStats, refetchBookings]);

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
      <Text style={styles.welcome}>{t('dashboard.welcome', { name: centerData?.nameEn || 'Owner' })}</Text>

      <View style={styles.statsGrid}>
        <StatCard title={t('dashboard.todayBookings')} value={stats?.today ?? 0} icon="calendar" color="#2196F3" />
        <StatCard title={t('dashboard.pendingBookings')} value={stats?.pending ?? 0} icon="time" color="#FF9800" />
        <StatCard title={t('dashboard.confirmedBookings')} value={stats?.confirmed ?? 0} icon="checkmark-circle" color="#4CAF50" />
        <View style={[styles.statCard, isRTL && styles.cardRtl, styles.ratingCard]}>
          <View style={[styles.statIcon, { backgroundColor: '#FFD700' + '20' }]}>
            <Ionicons name="star" size={24} color="#FFD700" />
          </View>
          <View style={styles.statContent}>
            <RatingStars rating={centerData?.averageRating ?? 0} />
            <Text style={styles.statTitle}>{centerData?.reviewCount ?? 0} {t('dashboard.totalReviews')}</Text>
          </View>
        </View>
      </View>

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
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/chat/' as any)}>
          <Ionicons name="chatbubbles" size={24} color="#2196F3" />
          <Text style={styles.actionText}>{t('chat.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/profile/' as any)}>
          <Ionicons name="person" size={24} color="#2196F3" />
          <Text style={styles.actionText}>{t('profile.title')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
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
