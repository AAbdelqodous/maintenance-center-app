import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { PipelineStrip } from '@/components/dashboard/PipelineStrip';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { useDashboardSnapshot } from '@/hooks/useDashboardSnapshot';
import type { PipelineWorkStage } from '@/types/dashboard';
import type { CenterRole } from '@/types/staff';

export default function StaffDashboardScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const isRTL = i18n.dir() === 'rtl';

  const canManagePricing = activePermissions.includes('MANAGE_PRICING');
  const canManageOffers  = activePermissions.includes('MANAGE_OFFERS');

  const { data, isLoading, isFetching } = useDashboardSnapshot();
  const silentRefetch = isFetching && !isLoading;

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handleStagePress = (stage: PipelineWorkStage) => {
    router.push({ pathname: '/staff/bookings' as any, params: { workStage: stage } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {t('staff.dashboard.greeting', { name: session?.firstname ?? '' })}
          </Text>
          {activeUserRole && <RoleBadge role={activeUserRole as CenterRole} />}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      ) : (
        <>
          <PipelineStrip
            stages={data?.pipeline ?? []}
            isFetching={silentRefetch}
            onStagePress={handleStagePress}
          />
          <KpiGrid
            kpis={data?.kpis}
            isLoading={false}
            isFetching={silentRefetch}
          />
        </>
      )}

      {(canManagePricing || canManageOffers) && (
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>{t('dashboard.quickActions')}</Text>
          <View style={[styles.actionRow, isRTL && styles.rowRtl]}>
            {canManagePricing && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/staff/pricing' as any)}
              >
                <Ionicons name="pricetag-outline" size={24} color="#4F46E5" />
                <Text style={styles.actionLabel}>{t('pricing.managePricing')}</Text>
              </TouchableOpacity>
            )}
            {canManageOffers && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/staff/offers' as any)}
              >
                <Ionicons name="gift-outline" size={24} color="#4F46E5" />
                <Text style={styles.actionLabel}>{t('offers.title')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerRtl: { flexDirection: 'row-reverse' },
  headerLeft: { flex: 1 },
  logoutBtn: { padding: 8 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  loader: { marginTop: 40 },
  quickActions: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  rtl: { textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: { fontSize: 13, color: '#4F46E5', fontWeight: '600', textAlign: 'center' },
});
