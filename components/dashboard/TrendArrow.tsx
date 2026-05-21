import React from 'react';
import { Text, StyleSheet } from 'react-native';
import type { TrendDirection } from '@/types/staffPerformance';

interface Props {
  direction?: TrendDirection;
}

export function TrendArrow({ direction }: Props) {
  if (!direction || direction === 'STABLE') return null;

  const isUp = direction === 'UP';
  return (
    <Text style={[styles.arrow, { color: isUp ? '#10B981' : '#EF4444' }]}>
      {isUp ? '↑' : '↓'}
    </Text>
  );
}

const styles = StyleSheet.create({
  arrow: {
    fontSize: 14,
    fontWeight: '700',
    marginStart: 4,
  },
});
