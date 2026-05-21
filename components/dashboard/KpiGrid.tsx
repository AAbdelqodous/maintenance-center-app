import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KpiCard } from './KpiCard';
import type { DashboardKpis, KpiCardViewModel } from '@/types/dashboard';

interface KpiGridProps {
  kpis: DashboardKpis | undefined;
  isLoading: boolean;
  isFetching?: boolean;
}

function PlaceholderCard() {
  return <View style={styles.placeholder} />;
}

export function KpiGrid({ kpis, isLoading, isFetching = false }: KpiGridProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.grid}>
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
        </View>
      </View>
    );
  }

  const revenueNull = kpis?.revenueToday.value === null;

  const viewModels: KpiCardViewModel[] = [
    {
      labelKey: 'dashboard.kpi.bookingsToday',
      subtitleKey: 'dashboard.kpi.bookingsTodayBaseline',
      value: kpis?.bookingsToday.value ?? null,
      baseline: kpis?.bookingsToday.baseline ?? null,
      hasSufficientHistory: kpis?.bookingsToday.hasSufficientHistory ?? false,
      positiveIsGood: true,
      formatValue: (v) => (v !== null ? String(Math.round(v)) : '—'),
    },
    {
      labelKey: 'dashboard.kpi.avgCompletionTime',
      subtitleKey: 'dashboard.kpi.avgCompletionTimeBaseline',
      value: kpis?.avgCompletionTimeHours.value ?? null,
      baseline: kpis?.avgCompletionTimeHours.baseline ?? null,
      hasSufficientHistory: kpis?.avgCompletionTimeHours.hasSufficientHistory ?? false,
      positiveIsGood: false,
      formatValue: (v) =>
        v !== null
          ? t('dashboard.kpi.avgCompletionTimeUnit', { hours: v.toFixed(1) })
          : '—',
    },
    {
      labelKey: 'dashboard.kpi.onTimeRate',
      subtitleKey: 'dashboard.kpi.onTimeRateBaseline',
      value: kpis?.onTimeCompletionRate.value ?? null,
      baseline: kpis?.onTimeCompletionRate.baseline ?? null,
      hasSufficientHistory: kpis?.onTimeCompletionRate.hasSufficientHistory ?? false,
      positiveIsGood: true,
      formatValue: (v) => (v !== null ? `${Math.round(v)}%` : '—'),
      target: kpis?.onTimeCompletionRate.target ?? 90,
    },
    {
      labelKey: 'dashboard.kpi.revenueToday',
      subtitleKey: 'dashboard.kpi.revenueTodayBaseline',
      overrideSubtitleKey: revenueNull ? 'dashboard.kpi.revenueUnavailable' : undefined,
      value: kpis?.revenueToday.value ?? null,
      baseline: kpis?.revenueToday.baseline ?? null,
      hasSufficientHistory: kpis?.revenueToday.hasSufficientHistory ?? false,
      positiveIsGood: true,
      formatValue: (v) => (v !== null ? `KD ${v.toFixed(3)}` : '—'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isFetching && (
          <ActivityIndicator size={14} color="#9CA3AF" style={styles.fetchingSpinner} />
        )}
      </View>
      <View style={styles.grid}>
        {viewModels.map((vm) => (
          <KpiCard key={vm.labelKey} vm={vm} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
    minHeight: 18,
  },
  headerPlaceholder: {
    height: 14,
    width: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  fetchingSpinner: {
    marginHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  placeholder: {
    width: '48%',
    minWidth: 150,
    height: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 12,
  },
});
