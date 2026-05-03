import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreatePricingMutation, useGetMyPricingQuery } from '@/store/api/pricingApi';
import PricingForm from '@/components/pricing/PricingForm';
import type { PricingFormValues } from '@/components/pricing/pricingSchema';
import { ServiceType } from '@/types/pricing';

export default function AddPricingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createPricing, { isLoading }] = useCreatePricingMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: existingPricing } = useGetMyPricingQuery();

  const usedTypes = new Set((existingPricing ?? []).map((p) => p.serviceType));
  const availableServiceTypes = Object.values(ServiceType).filter((t) => !usedTypes.has(t));

  const handleSubmit = async (values: PricingFormValues) => {
    setErrorMessage(null);
    try {
      await createPricing(values).unwrap();
      router.back();
    } catch (error: any) {
      const msg = error?.data?.businessErrorDescription ?? error?.data?.error ?? t('pricing.errorSave');
      setErrorMessage(msg);
    }
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}
      {availableServiceTypes.length === 0 ? (
        <View style={styles.allUsedContainer}>
          <Text style={styles.allUsedText}>{t('pricing.allTypesAdded')}</Text>
        </View>
      ) : (
        <PricingForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          availableServiceTypes={availableServiceTypes}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  allUsedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  allUsedText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});
