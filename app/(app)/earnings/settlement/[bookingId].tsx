import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useAppSelector } from '@/store';
import { useGetSettlementQuery, useRefundBookingMutation } from '@/store/api/centerPaymentsApi';
import type { CenterPaymentStatus } from '@/types/payments';

const STATUS_COLOR: Record<CenterPaymentStatus, string> = {
  PENDING: '#9E9E9E',
  HELD: '#F57C00',
  RELEASED: '#1565C0',
  PAID: '#2E7D32',
  REFUNDED: '#7B1FA2',
  FAILED: '#C62828',
};

// Spec 023 US2 — per-booking settlement (gross − commission = net, minus refunds) + refund action.
export default function SettlementScreen() {
  const { bookingId: rawId } = useLocalSearchParams<{ bookingId: string }>();
  const bookingId = Number(rawId);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = isRTL ? 'ar' : 'en';
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canRefund = activePermissions.includes('MANAGE_PAYOUTS');

  const { data, isLoading, isError } = useGetSettlementQuery(bookingId, { skip: !bookingId });
  const [refund, { isLoading: refunding }] = useRefundBookingMutation();

  const [showRefund, setShowRefund] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const onRefund = async () => {
    setBanner(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setBanner({ type: 'err', text: t('earnings.settlement.invalidAmount') });
      return;
    }
    try {
      await refund({ bookingId, body: { amount: value, target: 'WALLET', reason: reason.trim() || undefined } }).unwrap();
      setBanner({ type: 'ok', text: t('earnings.settlement.refunded') });
      setShowRefund(false);
      setAmount('');
      setReason('');
    } catch (e: any) {
      setBanner({ type: 'err', text: e?.data?.businessErrorDescription ?? t('common.error') });
    }
  };

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
        <Ionicons name="document-outline" size={48} color="#9E9E9E" />
        <AppText style={styles.muted}>{t('earnings.settlement.notFound')}</AppText>
      </View>
    );
  }

  const refundable = data.paymentStatus !== 'REFUNDED' && data.refundedAmount < data.gross && !data.disputed;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {banner && (
        <View style={[styles.banner, banner.type === 'ok' ? styles.bannerOk : styles.bannerErr]}>
          <Ionicons
            name={banner.type === 'ok' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={banner.type === 'ok' ? '#2E7D32' : '#C62828'}
          />
          <AppText style={styles.bannerText}>{banner.text}</AppText>
        </View>
      )}

      <View style={[styles.statusRow, isRTL && styles.rowRtl]}>
        <AppText style={styles.bookingLabel}>{t('earnings.settlement.bookingNo', { id: data.bookingId })}</AppText>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[data.paymentStatus] + '22' }]}>
          <AppText style={[styles.statusText, { color: STATUS_COLOR[data.paymentStatus] }]}>
            {t(`earnings.paymentStatus.${data.paymentStatus}`)}
          </AppText>
        </View>
      </View>

      {/* Line items */}
      <View style={styles.section}>
        {data.lines.map((line, idx) => (
          <View key={idx} style={[styles.lineRow, isRTL && styles.rowRtl]}>
            <AppText style={styles.lineLabel}>{locale === 'ar' ? line.labelAr : line.labelEn}</AppText>
            <AppText style={styles.lineAmount}>{formatKD(line.amount)}</AppText>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={[styles.lineRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.lineLabel}>{t('earnings.settlement.gross')}</AppText>
          <AppText style={styles.lineAmount}>{formatKD(data.gross)}</AppText>
        </View>
        <View style={[styles.lineRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.commissionLabel}>
            {t('earnings.settlement.commission', { rate: (data.commissionRate * 100).toFixed(1) })}
          </AppText>
          <AppText style={styles.commissionAmount}>− {formatKD(data.commissionAmount)}</AppText>
        </View>
        {data.refundedAmount > 0 && (
          <View style={[styles.lineRow, isRTL && styles.rowRtl]}>
            <AppText style={styles.commissionLabel}>{t('earnings.settlement.refundedLabel')}</AppText>
            <AppText style={styles.commissionAmount}>− {formatKD(data.refundedAmount)}</AppText>
          </View>
        )}
        <View style={styles.divider} />
        <View style={[styles.lineRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.netLabel}>{t('earnings.settlement.net')}</AppText>
          <AppText style={styles.netAmount}>{formatKD(data.net)}</AppText>
        </View>
      </View>

      {data.disputed && (
        <View style={[styles.banner, styles.bannerErr]}>
          <Ionicons name="warning-outline" size={18} color="#C62828" />
          <AppText style={styles.bannerText}>{t('earnings.settlement.disputed')}</AppText>
        </View>
      )}

      {/* Refund */}
      {canRefund && refundable && (
        <View style={styles.section}>
          {!showRefund ? (
            <TouchableOpacity style={styles.refundToggle} onPress={() => setShowRefund(true)}>
              <Ionicons name="return-down-back-outline" size={18} color="#C62828" />
              <AppText style={styles.refundToggleText}>{t('earnings.settlement.issueRefund')}</AppText>
            </TouchableOpacity>
          ) : (
            <View style={styles.refundForm}>
              <AppText style={styles.sectionTitle}>{t('earnings.settlement.issueRefund')}</AppText>
              <AppText style={styles.muted}>{t('earnings.settlement.refundNote')}</AppText>
              <TextInput
                style={[styles.input, isRTL && styles.inputRtl]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.000"
                placeholderTextColor="#9E9E9E"
              />
              <TextInput
                style={[styles.input, isRTL && styles.inputRtl]}
                value={reason}
                onChangeText={setReason}
                placeholder={t('earnings.settlement.reason')}
                placeholderTextColor="#9E9E9E"
              />
              <View style={[styles.refundActions, isRTL && styles.rowRtl]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRefund(false)}>
                  <AppText style={styles.cancelText}>{t('common.cancel')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, (refunding || !amount) && styles.btnDisabled]}
                  onPress={onRefund}
                  disabled={refunding || !amount}
                >
                  {refunding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText style={styles.confirmText}>{t('earnings.settlement.confirmRefund')}</AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 13, color: '#757575' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  bannerOk: { backgroundColor: '#E8F5E9' },
  bannerErr: { backgroundColor: '#FFEBEE' },
  bannerText: { flex: 1, fontSize: 13, color: '#333' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowRtl: { flexDirection: 'row-reverse' },
  bookingLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { fontSize: 14, color: '#555' },
  lineAmount: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  commissionLabel: { fontSize: 13, color: '#C62828' },
  commissionAmount: { fontSize: 13, color: '#C62828', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 4 },
  netLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  netAmount: { fontSize: 16, fontWeight: '800', color: '#2E7D32' },
  refundToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 4 },
  refundToggleText: { fontSize: 14, color: '#C62828', fontWeight: '600' },
  refundForm: { gap: 10 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1A1A2E', backgroundColor: '#fff',
  },
  inputRtl: { textAlign: 'right' },
  refundActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#555', fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#C62828', alignItems: 'center' },
  confirmText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
