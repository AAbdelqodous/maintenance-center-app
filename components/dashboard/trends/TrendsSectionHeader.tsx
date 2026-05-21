import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { TrendPeriod } from '@/types/trends';

const PERIODS: { key: TrendPeriod; labelKey: string }[] = [
  { key: '8_WEEKS', labelKey: 'trends.period.8weeks' },
  { key: '12_WEEKS', labelKey: 'trends.period.12weeks' },
  { key: '6_MONTHS', labelKey: 'trends.period.6months' },
];

interface TrendsSectionHeaderProps {
  expanded: boolean;
  onToggle: () => void;
  selectedPeriod: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
}

export function TrendsSectionHeader({
  expanded,
  onToggle,
  selectedPeriod,
  onPeriodChange,
}: TrendsSectionHeaderProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleRow, isRTL && styles.rowRtl]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{t('trends.sectionTitle')}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.periodRow, isRTL && styles.rowRtl]}>
          {PERIODS.map(({ key, labelKey }) => (
            <TouchableOpacity
              key={key}
              style={[styles.periodBtn, selectedPeriod === key && styles.periodBtnActive]}
              onPress={() => onPeriodChange(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, selectedPeriod === key && styles.periodTextActive]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  periodRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
