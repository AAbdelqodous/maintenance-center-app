import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { TrustBadge } from '@/types/pricing';

interface Props {
  badge: TrustBadge;
  locale: string;
}

export default function TrustBadgeCard({ badge, locale }: Props) {
  const { t } = useTranslation();

  if (badge.isEarned) {
    return (
      <View style={styles.earnedContainer}>
        <View style={styles.earnedHeader}>
          <Ionicons name="star" size={24} color="#FFD700" />
          <Text style={styles.earnedTitle}>{t(`trustBadge.${badge.badgeType}`)}</Text>
        </View>
        <Text style={styles.earnedLabel}>{t('trustBadge.earned')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.lockedContainer}>
      <View style={styles.lockedHeader}>
        <Ionicons name="lock-closed" size={24} color="#9E9E9E" />
        <Text style={styles.lockedTitle}>{t(`trustBadge.${badge.badgeType}`)}</Text>
      </View>
      <Text style={styles.lockedCriteria}>
        {locale === 'ar' ? badge.criteriaAr : badge.criteriaEn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  earnedContainer: {
    backgroundColor: '#FFFDE7',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  earnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  earnedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
  },
  earnedLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  lockedContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  lockedCriteria: {
    fontSize: 14,
    color: '#9E9E9E',
  },
});
