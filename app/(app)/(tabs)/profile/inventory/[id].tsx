import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { PartForm } from '@/components/inventory/PartForm';
import { AppText } from '@/components/ui/AppText';
import { formatKD } from '@/lib/utils/pricing';
import { useAppSelector } from '@/store';
import {
  useAdjustStockMutation,
  useDeactivatePartMutation,
  useGetMovementsQuery,
  useGetPartsQuery,
  useReceiveStockMutation,
  useUpdatePartMutation,
} from '@/store/api/inventoryApi';
import type { MovementType, UpdatePartRequest } from '@/types/inventory';

const MOVE_COLOR: Record<MovementType, string> = {
  RECEIVE: '#2E7D32', ADJUST: '#F57C00', CONSUME: '#C62828', CONSUME_REVERSAL: '#1565C0',
};

export default function PartDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = isRTL ? 'ar' : 'en';
  const perms = useAppSelector((s) => s.center.activePermissions);
  const canManage = perms.includes('MANAGE_INVENTORY');

  const { data: parts, isLoading } = useGetPartsQuery();
  const part = parts?.find((p) => p.id === id);
  const { data: movements } = useGetMovementsQuery(id, { skip: !id });
  const [receiveStock, { isLoading: receiving }] = useReceiveStockMutation();
  const [adjustStock, { isLoading: adjusting }] = useAdjustStockMutation();
  const [updatePart, { isLoading: updating }] = useUpdatePartMutation();
  const [deactivatePart] = useDeactivatePartMutation();

  const [mode, setMode] = useState<null | 'receive' | 'adjust'>(null);
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reason, setReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }
  if (!part) {
    return <View style={styles.centered}><AppText style={styles.muted}>{t('inventory.detail.notFound')}</AppText></View>;
  }

  const low = part.isActive && part.onHand <= part.reorderThreshold;

  const doReceive = async () => {
    setBanner(null);
    const q = Number(qty);
    if (!Number.isInteger(q) || q <= 0) { setBanner({ type: 'err', text: t('inventory.detail.invalidQty') }); return; }
    try {
      await receiveStock({ id, body: { quantity: q, unitCost: unitCost ? Number(unitCost) : undefined } }).unwrap();
      setBanner({ type: 'ok', text: t('inventory.detail.received') });
      setMode(null); setQty(''); setUnitCost('');
    } catch (e: any) { setBanner({ type: 'err', text: e?.data?.businessErrorDescription ?? t('common.error') }); }
  };

  const doAdjust = async () => {
    setBanner(null);
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || !reason.trim()) { setBanner({ type: 'err', text: t('inventory.detail.invalidAdjust') }); return; }
    try {
      await adjustStock({ id, body: { newOnHand: n, reason: reason.trim() } }).unwrap();
      setBanner({ type: 'ok', text: t('inventory.detail.adjusted') });
      setMode(null); setQty(''); setReason('');
    } catch (e: any) { setBanner({ type: 'err', text: e?.data?.businessErrorDescription ?? t('common.error') }); }
  };

  const onEdit = async (body: UpdatePartRequest) => {
    try {
      await updatePart({ id, body }).unwrap();
      setEditOpen(false);
      setBanner({ type: 'ok', text: t('inventory.detail.saved') });
    } catch (e: any) { setBanner({ type: 'err', text: e?.data?.businessErrorDescription ?? t('common.error') }); }
  };

  const confirmDeactivate = () => {
    const run = async () => { await deactivatePart(id).unwrap().catch(() => {}); router.back(); };
    if (Platform.OS === 'web') { if (window.confirm(t('inventory.detail.deactivateConfirm'))) run(); }
    else { setMode(null); run(); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {banner && (
        <View style={[styles.banner, banner.type === 'ok' ? styles.bannerOk : styles.bannerErr]}>
          <Ionicons name={banner.type === 'ok' ? 'checkmark-circle' : 'alert-circle'} size={18} color={banner.type === 'ok' ? '#2E7D32' : '#C62828'} />
          <AppText style={styles.bannerText}>{banner.text}</AppText>
        </View>
      )}

      <View style={styles.card}>
        <AppText style={styles.name}>{locale === 'ar' ? part.nameAr : part.nameEn}</AppText>
        <AppText style={styles.sku}>{part.sku}{part.category ? ` · ${part.category}` : ''}</AppText>
        <View style={[styles.onHandRow, isRTL && styles.rowRtl]}>
          <AppText style={[styles.onHand, low && { color: '#C62828' }]}>{part.onHand}</AppText>
          <AppText style={styles.unit}>{t(`inventory.units.${part.unit}`)} {t('inventory.detail.onHand')}</AppText>
        </View>
        {low && <AppText style={styles.lowText}>{t('inventory.detail.lowWarning', { threshold: part.reorderThreshold })}</AppText>}
        <View style={[styles.priceRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.priceLabel}>{t('inventory.form.costPrice')}: <AppText style={styles.priceVal}>{formatKD(part.costPrice)}</AppText></AppText>
          <AppText style={styles.priceLabel}>{t('inventory.form.salePrice')}: <AppText style={styles.priceVal}>{formatKD(part.salePrice)}</AppText></AppText>
        </View>
      </View>

      {canManage && (
        <View style={[styles.actionRow, isRTL && styles.rowRtl]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setMode(mode === 'receive' ? null : 'receive'); setQty(''); }}>
            <Ionicons name="arrow-down-circle-outline" size={18} color="#2E7D32" />
            <AppText style={styles.actionText}>{t('inventory.detail.receive')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setMode(mode === 'adjust' ? null : 'adjust'); setQty(String(part.onHand)); }}>
            <Ionicons name="create-outline" size={18} color="#F57C00" />
            <AppText style={styles.actionText}>{t('inventory.detail.adjust')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setEditOpen(true)}>
            <Ionicons name="pencil-outline" size={18} color="#2196F3" />
            <AppText style={styles.actionText}>{t('inventory.detail.edit')}</AppText>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'receive' && (
        <View style={styles.inlineForm}>
          <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder={t('inventory.detail.quantity')} placeholderTextColor="#9E9E9E" />
          <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholder={t('inventory.detail.unitCost')} placeholderTextColor="#9E9E9E" />
          <TouchableOpacity style={styles.primaryBtn} onPress={doReceive} disabled={receiving}>
            {receiving ? <ActivityIndicator color="#fff" /> : <AppText style={styles.primaryText}>{t('inventory.detail.receive')}</AppText>}
          </TouchableOpacity>
        </View>
      )}
      {mode === 'adjust' && (
        <View style={styles.inlineForm}>
          <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder={t('inventory.detail.newOnHand')} placeholderTextColor="#9E9E9E" />
          <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={reason} onChangeText={setReason} placeholder={t('inventory.detail.reason')} placeholderTextColor="#9E9E9E" />
          <TouchableOpacity style={styles.primaryBtn} onPress={doAdjust} disabled={adjusting}>
            {adjusting ? <ActivityIndicator color="#fff" /> : <AppText style={styles.primaryText}>{t('inventory.detail.adjust')}</AppText>}
          </TouchableOpacity>
        </View>
      )}

      <AppText style={styles.sectionTitle}>{t('inventory.movements.history')}</AppText>
      {(movements ?? []).map((m) => (
        <View key={m.id} style={[styles.moveRow, isRTL && styles.rowRtl]}>
          <View style={[styles.moveDot, { backgroundColor: MOVE_COLOR[m.type] }]} />
          <View style={styles.moveBody}>
            <AppText style={styles.moveType}>{t(`inventory.movements.${m.type}`)}{m.reason ? ` · ${m.reason}` : ''}</AppText>
            <AppText style={styles.moveMeta}>{m.actorName} · {new Date(m.createdAt).toLocaleDateString(locale)}</AppText>
          </View>
          <AppText style={[styles.moveQty, { color: MOVE_COLOR[m.type] }]}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</AppText>
        </View>
      ))}
      {(movements ?? []).length === 0 && <AppText style={styles.muted}>{t('inventory.movements.empty')}</AppText>}

      {canManage && part.isActive && (
        <TouchableOpacity style={styles.deactivate} onPress={confirmDeactivate}>
          <AppText style={styles.deactivateText}>{t('inventory.detail.deactivate')}</AppText>
        </TouchableOpacity>
      )}

      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalHeader}>
          <AppText style={styles.modalTitle}>{t('inventory.detail.edit')}</AppText>
          <TouchableOpacity onPress={() => setEditOpen(false)}><Ionicons name="close" size={26} color="#1A1A2E" /></TouchableOpacity>
        </View>
        <PartForm initial={part} submitting={updating} onSubmit={(b) => onEdit(b as UpdatePartRequest)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: '#757575', textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  bannerOk: { backgroundColor: '#E8F5E9' }, bannerErr: { backgroundColor: '#FFEBEE' },
  bannerText: { flex: 1, fontSize: 13, color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  name: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  sku: { fontSize: 13, color: '#9E9E9E' },
  onHandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  onHand: { fontSize: 28, fontWeight: '800', color: '#2E7D32' },
  unit: { fontSize: 14, color: '#757575' },
  lowText: { fontSize: 13, color: '#C62828', fontWeight: '600' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  priceLabel: { fontSize: 13, color: '#757575' },
  priceVal: { fontWeight: '700', color: '#1A1A2E' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  inlineForm: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A2E' },
  inputRtl: { textAlign: 'right' },
  primaryBtn: { backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  moveDot: { width: 10, height: 10, borderRadius: 5 },
  moveBody: { flex: 1 },
  moveType: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  moveMeta: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  moveQty: { fontSize: 15, fontWeight: '800' },
  deactivate: { borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  deactivateText: { color: '#C62828', fontWeight: '600' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
});
