import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetAdminStatsQuery } from '@/store/api/adminApi';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';

interface StatCardProps {
  icon: string;
  iconColor: string;
  bg: string;
  value: number | string | null;
  label: string;
}

function StatCard({ icon, iconColor, bg, value, label, fullWidth }: StatCardProps & { fullWidth?: boolean }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }, fullWidth && styles.statCardFull]}>
      <Ionicons name={icon as any} size={28} color={iconColor} />
      <Text style={[styles.statValue, { color: iconColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
  color: string;
}

function QuickAction({ icon, label, subtitle, badge, onPress, color }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
        {badge != null && badge > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);

  const { data: stats, isLoading, refetch, isFetching } = useGetAdminStatsQuery();

  const handleLogout = () => {
    const doLogout = async () => {
      await storage.clearAll();
      dispatch(clearSession());
      dispatch(clearActiveCenter());
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#7C3AED" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('admin.dashboard.greeting')}</Text>
          <Text style={styles.role}>{t('admin.dashboard.roleLabel')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color="#7C3AED" />
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {session?.email?.charAt(0).toUpperCase() ?? 'A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>{t('admin.dashboard.overview')}</Text>
      {isLoading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            icon="time-outline"
            iconColor="#F59E0B"
            bg="#FFFBEB"
            value={stats?.pendingApprovals ?? 0}
            label={t('admin.dashboard.statPending')}
          />
          <StatCard
            icon="checkmark-circle-outline"
            iconColor="#10B981"
            bg="#ECFDF5"
            value={stats?.approvedCenters ?? '—'}
            label={t('admin.dashboard.statApproved')}
          />
          <StatCard
            icon="storefront-outline"
            iconColor="#6366F1"
            bg="#EEF2FF"
            value={stats?.totalCenterOwners ?? '—'}
            label={t('admin.dashboard.statOwners')}
            fullWidth
          />
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>{t('admin.dashboard.quickActions')}</Text>
      <View style={styles.actionsContainer}>
        <QuickAction
          icon="person-add-outline"
          label={t('admin.dashboard.actionPending')}
          subtitle={t('admin.dashboard.actionPendingDesc', { count: stats?.pendingApprovals ?? 0 })}
          badge={stats?.pendingApprovals}
          color="#F59E0B"
          onPress={() => router.push('/(app)/(tabs)/admin/pending' as any)}
        />
        <QuickAction
          icon="people-outline"
          label={t('admin.dashboard.actionUsers')}
          subtitle={t('admin.dashboard.actionUsersDesc')}
          color="#6366F1"
          onPress={() => router.push('/(app)/(tabs)/admin/users' as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1F1235' },
  role: { fontSize: 13, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCardFull: { width: '100%' },
  statCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  actionsContainer: { gap: 10 },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  actionBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  actionSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
