import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInviteStaffMutation } from '@/store/api/staffApi';
import { inviteStaffSchema, InviteStaffFormData } from '@/components/staff/staffSchema';
import { ROLE_PERMISSIONS } from '@/types/staff';
import { useAppSelector } from '@/store';
import { CenterRole } from '@/types/staff';

export default function InviteStaffScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const [inviteStaff, { isLoading }] = useInviteStaffMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteStaffFormData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      targetEmail: '',
      targetRole: 'TECHNICIAN',
    },
  });

  const getAvailableRoles = () => {
    if (!activeUserRole) return [];

    const roles: CenterRole[] = [];
    const permissions = ROLE_PERMISSIONS[activeUserRole];

    if (permissions.includes('MANAGE_ALL_STAFF')) {
      return ['BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'];
    }

    if (permissions.includes('MANAGE_NON_MANAGER_STAFF')) {
      return ['RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'];
    }

    return roles;
  };

  const availableRoles = getAvailableRoles();

  const onSubmit = async (values: InviteStaffFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await inviteStaff(values).unwrap();
      setSuccessMessage(t('staff.invite.sent'));
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error('Invite error:', JSON.stringify(error?.data, null, 2));
      const msg = error?.data?.message || error?.data?.businessErrorDescription || t('staff.errors.invitationFailed');
      setErrorMessage(msg);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}
      {successMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('staff.invite.email')}</Text>
        <Controller
          control={control}
          name="targetEmail"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, isRTL && styles.inputRtl]}
              placeholder={t('staff.invite.emailPlaceholder')}
              placeholderTextColor="#9E9E9E"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        />
        {errors.targetEmail && (
          <Text style={styles.errorText}>{t(errors.targetEmail.message || 'validation.invalidEmail')}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('staff.invite.role')}</Text>
        <Controller
          control={control}
          name="targetRole"
          render={({ field: { onChange, value } }) => (
            Platform.OS === 'web' ? (
              <select
                value={value}
                onChange={(e) => onChange(e.target.value as any)}
                style={{
                  height: 50,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  borderRadius: 8,
                  paddingLeft: 12,
                  fontSize: 16,
                  color: value ? '#333333' : '#9E9E9E',
                  backgroundColor: '#FAFAFA',
                } as any}
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {t(`staff.roles.${role}`)}
                  </option>
                ))}
              </select>
            ) : (
              <View style={styles.roleSelector}>
                {availableRoles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleOption, value === role && styles.roleOptionSelected]}
                    onPress={() => onChange(role)}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        value === role && styles.roleTextSelected,
                        isRTL && { textAlign: 'right' },
                      ]}
                    >
                      {t(`staff.roles.${role}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        />
        {errors.targetRole && (
          <Text style={styles.errorText}>{t(errors.targetRole.message || 'validation.required')}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>{t('staff.invite.send')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  successBannerText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  rtl: {
    textAlign: 'right' as any,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  inputRtl: {
    textAlign: 'right' as any,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  roleOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  roleTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
