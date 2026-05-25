import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentMembersQuery,
  useRemoveDepartmentMemberMutation,
} from '@/store/api/departmentsApi';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { DEPT_ERROR_MAP } from './add';
import type { UpdateDepartmentRequest } from '@/types/department';

function EditDepartmentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deptId = Number(id);
  const isRTL = i18n.dir() === 'rtl';

  const [errorKey, setErrorKey] = useState<string | null>(null);

  const { data: departments = [], isLoading: deptsLoading } = useGetDepartmentsQuery();
  const department = departments.find((d) => d.id === deptId);

  const { data: members = [], isLoading: membersLoading } = useGetDepartmentMembersQuery(deptId);
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();
  const [deactivateDepartment, { isLoading: isDeactivating }] = useDeactivateDepartmentMutation();
  const [removeMember] = useRemoveDepartmentMemberMutation();

  const isLastActive = departments.filter((d) => d.isActive).length <= 1 && department?.isActive;

  const handleSave = async (data: UpdateDepartmentRequest) => {
    setErrorKey(null);
    try {
      await updateDepartment({ id: deptId, body: data }).unwrap();
      router.back();
    } catch (err: any) {
      const code = err?.data?.businessErrorCode ?? '';
      const i18nKey = DEPT_ERROR_MAP[code];
      setErrorKey(i18nKey ?? 'error.message');
    }
  };

  const confirmDeactivate = () => {
    const msg = t('departments.deactivateConfirm');
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDeactivate();
    } else {
      Alert.alert(t('departments.deactivate'), msg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: doDeactivate },
      ]);
    }
  };

  const doDeactivate = async () => {
    setErrorKey(null);
    try {
      await deactivateDepartment(deptId).unwrap();
      router.back();
    } catch (err: any) {
      const code = err?.data?.businessErrorCode ?? '';
      const i18nKey = DEPT_ERROR_MAP[code];
      setErrorKey(i18nKey ?? 'error.message');
    }
  };

  const confirmRemoveMember = (membershipId: number, name: string) => {
    const msg = t('departments.removeMemberConfirm');
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doRemoveMember(membershipId);
    } else {
      Alert.alert(name, msg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('departments.removeMember'), style: 'destructive', onPress: () => doRemoveMember(membershipId) },
      ]);
    }
  };

  const doRemoveMember = async (membershipId: number) => {
    try {
      await removeMember({ departmentId: deptId, membershipId }).unwrap();
    } catch (err: any) {
      const code = err?.data?.businessErrorCode ?? '';
      const i18nKey = DEPT_ERROR_MAP[code];
      setErrorKey(i18nKey ?? 'error.message');
    }
  };

  if (deptsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!department) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>{t('staff.member.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {errorKey && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t(errorKey)}</Text>
        </View>
      )}

      <DepartmentForm
        defaultValues={{
          nameAr: department.nameAr,
          nameEn: department.nameEn,
          categoryIds: department.categoryIds,
        }}
        onSubmit={handleSave}
      >
        {(submit) => (
          <TouchableOpacity
            style={[styles.saveButton, isUpdating && styles.buttonDisabled]}
            onPress={submit}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        )}
      </DepartmentForm>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>{t('departments.members')}</Text>
        {membersLoading ? (
          <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 12 }} />
        ) : members.length === 0 ? (
          <Text style={[styles.noMembers, isRTL && styles.textRtl]}>{t('departments.noMembers')}</Text>
        ) : (
          members.map((m) => (
            <View key={m.id} style={[styles.memberRow, isRTL && styles.memberRowRtl]}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.userFirstname} {m.userLastname}</Text>
                <Text style={styles.memberEmail}>{m.userEmail}</Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmRemoveMember(m.id, `${m.userFirstname} ${m.userLastname}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {department.isActive && !isLastActive && (
        <TouchableOpacity
          style={[styles.deactivateButton, isDeactivating && styles.buttonDisabled]}
          onPress={confirmDeactivate}
          disabled={isDeactivating}
          activeOpacity={0.8}
        >
          {isDeactivating ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={styles.deactivateText}>{t('departments.deactivate')}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

export default function EditDepartmentWrapper() {
  return (
    <ErrorBoundary>
      <EditDepartmentScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFound: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  noMembers: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberRowRtl: {
    flexDirection: 'row-reverse',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  memberEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deactivateButton: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deactivateText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },
  textRtl: {
    textAlign: 'right',
  },
});
