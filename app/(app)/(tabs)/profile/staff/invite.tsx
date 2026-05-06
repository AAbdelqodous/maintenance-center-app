import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useInviteStaffMutation } from '@/store/api/staffApi';
import type { CenterRole } from '@/types/staff';

const ROLES: CenterRole[] = ['BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'];

export default function InviteStaffScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<CenterRole | null>(null);
  const [inviteStaff, { isLoading }] = useInviteStaffMutation();

  const handleSend = async () => {
    if (!email.trim() || !selectedRole) {
      const msg = t('common.fillRequired');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
      return;
    }

    try {
      await inviteStaff({ targetEmail: email.trim(), targetRole: selectedRole }).unwrap();
      const msg = t('staff.invite.sent');
      if (Platform.OS === 'web') {
        window.alert(msg);
        router.back();
      } else {
        Alert.alert(t('common.success'), msg, [{ text: t('common.ok'), onPress: () => router.back() }]);
      }
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.businessErrorDescription ?? t('common.error');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.error'), msg);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={[styles.label, isRTL && styles.rtl]}>{t('staff.invite.email')}</Text>
        <TextInput
          style={[styles.input, isRTL && styles.inputRtl]}
          value={email}
          onChangeText={setEmail}
          placeholder={t('staff.invite.emailPlaceholder')}
          placeholderTextColor="#9E9E9E"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, isRTL && styles.rtl]}>{t('staff.invite.role')}</Text>
        <View style={styles.rolesGrid}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role;
            return (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                  {t(`staff.roles.${role}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedRole && (
        <View style={styles.permissionsHint}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={[styles.permissionsHintText, isRTL && styles.rtl]}>
            {t(`staff.roles.${selectedRole}`)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.sendButton, (!email.trim() || !selectedRole) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={isLoading || !email.trim() || !selectedRole}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>{t('staff.invite.send')}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  field: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 10 },
  rtl: { textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  roleChipSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  roleChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  roleChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  permissionsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  permissionsHintText: { fontSize: 13, color: '#6B7280', flex: 1 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  sendButtonDisabled: { backgroundColor: '#93C5FD' },
  sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
