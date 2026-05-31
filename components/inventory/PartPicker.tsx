import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useGetPartsQuery } from '@/store/api/inventoryApi';
import type { Part } from '@/types/inventory';

// Spec 025 — pick a catalogued part to add to a quote (used by QuoteBuilder). Search by name/SKU;
// deactivated parts are excluded. Selecting returns the part + chosen quantity to the caller.
export function PartPicker({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (part: Part, quantity: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetPartsQuery({ search }, { skip: !visible });
  const parts = (data ?? []).filter((p) => p.isActive);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={[styles.header, isRTL && styles.rowRtl]}>
          <AppText style={styles.title}>{t('inventory.quote.addFromCatalog')}</AppText>
          <TouchableOpacity onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={26} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchRow, isRTL && styles.rowRtl]}>
          <Ionicons name="search" size={18} color="#9E9E9E" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.inputRtl]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('inventory.catalog.search')}
            placeholderTextColor="#9E9E9E"
            autoFocus
          />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color="#2196F3" />
        ) : (
          <FlatList
            data={parts}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.row, isRTL && styles.rowRtl]} onPress={() => onSelect(item, 1)}>
                <View style={styles.rowBody}>
                  <AppText style={styles.name}>{isRTL ? item.nameAr : item.nameEn}</AppText>
                  <AppText style={styles.sku}>{item.sku} · {t('inventory.catalog.onHandShort', { n: item.onHand })}</AppText>
                </View>
                <AppText style={styles.price}>{formatKD(item.salePrice)}</AppText>
                <Ionicons name="add-circle" size={24} color="#2196F3" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<AppText style={styles.empty}>{t('inventory.catalog.empty')}</AppText>}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  inputRtl: { textAlign: 'right' },
  list: { padding: 16, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  sku: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  empty: { textAlign: 'center', color: '#9E9E9E', marginTop: 24 },
});
