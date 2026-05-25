import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGetBookingQueueQuery } from '@/store/api/bookingsApi';
import { BookingCard } from '@/components/bookings/BookingCard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Ionicons } from '@expo/vector-icons';

function DepartmentQueueScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [page, setPage] = useState(0);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingMoreRef = useRef(false);

  const { data, isLoading, isFetching, refetch } = useGetBookingQueueQuery({ page, size: 20 });

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

  useEffect(() => {
    const id = setInterval(() => {
      setAllBookings([]);
      setHasMore(true);
      if (page === 0) refetch();
      else setPage(0);
    }, 30_000);
    return () => clearInterval(id);
  }, [page, refetch]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setAllBookings([]);
    setHasMore(true);
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

  if (isLoading && page === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <Ionicons name="grid-outline" size={18} color="#4F46E5" />
        <Text style={styles.subtitle}>{t('bookings.queue.subtitle')}</Text>
        {data && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.totalElements}</Text>
          </View>
        )}
      </View>

      {allBookings.length === 0 && !isLoading ? (
        <View style={styles.centered}>
          {data?.noDepartmentMembership ? (
            <>
              <Ionicons name="git-network-outline" size={64} color="#E5E7EB" />
              <Text style={styles.emptyText}>{t('bookings.queue.noDepartment')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={64} color="#D1FAE5" />
              <Text style={styles.emptyText}>{t('bookings.queue.empty')}</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={allBookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              isOverdue={false}
              onPress={() => router.push(`/staff/bookings/${item.id}` as any)}
              showAssignedTo={false}
              departmentLabel={
                i18n.language === 'ar' ? item.departmentNameAr : item.departmentNameEn
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore
              ? <ActivityIndicator style={{ padding: 16 }} color="#4F46E5" />
              : null
          }
        />
      )}
    </View>
  );
}

export default function DepartmentQueueWrapper() {
  return (
    <ErrorBoundary>
      <DepartmentQueueScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  subtitle: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
  },
});
