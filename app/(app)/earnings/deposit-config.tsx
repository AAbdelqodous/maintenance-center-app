import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useAppSelector } from '@/store';
import { useGetDepositConfigQuery, useUpdateDepositConfigMutation } from '@/store/api/centerPaymentsApi';
import type { CancellationPolicy, DepositMode } from '@/types/payments';

const MODES: DepositMode[] = ['NONE', 'FLAT', 'PERCENT'];
const POLICIES: CancellationPolicy[] = ['REFUND', 'RETAIN'];

// Spec 023 US4 — configure a booking deposit (none / flat / percent) + cancellation policy, to cut
// no-shows. Viewing needs VIEW_REVENUE; editing reuses MANAGE_PRICING.
export default function DepositConfigScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canEdit = activePermissions.includes('MANAGE_PRICING');

  const { data, isLoading } = useGetDepositConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateDepositConfigMutation();

  const [mode, setMode] = useState<DepositMode>('NONE');
  const [flatAmount, setFlatAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [policy, setPolicy] = useState<CancellationPolicy>('REFUND');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setMode(data.mode);
    setFlatAmount(data.flatAmount != null ? String(data.flatAmount) : '');
    setPercent(data.percent != null ? String(data.percent) : '');
    setPolicy((data.cancellationPolicy as CancellationPolicy) ?? 'REFUND');
  }, [data]);

  const onSave = async () => {
    setBanner(null);
    if (mode === 'FLAT' && (!Number(flatAmount) || Number(flatAmount) <= 0)) {
      setBanner({ type: 'err', text: t('earnings.deposit.invalidFlat') });
      return;
    }
    if (mode === 'PERCENT') {
      const p = Number(percent);
      if (!p || p <= 0 || p > 100) {
        setBanner({ type: 'err', text: t('earnings.deposit.invalidPercent') });
        return;
      }
    }
    try {
      await updateConfig({
        mode,
        flatAmount: mode === 'FLAT' ? Number(flatAmount) : null,
        percent: mode === 'PERCENT' ? Number(percent) : null,
        cancellationPolicy: policy,
      }).unwrap();
      setBanner({ type: 'ok', text: t('earnings.deposit.saved') });
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

      <AppText style={styles.intro}>{t('earnings.deposit.intro')}</AppText>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('earnings.deposit.mode')}</AppText>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.option, isRTL && styles.rowRtl, mode === m && styles.optionActive]}
            onPress={() => canEdit && setMode(m)}
            disabled={!canEdit}
          >
            <Ionicons
              name={mode === m ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={mode === m ? '#2196F3' : '#9E9E9E'}
            />
            <View style={styles.optionTextWrap}>
              <AppText style={styles.optionTitle}>{t(`earnings.deposit.modes.${m}`)}</AppText>
              <AppText style={styles.optionSub}>{t(`earnings.deposit.modesSub.${m}`)}</AppText>
            </View>
          </TouchableOpacity>
        ))}

        {mode === 'FLAT' && (
          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>{t('earnings.deposit.flatAmount')}</AppText>
            <TextInput
              style={[styles.input, isRTL && styles.inputRtl]}
              value={flatAmount}
              onChangeText={setFlatAmount}
              keyboardType="decimal-pad"
              editable={canEdit}
              placeholder="0.000"
              placeholderTextColor="#9E9E9E"
            />
          </View>
        )}
        {mode === 'PERCENT' && (
          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>{t('earnings.deposit.percent')}</AppText>
            <TextInput
              style={[styles.input, isRTL && styles.inputRtl]}
              value={percent}
              onChangeText={setPercent}
              keyboardType="number-pad"
              editable={canEdit}
              placeholder="20"
              placeholderTextColor="#9E9E9E"
            />
          </View>
        )}
      </View>

      {mode !== 'NONE' && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>{t('earnings.deposit.cancellationPolicy')}</AppText>
          {POLICIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.option, isRTL && styles.rowRtl, policy === p && styles.optionActive]}
              onPress={() => canEdit && setPolicy(p)}
              disabled={!canEdit}
            >
              <Ionicons
                name={policy === p ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={policy === p ? '#2196F3' : '#9E9E9E'}
              />
              <View style={styles.optionTextWrap}>
                <AppText style={styles.optionTitle}>{t(`earnings.deposit.policies.${p}`)}</AppText>
                <AppText style={styles.optionSub}>{t(`earnings.deposit.policiesSub.${p}`)}</AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {canEdit ? (
        <TouchableOpacity style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <AppText style={styles.primaryBtnText}>{t('common.save')}</AppText>}
        </TouchableOpacity>
      ) : (
        <AppText style={styles.readOnly}>{t('earnings.deposit.readOnly')}</AppText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  bannerOk: { backgroundColor: '#E8F5E9' },
  bannerErr: { backgroundColor: '#FFEBEE' },
  bannerText: { flex: 1, fontSize: 13, color: '#333' },
  intro: { fontSize: 13, color: '#757575' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  optionActive: {},
  rowRtl: { flexDirection: 'row-reverse' },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  optionSub: { fontSize: 12, color: '#757575', marginTop: 2 },
  field: { gap: 6, marginTop: 6 },
  fieldLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1A1A2E', backgroundColor: '#fff',
  },
  inputRtl: { textAlign: 'right' },
  primaryBtn: { backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  readOnly: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
});
