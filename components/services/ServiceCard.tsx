import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatServicePriceRange } from '@/lib/utils/pricing';
import type { CenterServiceResponse } from '@/store/api/centerApi';

interface Props {
  item: CenterServiceResponse;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ServiceCard({ item, onEdit, onDelete }: Props) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const serviceName = i18n.language === 'ar' ? item.service.nameAr : item.service.nameEn;
  const priceLabel = formatServicePriceRange(item.minPrice, item.maxPrice);
  const durationLabel = item.typicalDurationMinutes
    ? `${item.typicalDurationMinutes} min`
    : null;

  return (
    <View style={[styles.card, isRTL && styles.cardRtl]}>
      <View style={styles.info}>
        <Text style={[styles.name, isRTL && styles.textRtl]}>{serviceName}</Text>
        <Text style={[styles.price, isRTL && styles.textRtl]}>{priceLabel}</Text>
        {durationLabel && (
          <Text style={[styles.duration, isRTL && styles.textRtl]}>{durationLabel}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onEdit}
          accessibilityLabel={t('common.edit')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil-outline" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDelete}
          accessibilityLabel={t('common.delete')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRtl: {
    flexDirection: 'row-reverse',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  price: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  textRtl: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
