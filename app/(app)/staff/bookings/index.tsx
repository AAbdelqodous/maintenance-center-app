import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGetBookingsQuery, BookingStatus } from '@/store/api/bookingsApi';
import { BookingCard } from '@/components/bookings/BookingCard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Ionicons } from '@expo/vector-icons';

const STATUSES: (BookingStatus | 'ALL')[] = [
  'ALL',
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
];

function StaffBookingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus;
  const { data, isLoading, isFetching, refetch } = useGetBookingsQuery({ page, size: 20, status: statusParam });

  React.useEffect(() => {
    setPage(0);
    setAllBookings([]);
    setHasMore(true);
    isFetchingMoreRef.current = false;
  }, [selectedStatus]);

  React.useEffect(() => {
    if (data) {
      if (page === 0) {
        setAllBookings(data.content);
      } else {
        setAllBookings((prev) => [...prev, ...data.content]);
      }
      setHasMore(!data.last);
      setIsFetchingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [data, page]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  };

  const loadMore = useCallback(() => {
    if (!isFetchingMoreRef.current && hasMore && !isFetching && !isLoading) {
      isFetchingMoreRef.current = true;
      setIsFetchingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching, isLoading]);

  const isOverdue = (booking: any) => {
    if (booking.bookingStatus !== BookingStatus.PENDING) return false;
    return new Date(`${booking.bookingDate}T${booking.bookingTime}`) < new Date();
  };

  const getStatusLabel = (status: BookingStatus | 'ALL') => {
    if (status === 'ALL') return t('bookings.all');
    return t(`bookings.status.${status.toLowerCase()}`) || status;
  };

  if (isLoading && page === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bookings.title')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabs}
      >
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.tab, selectedStatus === status && styles.tabActive]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[styles.tabText, selectedStatus === status && styles.tabTextActive]}>
              {getStatusLabel(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={allBookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            isOverdue={isOverdue(item)}
            onPress={() => router.push(`/staff/bookings/${item.id}` as any)}
          />
        )}
        contentContainerStyle={allBookings.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>{t('staff.bookings.empty')}</Text>
          </View>
        }
        ListFooterComponent={
          isFetchingMore ? <ActivityIndicator size="small" color="#4F46E5" style={styles.footer} /> : null
        }
      />
    </View>
  );
}

export default function StaffBookingsScreenWrapper() {
  return (
    <ErrorBoundary>
      <StaffBookingsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333333' },
  tabsContainer: { backgroundColor: '#FFFFFF', maxHeight: 52 },
  tabs: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },
  list: { paddingVertical: 8 },
  emptyList: { flexGrow: 1 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16, textAlign: 'center' },
  footer: { paddingVertical: 16 },
});
