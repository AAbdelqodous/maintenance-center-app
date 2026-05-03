import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OfferStatus } from '@/types/offers';

const STATUS_STYLES: Record<OfferStatus, { bg: string; text: string }> = {
  ACTIVE:    { bg: '#E8F5E9', text: '#2E7D32' },
  SCHEDULED: { bg: '#E3F2FD', text: '#1565C0' },
  EXPIRED:   { bg: '#F5F5F5', text: '#757575' },
  CANCELLED: { bg: '#FFEBEE', text: '#C62828' },
};

interface Props {
  status: OfferStatus;
}

export default function OfferStatusBadge({ status }: Props) {
  const { t } = useTranslation();
  const { bg, text } = STATUS_STYLES[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{t(`offers.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
