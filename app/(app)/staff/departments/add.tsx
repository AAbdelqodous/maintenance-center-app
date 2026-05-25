import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useCreateDepartmentMutation } from '@/store/api/departmentsApi';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import type { CreateDepartmentRequest } from '@/types/department';

const DEPT_ERROR_MAP: Record<string, string | undefined> = {
  DEPT_DUPLICATE_NAME_AR: 'departments.errors.duplicateNameAr',
  DEPT_DUPLICATE_NAME_EN: 'departments.errors.duplicateNameEn',
  DEPT_INVALID_CATEGORY: 'departments.errors.invalidCategory',
  DEPT_HAS_OPEN_BOOKINGS: 'departments.errors.hasOpenBookings',
  DEPT_HAS_ACTIVE_MEMBERS: 'departments.errors.hasActiveMembers',
  DEPT_LAST_ACTIVE: 'departments.errors.lastActive',
  DEPT_MEMBER_NOT_TECHNICIAN: 'departments.errors.memberNotTechnician',
  DEPT_MEMBER_ALREADY_ASSIGNED: undefined,
  DEPT_MEMBER_WRONG_CENTER: 'departments.errors.memberWrongCenter',
};

export { DEPT_ERROR_MAP };

function AddDepartmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createDepartment, { isLoading }] = useCreateDepartmentMutation();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = async (data: CreateDepartmentRequest) => {
    setErrorKey(null);
    try {
      await createDepartment(data).unwrap();
      router.back();
    } catch (err: any) {
      const code = err?.data?.businessErrorCode ?? err?.data?.error ?? '';
      const i18nKey = DEPT_ERROR_MAP[code];
      if (i18nKey) {
        setErrorKey(i18nKey);
      } else {
        setErrorKey('error.message');
      }
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {errorKey && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t(errorKey)}</Text>
        </View>
      )}

      <DepartmentForm onSubmit={handleSubmit}>
        {(submit) => (
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={submit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        )}
      </DepartmentForm>
    </ScrollView>
  );
}

export default function AddDepartmentWrapper() {
  return (
    <ErrorBoundary>
      <AddDepartmentScreen />
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
