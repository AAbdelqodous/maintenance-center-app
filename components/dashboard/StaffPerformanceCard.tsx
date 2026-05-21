import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StaffStatusBadge } from './StaffStatusBadge';
import { PerformanceTierBadge } from './PerformanceTierBadge';
import { TrendArrow } from './TrendArrow';
import type { StaffPerformanceCard as StaffPerformanceCardType } from '@/types/staffPerformance';

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const letters = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letters}</Text>
    </View>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

interface Props {
  card: StaffPerformanceCardType;
  onPress?: () => void;
}

export function StaffPerformanceCard({ card, onPress }: Props) {
  const { t } = useTranslation();

  const ratingDisplay = card.avgRatingThisMonth != null
    ? card.avgRatingThisMonth.toFixed(1)
    : '—';

  const timeDisplay = card.avgCompletionTimeMinutes != null
    ? t('performanceBoard.metrics.minutes', { min: Math.round(card.avgCompletionTimeMinutes) })
    : '—';

  const completedDisplay = card.completedThisMonth != null
    ? String(card.completedThisMonth)
    : '—';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Initials firstName={card.firstName} lastName={card.lastName} />
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {card.firstName} {card.lastName}
            </Text>
            <TrendArrow direction={card.trendDirection} />
          </View>
          <View style={styles.badgeRow}>
            <StaffStatusBadge status={card.status} />
            {(card.tier || card.isNew) && (
              <PerformanceTierBadge tier={card.tier} isNew={card.isNew} />
            )}
          </View>
        </View>
        <View style={styles.activeCount}>
          <Text style={styles.activeCountNumber}>{card.activeBookingsCount}</Text>
          <Text style={styles.activeCountLabel}>
            {t('performanceBoard.metrics.activeBookings')}
          </Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricCell
          label={t('performanceBoard.metrics.avgRating')}
          value={ratingDisplay}
        />
        <MetricCell
          label={t('performanceBoard.metrics.completionTime')}
          value={timeDisplay}
        />
        <MetricCell
          label={t('performanceBoard.metrics.completed')}
          value={completedDisplay}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 10,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3730A3',
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activeCount: {
    alignItems: 'center',
    marginStart: 8,
    flexShrink: 0,
  },
  activeCountNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  activeCountLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metricLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
