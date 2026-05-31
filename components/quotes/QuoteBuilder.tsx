import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { quoteSchema, QuoteFormValues } from './quoteSchema';
import { formatKD } from '@/lib/utils/pricing';
import { PartPicker } from '@/components/inventory/PartPicker';
import { useAppSelector } from '@/store';
import type { Part } from '@/types/inventory';

interface Props {
  onSubmit: (values: QuoteFormValues) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<QuoteFormValues>;
}

export default function QuoteBuilder({ onSubmit, isLoading, defaultValues }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { control, watch } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const watchedItems = watch('lineItems');
  const watchedDiscount = watch('discountAmount') ?? 0;

  // Spec 025 — add a catalogued part as a line item (CONSUME_PARTS); backend re-snapshots the price.
  const canConsumeParts = useAppSelector((s) => s.center.activePermissions).includes('CONSUME_PARTS');
  const [pickerOpen, setPickerOpen] = useState(false);
  const addCatalogPart = (part: Part, quantity: number) => {
    setPickerOpen(false);
    append({
      description: part.nameEn,
      descriptionAr: part.nameAr,
      partsCost: Math.round(part.salePrice * quantity * 1000) / 1000,
      laborCost: 0,
      partId: part.id,
      quantity,
      adHoc: false,
    });
  };

  const subtotal = useMemo(() =>
    (watchedItems ?? []).reduce((sum, item) => sum + (item.partsCost || 0) + (item.laborCost || 0), 0),
    [watchedItems]
  );

  const total = Math.max(0, subtotal - watchedDiscount);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>{t('quote.lineItems')}</Text>

      {fields.map((field, index) => (
        <View key={field.id} style={[styles.lineItemCard, isRTL && styles.cardRtl]}>
          <View style={styles.lineItemHeader}>
            <Text style={styles.lineItemIndex}>{index + 1}</Text>
            {fields.length > 1 && (
              <TouchableOpacity onPress={() => remove(index)}>
                <Text style={styles.removeText}>{t('quote.removeLineItem')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Controller
            control={control}
            name={`lineItems.${index}.description` as const}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('quote.description')}</Text>
                <Text style={styles.input}>{value}</Text>
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name={`lineItems.${index}.descriptionAr` as const}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('quote.descriptionAr')}</Text>
                <Text style={styles.input}>{value || '-'}</Text>
              </View>
            )}
          />

          <View style={[styles.row, isRTL && styles.rowRtl]}>
            <View style={[styles.halfWidth, isRTL && styles.halfWidthRtl]}>
              <Controller
                control={control}
                name={`lineItems.${index}.partsCost` as const}
                render={({ field: { value }, fieldState: { error } }) => (
                  <View>
                    <Text style={styles.label}>{t('quote.partsCost')}</Text>
                    <Text style={styles.input}>{formatKD(value)}</Text>
                    {error && <Text style={styles.errorText}>{error.message}</Text>}
                  </View>
                )}
              />
            </View>

            <View style={[styles.halfWidth, isRTL && styles.halfWidthRtl]}>
              <Controller
                control={control}
                name={`lineItems.${index}.laborCost` as const}
                render={({ field: { value }, fieldState: { error } }) => (
                  <View>
                    <Text style={styles.label}>{t('quote.laborCost')}</Text>
                    <Text style={styles.input}>{formatKD(value)}</Text>
                    {error && <Text style={styles.errorText}>{error.message}</Text>}
                  </View>
                )}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addLineButton}
        onPress={() => append({ description: '', partsCost: 0, laborCost: 0 })}
      >
        <Text style={styles.addLineButtonText}>{t('quote.addLineItem')}</Text>
      </TouchableOpacity>

      {canConsumeParts && (
        <TouchableOpacity style={styles.addPartButton} onPress={() => setPickerOpen(true)}>
          <Text style={styles.addPartButtonText}>{t('inventory.quote.addFromCatalog')}</Text>
        </TouchableOpacity>
      )}

      <PartPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addCatalogPart} />

      <View style={styles.totalsCard}>
        <View style={[styles.totalRow, isRTL && styles.rowRtl]}>
          <Text style={styles.totalLabel}>{t('quote.subtotal')}</Text>
          <Text style={styles.totalValue}>{formatKD(subtotal)}</Text>
        </View>

        <View style={[styles.totalRow, isRTL && styles.rowRtl]}>
          <Text style={styles.totalLabel}>{t('quote.discount')}</Text>
          <Text style={styles.totalValue}>-{formatKD(watchedDiscount)}</Text>
        </View>

        <View style={[styles.totalRow, isRTL && styles.rowRtl, styles.totalRowMain]}>
          <Text style={styles.totalLabelMain}>{t('quote.total')}</Text>
          <Text style={styles.totalValueMain}>{formatKD(total)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={() => onSubmit(watchedItems as any)}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>{t('quote.saveAsDraft')}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  lineItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRtl: {
    textAlign: 'right',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  removeText: {
    fontSize: 14,
    color: '#F44336',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#333333',
    minHeight: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  halfWidth: {
    flex: 1,
  },
  halfWidthRtl: {
    flex: 1,
  },
  addLineButton: {
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addLineButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  addPartButton: {
    backgroundColor: '#F3E5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  addPartButtonText: {
    color: '#7B1FA2',
    fontSize: 15,
    fontWeight: '600',
  },
  totalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowMain: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  totalLabelMain: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
  totalValueMain: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
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
