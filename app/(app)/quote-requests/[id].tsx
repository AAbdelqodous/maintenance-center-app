import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { QuoteResponseForm } from '@/components/quoteRequests/QuoteResponseForm';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import {
  useGetLeadQuery,
  useStartRequestChatMutation,
  useSubmitQuoteMutation,
  useWithdrawQuoteMutation,
} from '@/store/api/quoteRequestsApi';
import type { SubmitQuoteRequest } from '@/types/quoteRequests';

// Spec 024 US1 — request detail + submit/edit/withdraw this center's quote; message the customer.
export default function QuoteRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data, isLoading, isError, refetch } = useGetLeadQuery(requestId);
  const [submitQuote, { isLoading: submitting }] = useSubmitQuoteMutation();
  const [withdrawQuote] = useWithdrawQuoteMutation();
  const [startRequestChat] = useStartRequestChatMutation();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#9E9E9E" />
        <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
          <AppText style={styles.retryText}>{t('common.retry')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const { myResponse, requestStatus } = data;
  const isOpen = requestStatus === 'OPEN';
  const hasActiveQuote =
    !!myResponse && (myResponse.status === 'SUBMITTED' || myResponse.status === 'UPDATED');
  const category = isRTL ? data.categoryNameAr : data.categoryNameEn;

  const handleSubmit = async (payload: SubmitQuoteRequest) => {
    try {
      await submitQuote({ requestId, data: payload }).unwrap();
      setEditing(false);
    } catch {
      Alert.alert(t('quoteRequests.detail.title'), t('common.error'));
    }
  };

  const handleWithdraw = () => {
    Alert.alert(t('quoteRequests.detail.withdraw'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('quoteRequests.detail.withdraw'),
        style: 'destructive',
        onPress: () => withdrawQuote(requestId),
      },
    ]);
  };

  const handleMessage = async () => {
    try {
      const { conversationId } = await startRequestChat({ requestId }).unwrap();
      router.push(`/(app)/(tabs)/chat/${conversationId}`);
    } catch {
      Alert.alert(t('quoteRequests.detail.title'), t('common.error'));
    }
  };

  const priceLabel = myResponse
    ? myResponse.priceMin === myResponse.priceMax
      ? formatKD(myResponse.priceMin)
      : `${formatKD(myResponse.priceMin)} – ${formatKD(myResponse.priceMax)}`
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Request summary */}
      <AppText style={styles.category}>{category}</AppText>
      <AppText style={styles.description}>{data.description}</AppText>

      <View style={styles.facts}>
        {data.vehicleOrApplianceNote ? (
          <Fact label={t('quoteRequests.detail.vehicle')} value={data.vehicleOrApplianceNote} />
        ) : null}
        {data.areaGovernorate ? (
          <Fact
            label={t('quoteRequests.detail.area')}
            value={`${data.areaGovernorate}${data.distance != null ? ` · ${data.distance.toFixed(1)} km` : ''}`}
          />
        ) : null}
        {data.fulfillmentHint ? (
          <Fact
            label={t('quoteRequests.detail.fulfillment')}
            value={t(`quoteRequests.fulfillmentHint.${data.fulfillmentHint}`)}
          />
        ) : null}
      </View>

      <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2196F3" />
        <AppText style={styles.messageText}>{t('chat.title')}</AppText>
      </TouchableOpacity>

      {/* Outcome / quote area */}
      {!isOpen ? (
        <View style={[styles.banner, myResponse?.status === 'SELECTED' ? styles.bannerWon : styles.bannerClosed]}>
          <Ionicons
            name={myResponse?.status === 'SELECTED' ? 'trophy' : 'information-circle-outline'}
            size={18}
            color={myResponse?.status === 'SELECTED' ? '#2E7D32' : '#757575'}
          />
          <AppText style={styles.bannerText}>
            {myResponse?.status === 'SELECTED'
              ? t('quoteRequests.detail.won')
              : myResponse?.status === 'NOT_SELECTED'
                ? t('quoteRequests.detail.notSelected')
                : t('quoteRequests.detail.closed')}
          </AppText>
        </View>
      ) : hasActiveQuote && !editing ? (
        <View style={styles.quoteCard}>
          <AppText style={styles.quoteTitle}>{t('quoteRequests.detail.yourQuote')}</AppText>
          <AppText style={styles.quotePrice}>{priceLabel}</AppText>
          {myResponse?.estimatedDurationMinutes != null && (
            <AppText style={styles.quoteMeta}>
              {t('quoteRequests.form.duration')}: {myResponse.estimatedDurationMinutes}
            </AppText>
          )}
          {!!myResponse?.inclusions && <AppText style={styles.quoteMeta}>{myResponse.inclusions}</AppText>}
          <View style={styles.quoteActions}>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <AppText style={styles.editText}>{t('quoteRequests.detail.edit')}</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
              <AppText style={styles.withdrawText}>{t('quoteRequests.detail.withdraw')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <QuoteResponseForm
          existing={editing ? myResponse : null}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <AppText style={styles.factLabel}>{label}</AppText>
      <AppText style={styles.factValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  category: { fontSize: 13, color: '#2196F3', fontWeight: '700', textTransform: 'uppercase' },
  description: { fontSize: 16, color: '#1A1A2E', marginTop: 8, lineHeight: 23 },
  facts: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factLabel: { fontSize: 13, color: '#757575' },
  factValue: { fontSize: 14, color: '#333333', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  messageText: { color: '#2196F3', fontWeight: '600', fontSize: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 14, borderRadius: 12 },
  bannerWon: { backgroundColor: '#E8F5E9' },
  bannerClosed: { backgroundColor: '#EEEEEE' },
  bannerText: { fontSize: 15, fontWeight: '600', color: '#333333', flexShrink: 1 },
  quoteCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 16 },
  quoteTitle: { fontSize: 14, color: '#757575', fontWeight: '600' },
  quotePrice: { fontSize: 22, fontWeight: '700', color: '#1565C0', marginTop: 6 },
  quoteMeta: { fontSize: 14, color: '#424242', marginTop: 6 },
  quoteActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2196F3', alignItems: 'center' },
  editText: { color: '#2196F3', fontWeight: '600' },
  withdrawButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E53935', alignItems: 'center' },
  withdrawText: { color: '#E53935', fontWeight: '600' },
  retry: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2196F3', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
