import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useAppSelector } from '@/store';
import { useGetEarningsQuery } from '@/store/api/centerPaymentsApi';

// Spec 023 US1/US2 — earnings dashboard: held / available / paid-out (net of commission) + lifetime
// totals, with entries into payouts and deposit settings. Gated by VIEW_REVENUE.
export default function EarningsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canViewRevenue = activePermissions.includes('VIEW_REVENUE');
  const canManagePayouts = activePermissions.includes('MANAGE_PAYOUTS');

  const { data, isLoading, isError, refetch, isFetching } = useGetEarningsQuery(undefined, {
    skip: !canViewRevenue,
  });

  if (!canViewRevenue) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#9E9E9E" />
        <AppText style={styles.muted}>{t('earnings.noAccess')}</AppText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#9E9E9E" />
        <AppText style={styles.muted}>{t('common.error')}</AppText>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <AppText style={styles.retryText}>{t('common.retry')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const balanceCards = [
    { key: 'available', label: t('earnings.available'), value: data.available, icon: 'wallet-outline', color: '#2E7D32' },
    { key: 'held', label: t('earnings.held'), value: data.held, icon: 'lock-closed-outline', color: '#F57C00' },
    { key: 'paidOut', label: t('earnings.paidOut'), value: data.paidOut, icon: 'arrow-up-circle-outline', color: '#1565C0' },
  ] as const;

  const lifetimeRows = [
    { label: t('earnings.lifetimeGross'), value: data.lifetimeGross },
    { label: t('earnings.lifetimeCommission'), value: -data.lifetimeCommission },
    { label: t('earnings.lifetimeNet'), value: data.lifetimeNet, strong: true },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <View style={styles.cardsRow}>
        {balanceCards.map((c) => (
          <View key={c.key} style={styles.balanceCard}>
            <Ionicons name={c.icon as any} size={22} color={c.color} />
            <AppText style={[styles.balanceValue, { color: c.color }]}>{formatKD(c.value)}</AppText>
            <AppText style={styles.balanceLabel}>{c.label}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('earnings.lifetimeTitle')}</AppText>
        {lifetimeRows.map((r, idx) => (
          <View key={idx} style={[styles.lifetimeRow, isRTL && styles.rowRtl]}>
            <AppText style={[styles.lifetimeLabel, r.strong && styles.lifetimeStrong]}>{r.label}</AppText>
            <AppText style={[styles.lifetimeValue, r.strong && styles.lifetimeStrong]}>{formatKD(r.value)}</AppText>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.actionRow, isRTL && styles.rowRtl]}
        onPress={() => router.push('/(app)/earnings/payouts' as any)}
      >
        <Ionicons name="cash-outline" size={22} color="#2196F3" />
        <View style={styles.actionTextWrap}>
          <AppText style={styles.actionTitle}>{t('earnings.payouts.entry')}</AppText>
          <AppText style={styles.actionSub}>
            {canManagePayouts ? t('earnings.payouts.entrySub') : t('earnings.payouts.viewOnly')}
          </AppText>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, isRTL && styles.rowRtl]}
        onPress={() => router.push('/(app)/earnings/deposit-config' as any)}
      >
        <Ionicons name="shield-half-outline" size={22} color="#7B1FA2" />
        <View style={styles.actionTextWrap}>
          <AppText style={styles.actionTitle}>{t('earnings.deposit.entry')}</AppText>
          <AppText style={styles.actionSub}>{t('earnings.deposit.entrySub')}</AppText>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
      </TouchableOpacity>

      <AppText style={styles.footnote}>{t('earnings.commissionNote')}</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#757575', textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2196F3', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  cardsRow: { flexDirection: 'row', gap: 10 },
  balanceCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  balanceValue: { fontSize: 15, fontWeight: '800' },
  balanceLabel: { fontSize: 12, color: '#757575', textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  lifetimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowRtl: { flexDirection: 'row-reverse' },
  lifetimeLabel: { fontSize: 14, color: '#555' },
  lifetimeValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  lifetimeStrong: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 16,
  },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  actionSub: { fontSize: 12, color: '#757575', marginTop: 2 },
  footnote: { fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 4 },
});
