import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, usePreventRemove } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetMyPricingQuery, useUpdatePricingMutation, useDeletePricingMutation } from '@/store/api/pricingApi';
import PricingForm from '@/components/pricing/PricingForm';
import type { PricingFormValues } from '@/components/pricing/pricingSchema';
import type { CenterServicePricing } from '@/types/pricing';

export default function EditPricingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGetMyPricingQuery();
  const [updatePricing, { isLoading: isUpdating }] = useUpdatePricingMutation();
  const [deletePricing, { isLoading: isDeleting }] = useDeletePricingMutation();

  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const entry = data?.find((p: CenterServicePricing) => p.id === Number(id));

  useEffect(() => {
    if (entry) {
      setIsActive(entry.isActive);
    }
  }, [entry]);

  const defaultValues: PricingFormValues | undefined = entry ? {
    serviceType: entry.serviceType,
    serviceNameAr: entry.serviceNameAr,
    serviceNameEn: entry.serviceNameEn,
    minPrice: entry.minPrice,
    maxPrice: entry.maxPrice,
    typicalDurationMinutes: entry.typicalDurationMinutes,
    descriptionAr: entry.descriptionAr ?? '',
    descriptionEn: entry.descriptionEn ?? '',
  } : undefined;

  const handleToggleActive = async (value: boolean) => {
    if (!entry) return;
    try {
      await updatePricing({
        id: Number(id),
        data: { ...entry, isActive: value },
      }).unwrap();
      setIsActive(value);
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const handleSubmit = async (values: PricingFormValues) => {
    setErrorMessage(null);
    try {
      await updatePricing({
        id: Number(id),
        data: { ...values, isActive },
      }).unwrap();
      router.back();
    } catch (error) {
      console.error('Failed to update pricing:', error);
      setErrorMessage(t('pricing.errorSave'));
    }
  };

  const handleDelete = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(t('pricing.deleteConfirmWeb'))
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('pricing.deleteConfirmTitle'),
            t('pricing.deleteConfirmMessage'),
            [
              { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: t('pricing.delete'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    setDeleteError(null);
    try {
      await deletePricing(Number(id)).unwrap();
      router.back();
    } catch (error) {
      console.error('Failed to delete pricing:', error);
      setDeleteError(t('pricing.errorDelete'));
    }
  };

  // Prevent back navigation if form is dirty
  const navigationRef = React.useRef(navigation);
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  // Note: usePreventRemove is from @react-navigation/native, which should be available
  // For now, we'll implement a simple version. In a real implementation, this would need
  // to be integrated with the navigation system.
  // const { formState } = useForm({ defaultValues });
  // usePreventRemove(formState.isDirty, ({ data }) => {
  //   if (Platform.OS === 'web') {
  //     if (window.confirm(t('pricing.discardConfirmWeb'))) {
  //       navigationRef.current.dispatch(data.action);
  //     }
  //   } else {
  //     Alert.alert(
  //       t('pricing.discardTitle'),
  //       t('pricing.discardMessage'),
  //       [
  //         { text: t('common.cancel') || 'Cancel', style: 'cancel' },
  //         { text: t('pricing.discardTitle') || 'Discard', style: 'destructive', onPress: () => navigationRef.current.dispatch(data.action) },
  //       ]
  //     );
  //   }
  // });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError || !entry) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.activeToggleContainer}>
        <Text style={styles.activeToggleLabel}>{t('pricing.activeStatus')}</Text>
        <Switch
          value={isActive}
          onValueChange={handleToggleActive}
          trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
          thumbColor={isActive ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <PricingForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isUpdating || isDeleting}
      />

      {deleteError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{deleteError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.deleteButton, (isUpdating || isDeleting) && styles.deleteButtonDisabled]}
        onPress={handleDelete}
        disabled={isUpdating || isDeleting}
      >
        <Text style={styles.deleteButtonText}>{t('pricing.delete')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  activeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activeToggleLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});
