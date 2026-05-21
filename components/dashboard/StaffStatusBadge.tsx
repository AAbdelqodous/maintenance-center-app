import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StaffStatus } from '@/types/staffPerformance';

interface StatusStyle {
  background: string;
  text: string;
}

const STATUS_STYLES: Record<StaffStatus, StatusStyle> = {
  AVAILABLE:  { background: '#D1FAE5', text: '#065F46' },
  ON_TASK:    { background: '#DBEAFE', text: '#1E40AF' },
  OVERLOADED: { background: '#FEE2E2', text: '#991B1B' },
  OFFLINE:    { background: '#F3F4F6', text: '#6B7280' },
};

interface Props {
  status: StaffStatus;
}

export function StaffStatusBadge({ status }: Props) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.OFFLINE;

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Text style={[styles.label, { color: style.text }]} numberOfLines={1}>
        {t(`performanceBoard.status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
