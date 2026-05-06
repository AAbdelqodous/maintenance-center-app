import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetAllUsersQuery, AdminUserResponse } from '@/store/api/adminApi';

const TYPE_FILTERS = ['ALL', 'OWNER', 'STAFF', 'CUSTOMER'] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED:        { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  PENDING_APPROVAL:{ bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  REJECTED:        { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
};

export default function AdminUsersScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [activeFilter, setActiveFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useGetAllUsersQuery({
    page: 0,
    size: 100,
    type: activeFilter === 'ALL' ? undefined : activeFilter,
  });

  const users = (data?.content ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.firstname.toLowerCase().includes(q) ||
      u.lastname.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  const renderItem = ({ item }: { item: AdminUserResponse }) => {
    const status = item.approvalStatus ? STATUS_COLOR[item.approvalStatus] : null;
    return (
      <View style={styles.card}>
        <View style={[styles.row, isRTL && styles.rowRtl]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.firstname.charAt(0)}{item.lastname.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.date}>{formatDate(item.createdDate)}</Text>
          </View>
          <View style={styles.badges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.userType === 'OWNER' ? 'Owner' : item.userType === 'STAFF' ? 'Staff' : item.userType}</Text>
            </View>
            {status && (
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={[styles.searchInput, isRTL && styles.rtlInput]}
          placeholder={t('admin.users.searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <View style={styles.filters}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterBtnText, activeFilter === f && styles.filterBtnTextActive]}>
              {t(`admin.users.filter${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={users.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#7C3AED" />}
        ListHeaderComponent={
          data ? <Text style={styles.countLabel}>{t('admin.users.showing', { count: users.length, total: data.totalElements })}</Text> : null
        }
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator size="large" color="#7C3AED" style={styles.loader} />
            : <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={56} color="#9CA3AF" />
                <Text style={styles.emptyText}>{t('admin.users.noResults')}</Text>
              </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', margin: 16, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  rtlInput: { textAlign: 'right' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterBtnTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  emptyList: { flexGrow: 1, padding: 16 },
  countLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  loader: { marginTop: 60 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  email: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badges: { alignItems: 'flex-end', gap: 4 },
  typeBadge: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#6B7280' },
});
