import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useAppSelector } from '@/store';
import {
  useGetEarningsQuery,
  useGetPayoutAccountQuery,
  useGetPayoutsQuery,
  useRequestPayoutMutation,
  useUpsertPayoutAccountMutation,
} from '@/store/api/centerPaymentsApi';
import { MIN_PAYOUT_KD, type Payout, type PayoutStatus } from '@/types/payments';

const STATUS_COLOR: Record<PayoutStatus, string> = {
  REQUESTED: '#F57C00',
  PROCESSING: '#1565C0',
  PAID: '#2E7D32',
  FAILED: '#C62828',
};

function errMessage(e: any, fallback: string): string {
  return e?.data?.businessErrorDescription ?? fallback;
}

// Spec 023 US3 — bank payout account + request a payout of available balance + payout history.
export default function PayoutsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = isRTL ? 'ar' : 'en';
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canManagePayouts = activePermissions.includes('MANAGE_PAYOUTS');

  const { data: earnings, refetch: refetchEarnings } = useGetEarningsQuery();
  const { data: account, isLoading: accountLoading, isError: noAccount } = useGetPayoutAccountQuery();
  const { data: payouts, isLoading: payoutsLoading, refetch: refetchPayouts, isFetching } = useGetPayoutsQuery();
  const [upsertAccount, { isLoading: savingAccount }] = useUpsertPayoutAccountMutation();
  const [requestPayout, { isLoading: requesting }] = useRequestPayoutMutation();

  const [iban, setIban] = useState('');
  const [holderName, setHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const available = earnings?.available ?? 0;

  const onSaveAccount = async () => {
    setBanner(null);
    try {
      await upsertAccount({ iban: iban.trim(), holderName: holderName.trim() }).unwrap();
      setBanner({ type: 'ok', text: t('earnings.payouts.accountSaved') });
      setIban('');
      setHolderName('');
    } catch (e) {
      setBanner({ type: 'err', text: errMessage(e, t('common.error')) });
    }
  };

  const onRequest = async () => {
    setBanner(null);
    const value = Number(amount);
    if (!account) return;
    if (!Number.isFinite(value) || value <= 0) {
      setBanner({ type: 'err', text: t('earnings.payouts.invalidAmount') });
      return;
    }
    try {
      await requestPayout({ amount: value, accountId: account.id }).unwrap();
      setBanner({ type: 'ok', text: t('earnings.payouts.requested') });
      setAmount('');
      refetchEarnings();
    } catch (e) {
      setBanner({ type: 'err', text: errMessage(e, t('common.error')) });
    }
  };

  if (accountLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const hasAccount = !!account && !noAccount;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { refetchPayouts(); refetchEarnings(); }} />}
      >
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

        <View style={styles.availCard}>
          <AppText style={styles.availLabel}>{t('earnings.available')}</AppText>
          <AppText style={styles.availValue}>{formatKD(available)}</AppText>
        </View>

        {/* Bank account */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('earnings.payouts.account')}</AppText>
          {hasAccount ? (
            <View style={styles.accountBox}>
              <View style={[styles.accountRow, isRTL && styles.rowRtl]}>
                <Ionicons name="business-outline" size={18} color="#555" />
                <AppText style={styles.accountHolder}>{account!.holderName}</AppText>
                <View style={styles.verifiedPill}>
                  <AppText style={styles.verifiedText}>{t(`earnings.payouts.status.${account!.status}`)}</AppText>
                </View>
              </View>
              <AppText style={styles.iban}>{account!.iban}</AppText>
              {!!account!.bankName && <AppText style={styles.bankName}>{account!.bankName}</AppText>}
            </View>
          ) : (
            <AppText style={styles.muted}>{t('earnings.payouts.noAccount')}</AppText>
          )}

          {canManagePayouts && (
            <View style={styles.form}>
              <AppText style={styles.fieldLabel}>{t('earnings.payouts.holderName')}</AppText>
              <TextInput
                style={[styles.input, isRTL && styles.inputRtl]}
                value={holderName}
                onChangeText={setHolderName}
                placeholder={t('earnings.payouts.holderName')}
                placeholderTextColor="#9E9E9E"
              />
              <AppText style={styles.fieldLabel}>{t('earnings.payouts.iban')}</AppText>
              <TextInput
                style={[styles.input, isRTL && styles.inputRtl]}
                value={iban}
                onChangeText={setIban}
                autoCapitalize="characters"
                placeholder="KW00 0000 0000 0000 0000 0000 00"
                placeholderTextColor="#9E9E9E"
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (!iban.trim() || !holderName.trim() || savingAccount) && styles.btnDisabled]}
                onPress={onSaveAccount}
                disabled={!iban.trim() || !holderName.trim() || savingAccount}
              >
                {savingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText style={styles.primaryBtnText}>
                    {hasAccount ? t('earnings.payouts.updateAccount') : t('earnings.payouts.addAccount')}
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Request payout */}
        {canManagePayouts && hasAccount && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>{t('earnings.payouts.requestTitle')}</AppText>
            <AppText style={styles.muted}>{t('earnings.payouts.minNote', { min: MIN_PAYOUT_KD.toFixed(3) })}</AppText>
            <View style={[styles.amountRow, isRTL && styles.rowRtl]}>
              <TextInput
                style={[styles.input, styles.amountInput, isRTL && styles.inputRtl]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.000"
                placeholderTextColor="#9E9E9E"
              />
              <TouchableOpacity
                style={[styles.primaryBtn, styles.amountBtn, (requesting || !amount) && styles.btnDisabled]}
                onPress={onRequest}
                disabled={requesting || !amount}
              >
                {requesting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText style={styles.primaryBtnText}>{t('earnings.payouts.request')}</AppText>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setAmount(String(available))}>
              <AppText style={styles.maxLink}>{t('earnings.payouts.withdrawAll')}</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('earnings.payouts.history')}</AppText>
          {payoutsLoading ? (
            <ActivityIndicator color="#2196F3" />
          ) : payouts && payouts.length > 0 ? (
            payouts.map((p: Payout) => (
              <View key={p.id} style={[styles.payoutRow, isRTL && styles.rowRtl]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[p.status] }]} />
                <View style={styles.payoutText}>
                  <AppText style={styles.payoutAmount}>{formatKD(p.amount)}</AppText>
                  <AppText style={styles.payoutDate}>
                    {new Date(p.requestedAt).toLocaleDateString(locale)}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </AppText>
                </View>
                <AppText style={[styles.payoutStatus, { color: STATUS_COLOR[p.status] }]}>
                  {t(`earnings.payouts.status.${p.status}`)}
                </AppText>
              </View>
            ))
          ) : (
            <AppText style={styles.muted}>{t('earnings.payouts.noHistory')}</AppText>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: 13, color: '#757575' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  bannerOk: { backgroundColor: '#E8F5E9' },
  bannerErr: { backgroundColor: '#FFEBEE' },
  bannerText: { flex: 1, fontSize: 13, color: '#333' },
  availCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  availLabel: { fontSize: 13, color: '#757575' },
  availValue: { fontSize: 24, fontWeight: '800', color: '#2E7D32' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  rowRtl: { flexDirection: 'row-reverse' },
  accountBox: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 12, gap: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountHolder: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  verifiedPill: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 11, color: '#2E7D32', fontWeight: '700' },
  iban: { fontSize: 13, color: '#555', letterSpacing: 1 },
  bankName: { fontSize: 12, color: '#9E9E9E' },
  form: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1A1A2E', backgroundColor: '#fff',
  },
  inputRtl: { textAlign: 'right' },
  primaryBtn: { backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: { flex: 1 },
  amountBtn: { marginTop: 0, paddingHorizontal: 20 },
  maxLink: { fontSize: 13, color: '#2196F3', fontWeight: '600' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  payoutText: { flex: 1 },
  payoutAmount: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  payoutDate: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  payoutStatus: { fontSize: 12, fontWeight: '700' },
});
