import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import {
  useGetLeadMetricsQuery,
  useGetLeadPreferencesQuery,
  useUpdateLeadPreferencesMutation,
} from '@/store/api/quoteRequestsApi';

// Spec 024 US3 (preferences) + US4 (metrics). Owner-only via RESPOND_TO_QUOTES (gated by the entry).
export default function LeadPreferencesScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data: prefs, isLoading } = useGetLeadPreferencesQuery();
  const { data: metrics } = useGetLeadMetricsQuery();
  const [updatePrefs, { isLoading: saving }] = useUpdateLeadPreferencesMutation();

  const [optedIn, setOptedIn] = useState(true);
  const [areas, setAreas] = useState('');
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');

  useEffect(() => {
    if (prefs) {
      setOptedIn(prefs.optedIn);
      setAreas(prefs.areaGovernorates.join(', '));
      setQuietStart(prefs.quietHoursStart ?? '');
      setQuietEnd(prefs.quietHoursEnd ?? '');
    }
  }, [prefs]);

  const handleSave = () => {
    if (!prefs) return;
    updatePrefs({
      optedIn,
      categoryIds: prefs.categoryIds,
      areaGovernorates: areas.split(',').map((a) => a.trim()).filter(Boolean),
      quietHoursStart: quietStart.trim() || undefined,
      quietHoursEnd: quietEnd.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const inputStyle = [styles.input, isRTL && styles.rtlInput];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Metrics (US4) */}
      {metrics && (
        <View style={styles.metricsCard}>
          <AppText style={styles.metricsTitle}>{t('quoteRequests.metrics.title')}</AppText>
          <View style={styles.metricsGrid}>
            <Metric label={t('quoteRequests.metrics.received')} value={String(metrics.received)} />
            <Metric label={t('quoteRequests.metrics.responded')} value={String(metrics.responded)} />
            <Metric label={t('quoteRequests.metrics.won')} value={String(metrics.won)} />
            <Metric label={t('quoteRequests.metrics.winRate')} value={`${Math.round(metrics.winRate * 100)}%`} />
            <Metric label={t('quoteRequests.metrics.avgResponse')} value={`${metrics.avgResponseMinutes}m`} />
          </View>
        </View>
      )}

      {/* Preferences (US3) */}
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <AppText style={styles.label}>{t('quoteRequests.preferences.optIn')}</AppText>
            <AppText style={styles.hint}>{t('quoteRequests.preferences.optInHint')}</AppText>
          </View>
          <Switch value={optedIn} onValueChange={setOptedIn} />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.label}>{t('quoteRequests.preferences.areas')}</AppText>
        <AppText style={styles.hint}>{t('quoteRequests.preferences.areasHint')}</AppText>
        <TextInput
          style={inputStyle}
          value={areas}
          onChangeText={setAreas}
          placeholder="Hawalli, Salmiya, Capital"
          placeholderTextColor="#9E9E9E"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.section}>
        <AppText style={styles.label}>{t('quoteRequests.preferences.quietHours')}</AppText>
        <View style={styles.quietRow}>
          <View style={styles.quietCol}>
            <AppText style={styles.hint}>{t('quoteRequests.preferences.from')}</AppText>
            <TextInput style={inputStyle} value={quietStart} onChangeText={setQuietStart} placeholder="22:00" placeholderTextColor="#9E9E9E" />
          </View>
          <View style={styles.quietCol}>
            <AppText style={styles.hint}>{t('quoteRequests.preferences.to')}</AppText>
            <TextInput style={inputStyle} value={quietEnd} onChangeText={setQuietEnd} placeholder="07:00" placeholderTextColor="#9E9E9E" />
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.save, saving && styles.saveDisabled]} onPress={handleSave} disabled={saving}>
        <Ionicons name="checkmark" size={18} color="#fff" />
        <AppText style={styles.saveText}>{t('quoteRequests.preferences.save')}</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  metricsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  metricsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metric: { minWidth: 70 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#1565C0' },
  metricLabel: { fontSize: 12, color: '#757575', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#333333' },
  hint: { fontSize: 13, color: '#757575', marginTop: 2 },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 10,
  },
  rtlInput: { writingDirection: 'rtl' },
  quietRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  quietCol: { flex: 1 },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
