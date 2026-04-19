import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetBookingQuotesQuery, useSendQuoteMutation } from '@/store/api/quotesApi';
import type { BookingQuote } from '@/types/quote';
import { formatKD } from '@/lib/utils/pricing';

export default function QuoteDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId, quoteId } = useLocalSearchParams<{ bookingId: string; quoteId: string }>();

  const { data: quotes, isLoading, refetch } = useGetBookingQuotesQuery(Number(bookingId));
  const [sendQuote, { isLoading: isSending }] = useSendQuoteMutation();
  const [sendError, setSendError] = useState<string | null>(null);

  const quote = quotes?.find(q => q.id === Number(quoteId));

  const handleSend = async () => {
    if (!quote) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`${t('quote.confirmSendMessage')} ${t('quote.total')}: ${formatKD(quote.totalAmount)}`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('quote.confirmSendTitle'),
            `${t('quote.confirmSendMessage')} ${t('quote.total')}: ${formatKD(quote.totalAmount)}`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('progress.confirmSend'), onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    setSendError(null);
    try {
      await sendQuote({
        bookingId: Number(bookingId),
        quoteId: Number(quoteId),
      }).unwrap();
    } catch (error) {
      console.error('Failed to send quote:', error);
      setSendError(t('quote.errorSend'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Quote not found</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (quote.status) {
      case 'DRAFT': return '#9E9E9E';
      case 'SENT': return '#2196F3';
      case 'APPROVED': return '#4CAF50';
      case 'REJECTED': return '#F44336';
      case 'REVISED': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {t(`quote.${quote.status.toLowerCase()}`)}
            </Text>
          </View>
          <Text style={styles.version}>{t('quote.version')} {quote.version}</Text>
        </View>

        {sendError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{sendError}</Text>
          </View>
        )}

        {quote.status === 'DRAFT' && (
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>{t('quote.sendToCustomer')}</Text>
            )}
          </TouchableOpacity>
        )}

        {quote.status === 'SENT' && quote.sentAt && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Sent at</Text>
            <Text style={styles.infoValue}>{new Date(quote.sentAt).toLocaleString()}</Text>
          </View>
        )}

        {quote.status === 'APPROVED' && quote.respondedAt && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('quote.respondedAt')}</Text>
            <Text style={styles.infoValue}>{new Date(quote.respondedAt).toLocaleString()}</Text>
          </View>
        )}

        {quote.status === 'REJECTED' && (
          <>
            <View style={styles.rejectedCard}>
              <Text style={styles.rejectedText}>{t(`quote.${quote.status.toLowerCase()}`)}</Text>
              {quote.responseNotes && (
                <Text style={styles.responseNotes}>{quote.responseNotes}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.revisedButton}
              onPress={() => router.push(`./create-quote?bookingId=${bookingId}`)}
            >
              <Text style={styles.revisedButtonText}>{t('quote.createRevised')}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.lineItemsCard}>
          <Text style={styles.cardTitle}>{t('quote.lineItems')}</Text>
          {quote.lineItems.map((item, index) => (
            <View key={index} style={styles.lineItemRow}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
                <Text style={styles.lineItemDetails}>
                  {t('quote.partsCost')}: {formatKD(item.partsCost)} | {t('quote.laborCost')}: {formatKD(item.laborCost)}
                </Text>
              </View>
              <Text style={styles.lineItemTotal}>{formatKD(item.partsCost + item.laborCost)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('quote.subtotal')}</Text>
            <Text style={styles.totalValue}>{formatKD(quote.subtotal)}</Text>
          </View>
          {quote.discountAmount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('quote.discount')}</Text>
                <Text style={styles.totalValue}>-{formatKD(quote.discountAmount)}</Text>
              </View>
              {quote.discountReason && (
                <Text style={styles.discountReason}>{quote.discountReason}</Text>
              )}
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('quote.tax')}</Text>
            <Text style={styles.totalValue}>{formatKD(quote.taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowMain]}>
            <Text style={styles.totalLabelMain}>{t('quote.total')}</Text>
            <Text style={styles.totalValueMain}>{formatKD(quote.totalAmount)}</Text>
          </View>
        </View>

        {quote.estimatedDurationMinutes && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('quote.estimatedDuration')}</Text>
            <Text style={styles.infoValue}>{quote.estimatedDurationMinutes} min</Text>
          </View>
        )}

        <Text style={styles.footerText}>
          Created: {new Date(quote.createdAt).toLocaleString()}
        </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#999999',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
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
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  rejectedCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rejectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 8,
  },
  responseNotes: {
    fontSize: 14,
    color: '#333333',
  },
  revisedButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  revisedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lineItemsCard: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  lineItemDetails: {
    fontSize: 12,
    color: '#999999',
  },
  lineItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
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
  discountReason: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});
