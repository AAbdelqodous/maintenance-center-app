import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateQuoteMutation } from '@/store/api/quotesApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteSchema, QuoteFormValues } from '@/components/quotes/quoteSchema';

export default function CreateQuoteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [createQuote, { isLoading }] = useCreateQuoteMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      lineItems: [{ description: '', partsCost: 0, laborCost: 0 }],
      discountAmount: 0,
    },
  });

  const watchedItems = watch('lineItems');
  const watchedDiscount = watch('discountAmount') ?? 0;

  const subtotal = (watchedItems ?? []).reduce((sum, item) => sum + (item.partsCost || 0) + (item.laborCost || 0), 0);
  const total = Math.max(0, subtotal - watchedDiscount);

  const onSubmit = async (values: QuoteFormValues) => {
    setErrorMessage(null);
    try {
      await createQuote({
        bookingId: Number(bookingId),
        data: values,
      }).unwrap();
      router.back();
    } catch (error) {
      console.error('Failed to create quote:', error);
      setErrorMessage(t('quote.errorSave'));
    }
  };

  const formatKD = (amount: number) => `KD ${amount.toFixed(3)}`;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('quote.lineItems')}</Text>

        {watchedItems.map((item, index) => (
          <View key={index} style={styles.lineItemCard}>
            <Text style={styles.lineItemIndex}>{index + 1}</Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('quote.description')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('quote.description')}
                value={item.description}
                onChangeText={(text) => {
                  const newItems = [...watchedItems];
                  newItems[index].description = text;
                }}
              />
              {errors.lineItems?.[index]?.description && (
                <Text style={styles.errorText}>{errors.lineItems[index].description?.message}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('quote.partsCost')} (KD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                value={item.partsCost !== undefined ? String(item.partsCost) : ''}
                onChangeText={(text) => {
                  const newItems = [...watchedItems];
                  newItems[index].partsCost = parseFloat(text) || 0;
                }}
                keyboardType="decimal-pad"
              />
              {errors.lineItems?.[index]?.partsCost && (
                <Text style={styles.errorText}>{errors.lineItems[index].partsCost?.message}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('quote.laborCost')} (KD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                value={item.laborCost !== undefined ? String(item.laborCost) : ''}
                onChangeText={(text) => {
                  const newItems = [...watchedItems];
                  newItems[index].laborCost = parseFloat(text) || 0;
                }}
                keyboardType="decimal-pad"
              />
              {errors.lineItems?.[index]?.laborCost && (
                <Text style={styles.errorText}>{errors.lineItems[index].laborCost?.message}</Text>
              )}
            </View>

            {watchedItems.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  const newItems = watchedItems.filter((_, i) => i !== index);
                }}
              >
                <Text style={styles.removeButtonText}>{t('quote.removeLineItem')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addLineButton}
          onPress={() => {
            const newItems = [...watchedItems, { description: '', partsCost: 0, laborCost: 0 }];
          }}
        >
          <Text style={styles.addLineButtonText}>{t('quote.addLineItem')}</Text>
        </TouchableOpacity>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('quote.discount')} (KD)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.000"
            value={watchedDiscount !== undefined && watchedDiscount !== null ? String(watchedDiscount) : ''}
            onChangeText={(text) => {
              const val = parseFloat(text) || 0;
            }}
            keyboardType="decimal-pad"
          />
          {errors.discountAmount && (
            <Text style={styles.errorText}>{errors.discountAmount.message}</Text>
          )}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('quote.subtotal')}</Text>
            <Text style={styles.totalValue}>{formatKD(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('quote.discount')}</Text>
            <Text style={styles.totalValue}>-{formatKD(watchedDiscount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowMain]}>
            <Text style={styles.totalLabelMain}>{t('quote.total')}</Text>
            <Text style={styles.totalValueMain}>{formatKD(total)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('quote.saveAsDraft')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
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
  lineItemIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2,
  },
  removeButton: {
    marginTop: 8,
  },
  removeButtonText: {
    color: '#F44336',
    fontSize: 14,
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
