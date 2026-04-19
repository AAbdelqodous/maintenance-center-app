import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { BookingQuote } from '@/types/quote';

interface Props {
  quote: BookingQuote;
  onPress?: () => void;
}

export default function QuoteCard({ quote, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const getStatusColor = () => {
    switch (quote.status) {
      case 'DRAFT': return '#9E9E9E';
      case 'SENT': return '#2196F3';
      case 'APPROVED': return '#4CAF50';
      case 'REJECTED': return '#F44336';
      case 'REVISED': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const formatKD = (amount: number) => `KD ${amount.toFixed(3)}`;

  return (
    <TouchableOpacity
      style={[styles.container, isRTL && styles.containerRtl]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <View style={styles.statusBadge} style={{ backgroundColor: `${getStatusColor()}20` }}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {t(`quote.${quote.status.toLowerCase()}`)}
          </Text>
        </View>
        <Text style={styles.version}>{t('quote.version')} {quote.version}</Text>
      </View>

      <View style={[styles.amountContainer, isRTL && styles.rowRtl]}>
        <Text style={styles.amountLabel}>{t('quote.total')}</Text>
        <Text style={styles.amountValue}>{formatKD(quote.totalAmount)}</Text>
      </View>

      <Text style={styles.date}>
        {new Date(quote.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerRtl: {
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#999999',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  date: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
});
