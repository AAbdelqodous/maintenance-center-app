import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ChartLimitedDataCaptionProps {
  actual: number;
  total: number;
}

export function ChartLimitedDataCaption({ actual, total }: ChartLimitedDataCaptionProps) {
  const { t } = useTranslation();
  return (
    <Text style={styles.caption}>
      {t('trends.limitedData', { actual, total })}
    </Text>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
