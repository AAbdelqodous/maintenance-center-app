import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLookup } from '@/lib/hooks/useLookup';
import type { LookupDetail } from '@/types/lookup';

interface LookupSelectProps {
  parameter: string;
  value: string | null;
  onChange: (shortName: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export default function LookupSelect({
  parameter,
  value,
  onChange,
  label,
  placeholder,
  required,
  disabled,
  error,
}: LookupSelectProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { values, getLabel, isLoading, isError } = useLookup(parameter);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const displayLabel = value ? getLabel(value) : null;
  const showSearch = values.length > 5;

  const filtered: LookupDetail[] = search
    ? values.filter(
        (v) =>
          v.labelAr.includes(search) ||
          v.labelEn.toLowerCase().includes(search.toLowerCase()) ||
          v.shortName.toLowerCase().includes(search.toLowerCase()),
      )
    : values;

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const select = (shortName: string) => {
    onChange(shortName);
    close();
  };

  return (
    <View>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#2196F3" style={{ flex: 1 }} />
        ) : (
          <Text
            style={[styles.triggerText, !displayLabel && styles.placeholderText]}
            numberOfLines={1}
          >
            {displayLabel ?? placeholder ?? t('common.select')}
          </Text>
        )}
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? '#BDBDBD' : '#666666'}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />

          <View style={styles.sheet}>
            <View style={[styles.sheetHeader, isRTL && styles.rowRtl]}>
              <Text style={styles.sheetTitle}>{label ?? placeholder}</Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={22} color="#333333" />
              </TouchableOpacity>
            </View>

            {showSearch && (
              <TextInput
                style={[styles.searchInput, isRTL && styles.rtlInput]}
                placeholder={t('common.search')}
                placeholderTextColor="#9E9E9E"
                value={search}
                onChangeText={setSearch}
              />
            )}

            {isError ? (
              <Text style={styles.errorState}>{t('common.error')}</Text>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.shortName}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.shortName === value;
                  const itemLabel =
                    i18n.language === 'ar' ? item.labelAr : item.labelEn;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        isRTL && styles.optionRtl,
                      ]}
                      onPress={() => select(item.shortName)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {itemLabel}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#2196F3" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>{t('common.noData')}</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, color: '#555555', marginBottom: 8, fontWeight: '500' },
  required: { color: '#F44336' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
  },
  triggerError: { borderColor: '#F44336' },
  triggerDisabled: { backgroundColor: '#F5F5F5', opacity: 0.6 },
  triggerText: { fontSize: 15, color: '#333333', flex: 1 },
  placeholderText: { color: '#9E9E9E' },
  errorText: { fontSize: 12, color: '#F44336', marginTop: 4 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '65%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#333333' },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  rtlInput: { textAlign: 'right' },
  list: { flexShrink: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionRtl: { flexDirection: 'row-reverse' },
  optionSelected: { backgroundColor: '#E3F2FD', borderRadius: 8 },
  optionText: { fontSize: 16, color: '#333333', flex: 1 },
  optionTextSelected: { color: '#2196F3', fontWeight: '600' },
  errorState: { textAlign: 'center', color: '#F44336', padding: 16 },
  emptyText: { textAlign: 'center', color: '#9E9E9E', padding: 16, fontSize: 15 },
});
