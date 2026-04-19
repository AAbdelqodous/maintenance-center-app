import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CenterServicePricing } from '@/types/pricing';
import { formatPriceRange } from '@/lib/utils/pricing';

interface Props {
  item: CenterServicePricing;
  onPress: () => void;
}

export default function PricingCard({ item, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <TouchableOpacity
      style={[styles.container, !item.isActive && styles.paused, isRTL && styles.rtl]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn}
        </Text>
        <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgePaused]}>
          <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextPaused]}>
            {item.isActive ? t('pricing.active') : t('pricing.paused')}
          </Text>
        </View>
      </View>

      <Text style={styles.price}>{formatPriceRange(item.minPrice, item.maxPrice)}</Text>

      {item.typicalDurationMinutes && (
        <Text style={styles.duration}>
          {item.typicalDurationMinutes} {t('pricing.duration')}
        </Text>
      )}
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
  paused: {
    opacity: 0.5,
  },
  rtl: {
    flexDirection: 'row-reverse',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgePaused: {
    backgroundColor: '#F5F5F5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#4CAF50',
  },
  badgeTextPaused: {
    color: '#757575',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#757575',
  },
});
