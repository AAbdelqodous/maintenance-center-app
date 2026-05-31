import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useAppSelector } from '@/store';
import { useGetReportQuery } from '@/store/api/inventoryApi';

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

// Spec 025 US-Reports — stock value, parts margin, usage, and the reorder list over a range.
export default function InventoryReportsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = isRTL ? 'ar' : 'en';
  const perms = useAppSelector((s) => s.center.activePermissions);
  const canView = perms.includes('VIEW_REPORTS') || perms.includes('GENERATE_REPORTS');

  const to = isoDate(new Date());
  const from = isoDate(new Date(Date.now() - 30 * 86400_000));
  const { data, isLoading, isError } = useGetReportQuery({ from, to }, { skip: !canView });

  if (!canView) {
    return <View style={styles.centered}><Ionicons name="lock-closed-outline" size={48} color="#9E9E9E" /><AppText style={styles.muted}>{t('inventory.reports.noAccess')}</AppText></View>;
  }
  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2196F3" /></View>;
  if (isError || !data) return <View style={styles.centered}><AppText style={styles.muted}>{t('common.error')}</AppText></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText style={styles.range}>{t('inventory.reports.range', { from, to })}</AppText>

      <View style={[styles.kpiRow, isRTL && styles.rowRtl]}>
        <View style={styles.kpi}>
          <AppText style={styles.kpiValue}>{formatKD(data.stockValue)}</AppText>
          <AppText style={styles.kpiLabel}>{t('inventory.reports.stockValue')}</AppText>
        </View>
        <View style={styles.kpi}>
          <AppText style={[styles.kpiValue, { color: '#2E7D32' }]}>{formatKD(data.partsMargin)}</AppText>
          <AppText style={styles.kpiLabel}>{t('inventory.reports.margin')}</AppText>
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('inventory.reports.usage')}</AppText>
        {data.usage.length === 0 ? (
          <AppText style={styles.muted}>{t('inventory.reports.noUsage')}</AppText>
        ) : data.usage.map((u) => (
          <View key={u.partId} style={[styles.row, isRTL && styles.rowRtl]}>
            <AppText style={styles.rowName}>{locale === 'ar' ? u.nameAr : u.nameEn}</AppText>
            <AppText style={styles.rowVal}>{u.consumedQty}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('inventory.lowStock.title')}</AppText>
        {data.reorder.length === 0 ? (
          <AppText style={styles.muted}>{t('inventory.reports.noReorder')}</AppText>
        ) : data.reorder.map((r) => (
          <View key={r.partId} style={[styles.row, isRTL && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.rowName}>{locale === 'ar' ? r.nameAr : r.nameEn}</AppText>
              <AppText style={styles.rowSub}>{r.sku}{r.supplier ? ` · ${r.supplier}` : ''}</AppText>
            </View>
            <AppText style={styles.reorderQty}>{t('inventory.lowStock.suggested', { n: r.suggestedReorderQty })}</AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 14, color: '#757575' },
  range: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  kpiLabel: { fontSize: 12, color: '#757575', textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  rowName: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  rowVal: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  reorderQty: { fontSize: 13, color: '#C62828', fontWeight: '700' },
});
