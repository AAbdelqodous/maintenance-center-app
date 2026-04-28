import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetCenterStaffQuery, useUpdateMembershipRoleMutation, useSuspendMemberMutation, useReinstateMemberMutation, useRemoveMemberMutation, useLeaveCenterMutation } from '@/store/api/staffApi';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { MembershipStatusBadge } from '@/components/staff/MembershipStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { CenterRole, MembershipStatus } from '@/types/staff';
import { useAppSelector } from '@/store';

export default function StaffDetailScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateMembershipRoleMutation();
  const [suspend, { isLoading: isSuspending }] = useSuspendMemberMutation();
  const [reinstate, { isLoading: isReinstating }] = useReinstateMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const [leaveCenter, { isLoading: isLeaving }] = useLeaveCenterMutation();

  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [showConfirmSuspend, setShowConfirmSuspend] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const { data: staffData, isLoading, refetch } = useGetCenterStaffQuery(
    { page: 0, size: 100 },
    { skip: !membershipId }
  );

  const membership = staffData?.content?.find((m: any) => m.id === parseInt(membershipId || '0'));
  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const sessionEmail = useAppSelector((state) => state.auth.session?.email);

  useEffect(() => {
    refetch();
  }, [membershipId, refetch]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSuspend = async () => {
    if (Platform.OS !== 'web' && !showConfirmSuspend) {
      setShowConfirmSuspend(true);
      return;
    }
    try {
      await suspend(parseInt(membershipId || '0')).unwrap();
      setShowConfirmSuspend(false);
      refetch();
    } catch (error: any) {
      const msg = error?.data?.message || t('staff.errors.permissionDenied');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  const handleReinstate = async () => {
    try {
      await reinstate(parseInt(membershipId || '0')).unwrap();
      refetch();
    } catch (error: any) {
      const msg = error?.data?.message || t('staff.errors.permissionDenied');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  const handleRemove = async () => {
    if (Platform.OS !== 'web' && !showConfirmRemove) {
      setShowConfirmRemove(true);
      return;
    }
    try {
      await removeMember(parseInt(membershipId || '0')).unwrap();
      setShowConfirmRemove(false);
      router.back();
    } catch (error: any) {
      const msg = error?.data?.message || t('staff.errors.permissionDenied');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  const handleLeave = async () => {
    if (Platform.OS !== 'web' && !showConfirmLeave) {
      setShowConfirmLeave(true);
      return;
    }
    try {
      await leaveCenter().unwrap();
      setShowConfirmLeave(false);
      router.back();
    } catch (error: any) {
      const msg = error?.data?.message || t('staff.errors.permissionDenied');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  const handleChangeRole = async (newRole: string) => {
    try {
      await updateRole({ membershipId: parseInt(membershipId || '0'), role: newRole }).unwrap();
      setShowChangeRole(false);
      refetch();
    } catch (error: any) {
      const msg = error?.data?.message || t('staff.errors.permissionDenied');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!membership) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('staff.member.notFound')}</Text>
      </View>
    );
  }

  const isOwnMembership = membership.userEmail === sessionEmail;
  const canRemove = activePermissions.includes('MANAGE_ALL_STAFF') || 
                    (activePermissions.includes('MANAGE_NON_MANAGER_STAFF') && membership.role !== 'OWNER' && membership.role !== 'BRANCH_MANAGER');
  const canSuspend = canRemove;
  const canChangeRole = activePermissions.includes('MANAGE_ALL_STAFF') && membership.role !== 'OWNER';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(membership.userFirstname, membership.userLastname)}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {membership.userFirstname} {membership.userLastname}
          </Text>
          <Text style={styles.email}>{membership.userEmail}</Text>
          <View style={styles.badges}>
            <RoleBadge role={membership.role} />
            <MembershipStatusBadge status={membership.status} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('staff.member.details')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('staff.member.role')}</Text>
          <RoleBadge role={membership.role} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('staff.member.status')}</Text>
          <MembershipStatusBadge status={membership.status} />
        </View>
        {membership.invitedByName && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('staff.member.invitedBy')}</Text>
            <Text style={styles.value}>{membership.invitedByName}</Text>
          </View>
        )}
        {membership.activatedAt && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('staff.member.activatedAt')}</Text>
            <Text style={styles.value}>{formatDate(membership.activatedAt)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsSection}>
        <PermissionGate permission="MANAGE_ALL_STAFF" fallback={null}>
          {canChangeRole && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowChangeRole(true)}
            >
              <Ionicons name="swap-horizontal" size={20} color="#4F46E5" />
              <Text style={styles.actionButtonText}>{t('staff.member.changeRole')}</Text>
            </TouchableOpacity>
          )}
        </PermissionGate>

        {membership.status === 'ACTIVE' ? (
          <PermissionGate permission="MANAGE_NON_MANAGER_STAFF" fallback={null}>
            {canSuspend && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSuspend}
                disabled={isSuspending}
              >
                <Ionicons name="pause-circle" size={20} color="#F59E0B" />
                <Text style={styles.actionButtonText}>{t('staff.member.suspend')}</Text>
              </TouchableOpacity>
            )}
          </PermissionGate>
        ) : membership.status === 'SUSPENDED' ? (
          <PermissionGate permission="MANAGE_NON_MANAGER_STAFF" fallback={null}>
            {canSuspend && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReinstate}
                disabled={isReinstating}
              >
                <Ionicons name="play-circle" size={20} color="#10B981" />
                <Text style={styles.actionButtonText}>{t('staff.member.reinstate')}</Text>
              </TouchableOpacity>
            )}
          </PermissionGate>
        ) : null}

        {isOwnMembership && membership.role !== 'OWNER' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleLeave}
            disabled={isLeaving}
          >
            <Ionicons name="exit-outline" size={20} color="#DC2626" />
            <Text style={[styles.actionButtonText, styles.dangerText]}>{t('staff.member.leave')}</Text>
          </TouchableOpacity>
        )}

        <PermissionGate permission="MANAGE_NON_MANAGER_STAFF" fallback={null}>
          {canRemove && !isOwnMembership && membership.role !== 'OWNER' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleRemove}
              disabled={isRemoving}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.actionButtonText, styles.dangerText]}>{t('staff.member.remove')}</Text>
            </TouchableOpacity>
          )}
        </PermissionGate>
      </View>

      {showConfirmRemove && (
        <View style={styles.confirmBanner}>
          <Text style={styles.confirmText}>{t('staff.member.confirmRemove')}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonCancel]}
              onPress={() => setShowConfirmRemove(false)}
            >
              <Text style={styles.confirmButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonDanger]}
              onPress={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showConfirmSuspend && (
        <View style={styles.confirmBanner}>
          <Text style={styles.confirmText}>{t('staff.member.confirmSuspend')}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonCancel]}
              onPress={() => setShowConfirmSuspend(false)}
            >
              <Text style={styles.confirmButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonWarning]}
              onPress={handleSuspend}
              disabled={isSuspending}
            >
              {isSuspending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showConfirmLeave && (
        <View style={styles.confirmBanner}>
          <Text style={styles.confirmText}>{t('staff.member.confirmLeave')}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonCancel]}
              onPress={() => setShowConfirmLeave(false)}
            >
              <Text style={styles.confirmButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonDanger]}
              onPress={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showChangeRole && (
        <View style={styles.roleModal}>
          <Text style={styles.roleModalTitle}>{t('staff.member.selectRole')}</Text>
          <View style={styles.roleOptions}>
            {(activePermissions.includes('MANAGE_ALL_STAFF') 
              ? ['BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT']
              : ['RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT']
            ).map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  membership.role === role && styles.roleOptionSelected,
                ]}
                onPress={() => handleChangeRole(role)}
                disabled={isUpdatingRole}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    membership.role === role && styles.roleOptionTextSelected,
                    isRTL && { textAlign: 'right' },
                  ]}
                >
                  {t(`staff.roles.${role as CenterRole}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.roleModalClose}
            onPress={() => setShowChangeRole(false)}
          >
            <Text style={styles.roleModalCloseText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4F46E5',
  },
  headerInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  dangerButton: {
    marginTop: 8,
  },
  dangerText: {
    color: '#DC2626',
  },
  confirmBanner: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  confirmText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: '#E5E7EB',
  },
  confirmButtonDanger: {
    backgroundColor: '#DC2626',
  },
  confirmButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  roleModal: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roleOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  roleModalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleModalCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
