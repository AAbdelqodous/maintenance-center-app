import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGetCenterStaffQuery } from '@/store/api/staffApi';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { StaffMemberCard } from '@/components/staff/StaffMemberCard';
import { Ionicons } from '@expo/vector-icons';
import { CenterRole } from '@/types/staff';

function StaffScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [page, setPage] = useState(0);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data: staffData, isLoading, isFetching, refetch } = useGetCenterStaffQuery(
    { page, size: 20 },
    { skip: false }
  );

  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    if (staffData) {
      if (page === 0) {
        setAllStaff(staffData.content);
      } else {
        setAllStaff(prev => [...prev, ...staffData.content]);
      }
      setHasMore(!staffData.last);
      setIsFetchingMore(false);
    }
  }, [staffData, page]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !isFetching && !isLoading && !isFetchingMore) {
      setIsFetchingMore(true);
      setPage(prev => prev + 1);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <StaffMemberCard
      membership={item}
      onPress={() => router.push(`/staff/${item.id}`)}
    />
  );

  const ListEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>
          {t('staff.emptyState')}
        </Text>
      </View>
    );
  };

  const ListFooterComponent = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={allStaff}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={allStaff.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      />
      <PermissionGate permission="MANAGE_NON_MANAGER_STAFF">
        <TouchableOpacity
          style={[styles.fab, isRTL && styles.fabRtl]}
          onPress={() => router.push('/staff/invite')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </PermissionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabRtl: {
    right: undefined,
    left: 24,
  },
});

export default StaffScreen;
