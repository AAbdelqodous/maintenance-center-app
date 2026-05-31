import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAdvanceLogisticsMutation } from '@/store/api/fulfillmentApi';
import { legsFor, type FulfillmentMode, type LogisticsStatus } from '@/types/fulfillment';

// Spec 008 — center-side logistics. Shows the pickup/at-home leg timeline and lets staff advance it
// (UPDATE_WORK_STAGE — gate at the call site). Drop-off / no mode → renders nothing. The displayed
// state starts from the booking's logisticsState and then follows the advance response's `legs`.
interface Props {
  bookingId: number;
  mode?: FulfillmentMode | null;
  initialState?: string | null;
  onAdvanced?: () => void;
}

export function LogisticsCard({ bookingId, mode, initialState, onAdvanced }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [advance, { isLoading }] = useAdvanceLogisticsMutation();
  const [status, setStatus] = useState<LogisticsStatus | null>(null);

  const currentState = status?.currentState ?? initialState ?? null;
  const legs = useMemo(
    () => (mode && mode !== 'DROP_OFF' ? legsFor(mode, status?.legs) : []),
    [mode, status?.legs],
  );

  if (!mode || mode === 'DROP_OFF' || legs.length === 0) return null;

  const currentIdx = currentState ? legs.indexOf(currentState) : -1;
  const nextLeg = currentIdx < legs.length - 1 ? legs[currentIdx + 1] : null;

  const handleAdvance = async () => {
    try {
      const res = await advance({ bookingId }).unwrap();
      setStatus(res);
      onAdvanced?.();
    } catch (e: any) {
      const msg = e?.data?.businessErrorDescription ?? t('fulfillment.advanceError');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  };

  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, isRTL && styles.rowRtl]}>
        <Ionicons name="navigate-outline" size={18} color="#1565C0" />
        <Text style={styles.title}>{t('fulfillment.logisticsTitle')}</Text>
        <Text style={styles.modeChip}>{t(`fulfillment.mode.${mode}`)}</Text>
      </View>

      {status?.declined && (
        <View style={[styles.declineBanner, isRTL && styles.rowRtl]}>
          <Ionicons name="alert-circle" size={16} color="#C62828" />
          <Text style={styles.declineText}>{t('fulfillment.declined')}</Text>
        </View>
      )}

      {legs.map((state, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        return (
          <View key={state} style={[styles.row, isRTL && styles.rowRtl]}>
            <View style={styles.railCol}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                {done && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              {idx < legs.length - 1 && <View style={[styles.line, (done || current) && styles.lineDone]} />}
            </View>
            <Text style={[styles.state, current && styles.stateCurrent, done && styles.stateDone]}>
              {t(`fulfillment.logistics.${state}`)}
            </Text>
          </View>
        );
      })}

      {nextLeg ? (
        <TouchableOpacity
          style={[styles.advanceButton, isLoading && styles.advanceButtonDisabled, isRTL && styles.rowRtl]}
          onPress={handleAdvance}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
              <Text style={styles.advanceButtonText}>
                {t('fulfillment.advance', { next: t(`fulfillment.logistics.${nextLeg}`) })}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.finalRow, isRTL && styles.rowRtl]}>
          <Ionicons name="checkmark-done-circle" size={16} color="#2E7D32" />
          <Text style={styles.finalText}>{t('fulfillment.atFinalLeg')}</Text>
        </View>
      )}
    </View>
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
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  rowRtl: { flexDirection: 'row-reverse' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  modeChip: { fontSize: 12, fontWeight: '600', color: '#1565C0', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  declineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10, marginBottom: 12 },
  declineText: { flex: 1, fontSize: 13, color: '#C62828', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  railCol: { alignItems: 'center', width: 22 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#BDBDBD', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  dotCurrent: { borderColor: '#2196F3', backgroundColor: '#2196F3' },
  line: { width: 2, height: 20, backgroundColor: '#E0E0E0' },
  lineDone: { backgroundColor: '#2E7D32' },
  state: { fontSize: 14, color: '#9E9E9E', paddingTop: 0, paddingBottom: 10 },
  stateCurrent: { color: '#1A1A2E', fontWeight: '700' },
  stateDone: { color: '#424242' },
  advanceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 12, marginTop: 6 },
  advanceButtonDisabled: { backgroundColor: '#90CAF9' },
  advanceButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  finalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, justifyContent: 'center' },
  finalText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});
