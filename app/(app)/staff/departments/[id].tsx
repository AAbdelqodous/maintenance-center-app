import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Switch, TextInput,
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
  // Spec 022 — diagnostic dept controls live alongside the existing name/category form.
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [feeInput, setFeeInput] = useState('');

  const { data: departments = [], isLoading: deptsLoading } = useGetDepartmentsQuery();
  const department = departments.find((d) => d.id === deptId);

  const { data: members = [], isLoading: membersLoading } = useGetDepartmentMembersQuery(deptId);
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();
  const [deactivateDepartment, { isLoading: isDeactivating }] = useDeactivateDepartmentMutation();
  const [removeMember] = useRemoveDepartmentMemberMutation();

  // Hydrate diagnostic state from the loaded department once.
  useEffect(() => {
    if (!department) return;
    setIsDiagnostic(department.isDiagnostic);
    setFeeInput(
      department.diagnosticFeeAmount != null ? department.diagnosticFeeAmount.toFixed(3) : '',
    );
  }, [department?.id, department?.isDiagnostic, department?.diagnosticFeeAmount]);

  const isLastActive = departments.filter((d) => d.isActive).length <= 1 && department?.isActive;

  // Parse the fee input into a number for the API call. Empty string → null (clears the fee).
  const parsedFee = (): number | null => {
    if (!feeInput.trim()) return null;
    const n = Number(feeInput);
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = async (data: UpdateDepartmentRequest) => {
    setErrorKey(null);
    try {
      await updateDepartment({
        id: deptId,
        body: {
          ...data,
          isDiagnostic,
          // Only send a fee when the dept IS diagnostic. Sending a value on a non-diagnostic
          // dept is rejected by the backend with INVALID_DIAGNOSTIC_FEE_TARGET.
          diagnosticFeeAmount: isDiagnostic ? parsedFee() : null,
        },
      }).unwrap();
      router.back();
    } catch (err: any) {
      // Backend may return either the numeric businessErrorCode or the string `error` field.
      // Prefer the string code (spec 022 wire contract) since that's what maps cleanly to i18n.
      const code = err?.data?.error ?? err?.data?.businessErrorCode ?? '';
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
          <>
            <View style={styles.diagnosticCard}>
              <View style={[styles.diagnosticHeader, isRTL && styles.memberRowRtl]}>
                <Text style={[styles.diagnosticLabel, isRTL && styles.textRtl]}>
                  {t('departments.diagnostic.toggle')}
                </Text>
                <Switch
                  value={isDiagnostic}
                  onValueChange={setIsDiagnostic}
                  trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                  thumbColor={isDiagnostic ? '#4F46E5' : '#F3F4F6'}
                />
              </View>
              {isDiagnostic && (
                <View style={styles.diagnosticFeeField}>
                  <Text style={[styles.diagnosticFeeLabel, isRTL && styles.textRtl]}>
                    {t('departments.diagnostic.feeLabel')}
                  </Text>
                  <TextInput
                    style={[styles.diagnosticFeeInput, isRTL && styles.textRtl]}
                    value={feeInput}
                    onChangeText={setFeeInput}
                    keyboardType="decimal-pad"
                    placeholder="0.000"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={[styles.diagnosticFeeHelper, isRTL && styles.textRtl]}>
                    {t('departments.diagnostic.feeHelper')}
                  </Text>
                </View>
              )}
            </View>

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
          </>
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
  // Spec 022 — diagnostic dept controls
  diagnosticCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    gap: 12,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagnosticLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  diagnosticFeeField: {
    gap: 6,
  },
  diagnosticFeeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  diagnosticFeeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  diagnosticFeeHelper: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
