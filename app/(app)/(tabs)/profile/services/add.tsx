import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetServicesForCategoryQuery,
  useGetMyCenterServicesQuery,
  useAddCenterServiceMutation,
  useGetMyCenterQuery,
} from '@/store/api/centerApi';
import PriceRangeInput from '@/components/services/PriceRangeInput';
import BilingualDescriptionFields from '@/components/services/BilingualDescriptionFields';
import { addCenterServiceSchema, type AddCenterServiceForm } from '@/components/services/servicesSchema';
import { Ionicons } from '@expo/vector-icons';

export default function AddCenterServiceScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoAssigned = useRef(false);

  const { data: center, isLoading: loadingCenter } = useGetMyCenterQuery();
  const { data: myCenterServices } = useGetMyCenterServicesQuery();
  const [addCenterService, { isLoading: isSubmitting }] = useAddCenterServiceMutation();

  const centerCategories = center?.categories ?? [];
  const isSingleCategory = centerCategories.length === 1;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddCenterServiceForm>({
    resolver: zodResolver(addCenterServiceSchema),
    defaultValues: {
      categoryId: undefined,
      serviceId: undefined,
      minPrice: null,
      maxPrice: null,
      typicalDurationMinutes: null,
      descriptionAr: null,
      descriptionEn: null,
    },
  });

  useEffect(() => {
    if (!autoAssigned.current && center?.categories?.length === 1) {
      autoAssigned.current = true;
      setValue('categoryId', center.categories[0].id);
      setStep(2);
    }
  }, [center, setValue]);

  const selectedCategoryId = watch('categoryId');
  const selectedServiceId = watch('serviceId');

  const { data: servicesForCategory, isLoading: loadingServices } = useGetServicesForCategoryQuery(
    selectedCategoryId!,
    { skip: !selectedCategoryId }
  );

  const alreadyOfferedIds = useMemo(
    () =>
      new Set(
        (myCenterServices ?? [])
          .filter((s) => s.category.id === selectedCategoryId)
          .map((s) => s.service.id)
      ),
    [myCenterServices, selectedCategoryId]
  );

  const selectedCategory = centerCategories.find((c) => c.id === selectedCategoryId);
  const selectedService = servicesForCategory?.find((s) => s.id === selectedServiceId);

  const totalSteps = isSingleCategory ? 2 : 3;
  const displayStep = isSingleCategory ? step - 1 : step;

  const onSubmit = async (values: AddCenterServiceForm) => {
    setErrorMessage(null);
    try {
      await addCenterService(values).unwrap();
      router.back();
    } catch (error: any) {
      const msg =
        error?.data?.businessErrorDescription ??
        error?.data?.error ??
        t('services.errorSave');
      setErrorMessage(msg);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <View key={s} style={[styles.stepDot, displayStep === s && styles.stepDotActive]} />
      ))}
    </View>
  );

  const CategoryBadge = () => {
    if (!selectedCategory) return null;
    const catName = i18n.language === 'ar' ? selectedCategory.nameAr : selectedCategory.nameEn;
    return (
      <View style={[styles.categoryBadge, isRTL && styles.categoryBadgeRtl]}>
        <Text style={styles.categoryBadgeText}>
          {t('services.addingForCategory', { name: catName })}
        </Text>
      </View>
    );
  };

  if (loadingCenter) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color="#2196F3" size="large" />
      </View>
    );
  }

  if (centerCategories.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={[styles.noCategoriesText, isRTL && styles.textRtl]}>
          {t('services.noCategoriesError')}
        </Text>
        <TouchableOpacity style={styles.backButtonStandalone} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('services.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 1) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StepIndicator />
        <Text style={[styles.stepTitle, isRTL && styles.textRtl]}>{t('services.step1Title')}</Text>
        <View style={styles.chipGrid}>
          {centerCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.chip}
              onPress={() => {
                setValue('categoryId', cat.id);
                setValue('serviceId', undefined as any);
                setStep(2);
              }}
              accessibilityLabel={i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
            >
              <Text style={styles.chipText}>
                {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (step === 2) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StepIndicator />
        <CategoryBadge />
        <Text style={[styles.stepTitle, isRTL && styles.textRtl]}>{t('services.step2Title')}</Text>
        {loadingServices ? (
          <ActivityIndicator color="#2196F3" style={styles.spinner} />
        ) : (
          <View>
            {(servicesForCategory ?? []).map((svc) => {
              const isDisabled = alreadyOfferedIds.has(svc.id);
              const svcName = i18n.language === 'ar' ? svc.nameAr : svc.nameEn;
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={[styles.serviceRow, isDisabled && styles.serviceRowDisabled]}
                  onPress={() => {
                    if (!isDisabled) {
                      setValue('serviceId', svc.id);
                      setStep(3);
                    }
                  }}
                  disabled={isDisabled}
                  accessibilityState={{ disabled: isDisabled }}
                >
                  <Text style={[styles.serviceRowText, isDisabled && styles.serviceRowTextDisabled, isRTL && styles.textRtl]}>
                    {svcName}
                  </Text>
                  {isDisabled ? (
                    <View style={[styles.disabledBadge, isRTL && styles.flexRowReverse]}>
                      <Ionicons name="lock-closed-outline" size={12} color="#9E9E9E" />
                      <Text style={styles.disabledBadgeText}>{t('services.alreadyAdded')}</Text>
                    </View>
                  ) : (
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (isSingleCategory ? router.back() : setStep(1))}
        >
          <Text style={styles.backButtonText}>{t('services.back')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StepIndicator />
      <CategoryBadge />
      <Text style={[styles.stepTitle, isRTL && styles.textRtl]}>{t('services.step3Title')}</Text>
      {selectedService && (
        <Text style={[styles.selectedLabel, isRTL && styles.textRtl]}>
          {i18n.language === 'ar' ? selectedService.nameAr : selectedService.nameEn}
        </Text>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <PriceRangeInput control={control} errors={errors} isRTL={isRTL} />
      <BilingualDescriptionFields control={control} errors={errors} isRTL={isRTL} />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>{t('services.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('services.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noCategoriesText: {
    fontSize: 15,
    color: '#616161',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
  },
  stepDotActive: {
    backgroundColor: '#2196F3',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryBadgeRtl: {
    alignSelf: 'flex-end',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '500',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginBottom: 16,
  },
  spinner: {
    marginTop: 32,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2196F3',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '500',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    minHeight: 56,
  },
  serviceRowDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  serviceRowText: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    fontWeight: '500',
  },
  serviceRowTextDisabled: {
    color: '#9E9E9E',
  },
  disabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flexRowReverse: {
    flexDirection: 'row-reverse',
  },
  disabledBadgeText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  textRtl: {
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  backButtonStandalone: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
