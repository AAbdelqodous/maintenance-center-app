import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BookingStatus } from '../../store/api/bookingsApi';

interface StatusBadgeProps {
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FF9800',
  CONFIRMED: '#2196F3',
  IN_PROGRESS: '#9C27B0',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getTranslationKey = (status: string): string => {
    const key = status.toLowerCase();
    if (['car', 'electronics', 'home_appliance'].includes(key)) {
      return `bookings.serviceType.${key}`;
    }
    return `bookings.${key}`;
  };

  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9E9E9E' }]}>
      <Text style={styles.text}>{t(getTranslationKey(status)) || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
