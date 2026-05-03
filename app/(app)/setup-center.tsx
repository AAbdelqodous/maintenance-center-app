import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateCenterMutation, useGetCategoriesQuery } from '@/store/api/centerApi';
import { useAppDispatch } from '@/store';
import { setActiveCenterId } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';

const TOTAL_STEPS = 3;

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default' as any,
  isRTL = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  isRTL?: boolean;
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, isRTL && styles.inputRtl]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9E9E9E"
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

export default function SetupCenterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';

  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1 — Basic info
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 — Location
  const [cityAr, setCityAr] = useState('');
  const [cityEn, setCityEn] = useState('');
  const [districtAr, setDistrictAr] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [streetAr, setStreetAr] = useState('');
  const [streetEn, setStreetEn] = useState('');

  // Step 3 — Categories & hours
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');

  const { data: categories } = useGetCategoriesQuery();
  const [createCenter, { isLoading }] = useCreateCenterMutation();

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const validateStep = (): boolean => {
    setErrorMessage('');
    if (step === 1) {
      if (!nameAr || !nameEn || !phone || !email) {
        setErrorMessage(t('common.fillRequired'));
        return false;
      }
    }
    if (step === 2) {
      if (!cityAr || !cityEn) {
        setErrorMessage(t('common.fillRequired'));
        return false;
      }
    }
    if (step === 3) {
      if (selectedCategoryIds.length === 0) {
        setErrorMessage(t('setupCenter.selectCategory'));
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrorMessage('');
    setStep((s) => s - 1);
  };

  const handleCreate = async () => {
    if (!validateStep()) return;
    try {
      const result = await createCenter({
        nameAr,
        nameEn,
        phone,
        email,
        address: { cityAr, cityEn, districtAr, districtEn, streetAr, streetEn },
        openingTime: openingTime || undefined,
        closingTime: closingTime || undefined,
        categoryIds: selectedCategoryIds,
      }).unwrap();

      await storage.saveActiveCenterId(result.id);
      dispatch(setActiveCenterId(result.id));
      router.replace('/(app)/(tabs)/');
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.businessErrorDescription ?? t('common.error');
      setErrorMessage(msg);
    }
  };

  const handleLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const stepTitles = [
    { title: t('setupCenter.step1Title'), subtitle: t('setupCenter.step1Subtitle') },
    { title: t('setupCenter.step2Title'), subtitle: t('setupCenter.step2Subtitle') },
    { title: t('setupCenter.step3Title'), subtitle: t('setupCenter.step3Subtitle') },
  ];


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('setupCenter.title')}</Text>
        <Text style={styles.stepIndicator}>
          {t('setupCenter.stepOf', { current: step, total: TOTAL_STEPS })}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step title */}
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, isRTL && styles.textRtl]}>
            {stepTitles[step - 1].title}
          </Text>
          <Text style={[styles.stepSubtitle, isRTL && styles.textRtl]}>
            {stepTitles[step - 1].subtitle}
          </Text>
        </View>

        {/* Step 1 — Basic info */}
        {step === 1 && (
          <View>
            <Field
              label={t('setupCenter.nameAr')}
              value={nameAr}
              onChangeText={setNameAr}
              placeholder="مركز الصيانة"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.nameEn')}
              value={nameEn}
              onChangeText={setNameEn}
              placeholder="Maintenance Center"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder="+965 XXXX XXXX"
              keyboardType="phone-pad"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="center@example.com"
              keyboardType="email-address"
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <View>
            <Field
              label={t('setupCenter.cityAr')}
              value={cityAr}
              onChangeText={setCityAr}
              placeholder="الكويت"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.cityEn')}
              value={cityEn}
              onChangeText={setCityEn}
              placeholder="Kuwait City"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.districtAr')}
              value={districtAr}
              onChangeText={setDistrictAr}
              placeholder="الروضة"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.districtEn')}
              value={districtEn}
              onChangeText={setDistrictEn}
              placeholder="Rumaithiya"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.streetAr')}
              value={streetAr}
              onChangeText={setStreetAr}
              placeholder="شارع الخليج"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.streetEn')}
              value={streetEn}
              onChangeText={setStreetEn}
              placeholder="Gulf Road"
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Step 3 — Categories & hours */}
        {step === 3 && (
          <View>
            <Text style={[styles.label, styles.sectionLabel, isRTL && styles.textRtl]}>
              {t('setupCenter.categories')}
            </Text>
            <View style={styles.categoriesGrid}>
              {categories?.map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Text
                      style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                    >
                      {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field
              label={t('setupCenter.openingTime')}
              value={openingTime}
              onChangeText={setOpeningTime}
              placeholder="09:00:00"
              isRTL={isRTL}
            />
            <Field
              label={t('setupCenter.closingTime')}
              value={closingTime}
              onChangeText={setClosingTime}
              placeholder="21:00:00"
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Error */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#C62828" />
            <Text style={[styles.errorText, isRTL && styles.textRtl]}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer buttons */}
      <View style={[styles.footer, isRTL && styles.footerRtl]}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color="#666666" />
            <Text style={styles.backButtonText}>{t('setupCenter.back')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        )}

        {step < TOTAL_STEPS ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{t('setupCenter.next')}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.nextButtonText}>{t('setupCenter.create')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 13,
    color: '#888888',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  fieldContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 6,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 15,
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  inputRtl: {
    textAlign: 'right',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  footerRtl: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    color: '#F44336',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  nextButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textRtl: {
    textAlign: 'right',
  },
});
