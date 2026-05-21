import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PipelineWorkStage } from '@/types/dashboard';

interface PipelineChipProps {
  stage: PipelineWorkStage;
  count: number;
  flexWeight: number;
  isBottleneck: boolean;
  onPress: () => void;
}

export function PipelineChip({ stage, count, flexWeight, isBottleneck, onPress }: PipelineChipProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { flexGrow: Math.max(flexWeight, 0.01) },
        isBottleneck && styles.chipBottleneck,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.count, isBottleneck && styles.countBottleneck]} numberOfLines={1}>
        {count}
      </Text>
      <Text style={[styles.label, isBottleneck && styles.labelBottleneck]} numberOfLines={1}>
        {t(`dashboard.pipeline.stages.${stage}` as any)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipBottleneck: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  countBottleneck: {
    color: '#92400E',
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  labelBottleneck: {
    color: '#92400E',
    fontWeight: '600',
  },
});
