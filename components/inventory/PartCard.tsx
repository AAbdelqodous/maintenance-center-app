import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import type { Part } from '@/types/inventory';

// Spec 025 — one catalog row: bilingual name, SKU, on-hand, price, low-stock badge.
export function PartCard({ part, onPress }: { part: Part; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const name = isRTL ? part.nameAr : part.nameEn;
  const low = part.isActive && part.onHand <= part.reorderThreshold;

  return (
    <TouchableOpacity style={[styles.card, isRTL && styles.rowRtl]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.body}>
        <View style={[styles.titleRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.name} numberOfLines={1}>{name}</AppText>
          {!part.isActive && (
            <View style={styles.inactivePill}>
              <AppText style={styles.inactiveText}>{t('inventory.catalog.inactive')}</AppText>
            </View>
          )}
        </View>
        <AppText style={styles.sku}>{part.sku}{part.category ? ` · ${part.category}` : ''}</AppText>
        <View style={[styles.metaRow, isRTL && styles.rowRtl]}>
          <View style={[styles.onHandWrap, isRTL && styles.rowRtl]}>
            <AppText style={[styles.onHand, low && styles.onHandLow]}>{part.onHand}</AppText>
            <AppText style={styles.unit}>{t(`inventory.units.${part.unit}`)}</AppText>
            {low && (
              <View style={styles.lowBadge}>
                <Ionicons name="alert-circle" size={12} color="#C62828" />
                <AppText style={styles.lowText}>{t('inventory.catalog.low')}</AppText>
              </View>
            )}
          </View>
          <AppText style={styles.price}>{formatKD(part.salePrice)}</AppText>
        </View>
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  inactivePill: { backgroundColor: '#EEE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveText: { fontSize: 10, color: '#757575', fontWeight: '600' },
  sku: { fontSize: 12, color: '#9E9E9E' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  onHandWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onHand: { fontSize: 15, fontWeight: '800', color: '#2E7D32' },
  onHandLow: { color: '#C62828' },
  unit: { fontSize: 12, color: '#757575' },
  lowBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FFEBEE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 },
  lowText: { fontSize: 10, color: '#C62828', fontWeight: '700' },
  price: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
});
