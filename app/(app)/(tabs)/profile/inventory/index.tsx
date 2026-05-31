import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { PartCard } from '@/components/inventory/PartCard';
import { AppText } from '@/components/ui/AppText';
import { useAppSelector } from '@/store';
import { useGetPartsQuery } from '@/store/api/inventoryApi';
import type { Part } from '@/types/inventory';

// Spec 025 US1 — parts catalog: search, low-stock filter, add. Viewing needs CONSUME_PARTS;
// adding/editing needs MANAGE_INVENTORY.
export default function InventoryCatalogScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const perms = useAppSelector((s) => s.center.activePermissions);
  const canView = perms.includes('CONSUME_PARTS') || perms.includes('MANAGE_INVENTORY');
  const canManage = perms.includes('MANAGE_INVENTORY');

  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useGetPartsQuery(
    { search, lowStock: lowOnly },
    { skip: !canView },
  );

  if (!canView) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#9E9E9E" />
        <AppText style={styles.muted}>{t('inventory.catalog.noAccess')}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={[styles.searchRow, isRTL && styles.rowRtl]}>
          <Ionicons name="search" size={18} color="#9E9E9E" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.inputRtl]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('inventory.catalog.search')}
            placeholderTextColor="#9E9E9E"
          />
        </View>
        <View style={[styles.filterRow, isRTL && styles.rowRtl]}>
          <TouchableOpacity
            style={[styles.chip, lowOnly && styles.chipActive]}
            onPress={() => setLowOnly((v) => !v)}
          >
            <Ionicons name="alert-circle-outline" size={15} color={lowOnly ? '#fff' : '#C62828'} />
            <AppText style={[styles.chipText, lowOnly && styles.chipTextActive]}>{t('inventory.catalog.lowStockFilter')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, styles.reportChip]} onPress={() => router.push('/(app)/(tabs)/profile/inventory/reports' as any)}>
            <Ionicons name="bar-chart-outline" size={15} color="#2196F3" />
            <AppText style={[styles.chipText, { color: '#2196F3' }]}>{t('inventory.reports.title')}</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#2196F3" />
      ) : isError ? (
        <View style={styles.centered}>
          <AppText style={styles.muted}>{t('common.error')}</AppText>
          <TouchableOpacity style={styles.retry} onPress={() => refetch()}><AppText style={styles.retryText}>{t('common.retry')}</AppText></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p: Part) => String(p.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <PartCard part={item} onPress={() => router.push(`/(app)/(tabs)/profile/inventory/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color="#9E9E9E" />
              <AppText style={styles.muted}>{lowOnly ? t('inventory.catalog.noLow') : t('inventory.catalog.empty')}</AppText>
            </View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/(tabs)/profile/inventory/new' as any)} accessibilityRole="button">
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#757575', textAlign: 'center' },
  controls: { padding: 16, gap: 10, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  inputRtl: { textAlign: 'right' },
  filterRow: { flexDirection: 'row', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#C62828', borderColor: '#C62828' },
  chipText: { fontSize: 13, color: '#C62828', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  reportChip: { borderColor: '#BBDEFB' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  retry: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2196F3', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
});
