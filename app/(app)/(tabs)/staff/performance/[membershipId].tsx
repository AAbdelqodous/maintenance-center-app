import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetStaffMonthlyHistoryQuery } from '@/store/api/analyticsApi';
import { PermissionGate } from '@/components/staff/PermissionGate';
import type { StaffMonthlyMetrics } from '@/types/staffPerformance';

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTH_NAMES_AR = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function MonthRow({ m, isAr }: { m: StaffMonthlyMetrics; isAr: boolean }) {
  const monthLabel = `${isAr ? MONTH_NAMES_AR[m.month] : MONTH_NAMES[m.month]} ${m.year}`;
  const rating = m.avgRating != null ? m.avgRating.toFixed(1) : '—';
  const onTime = m.onTimeRate != null ? `${Math.round(m.onTimeRate * 100)}%` : '—';

  return (
    <View style={styles.monthRow}>
      <Text style={styles.monthLabel}>{monthLabel}</Text>
      <Text style={styles.monthCell}>{m.completedBookings}</Text>
      <Text style={styles.monthCell}>{rating}</Text>
      <Text style={styles.monthCell}>{onTime}</Text>
    </View>
  );
}

function DrillDownContent({ membershipId }: { membershipId: number }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useGetStaffMonthlyHistoryQuery({
    membershipId,
    months: 6,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B7280" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <TouchableOpacity style={styles.centered} onPress={refetch}>
        <Text style={styles.errorText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    );
  }

  const fullName = `${data.firstName} ${data.lastName}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {t('performanceBoard.drilldown.title', { name: fullName })}
      </Text>

      <Text style={styles.sectionTitle}>{t('performanceBoard.drilldown.monthlyHistory')}</Text>

      {data.months.length === 0 ? (
        <Text style={styles.emptyText}>{t('performanceBoard.drilldown.noHistory')}</Text>
      ) : (
        <View style={styles.table}>
          <View style={[styles.monthRow, styles.tableHeader]}>
            <Text style={[styles.monthLabel, styles.headerText]}>
              {t('performanceBoard.drilldown.month')}
            </Text>
            <Text style={[styles.monthCell, styles.headerText]}>
              {t('performanceBoard.drilldown.completed')}
            </Text>
            <Text style={[styles.monthCell, styles.headerText]}>
              {t('performanceBoard.drilldown.rating')}
            </Text>
            <Text style={[styles.monthCell, styles.headerText]}>
              {t('performanceBoard.drilldown.onTime')}
            </Text>
          </View>
          {data.months.map((m) => (
            <MonthRow key={`${m.year}-${m.month}`} m={m} isAr={isAr} />
          ))}
        </View>
      )}

      {data.recentBookings.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {t('performanceBoard.drilldown.recentBookings')}
          </Text>
          {data.recentBookings.map((b) => (
            <TouchableOpacity
              key={b.bookingId}
              style={styles.bookingRow}
              onPress={() => router.push(`/(tabs)/bookings/${b.bookingId}` as any)}
            >
              <Text style={styles.bookingCustomer} numberOfLines={1}>
                {b.customerName}
              </Text>
              <Text style={styles.bookingMeta}>
                {b.serviceType} · {b.bookingDate}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function AccessDenied() {
  const { t } = useTranslation();
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{t('performanceBoard.drilldown.accessDenied')}</Text>
    </View>
  );
}

export default function StaffPerformanceDrillDown() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  const id = Number(membershipId);

  return (
    <PermissionGate permission="MANAGE_NON_MANAGER_STAFF" fallback={<AccessDenied />}>
      <DrillDownContent membershipId={id} />
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
  },
  headerText: {
    fontWeight: '600',
    color: '#374151',
  },
  monthRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  monthLabel: {
    flex: 2,
    fontSize: 13,
    color: '#374151',
  },
  monthCell: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  bookingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingCustomer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  bookingMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
