import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CenterOffer } from '@/types/offers';
import OfferStatusBadge from './OfferStatusBadge';

interface Props {
  offer: CenterOffer;
  onPress: () => void;
}

export default function OfferCard({ offer, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const title = isAr ? offer.titleAr : offer.titleEn;

  const discountLabel =
    offer.discountType === 'PERCENTAGE'
      ? `${offer.discountValue}% off`
      : `KD ${Number(offer.discountValue).toFixed(3)} off`;

  const servicesLabel =
    offer.applicableServiceTypes.length === 0
      ? t('offers.allServices')
      : offer.applicableServiceTypes.map(s => s.replace(/_/g, ' ')).join(', ');

  const redemptionLabel =
    offer.maxRedemptions != null
      ? `${offer.currentRedemptions} ${t('offers.of')} ${offer.maxRedemptions} ${t('offers.redeemed')}`
      : `${offer.currentRedemptions} ${t('offers.redeemed')}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <OfferStatusBadge status={offer.status} />
      </View>

      <Text style={styles.discount}>{discountLabel}</Text>
      <Text style={styles.services} numberOfLines={1}>{servicesLabel}</Text>

      <View style={styles.footer}>
        <Text style={styles.dates}>{offer.startDate} → {offer.endDate}</Text>
        <Text style={styles.redemptions}>{redemptionLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16, fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 8,
  },
  discount: {
    fontSize: 18, fontWeight: '700', color: '#2196F3', marginBottom: 4,
  },
  services: {
    fontSize: 13, color: '#757575', marginBottom: 8,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dates: { fontSize: 12, color: '#9E9E9E' },
  redemptions: { fontSize: 12, color: '#9E9E9E' },
});
