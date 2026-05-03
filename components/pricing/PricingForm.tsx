import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ServiceType } from '@/types/pricing';
import { pricingSchema, PricingFormValues } from './pricingSchema';

interface Props {
  defaultValues?: Partial<PricingFormValues>;
  onSubmit: (values: PricingFormValues) => Promise<void>;
  isLoading: boolean;
  availableServiceTypes?: ServiceType[];
}

export default function PricingForm({ defaultValues, onSubmit, isLoading, availableServiceTypes }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      serviceNameAr: '',
      serviceNameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      ...defaultValues,
    },
  });

  const serviceTypes = availableServiceTypes ?? Object.values(ServiceType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.fieldContainer, isRTL && styles.rtl]}>
        <Text style={styles.label}>{t('pricing.serviceType')}</Text>
        <Controller
          control={control}
          name="serviceType"
          render={({ field: { onChange, value } }) => (
            Platform.OS === 'web' ? (
              <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                style={{
                  height: 50, width: '100%', borderWidth: 1, borderColor: '#E0E0E0',
                  borderRadius: 8, paddingLeft: 12, fontSize: 16,
                  color: value ? '#333333' : '#9E9E9E', backgroundColor: '#FAFAFA',
                  border: '1px solid #E0E0E0', outline: 'none',
                } as any}
              >
                <option value="" disabled>{t('pricing.serviceType')}</option>
                {serviceTypes.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            ) : (
              <View style={styles.serviceTypeGrid}>
                {serviceTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.serviceTypeChip, value === type && styles.serviceTypeChipActive]}
                    onPress={() => onChange(type)}
                  >
                    <Text style={[styles.serviceTypeChipText, value === type && styles.serviceTypeChipTextActive]}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
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
              onChangeText={(text) => onChange(text === '' ? undefined : parseFloat(text))}
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
              onChangeText={(text) => onChange(text === '' ? undefined : parseFloat(text))}
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
              onChangeText={(text) => onChange(text === '' ? undefined : parseInt(text, 10))}
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
  serviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  serviceTypeChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  serviceTypeChipText: {
    fontSize: 13,
    color: '#666666',
  },
  serviceTypeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
