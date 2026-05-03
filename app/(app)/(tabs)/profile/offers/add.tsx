import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateOfferMutation } from '@/store/api/offersApi';
import OfferForm, { OfferFormValues } from '@/components/offers/OfferForm';

export default function AddOfferScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [createOffer, { isLoading }] = useCreateOfferMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: OfferFormValues) => {
    setErrorMessage(null);
    try {
      await createOffer({
        titleAr: values.titleAr,
        titleEn: values.titleEn,
        descriptionAr: values.descriptionAr,
        descriptionEn: values.descriptionEn,
        discountType: values.discountType,
        discountValue: values.discountValue,
        applicableServiceTypes: values.applicableServiceTypes,
        startDate: values.startDate,
        endDate: values.endDate,
        maxRedemptions: values.maxRedemptions,
      }).unwrap();
      router.back();
    } catch (error: any) {
      const validationErrors: string[] = error?.data?.validationErrors ?? [];
      const msg =
        error?.data?.businessErrorDescription ??
        error?.data?.error ??
        (validationErrors.length > 0 ? validationErrors.join('. ') : null) ??
        t('offers.errorSave');
      setErrorMessage(msg);
    }
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
      <OfferForm onSubmit={handleSubmit} isLoading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  errorBanner: {
    backgroundColor: '#FFEBEE', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFCDD2',
  },
  errorText: { color: '#C62828', fontSize: 14 },
});
