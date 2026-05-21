import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ChartHeadlineProps {
  text: string;
}

export function ChartHeadline({ text }: ChartHeadlineProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  return <Text style={[styles.headline, isRTL && styles.rtl]}>{text}</Text>;
}

const styles = StyleSheet.create({
  headline: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'left',
  },
  rtl: {
    textAlign: 'right',
  },
});
