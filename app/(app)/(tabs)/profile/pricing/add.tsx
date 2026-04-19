import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreatePricingMutation } from '@/store/api/pricingApi';
import PricingForm from '@/components/pricing/PricingForm';
import type { PricingFormValues } from '@/components/pricing/pricingSchema';

export default function AddPricingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createPricing, { isLoading }] = useCreatePricingMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: PricingFormValues) => {
    setErrorMessage(null);
    try {
      await createPricing(values).unwrap();
      router.back();
    } catch (error) {
      console.error('Failed to create pricing:', error);
      setErrorMessage(t('pricing.errorSave'));
    }
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}
      <PricingForm onSubmit={handleSubmit} isLoading={isLoading} />
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
});
