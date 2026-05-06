import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { useGetStaffDashboardQuery } from '@/store/api/staffApi';
import type { CenterRole } from '@/types/staff';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StaffDashboardScreen() {
  const { t, i18n } = useTranslation();
  const session = useAppSelector((state) => state.auth.session);
  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);
  const isRTL = i18n.dir() === 'rtl';

  const { data, isLoading } = useGetStaffDashboardQuery();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <View>
          <Text style={styles.greeting}>
            {t('staff.dashboard.greeting', { name: session?.firstname ?? '' })}
          </Text>
          {activeUserRole && <RoleBadge role={activeUserRole as CenterRole} />}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label={t('staff.dashboard.assignedTotal')} value={data?.assignedTotal ?? 0} />
          <StatCard label={t('staff.dashboard.assignedActive')} value={data?.assignedActive ?? 0} />
          <StatCard label={t('staff.dashboard.assignedCompleted')} value={data?.assignedCompleted ?? 0} />
          <StatCard label={t('staff.dashboard.assignedThisWeek')} value={data?.assignedThisWeek ?? 0} />
          <StatCard
            label={t('staff.dashboard.avgRating')}
            value={data?.avgRating ? data.avgRating.toFixed(1) : '—'}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerRtl: { flexDirection: 'row-reverse' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#4F46E5' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  loader: { marginTop: 40 },
});
