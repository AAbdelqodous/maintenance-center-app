import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { CenterOffer, DiscountType, OfferStatus } from '@/types/offers';
import DatePickerInput from './DatePickerInput';

const offerSchema = z.object({
  titleAr: z.string().min(1, 'Arabic title is required'),
  titleEn: z.string().min(1, 'English title is required'),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number({ invalid_type_error: 'Enter a valid number' }).positive('Must be > 0'),
  applicableServiceTypes: z.array(z.string()).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxRedemptions: z.number().int().positive().optional(),
}).refine(d => d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type OfferFormValues = z.infer<typeof offerSchema>;

const SERVICE_TYPES = [
  'REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION',
  'CONSULTATION', 'EMERGENCY', 'WARRANTY', 'OTHER',
];

interface Props {
  defaultValues?: Partial<OfferFormValues>;
  onSubmit: (values: OfferFormValues) => Promise<void>;
  isLoading: boolean;
  lockedFields?: string[];
  currentStatus?: OfferStatus;
}

export default function OfferForm({
  defaultValues, onSubmit, isLoading, lockedFields = [], currentStatus,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      titleAr: '',
      titleEn: '',
      discountType: 'PERCENTAGE',
      applicableServiceTypes: [],
      ...defaultValues,
    },
  });

  const discountType = watch('discountType');
  const selectedServiceTypes = watch('applicableServiceTypes') ?? [];
  const startDateValue = watch('startDate');
  const today = new Date().toISOString().split('T')[0];

  const isLocked = (field: string) => lockedFields.includes(field);

  const toggleServiceType = (type: string) => {
    const current = selectedServiceTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setValue('applicableServiceTypes', next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Title Arabic */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.titleAr')}</Text>
        <Controller control={control} name="titleAr" render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={value}
            onChangeText={onChange}
            placeholder={t('offers.titleAr')}
            placeholderTextColor="#9E9E9E"
          />
        )} />
        {errors.titleAr && <Text style={styles.error}>{errors.titleAr.message}</Text>}
      </View>

      {/* Title English */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.titleEn')}</Text>
        <Controller control={control} name="titleEn" render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={t('offers.titleEn')}
            placeholderTextColor="#9E9E9E"
          />
        )} />
        {errors.titleEn && <Text style={styles.error}>{errors.titleEn.message}</Text>}
      </View>

      {/* Description Arabic */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.descriptionAr')}</Text>
        <Controller control={control} name="descriptionAr" render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
            value={value ?? ''}
            onChangeText={onChange}
            placeholder={t('offers.descriptionAr')}
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={3}
          />
        )} />
      </View>

      {/* Description English */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.descriptionEn')}</Text>
        <Controller control={control} name="descriptionEn" render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={value ?? ''}
            onChangeText={onChange}
            placeholder={t('offers.descriptionEn')}
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={3}
          />
        )} />
      </View>

      {/* Discount Type */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.discountType')}</Text>
        {isLocked('discountType') ? (
          <Text style={styles.lockedValue}>
            {discountType === 'PERCENTAGE' ? t('offers.percentage') : t('offers.fixedAmount')}
          </Text>
        ) : (
          <View style={styles.toggleRow}>
            {(['PERCENTAGE', 'FIXED_AMOUNT'] as DiscountType[]).map(type => (
              <Controller key={type} control={control} name="discountType" render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={[styles.toggleBtn, value === type && styles.toggleBtnActive]}
                  onPress={() => onChange(type)}
                >
                  <Text style={[styles.toggleText, value === type && styles.toggleTextActive]}>
                    {type === 'PERCENTAGE' ? t('offers.percentage') : t('offers.fixedAmount')}
                  </Text>
                </TouchableOpacity>
              )} />
            ))}
          </View>
        )}
      </View>

      {/* Discount Value */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.discountValue')}</Text>
        {isLocked('discountValue') ? (
          <Text style={styles.lockedValue}>
            {defaultValues?.discountValue}
            {discountType === 'PERCENTAGE' ? '%' : ' KD'}
          </Text>
        ) : (
          <Controller control={control} name="discountValue" render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value !== undefined ? String(value) : ''}
              onChangeText={v => onChange(v === '' ? undefined : parseFloat(v))}
              placeholder={discountType === 'PERCENTAGE' ? '15' : '5.000'}
              placeholderTextColor="#9E9E9E"
              keyboardType="decimal-pad"
            />
          )} />
        )}
        {errors.discountValue && <Text style={styles.error}>{errors.discountValue.message}</Text>}
      </View>

      {/* Applicable Service Types */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.applicableServices')}</Text>
        {isLocked('applicableServiceTypes') ? (
          <Text style={styles.lockedValue}>
            {selectedServiceTypes.length === 0
              ? t('offers.allServices')
              : selectedServiceTypes.join(', ')}
          </Text>
        ) : (
          <>
            <View style={styles.chipGrid}>
              {SERVICE_TYPES.map(type => {
                const selected = selectedServiceTypes.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleServiceType(type)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {selectedServiceTypes.length === 0 ? t('offers.allServices') : ''}
            </Text>
          </>
        )}
      </View>

      {/* Start Date */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.startDate')}</Text>
        {isLocked('startDate') ? (
          <Text style={styles.lockedValue}>{defaultValues?.startDate}</Text>
        ) : (
          <Controller control={control} name="startDate" render={({ field: { onChange, value } }) => (
            <DatePickerInput value={value} onChange={onChange} minDate={today} />
          )} />
        )}
        {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
      </View>

      {/* End Date */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.endDate')}</Text>
        <Controller control={control} name="endDate" render={({ field: { onChange, value } }) => (
          <DatePickerInput
            value={value}
            onChange={onChange}
            minDate={startDateValue ? startDateValue : today}
          />
        )} />
        {errors.endDate && <Text style={styles.error}>{errors.endDate.message}</Text>}
      </View>

      {/* Max Redemptions */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('offers.maxRedemptions')}</Text>
        <Controller control={control} name="maxRedemptions" render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value !== undefined ? String(value) : ''}
            onChangeText={v => onChange(v === '' ? undefined : parseInt(v, 10))}
            placeholder="100"
            placeholderTextColor="#9E9E9E"
            keyboardType="number-pad"
          />
        )} />
      </View>

      {/* Field locked hint */}
      {lockedFields.length > 0 && (
        <View style={styles.lockedHint}>
          <Text style={styles.lockedHintText}>{t('offers.fieldLocked')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Text style={styles.submitBtnText}>
          {isLoading ? t('common.loading') : t('offers.saveChanges')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, color: '#555555', marginBottom: 8, fontWeight: '500' },
  input: {
    height: 50, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, paddingHorizontal: 12, fontSize: 15,
    color: '#333333', backgroundColor: '#FAFAFA',
  },
  rtlInput: { textAlign: 'right' },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  error: { fontSize: 12, color: '#F44336', marginTop: 4 },
  hint: { fontSize: 12, color: '#9E9E9E', marginTop: 4 },
  lockedValue: {
    fontSize: 15, color: '#555555', paddingVertical: 12,
    paddingHorizontal: 12, backgroundColor: '#F5F5F5',
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
  },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA', alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  toggleText: { fontSize: 14, color: '#666666' },
  toggleTextActive: { color: '#FFFFFF', fontWeight: '600' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  chipText: { fontSize: 13, color: '#666666' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  lockedHint: {
    backgroundColor: '#FFF8E1', borderRadius: 8,
    padding: 12, marginBottom: 16,
  },
  lockedHintText: { fontSize: 13, color: '#F57F17' },
  submitBtn: {
    backgroundColor: '#2196F3', borderRadius: 8,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#B0BEC5' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
