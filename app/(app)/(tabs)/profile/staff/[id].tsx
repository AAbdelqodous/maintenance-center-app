import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, router as globalRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetCenterStaffQuery,
  useUpdateMembershipRoleMutation,
  useSuspendMemberMutation,
  useReinstateMemberMutation,
  useRemoveMemberMutation,
  useResendInvitationMutation,
} from '@/store/api/staffApi';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { MembershipStatusBadge } from '@/components/staff/MembershipStatusBadge';
import type { CenterRole } from '@/types/staff';

const ASSIGNABLE_ROLES: CenterRole[] = ['BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'];

export default function StaffMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const { data: staffPage, isLoading } = useGetCenterStaffQuery({});
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateMembershipRoleMutation();
  const [suspend, { isLoading: isSuspending }] = useSuspendMemberMutation();
  const [reinstate, { isLoading: isReinstating }] = useReinstateMemberMutation();
  const [remove, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const [resend, { isLoading: isResending }] = useResendInvitationMutation();

  const membership = staffPage?.content.find((m) => String(m.id) === id);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const confirm = (message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) onConfirm();
    } else {
      Alert.alert(t('common.confirm'), message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const handleChangeRole = async (newRole: CenterRole) => {
    setRoleModalVisible(false);
    if (!membership) return;
    try {
      await updateRole({ membershipId: membership.id, role: newRole }).unwrap();
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.businessErrorDescription ?? t('common.error');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  };

  const handleSuspend = () =>
    confirm(t('staff.member.confirmSuspend'), async () => {
      if (!membership) return;
      try {
        await suspend(membership.id).unwrap();
      } catch (err: any) {
        if (err?.data?.error === 'STAFF_HAS_ACTIVE_ASSIGNMENTS') {
          const msg = t('staff.member.hasActiveAssignments');
          if (Platform.OS === 'web') {
            window.alert(msg);
            globalRouter.push('/(app)/(tabs)/bookings' as any);
          } else {
            Alert.alert(t('common.error'), msg, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('staff.member.viewBookings'), onPress: () => globalRouter.push('/(app)/(tabs)/bookings' as any) },
            ]);
          }
        } else {
          const msg = err?.data?.businessErrorDescription ?? t('common.error');
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert(t('common.error'), msg);
        }
      }
    });

  const handleReinstate = async () => {
    if (!membership) return;
    try {
      await reinstate(membership.id).unwrap();
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.businessErrorDescription ?? t('common.error');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  };

  const handleRemove = () =>
    confirm(t('staff.member.confirmRemove'), async () => {
      if (!membership) return;
      try {
        await remove(membership.id).unwrap();
        router.back();
      } catch (err: any) {
        if (err?.data?.error === 'STAFF_HAS_ACTIVE_ASSIGNMENTS') {
          const msg = t('staff.member.hasActiveAssignments');
          if (Platform.OS === 'web') {
            window.alert(msg);
            globalRouter.push('/(app)/(tabs)/bookings' as any);
          } else {
            Alert.alert(t('common.error'), msg, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('staff.member.viewBookings'), onPress: () => globalRouter.push('/(app)/(tabs)/bookings' as any) },
            ]);
          }
        } else {
          const msg = err?.data?.businessErrorDescription ?? t('common.error');
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert(t('common.error'), msg);
        }
      }
    });

  const handleResendInvitation = async () => {
    if (!membership) return;
    try {
      await resend(membership.id).unwrap();
      const msg = t('staff.invite.sent');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.success'), msg);
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.businessErrorDescription ?? t('common.error');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!membership) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-remove-outline" size={48} color="#E0E0E0" />
        <Text style={styles.notFoundText}>{t('staff.member.notFound')}</Text>
      </View>
    );
  }

  const isActive = membership.status === 'ACTIVE';
  const isSuspended = membership.status === 'SUSPENDED';
  const isInvited = membership.status === 'INVITED' || membership.status === 'INVITATION_EXPIRED';
  const isBusy = isUpdatingRole || isSuspending || isReinstating || isRemoving || isResending;

  const initials = `${membership.userFirstname.charAt(0)}${membership.userLastname.charAt(0)}`.toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + identity */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{membership.userFirstname} {membership.userLastname}</Text>
        <Text style={styles.email}>{membership.userEmail}</Text>
        <View style={styles.badgeRow}>
          <RoleBadge role={membership.role} />
          <MembershipStatusBadge status={membership.status} />
        </View>
      </View>

      {/* Details card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{t('staff.member.details')}</Text>
        <DetailRow
          label={t('staff.member.role')}
          value={t(`staff.roles.${membership.role}`)}
          isRTL={isRTL}
        />
        <DetailRow
          label={t('staff.member.status')}
          value={t(`staff.statuses.${membership.status}`)}
          isRTL={isRTL}
        />
        {membership.invitedByName && (
          <DetailRow
            label={t('staff.member.invitedBy', { name: '' })}
            value={membership.invitedByName}
            isRTL={isRTL}
          />
        )}
        {membership.activatedAt && (
          <DetailRow
            label={t('staff.member.activatedAt')}
            value={formatDate(membership.activatedAt)}
            isRTL={isRTL}
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.card}>
        {/* Change role — available for active & suspended members */}
        {(isActive || isSuspended) && (
          <ActionRow
            icon="swap-horizontal-outline"
            color="#2196F3"
            label={t('staff.member.changeRole')}
            onPress={() => setRoleModalVisible(true)}
            disabled={isBusy}
            isRTL={isRTL}
          />
        )}

        {/* Resend invitation — for pending/expired invites */}
        {isInvited && (
          <ActionRow
            icon="mail-outline"
            color="#FF9800"
            label={t('staff.invite.send')}
            onPress={handleResendInvitation}
            loading={isResending}
            disabled={isBusy}
            isRTL={isRTL}
          />
        )}

        {/* Suspend — active members only */}
        {isActive && (
          <ActionRow
            icon="pause-circle-outline"
            color="#FF9800"
            label={t('staff.member.suspend')}
            onPress={handleSuspend}
            loading={isSuspending}
            disabled={isBusy}
            isRTL={isRTL}
          />
        )}

        {/* Reinstate — suspended members only */}
        {isSuspended && (
          <ActionRow
            icon="play-circle-outline"
            color="#4CAF50"
            label={t('staff.member.reinstate')}
            onPress={handleReinstate}
            loading={isReinstating}
            disabled={isBusy}
            isRTL={isRTL}
          />
        )}

        {/* Remove */}
        <ActionRow
          icon="trash-outline"
          color="#F44336"
          label={t('staff.member.remove')}
          onPress={handleRemove}
          loading={isRemoving}
          disabled={isBusy}
          isRTL={isRTL}
          danger
        />
      </View>

      {/* Role picker modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('staff.member.selectRole')}</Text>
            {ASSIGNABLE_ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.modalRoleRow, membership.role === role && styles.modalRoleRowSelected]}
                onPress={() => handleChangeRole(role)}
              >
                <Text style={[styles.modalRoleText, membership.role === role && styles.modalRoleTextSelected]}>
                  {t(`staff.roles.${role}`)}
                </Text>
                {membership.role === role && (
                  <Ionicons name="checkmark" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
  return (
    <View style={[detailStyles.row, isRTL && detailStyles.rowRtl]}>
      <Text style={[detailStyles.label, isRTL && detailStyles.rtl]}>{label}</Text>
      <Text style={[detailStyles.value, isRTL && detailStyles.rtl]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  icon, color, label, onPress, loading, disabled, danger, isRTL,
}: {
  icon: string; color: string; label: string;
  onPress: () => void; loading?: boolean; disabled?: boolean; danger?: boolean; isRTL: boolean;
}) {
  return (
    <TouchableOpacity
      style={[actionStyles.row, isRTL && actionStyles.rowRtl]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon as any} size={22} color={color} />
      )}
      <Text style={[actionStyles.label, danger && actionStyles.dangerLabel, isRTL && actionStyles.rtl]}>
        {label}
      </Text>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  value: { fontSize: 14, color: '#111827', fontWeight: '600' },
  rtl: { textAlign: 'right' },
});

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  dangerLabel: { color: '#F44336' },
  rtl: { textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#4F46E5' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, color: '#9CA3AF', fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5,
  },
  rtl: { textAlign: 'right' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    marginBottom: 16, textAlign: 'center',
  },
  modalRoleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalRoleRowSelected: { backgroundColor: '#EFF6FF', borderRadius: 8 },
  modalRoleText: { fontSize: 15, color: '#374151' },
  modalRoleTextSelected: { color: '#2196F3', fontWeight: '700' },
});
