import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { computeDelta } from '@/types/dashboard';
import type { KpiCardViewModel } from '@/types/dashboard';

function getDeltaColor(delta: number, positiveIsGood: boolean): string {
  if (delta === 0) return '#9CA3AF';
  const isGood = positiveIsGood ? delta > 0 : delta < 0;
  return isGood ? '#10B981' : '#EF4444';
}

function getDeltaArrow(delta: number): string {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '=';
}

interface KpiCardProps {
  vm: KpiCardViewModel;
}

export function KpiCard({ vm }: KpiCardProps) {
  const { t } = useTranslation();

  const delta = computeDelta(vm.value, vm.baseline, vm.hasSufficientHistory);
  const displayValue = vm.value !== null ? vm.formatValue(vm.value) : '—';

  let deltaBadgeText: string;
  let deltaBadgeColor: string;
  let subtitleText: string;

  if (delta === null) {
    deltaBadgeText = '—';
    deltaBadgeColor = '#9CA3AF';
    subtitleText = vm.hasSufficientHistory
      ? t(vm.overrideSubtitleKey ?? vm.subtitleKey)
      : t('dashboard.kpi.notEnoughHistory');
  } else if (delta === 0) {
    deltaBadgeText = t('dashboard.kpi.noChange');
    deltaBadgeColor = '#9CA3AF';
    subtitleText = t(vm.overrideSubtitleKey ?? vm.subtitleKey);
  } else {
    const arrow = getDeltaArrow(delta);
    const pct = Math.round(Math.abs(delta));
    deltaBadgeText = `${arrow} ${pct}%`;
    deltaBadgeColor = getDeltaColor(delta, vm.positiveIsGood);
    subtitleText = t(vm.overrideSubtitleKey ?? vm.subtitleKey);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={2}>
        {t(vm.labelKey)}
      </Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {displayValue}
      </Text>
      <View style={[styles.deltaBadge, { backgroundColor: deltaBadgeColor + '18' }]}>
        <Text style={[styles.deltaText, { color: deltaBadgeColor }]} numberOfLines={1}>
          {deltaBadgeText}
        </Text>
      </View>
      {vm.target !== undefined && (
        <Text style={styles.target} numberOfLines={1}>
          {t('dashboard.kpi.onTimeRateTarget', { target: vm.target })}
        </Text>
      )}
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitleText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  deltaBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  target: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 14,
  },
});
