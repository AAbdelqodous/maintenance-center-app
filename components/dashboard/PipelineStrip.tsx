import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PipelineChip } from './PipelineChip';
import { PIPELINE_STAGE_ORDER } from '@/types/dashboard';
import type { PipelineStageData, PipelineWorkStage } from '@/types/dashboard';

interface PipelineStripProps {
  stages: PipelineStageData[];
  isFetching: boolean;
  onStagePress: (stage: PipelineWorkStage) => void;
}

function findBottleneck(stages: PipelineStageData[]): PipelineWorkStage | null {
  if (stages.length === 0) return null;
  const total = stages.reduce((s, p) => s + p.count, 0);
  if (total === 0) return null;

  const candidate = stages.reduce((a, b) => (a.count > b.count ? a : b));
  const othersSum = stages.reduce((s, p) => (p.stage !== candidate.stage ? s + p.count : s), 0);
  const mean = othersSum / (stages.length - 1);

  return candidate.count >= 2 * mean ? candidate.stage : null;
}

export function PipelineStrip({ stages, isFetching, onStagePress }: PipelineStripProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Ensure stages are always in canonical order; fill missing stages with count 0
  const orderedStages: PipelineStageData[] = PIPELINE_STAGE_ORDER.map((stage) => {
    const found = stages.find((s) => s.stage === stage);
    return found ?? { stage, count: 0 };
  });

  const totalCount = orderedStages.reduce((s, p) => s + p.count, 0) || 1;
  const bottleneckStage = findBottleneck(orderedStages);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('dashboard.pipeline.title')}
        </Text>
        {isFetching && (
          <ActivityIndicator size={14} color="#9CA3AF" style={styles.fetchingSpinner} />
        )}
      </View>

      <View style={[styles.strip, isRTL && styles.stripRTL]}>
        {orderedStages.map((item) => (
          <PipelineChip
            key={item.stage}
            stage={item.stage}
            count={item.count}
            flexWeight={item.count / totalCount}
            isBottleneck={item.stage === bottleneckStage}
            onPress={() => onStagePress(item.stage)}
          />
        ))}
      </View>

      {bottleneckStage && (
        <Text style={[styles.bottleneckCaption, isRTL && styles.textRTL]}>
          {t('dashboard.pipeline.bottleneck', {
            stage: t(`dashboard.pipeline.stagesLong.${bottleneckStage}` as any),
          })}
        </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  textRTL: {
    textAlign: 'right',
  },
  fetchingSpinner: {
    marginHorizontal: 4,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  stripRTL: {
    flexDirection: 'row-reverse',
  },
  bottleneckCaption: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
});
