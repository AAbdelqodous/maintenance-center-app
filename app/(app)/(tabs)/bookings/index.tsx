import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetBookingsQuery } from '@/store/api/bookingsApi';
import { BookingStatus } from '@/store/api/bookingsApi';
import { BookingCard } from '@/components/bookings/BookingCard';

const STATUS_KEY_MAP: Record<string, string> = {
  ALL: 'all',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export default function BookingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'ALL'>('ALL');

  const { data: bookingsData, isLoading, refetch } = useGetBookingsQuery({
    page: 0,
    size: 100,
    ...(selectedStatus !== 'ALL' && { status: selectedStatus }),
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Server filters by status when one is selected; no client-side re-filter needed
  const filteredBookings = bookingsData?.content || [];

  const statuses: (BookingStatus | 'ALL')[] = ['ALL', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.CANCELLED];

  const getTabCount = (status: BookingStatus | 'ALL') => {
    if (!bookingsData?.content) return 0;
    if (selectedStatus === 'ALL') {
      return status === 'ALL'
        ? bookingsData.content.length
        : bookingsData.content.filter(b => b.bookingStatus === status).length;
    }
    // Server-filtered: only selected status data is loaded
    return status === selectedStatus ? bookingsData.content.length : 0;
  };

  const StatusTab = ({ status }: { status: BookingStatus | 'ALL' }) => {
    const isSelected = selectedStatus === status;
    const count = getTabCount(status);

    return (
      <TouchableOpacity
        style={[styles.tab, isSelected && styles.selectedTab, isRTL && styles.tabRtl]}
        onPress={() => setSelectedStatus(status)}
      >
        <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
          {t(`bookings.${STATUS_KEY_MAP[status]}`)} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabsContainer, isRTL && styles.tabsRtl]}
      >
        {statuses.map((status) => (
          <StatusTab key={status} status={status} />
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/bookings/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('bookings.noBookings')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabsContainer: {
    padding: 12,
    gap: 8,
  },
  tabsRtl: {
    flexDirection: 'row-reverse',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabRtl: {
    marginLeft: 0,
    marginRight: 8,
  },
  selectedTab: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  selectedTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
});
