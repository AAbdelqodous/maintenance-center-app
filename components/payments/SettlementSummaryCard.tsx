import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useGetSettlementQuery } from '@/store/api/centerPaymentsApi';
import type { CenterPaymentStatus } from '@/types/payments';

const STATUS_COLOR: Record<CenterPaymentStatus, string> = {
  PENDING: '#9E9E9E',
  HELD: '#F57C00',
  RELEASED: '#1565C0',
  PAID: '#2E7D32',
  REFUNDED: '#7B1FA2',
  FAILED: '#C62828',
};

// Spec 023 — compact per-booking settlement (gross − commission = net) for the booking detail.
// Self-degrades to a plain link while no payment has been captured yet (settlement 404). Tapping
// opens the full settlement screen (where a refund can be issued).
export function SettlementSummaryCard({ bookingId, onPress }: { bookingId: number; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { data, isLoading, isError } = useGetSettlementQuery(bookingId, { skip: !bookingId });

  if (isLoading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color="#2196F3" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <TouchableOpacity style={[styles.card, styles.linkRow, isRTL && styles.rowRtl]} onPress={onPress}>
        <Ionicons name="cash-outline" size={20} color="#2E7D32" />
        <AppText style={styles.linkText}>{t('earnings.settlement.entry')}</AppText>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <AppText style={styles.title}>{t('earnings.settlement.entry')}</AppText>
        <View style={[styles.pill, { backgroundColor: STATUS_COLOR[data.paymentStatus] + '22' }]}>
          <AppText style={[styles.pillText, { color: STATUS_COLOR[data.paymentStatus] }]}>
            {t(`earnings.paymentStatus.${data.paymentStatus}`)}
          </AppText>
        </View>
      </View>

      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <AppText style={styles.label}>{t('earnings.settlement.gross')}</AppText>
        <AppText style={styles.value}>{formatKD(data.gross)}</AppText>
      </View>
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <AppText style={styles.commission}>
          {t('earnings.settlement.commission', { rate: (data.commissionRate * 100).toFixed(1) })}
        </AppText>
        <AppText style={styles.commission}>− {formatKD(data.commissionAmount)}</AppText>
      </View>
      {data.refundedAmount > 0 && (
        <View style={[styles.row, isRTL && styles.rowRtl]}>
          <AppText style={styles.commission}>{t('earnings.settlement.refundedLabel')}</AppText>
          <AppText style={styles.commission}>− {formatKD(data.refundedAmount)}</AppText>
        </View>
      )}

      <View style={styles.divider} />
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <AppText style={styles.netLabel}>{t('earnings.settlement.net')}</AppText>
        <View style={[styles.netRight, isRTL && styles.rowRtl]}>
          <AppText style={styles.netValue}>{formatKD(data.net)}</AppText>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9E9E9E" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  loadingCard: { alignItems: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  rowRtl: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: '#555' },
  value: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  commission: { fontSize: 13, color: '#C62828' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 2 },
  netLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  netRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  netValue: { fontSize: 16, fontWeight: '800', color: '#2E7D32' },
});
