import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { AddCenterServiceForm } from './servicesSchema';

const MAX_CHARS = 500;

interface Props {
  control: Control<AddCenterServiceForm>;
  errors: FieldErrors<AddCenterServiceForm>;
  isRTL: boolean;
}

export default function BilingualDescriptionFields({ control, errors, isRTL }: Props) {
  const { t } = useTranslation();

  return (
    <View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('services.descriptionAr')}</Text>
        <Controller
          control={control}
          name="descriptionAr"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TextInput
                style={[styles.textArea, styles.rtlInput]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={MAX_CHARS}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value ?? ''}
                placeholder="وصف الخدمة بالعربية..."
                placeholderTextColor="#9E9E9E"
                writingDirection="rtl"
              />
              <Text style={[styles.charCount, styles.charCountRtl]}>
                {t('services.charCount', { count: (value ?? '').length })}
              </Text>
            </>
          )}
        />
        {errors.descriptionAr && (
          <Text style={styles.errorText}>{errors.descriptionAr.message}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('services.descriptionEn')}</Text>
        <Controller
          control={control}
          name="descriptionEn"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TextInput
                style={[styles.textArea, isRTL && styles.ltrOverride]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={MAX_CHARS}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value ?? ''}
                placeholder="Service description in English..."
                placeholderTextColor="#9E9E9E"
              />
              <Text style={styles.charCount}>
                {t('services.charCount', { count: (value ?? '').length })}
              </Text>
            </>
          )}
        />
        {errors.descriptionEn && (
          <Text style={styles.errorText}>{errors.descriptionEn.message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltrOverride: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  charCount: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
    textAlign: 'left',
  },
  charCountRtl: {
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
});
