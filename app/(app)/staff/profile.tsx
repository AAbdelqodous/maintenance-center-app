import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSession, clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { router } from 'expo-router';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { useGetMyMembershipsQuery } from '@/store/api/staffApi';
import {
  useGetUserMeQuery,
  useUpdateUserMeMutation,
  useChangePasswordMutation,
} from '@/store/api/userApi';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import type { CenterRole } from '@/types/staff';

function InputField({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default' as any, autoCapitalize = 'sentences' as any, isRTL = false,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any; isRTL?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>{label}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.rtlInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function SectionCard({ title, children, isRTL }: { title: string; children: React.ReactNode; isRTL: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{title}</Text>
      {children}
    </View>
  );
}

function MemberProfileScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);
  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);
  const isRTL = i18n.dir() === 'rtl';

  const { data: user, isLoading: isLoadingUser } = useGetUserMeQuery();
  const { data: memberships } = useGetMyMembershipsQuery();
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMeMutation();
  const [changePassword, { isLoading: isChangingPwd }] = useChangePasswordMutation();

  // Personal info
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [language, setLanguage] = useState<'ARABIC' | 'ENGLISH'>('ENGLISH');

  // Address
  const [cityAr, setCityAr] = useState('');
  const [cityEn, setCityEn] = useState('');
  const [districtAr, setDistrictAr] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [streetAr, setStreetAr] = useState('');
  const [streetEn, setStreetEn] = useState('');
  const [governorateAr, setGovernorateAr] = useState('');
  const [governorateEn, setGovernorateEn] = useState('');

  // Password change
  const [showPwdSection, setShowPwdSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    setFirstname(user.firstname ?? '');
    setLastname(user.lastname ?? '');
    setPhone(user.phone ?? '');
    setDateOfBirth(user.dateOfBirth ?? '');
    setLanguage(user.language ?? 'ENGLISH');
    setCityAr(user.address?.cityAr ?? '');
    setCityEn(user.address?.cityEn ?? '');
    setDistrictAr(user.address?.districtAr ?? '');
    setDistrictEn(user.address?.districtEn ?? '');
    setStreetAr(user.address?.streetAr ?? '');
    setStreetEn(user.address?.streetEn ?? '');
    setGovernorateAr(user.address?.governorateAr ?? '');
    setGovernorateEn(user.address?.governorateEn ?? '');
  }, [user]);

  const activeMembership = memberships?.find((m) => m.centerId === activeCenterId) ?? memberships?.[0];
  const centerName = activeMembership
    ? (i18n.language === 'ar' ? activeMembership.centerNameAr : activeMembership.centerNameEn)
    : null;

  const initials = [firstname, lastname]
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || session?.email?.charAt(0).toUpperCase() || '?';

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      showAlert(t('common.error'), t('staff.profile.nameRequired'));
      return;
    }
    try {
      const result = await updateUser({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        language,
        address: {
          cityAr: cityAr.trim() || undefined,
          cityEn: cityEn.trim() || undefined,
          districtAr: districtAr.trim() || undefined,
          districtEn: districtEn.trim() || undefined,
          streetAr: streetAr.trim() || undefined,
          streetEn: streetEn.trim() || undefined,
          governorateAr: governorateAr.trim() || undefined,
          governorateEn: governorateEn.trim() || undefined,
        },
      }).unwrap();
      // Sync firstname into session so the header reflects the change
      if (session) {
        dispatch(setSession({ ...session, firstname: result.firstname }));
      }
      showAlert(t('common.success'), t('staff.profile.saved'));
    } catch {
      showAlert(t('common.error'), t('staff.profile.saveError'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert(t('common.error'), t('common.fillRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(t('common.error'), t('staff.profile.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      showAlert(t('common.error'), t('staff.profile.passwordTooShort'));
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwdSection(false);
      showAlert(t('common.success'), t('staff.profile.passwordChanged'));
    } catch {
      showAlert(t('common.error'), t('staff.profile.passwordError'));
    }
  };

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  if (isLoadingUser) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + role */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.fullName}>{`${firstname} ${lastname}`.trim() || session?.email}</Text>
        <Text style={styles.email}>{session?.email}</Text>
        {activeUserRole && (
          <View style={styles.badgeRow}>
            <RoleBadge role={activeUserRole as CenterRole} />
          </View>
        )}
        {centerName && (
          <View style={styles.centerRow}>
            <Ionicons name="business-outline" size={14} color="#6B7280" />
            <Text style={styles.centerName}>{centerName}</Text>
          </View>
        )}
      </View>

      {/* Personal info */}
      <SectionCard title={t('staff.profile.personalInfo')} isRTL={isRTL}>
        <InputField
          label={t('staff.profile.firstname')}
          value={firstname}
          onChangeText={setFirstname}
          placeholder="John"
          isRTL={isRTL}
        />
        <InputField
          label={t('staff.profile.lastname')}
          value={lastname}
          onChangeText={setLastname}
          placeholder="Doe"
          isRTL={isRTL}
        />
        <InputField
          label={t('staff.profile.phone')}
          value={phone}
          onChangeText={setPhone}
          placeholder="+965 XXXX XXXX"
          keyboardType="phone-pad"
          autoCapitalize="none"
          isRTL={isRTL}
        />
        <InputField
          label={t('staff.profile.dateOfBirth')}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          isRTL={isRTL}
        />
        {/* Language toggle */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>{t('staff.profile.language')}</Text>
          <View style={[styles.languageRow, isRTL && styles.rowRtl]}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'ARABIC' && styles.langBtnActive]}
              onPress={() => setLanguage('ARABIC')}
            >
              <Text style={[styles.langBtnText, language === 'ARABIC' && styles.langBtnTextActive]}>
                {t('staff.profile.languageAr')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === 'ENGLISH' && styles.langBtnActive]}
              onPress={() => setLanguage('ENGLISH')}
            >
              <Text style={[styles.langBtnText, language === 'ENGLISH' && styles.langBtnTextActive]}>
                {t('staff.profile.languageEn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SectionCard>

      {/* Address */}
      <SectionCard title={t('staff.profile.address')} isRTL={isRTL}>
        <InputField label={`${t('profile.city')} (العربية)`} value={cityAr} onChangeText={setCityAr} placeholder="الكويت" isRTL={isRTL} />
        <InputField label={`${t('profile.city')} (English)`} value={cityEn} onChangeText={setCityEn} placeholder="Kuwait City" isRTL={isRTL} />
        <InputField label={`${t('staff.profile.governorate')} (العربية)`} value={governorateAr} onChangeText={setGovernorateAr} placeholder="العاصمة" isRTL={isRTL} />
        <InputField label={`${t('staff.profile.governorate')} (English)`} value={governorateEn} onChangeText={setGovernorateEn} placeholder="Capital" isRTL={isRTL} />
        <InputField label={`${t('profile.area')} (العربية)`} value={districtAr} onChangeText={setDistrictAr} placeholder="الروضة" isRTL={isRTL} />
        <InputField label={`${t('profile.area')} (English)`} value={districtEn} onChangeText={setDistrictEn} placeholder="Rumaithiya" isRTL={isRTL} />
        <InputField label={`${t('profile.street')} (العربية)`} value={streetAr} onChangeText={setStreetAr} placeholder="شارع الخليج" isRTL={isRTL} />
        <InputField label={`${t('profile.street')} (English)`} value={streetEn} onChangeText={setStreetEn} placeholder="Gulf Road" isRTL={isRTL} />
      </SectionCard>

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isSaving}>
        {isSaving
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.saveButtonText}>{t('staff.profile.saveProfile')}</Text>}
      </TouchableOpacity>

      {/* Change password */}
      <TouchableOpacity
        style={[styles.sectionToggle, isRTL && styles.rowRtl]}
        onPress={() => setShowPwdSection((v) => !v)}
      >
        <Ionicons name="lock-closed-outline" size={18} color="#4F46E5" />
        <Text style={styles.sectionToggleText}>{t('staff.profile.changePassword')}</Text>
        <Ionicons
          name={showPwdSection ? 'chevron-up' : (isRTL ? 'chevron-back' : 'chevron-forward')}
          size={18}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {showPwdSection && (
        <SectionCard title={t('staff.profile.changePassword')} isRTL={isRTL}>
          <InputField
            label={t('staff.profile.currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            isRTL={isRTL}
          />
          <InputField
            label={t('staff.profile.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            isRTL={isRTL}
          />
          <InputField
            label={t('staff.profile.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            isRTL={isRTL}
          />
          <TouchableOpacity
            style={styles.pwdButton}
            onPress={handleChangePassword}
            disabled={isChangingPwd}
          >
            {isChangingPwd
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.pwdButtonText}>{t('staff.profile.changePassword')}</Text>}
          </TouchableOpacity>
        </SectionCard>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function MemberProfileScreenWrapper() {
  return (
    <ErrorBoundary>
      <MemberProfileScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#C7D2FE',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#3730A3' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  email: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  badgeRow: { marginBottom: 6 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  centerName: { fontSize: 13, color: '#6B7280' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, color: '#6B7280', fontWeight: '600',
    textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5,
  },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 6 },
  input: {
    height: 46, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 8, paddingHorizontal: 12,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  rtl: { textAlign: 'right' },

  languageRow: { flexDirection: 'row', gap: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  langBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#D1D5DB',
    alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  langBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  langBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  langBtnTextActive: { color: '#FFFFFF' },

  saveButton: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    padding: 15, alignItems: 'center', marginBottom: 12,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionToggleText: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },

  pwdButton: {
    backgroundColor: '#1D4ED8', borderRadius: 8,
    padding: 13, alignItems: 'center', marginTop: 4,
  },
  pwdButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, marginTop: 8,
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
