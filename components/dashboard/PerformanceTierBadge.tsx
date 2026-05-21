import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PerformanceTier } from '@/types/staffPerformance';

interface TierStyle {
  background: string;
  text: string;
}

const TIER_STYLES: Record<PerformanceTier | 'NEW', TierStyle> = {
  TOP_PERFORMER:   { background: '#FEF3C7', text: '#92400E' },
  STRONG:          { background: '#D1FAE5', text: '#065F46' },
  ON_TRACK:        { background: '#DBEAFE', text: '#1E40AF' },
  NEEDS_ATTENTION: { background: '#FEE2E2', text: '#991B1B' },
  NEW:             { background: '#EDE9FE', text: '#5B21B6' },
};

interface Props {
  tier?: PerformanceTier;
  isNew?: boolean;
}

export function PerformanceTierBadge({ tier, isNew }: Props) {
  const { t } = useTranslation();

  if (!tier && !isNew) return null;

  const key = isNew ? 'NEW' : tier!;
  const style = TIER_STYLES[key];
  const label = t(`performanceBoard.tier.${key}`);

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Text style={[styles.label, { color: style.text }]} numberOfLines={1}>
        {label}
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
