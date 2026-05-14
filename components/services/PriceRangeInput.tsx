import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { AddCenterServiceForm } from './servicesSchema';

interface Props {
  control: Control<AddCenterServiceForm>;
  errors: FieldErrors<AddCenterServiceForm>;
  isRTL: boolean;
}

export default function PriceRangeInput({ control, errors, isRTL }: Props) {
  const { t } = useTranslation();

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('services.minPrice')}</Text>
          <Controller
            control={control}
            name="minPrice"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, isRTL && styles.rtlInput]}
                  keyboardType="decimal-pad"
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    const parsed = parseFloat(text);
                    onChange(text === '' ? null : isNaN(parsed) ? null : parsed);
                  }}
                  value={value != null ? String(value) : ''}
                  placeholder="0.000"
                  placeholderTextColor="#9E9E9E"
                />
                <Text style={styles.currency}>KD</Text>
              </View>
            )}
          />
          {errors.minPrice && (
            <Text style={styles.errorText}>{errors.minPrice.message}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('services.maxPrice')}</Text>
          <Controller
            control={control}
            name="maxPrice"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, isRTL && styles.rtlInput]}
                  keyboardType="decimal-pad"
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    const parsed = parseFloat(text);
                    onChange(text === '' ? null : isNaN(parsed) ? null : parsed);
                  }}
                  value={value != null ? String(value) : ''}
                  placeholder="0.000"
                  placeholderTextColor="#9E9E9E"
                />
                <Text style={styles.currency}>KD</Text>
              </View>
            )}
          />
          {errors.maxPrice && (
            <Text style={styles.errorText}>{errors.maxPrice.message}</Text>
          )}
        </View>
      </View>

      <View style={styles.durationField}>
        <Text style={styles.label}>{t('services.duration')}</Text>
        <Controller
          control={control}
          name="typicalDurationMinutes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              keyboardType="number-pad"
              onBlur={onBlur}
              onChangeText={(text) => {
                const parsed = parseInt(text, 10);
                onChange(text === '' ? null : isNaN(parsed) ? null : parsed);
              }}
              value={value != null ? String(value) : ''}
              placeholder="60"
              placeholderTextColor="#9E9E9E"
            />
          )}
        />
        {errors.typicalDurationMinutes && (
          <Text style={styles.errorText}>{errors.typicalDurationMinutes.message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    marginBottom: 16,
  },
  durationField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333333',
  },
  rtlInput: {
    textAlign: 'right',
  },
  currency: {
    fontSize: 14,
    color: '#9E9E9E',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
});
