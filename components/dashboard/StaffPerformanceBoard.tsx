import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StaffPerformanceCard } from './StaffPerformanceCard';
import { useStaffPerformanceBoard } from '@/hooks/useStaffPerformanceBoard';
import { sortBoard } from '@/types/staffPerformance';
import type { StaffPerformanceCard as StaffPerformanceCardType, RebalanceSuggestion } from '@/types/staffPerformance';

interface Props {
  onCardPress?: (card: StaffPerformanceCardType) => void;
  onRebalancePress?: (suggestion: RebalanceSuggestion) => void;
}

export function StaffPerformanceBoard({ onCardPress, onRebalancePress }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useStaffPerformanceBoard();

  const sorted = data ? sortBoard(data.staff) : [];
  const overloadedStaff = sorted.filter(s => s.isOverloaded === true);
  const eligibleRecipients = sorted.filter(
    s => !s.isOverloaded && (s.status === 'AVAILABLE' || s.status === 'ON_TASK'),
  );
  const showRebalance = overloadedStaff.length > 0 && sorted.length > 1;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#6B7280" />
      </View>
    );
  }

  if (isError) {
    return (
      <TouchableOpacity style={styles.centered} onPress={refetch}>
        <Text style={styles.errorText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    );
  }

  if (!data || sorted.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('performanceBoard.noStaff')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('performanceBoard.title')}</Text>
        {showRebalance && onRebalancePress && (
          <TouchableOpacity
            style={styles.rebalanceBtn}
            onPress={() => onRebalancePress({ overloadedStaff, eligibleRecipients })}
          >
            <Text style={styles.rebalanceBtnText}>{t('performanceBoard.rebalanceBtn')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => String(item.membershipId)}
        renderItem={({ item }) => (
          <StaffPerformanceCard
            card={item}
            onPress={onCardPress ? () => onCardPress(item) : undefined}
          />
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rebalanceBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rebalanceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
});
