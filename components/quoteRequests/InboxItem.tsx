import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { InboxItem as InboxItemType } from '@/types/quoteRequests';

interface InboxItemProps {
  item: InboxItemType;
  onPress: () => void;
}

// Spec 024 US1 — one matching customer request in the center's inbox.
export function InboxItem({ item, onPress }: InboxItemProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const category = isRTL ? item.categoryNameAr : item.categoryNameEn;
  const responded = item.myResponseStatus !== 'NONE' && item.myResponseStatus !== 'WITHDRAWN';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.topRow}>
        <AppText style={styles.category}>{category}</AppText>
        <View style={[styles.badge, responded ? styles.badgeResponded : styles.badgeNew]}>
          <AppText style={[styles.badgeText, responded ? styles.badgeTextResponded : styles.badgeTextNew]}>
            {responded ? t('quoteRequests.inbox.responded') : t('quoteRequests.inbox.notResponded')}
          </AppText>
        </View>
      </View>

      <AppText style={styles.preview} numberOfLines={2}>
        {item.descriptionPreview}
      </AppText>

      <View style={styles.metaRow}>
        {item.areaGovernorate ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color="#757575" />
            <AppText style={styles.metaText}>
              {item.areaGovernorate}
              {item.distance != null ? ` · ${item.distance.toFixed(1)} km` : ''}
            </AppText>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color="#757575" />
          <AppText style={styles.metaText}>
            {t('quoteRequests.inbox.expiresIn', {
              when: new Date(item.expiresAt).toLocaleDateString(isRTL ? 'ar' : 'en'),
            })}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 13, color: '#2196F3', fontWeight: '700', textTransform: 'uppercase', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeNew: { backgroundColor: '#E3F2FD' },
  badgeResponded: { backgroundColor: '#E8F5E9' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextNew: { color: '#1565C0' },
  badgeTextResponded: { color: '#2E7D32' },
  preview: { fontSize: 15, color: '#333333', marginTop: 8, lineHeight: 21 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#757575' },
});
