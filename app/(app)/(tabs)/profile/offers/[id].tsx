import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetOfferQuery, useUpdateOfferMutation, useCancelOfferMutation } from '@/store/api/offersApi';
import OfferForm, { OfferFormValues } from '@/components/offers/OfferForm';
import OfferStatusBadge from '@/components/offers/OfferStatusBadge';
import type { OfferStatus } from '@/types/offers';

const ACTIVE_LOCKED_FIELDS = ['discountType', 'discountValue', 'startDate', 'applicableServiceTypes'];

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: offer, isLoading } = useGetOfferQuery(Number(id));
  const [updateOffer, { isLoading: isUpdating }] = useUpdateOfferMutation();
  const [cancelOffer, { isLoading: isCancelling }] = useCancelOfferMutation();

  if (isLoading || !offer) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const status: OfferStatus = offer.status;
  const isEditable = status === 'SCHEDULED' || status === 'ACTIVE';
  const lockedFields = status === 'ACTIVE' ? ACTIVE_LOCKED_FIELDS : [];
  const canCancel = status === 'SCHEDULED' || status === 'ACTIVE';

  const handleUpdate = async (values: OfferFormValues) => {
    setErrorMessage(null);
    try {
      await updateOffer({
        id: Number(id),
        data: {
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
        },
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

  const doCancel = async () => {
    try {
      await cancelOffer(Number(id)).unwrap();
      router.back();
    } catch (error: any) {
      const msg =
        error?.data?.businessErrorDescription ??
        error?.data?.error ??
        t('offers.errorCancel');
      setErrorMessage(msg);
    }
  };

  const handleCancel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('offers.cancelConfirm'))) doCancel();
    } else {
      Alert.alert(t('offers.cancel'), t('offers.cancelConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('offers.cancel'), style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const defaultValues: Partial<OfferFormValues> = {
    titleAr: offer.titleAr,
    titleEn: offer.titleEn,
    descriptionAr: offer.descriptionAr,
    descriptionEn: offer.descriptionEn,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    applicableServiceTypes: offer.applicableServiceTypes,
    startDate: offer.startDate,
    endDate: offer.endDate,
    maxRedemptions: offer.maxRedemptions,
  };

  // Redemption count display
  const redemptionText = offer.maxRedemptions != null
    ? `${offer.currentRedemptions} ${t('offers.of')} ${offer.maxRedemptions} ${t('offers.redeemed')}`
    : `${offer.currentRedemptions} ${t('offers.redeemed')}`;

  return (
    <View style={styles.container}>
      {/* Status + Redemptions header */}
      <View style={styles.statusBar}>
        <OfferStatusBadge status={status} />
        <Text style={styles.redemptions}>{redemptionText}</Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {isEditable ? (
        <OfferForm
          defaultValues={defaultValues}
          onSubmit={handleUpdate}
          isLoading={isUpdating}
          lockedFields={lockedFields}
          currentStatus={status}
        />
      ) : (
        /* Read-only view for EXPIRED / CANCELLED */
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyTitle}>
            {t(`offers.status.${status}`)}
          </Text>
          <Text style={styles.readOnlyDiscount}>
            {offer.discountType === 'PERCENTAGE'
              ? `${offer.discountValue}% off`
              : `KD ${Number(offer.discountValue).toFixed(3)} off`}
          </Text>
          <Text style={styles.readOnlyDates}>{offer.startDate} → {offer.endDate}</Text>
          <Text style={styles.readOnlyRedemptions}>{redemptionText}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, isCancelling && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling
            ? <ActivityIndicator color="#C62828" />
            : <Text style={styles.cancelBtnText}>{t('offers.cancel')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  redemptions: { fontSize: 13, color: '#757575' },
  errorBanner: {
    backgroundColor: '#FFEBEE', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFCDD2',
  },
  errorText: { color: '#C62828', fontSize: 14 },
  readOnly: { padding: 24 },
  readOnlyTitle: { fontSize: 16, color: '#757575', marginBottom: 8 },
  readOnlyDiscount: { fontSize: 24, fontWeight: '700', color: '#2196F3', marginBottom: 8 },
  readOnlyDates: { fontSize: 14, color: '#9E9E9E', marginBottom: 4 },
  readOnlyRedemptions: { fontSize: 14, color: '#9E9E9E' },
  cancelBtn: {
    margin: 16, padding: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#C62828',
    alignItems: 'center',
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { color: '#C62828', fontSize: 16, fontWeight: '600' },
});
