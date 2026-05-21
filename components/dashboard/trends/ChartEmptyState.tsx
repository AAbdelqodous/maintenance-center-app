import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export function ChartEmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Ionicons name="bar-chart-outline" size={32} color="#D1D5DB" />
      <Text style={styles.text}>{t('trends.emptyState')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  text: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
