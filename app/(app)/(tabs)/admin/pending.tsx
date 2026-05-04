import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetPendingUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  AdminUserResponse,
} from '@/store/api/adminApi';

export default function AdminPendingScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data, isLoading, refetch, isFetching } = useGetPendingUsersQuery({ page: 0, size: 50 });
  const [approveUser] = useApproveUserMutation();
  const [rejectUser] = useRejectUserMutation();

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (user: AdminUserResponse) => {
    setActionId(user.id);
    try {
      await approveUser(user.id).unwrap();
      showToast('success', t('admin.approved', { name: user.firstname }));
    } catch {
      showToast('error', t('admin.actionFailed'));
    } finally {
      setActionId(null);
    }
  };

  const handleRejectConfirm = async (user: AdminUserResponse) => {
    setActionId(user.id);
    try {
      await rejectUser({ id: user.id, reason: rejectReason.trim() || undefined }).unwrap();
      showToast('success', t('admin.rejected', { name: user.firstname }));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      showToast('error', t('admin.actionFailed'));
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      i18n.language === 'ar' ? 'ar-EG' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' },
    );

  const renderItem = ({ item }: { item: AdminUserResponse }) => {
    const isBusy = actionId === item.id;
    const isRejectOpen = rejectingId === item.id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, isRTL && styles.rowRtl]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstname.charAt(0)}{item.lastname.charAt(0)}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.date}>{t('admin.registeredOn', { date: formatDate(item.createdDate) })}</Text>
          </View>
        </View>

        {isRejectOpen ? (
          <View style={styles.rejectBox}>
            <TextInput
              style={[styles.rejectInput, isRTL && styles.rtlInput]}
              placeholder={t('admin.rejectReasonPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={[styles.rejectActions, isRTL && styles.rowRtl]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setRejectingId(null); setRejectReason(''); }}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRejectBtn} onPress={() => handleRejectConfirm(item)} disabled={isBusy}>
                {isBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmRejectBtnText}>{t('admin.confirmReject')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.actions, isRTL && styles.rowRtl]}>
            <TouchableOpacity style={[styles.rejectBtn, isBusy && styles.disabledBtn]} onPress={() => setRejectingId(item.id)} disabled={!!actionId}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.rejectBtnText}>{t('admin.reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, isBusy && styles.disabledBtn]} onPress={() => handleApprove(item)} disabled={!!actionId}>
              {isBusy
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <><Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" /><Text style={styles.approveBtnText}>{t('admin.approve')}</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {toast && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}
      <FlatList
        data={data?.content ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={(data?.content.length ?? 0) === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#7C3AED" />}
        ListHeaderComponent={data && data.totalElements > 0
          ? <Text style={styles.countLabel}>{t('admin.pendingCount', { count: data.totalElements })}</Text>
          : null}
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator size="large" color="#7C3AED" style={styles.loader} />
            : <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>{t('admin.noPending')}</Text>
              </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1, padding: 16 },
  loader: { marginTop: 60 },
  countLabel: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 4, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  email: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  date: { fontSize: 12, color: '#9CA3AF' },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, gap: 6,
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#FECACA', gap: 6,
  },
  rejectBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },
  rejectBox: { marginTop: 4 },
  rejectInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#111827',
    minHeight: 72, textAlignVertical: 'top', marginBottom: 10,
  },
  rtlInput: { textAlign: 'right' },
  rejectActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  confirmRejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center' },
  confirmRejectBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  toast: {
    position: 'absolute', top: 16, left: 16, right: 16,
    zIndex: 100, padding: 14, borderRadius: 10,
  },
  toastSuccess: { backgroundColor: '#D1FAE5' },
  toastError: { backgroundColor: '#FEE2E2' },
  toastText: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'center' },
});
