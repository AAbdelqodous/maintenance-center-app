import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetMyCenterServicesQuery,
  useUpdateCenterServiceMutation,
  useDeleteCenterServiceMutation,
} from '@/store/api/centerApi';
import PriceRangeInput from '@/components/services/PriceRangeInput';
import BilingualDescriptionFields from '@/components/services/BilingualDescriptionFields';
import { editCenterServiceSchema, type EditCenterServiceForm, type AddCenterServiceForm } from '@/components/services/servicesSchema';

export default function EditCenterServiceScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const { data: services } = useGetMyCenterServicesQuery();
  const offering = services?.find((s) => s.id === Number(id));

  const [updateCenterService, { isLoading: isUpdating }] = useUpdateCenterServiceMutation();
  const [deleteCenterService, { isLoading: isDeleting }] = useDeleteCenterServiceMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCenterServiceForm>({
    resolver: zodResolver(editCenterServiceSchema),
    defaultValues: {
      minPrice: offering?.minPrice ?? null,
      maxPrice: offering?.maxPrice ?? null,
      typicalDurationMinutes: offering?.typicalDurationMinutes ?? null,
      descriptionAr: offering?.descriptionAr ?? null,
      descriptionEn: offering?.descriptionEn ?? null,
    },
  });

  const onSave = async (values: EditCenterServiceForm) => {
    if (!offering) return;
    setErrorMessage(null);
    try {
      await updateCenterService({ id: offering.id, data: values }).unwrap();
      router.back();
    } catch (error: any) {
      const msg =
        error?.data?.businessErrorDescription ??
        error?.data?.error ??
        t('services.errorSave');
      setErrorMessage(msg);
    }
  };

  const handleDelete = () => {
    if (!offering) return;

    const doDelete = async () => {
      try {
        await deleteCenterService(offering.id).unwrap();
        router.back();
      } catch {
        if (Platform.OS === 'web') {
          window.alert(t('services.errorDelete'));
        } else {
          Alert.alert(t('common.error'), t('services.errorDelete'));
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('services.deleteConfirmWeb'))) doDelete();
    } else {
      Alert.alert(t('services.deleteConfirmTitle'), t('services.deleteConfirmMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (!offering) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>{t('common.noData')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryName = i18n.language === 'ar' ? offering.category.nameAr : offering.category.nameEn;
  const serviceName = i18n.language === 'ar' ? offering.service.nameAr : offering.service.nameEn;

  return (
    <>
      <Stack.Screen options={{ title: t('services.editService') }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.identitySection}>
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, isRTL && styles.textRtl]}>{t('services.category')}</Text>
            <View style={styles.identityChip}>
              <Text style={styles.identityChipText}>{categoryName}</Text>
            </View>
          </View>
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, isRTL && styles.textRtl]}>{t('services.service')}</Text>
            <View style={styles.identityChip}>
              <Text style={styles.identityChipText}>{serviceName}</Text>
            </View>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <PriceRangeInput
          control={control as unknown as import('react-hook-form').Control<AddCenterServiceForm>}
          errors={errors as import('react-hook-form').FieldErrors<AddCenterServiceForm>}
          isRTL={isRTL}
        />
        <BilingualDescriptionFields
          control={control as unknown as import('react-hook-form').Control<AddCenterServiceForm>}
          errors={errors as import('react-hook-form').FieldErrors<AddCenterServiceForm>}
          isRTL={isRTL}
        />

        <TouchableOpacity
          style={[styles.saveButton, isUpdating && styles.buttonDisabled]}
          onPress={handleSubmit(onSave)}
          disabled={isUpdating || isDeleting}
        >
          {isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('services.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={isUpdating || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#F44336" />
          ) : (
            <Text style={styles.deleteButtonText}>{t('services.deleteConfirmTitle')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  identitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  identityLabel: {
    fontSize: 14,
    color: '#9E9E9E',
    width: 70,
  },
  identityChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  identityChipText: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  textRtl: {
    textAlign: 'right',
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
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    minHeight: 52,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    minHeight: 52,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
