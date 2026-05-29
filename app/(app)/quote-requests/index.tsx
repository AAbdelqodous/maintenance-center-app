import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { InboxItem } from '@/components/quoteRequests/InboxItem';
import { AppText } from '@/components/ui/AppText';
import { useAppSelector } from '@/store';
import { useGetInboxQuery } from '@/store/api/quoteRequestsApi';

// Spec 024 US1 — the center's inbox of matching customer quote requests.
export default function QuoteRequestsInboxScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canRespond = activePermissions.includes('RESPOND_TO_QUOTES');

  const { data, isLoading, isError, refetch, isFetching } = useGetInboxQuery(undefined, {
    skip: !canRespond,
  });

  if (!canRespond) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#9E9E9E" />
        <AppText style={styles.muted}>{t('quoteRequests.inbox.noAccess')}</AppText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#9E9E9E" />
        <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
          <AppText style={styles.retryText}>{t('common.retry')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={data ?? []}
      keyExtractor={(item) => String(item.requestId)}
      refreshing={isFetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <InboxItem item={item} onPress={() => router.push(`/(app)/quote-requests/${item.requestId}`)} />
      )}
      ListHeaderComponent={
        <TouchableOpacity
          style={styles.prefsRow}
          onPress={() => router.push('/(app)/quote-requests/preferences')}
          accessibilityRole="button"
        >
          <Ionicons name="options-outline" size={18} color="#2196F3" />
          <AppText style={styles.prefsText}>{t('quoteRequests.preferences.title')}</AppText>
          <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Ionicons name="pricetags-outline" size={48} color="#9E9E9E" />
          <AppText style={styles.muted}>{t('quoteRequests.inbox.empty')}</AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#F5F5F5' },
  listContent: { padding: 16, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  muted: { fontSize: 15, color: '#757575', textAlign: 'center' },
  prefsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  prefsText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  retry: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2196F3', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
