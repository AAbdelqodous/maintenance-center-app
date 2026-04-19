import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Picker } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { ServiceType } from '@/types/pricing';
import { pricingSchema, PricingFormValues } from './pricingSchema';

interface Props {
  defaultValues?: Partial<PricingFormValues>;
  onSubmit: (values: PricingFormValues) => Promise<void>;
  isLoading: boolean;
}

export default function PricingForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues,
  });

  const serviceTypes = Object.values(ServiceType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.serviceType')}</Text>
        <Controller
          control={control}
          name="serviceType"
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerContainer}>
              {Platform.OS === 'ios' ? (
                <TextInput
                  style={styles.input}
                  placeholder={t('pricing.serviceType')}
                  value={value}
                  onChangeText={onChange}
                />
              ) : (
                <Picker
                  selectedValue={value}
                  onValueChange={onChange}
                  style={styles.picker}
                >
                  <Picker.Item label={t('pricing.serviceType')} value="" />
                  {serviceTypes.map((type) => (
                    <Picker.Item
                      key={type}
                      label={type.replace('_', ' ')}
                      value={type}
                    />
                  ))}
                </Picker>
              )}
            </View>
          )}
        />
        {errors.serviceType && (
          <Text style={styles.errorText}>{errors.serviceType.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.serviceNameAr')}</Text>
        <Controller
          control={control}
          name="serviceNameAr"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              placeholder={t('pricing.serviceNameAr')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.serviceNameAr && (
          <Text style={styles.errorText}>{errors.serviceNameAr.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.serviceNameEn')}</Text>
        <Controller
          control={control}
          name="serviceNameEn"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder={t('pricing.serviceNameEn')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.serviceNameEn && (
          <Text style={styles.errorText}>{errors.serviceNameEn.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.minPrice')}</Text>
        <Controller
          control={control}
          name="minPrice"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="0.000"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChangeText={(text) => onChange(parseFloat(text) || NaN)}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />
        {errors.minPrice && (
          <Text style={styles.errorText}>{errors.minPrice.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.maxPrice')}</Text>
        <Controller
          control={control}
          name="maxPrice"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="0.000"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChangeText={(text) => onChange(parseFloat(text) || NaN)}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />
        {errors.maxPrice && (
          <Text style={styles.errorText}>{errors.maxPrice.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.duration')}</Text>
        <Controller
          control={control}
          name="typicalDurationMinutes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="30"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChangeText={(text) => onChange(text ? parseInt(text, 10) : undefined)}
              onBlur={onBlur}
              keyboardType="number-pad"
            />
          )}
        />
        {errors.typicalDurationMinutes && (
          <Text style={styles.errorText}>{errors.typicalDurationMinutes.message}</Text>
        )}
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.descriptionAr')}</Text>
        <Controller
          control={control}
          name="descriptionAr"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
              placeholder={t('pricing.descriptionAr')}
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={4}
            />
          )}
        />
      </View>

      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.descriptionEn')}</Text>
        <Controller
          control={control}
          name="descriptionEn"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('pricing.descriptionEn')}
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={4}
            />
          )}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.submitButtonText}>{t('common.loading')}</Text>
        ) : (
          <Text style={styles.submitButtonText}>{t('pricing.save')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  rtl: {
    textAlign: 'right',
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
