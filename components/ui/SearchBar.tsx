import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#9E9E9E" style={isRTL ? styles.iconRtl : styles.icon} />
      <TextInput
        style={[styles.input, isRTL && styles.rtlInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || t('common.search') || 'Search...'}
        placeholderTextColor="#9E9E9E"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  icon: {
    marginRight: 8,
  },
  iconRtl: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
