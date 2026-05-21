import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGetBookingsQuery, BookingStatus } from '@/store/api/bookingsApi';
import { useGetMyAssignedBookingsQuery } from '@/store/api/staffApi';
import { useAppSelector } from '@/store';
import { BookingCard } from '@/components/bookings/BookingCard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

function StaffBookingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);
  const isTechnician = activeUserRole === 'TECHNICIAN';

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus;

  // Technicians only see their assigned bookings; other roles see all branch bookings.
  // Both hooks are always called (React rules of hooks); one is skipped via `skip`.
  const allBookingsResult = useGetBookingsQuery(
    { page, size: 20, status: statusParam },
    { skip: isTechnician }
  );
  const assignedResult = useGetMyAssignedBookingsQuery(
    { page, size: 20, status: statusParam },
    { skip: !isTechnician }
  );

  const { data, isLoading, isFetching, refetch } = isTechnician ? assignedResult : allBookingsResult;

  React.useEffect(() => {
    setPage(0);
    setAllBookings([]);
    setHasMore(true);
    setIsFetchingMore(false);
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
  }, [data]);

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

  const isOverdue = useCallback((booking: any) => {
    if (booking.bookingStatus !== BookingStatus.PENDING) return false;
    return new Date(`${booking.bookingDate}T${booking.bookingTime}`) < new Date();
  }, []);

  const statuses: (BookingStatus | 'ALL')[] = ['ALL', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.CANCELLED];

  const StatusTab = ({ status }: { status: BookingStatus | 'ALL' }) => {
    const isSelected = selectedStatus === status;
    const count = isSelected ? (data?.totalElements ?? allBookings.length) : null;

    return (
      <TouchableOpacity
        style={[styles.tab, isSelected && styles.selectedTab, isRTL && styles.tabRtl]}
        onPress={() => setSelectedStatus(status)}
      >
        <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
          {t(`bookings.${status.toLowerCase()}`)}
          {count !== null ? ` (${count})` : ''}
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

      {isLoading && page === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : allBookings.length > 0 ? (
        <FlatList
          data={allBookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              isOverdue={isOverdue(item)}
              onPress={() => router.push(`/staff/bookings/${item.id}` as any)}
              showAssignedTo={!isTechnician}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator style={{ padding: 16 }} color="#2196F3" /> : null}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('staff.bookings.empty')}</Text>
        </View>
      )}
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
