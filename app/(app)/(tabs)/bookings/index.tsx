import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetBookingsQuery } from '../../../store/api/bookingsApi';
import { BookingStatus } from '../../../store/api/bookingsApi';
import { BookingCard } from '../../../components/bookings/BookingCard';

export default function BookingsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'ALL'>('ALL');

  const { data: bookingsData, isLoading, refetch } = useGetBookingsQuery({ page: 0, size: 100 });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredBookings = bookingsData?.content.filter(
    (booking) => selectedStatus === 'ALL' || booking.status === selectedStatus
  ) || [];

  const statuses: (BookingStatus | 'ALL')[] = ['ALL', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.CANCELLED];

  const StatusTab = ({ status }: { status: BookingStatus | 'ALL' }) => {
    const isSelected = selectedStatus === status;
    const count = status === 'ALL' 
      ? bookingsData?.content.length ?? 0
      : bookingsData?.content.filter(b => b.status === status).length ?? 0;

    return (
      <TouchableOpacity
        style={[styles.tab, isSelected && styles.selectedTab, isRTL && styles.tabRtl]}
        onPress={() => setSelectedStatus(status)}
      >
        <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
          {t(`bookings.${status.toLowerCase()}`)} ({count})
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
              onPress={() => {}}
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
