import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetCenterStaffQuery } from '@/store/api/staffApi';
import { StaffMemberCard } from '@/components/staff/StaffMemberCard';
import type { MembershipStatus } from '@/types/staff';

type FilterKey = 'all' | 'active' | 'invited' | 'suspended';

const FILTER_STATUS: Record<FilterKey, MembershipStatus | undefined> = {
  all: undefined,
  active: 'ACTIVE',
  invited: 'INVITED',
  suspended: 'SUSPENDED',
};

export default function StaffListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const statusParam = FILTER_STATUS[activeFilter];
  const { data, isLoading, isError, refetch } = useGetCenterStaffQuery(
    statusParam ? { status: statusParam } : {}
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const members = data?.content ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(Object.keys(FILTER_STATUS) as FilterKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeFilter === key && styles.tabActive]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[styles.tabText, activeFilter === key && styles.tabTextActive]}>
              {key === 'all' ? t('staff.title') : t(`staff.statuses.${FILTER_STATUS[key]}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {members.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>{t('staff.emptyState')}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(app)/(tabs)/profile/staff/invite' as any)}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('staff.invite.title')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <StaffMemberCard
              membership={item}
              onPress={() => router.push(`/(app)/(tabs)/profile/staff/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/(tabs)/profile/staff/invite' as any)}
      >
        <Ionicons name="person-add-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  tabText: { fontSize: 12, color: '#9E9E9E', fontWeight: '500' },
  tabTextActive: { color: '#2196F3', fontWeight: '700' },
  list: { paddingVertical: 8, paddingBottom: 96 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: {
    fontSize: 15, color: '#757575', textAlign: 'center',
    marginTop: 16, marginBottom: 24, lineHeight: 22,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2196F3', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#757575', marginBottom: 12 },
  retryBtn: { backgroundColor: '#2196F3', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
});
