import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyOffersQuery } from '@/store/api/offersApi';
import OfferCard from '@/components/offers/OfferCard';
import type { OfferStatus } from '@/types/offers';

type FilterKey = 'all' | 'active' | 'scheduled' | 'expired';

const FILTER_MAP: Record<FilterKey, OfferStatus | undefined> = {
  all: undefined,
  active: 'ACTIVE',
  scheduled: 'SCHEDULED',
  expired: 'EXPIRED',
};

export default function StaffOffersListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const statusParam = FILTER_MAP[activeFilter];
  const { data, isLoading, isError, refetch } = useGetMyOffersQuery(
    statusParam ? { status: statusParam } : undefined
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const offers = data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(Object.keys(FILTER_MAP) as FilterKey[]).map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeFilter === key && styles.tabActive]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[styles.tabText, activeFilter === key && styles.tabTextActive]}>
              {t(`offers.filter.${key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {offers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="pricetag-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>{t('offers.noOffers')}</Text>
          <Text style={styles.emptySubtitle}>{t('offers.noOffersSubtitle')}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/staff/offers/add' as any)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('offers.add')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onPress={() => router.push(`/staff/offers/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/staff/offers/add' as any)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
  tabTextActive: { color: '#4F46E5', fontWeight: '700' },
  list: { padding: 16, paddingBottom: 96 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333333', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 24 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#757575', marginBottom: 12 },
  retryBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
});
