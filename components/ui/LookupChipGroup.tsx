import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLookup } from '@/lib/hooks/useLookup';

interface LookupChipGroupProps {
  parameter: string;
  value: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export default function LookupChipGroup({
  parameter,
  value,
  onChange,
  disabled,
}: LookupChipGroupProps) {
  const { i18n } = useTranslation();
  const { values, isLoading, isError } = useLookup(parameter);

  const toggle = (shortName: string) => {
    if (disabled) return;
    const next = value.includes(shortName)
      ? value.filter((v) => v !== shortName)
      : [...value, shortName];
    onChange(next);
  };

  if (isLoading) {
    return <ActivityIndicator size="small" color="#2196F3" style={styles.loader} />;
  }

  if (isError || values.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {values.map((item) => {
        const selected = value.includes(item.shortName);
        const chipLabel = i18n.language === 'ar' ? item.labelAr : item.labelEn;
        return (
          <TouchableOpacity
            key={item.shortName}
            style={[
              styles.chip,
              selected && styles.chipSelected,
              disabled && styles.chipDisabled,
            ]}
            onPress={() => toggle(item.shortName)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {chipLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  chipDisabled: { opacity: 0.55 },
  chipText: { fontSize: 13, color: '#666666' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
});
