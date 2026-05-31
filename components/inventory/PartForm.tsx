import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { CreatePartRequest, Part, Unit, UpdatePartRequest } from '@/types/inventory';
import { UNITS } from '@/types/inventory';

interface Props {
  initial?: Part;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (body: CreatePartRequest | UpdatePartRequest) => void;
}

// Spec 025 — create/edit a catalog item. Bilingual name, SKU, unit, cost/sale price, supplier, threshold.
export function PartForm({ initial, submitting, error, onSubmit }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'PIECE');
  const [costPrice, setCostPrice] = useState(initial ? String(initial.costPrice) : '');
  const [salePrice, setSalePrice] = useState(initial ? String(initial.salePrice) : '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [reorderThreshold, setReorderThreshold] = useState(initial ? String(initial.reorderThreshold) : '0');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const valid =
    nameEn.trim() && nameAr.trim() && sku.trim() &&
    Number(costPrice) >= 0 && costPrice !== '' && Number(salePrice) >= 0 && salePrice !== '' &&
    Number(reorderThreshold) >= 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const body: UpdatePartRequest = {
      nameEn: nameEn.trim(), nameAr: nameAr.trim(), sku: sku.trim(),
      category: category.trim() || undefined, unit,
      costPrice: Number(costPrice), salePrice: Number(salePrice),
      supplier: supplier.trim() || undefined, reorderThreshold: Number(reorderThreshold),
      ...(initial ? { isActive } : {}),
    };
    onSubmit(body);
  };

  const field = (label: string, value: string, set: (v: string) => void, opts?: { keyboardType?: 'decimal-pad' | 'number-pad'; placeholder?: string }) => (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        style={[styles.input, isRTL && styles.inputRtl]}
        value={value}
        onChangeText={set}
        keyboardType={opts?.keyboardType}
        placeholder={opts?.placeholder}
        placeholderTextColor="#9E9E9E"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {field(t('inventory.form.nameEn'), nameEn, setNameEn)}
      {field(t('inventory.form.nameAr'), nameAr, setNameAr)}
      {field(t('inventory.form.sku'), sku, setSku, { placeholder: 'BP-FRT-001' })}
      {field(t('inventory.form.category'), category, setCategory)}

      <View style={styles.field}>
        <AppText style={styles.label}>{t('inventory.form.unit')}</AppText>
        <View style={[styles.unitRow, isRTL && styles.rowRtl]}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChip, unit === u && styles.unitChipActive]}
              onPress={() => setUnit(u)}
            >
              <AppText style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                {t(`inventory.units.${u}`)}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.priceRow, isRTL && styles.rowRtl]}>
        <View style={styles.priceCol}>{field(t('inventory.form.costPrice'), costPrice, setCostPrice, { keyboardType: 'decimal-pad', placeholder: '0.000' })}</View>
        <View style={styles.priceCol}>{field(t('inventory.form.salePrice'), salePrice, setSalePrice, { keyboardType: 'decimal-pad', placeholder: '0.000' })}</View>
      </View>

      {field(t('inventory.form.supplier'), supplier, setSupplier)}
      {field(t('inventory.form.reorderThreshold'), reorderThreshold, setReorderThreshold, { keyboardType: 'number-pad' })}

      {initial && (
        <View style={[styles.activeRow, isRTL && styles.rowRtl]}>
          <AppText style={styles.label}>{t('inventory.form.active')}</AppText>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>
      )}

      {touched && !valid && <AppText style={styles.err}>{t('inventory.form.invalid')}</AppText>}
      {!!error && <AppText style={styles.err}>{error}</AppText>}

      <TouchableOpacity style={[styles.saveBtn, (submitting || !valid) && styles.saveDisabled]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <AppText style={styles.saveText}>{t('inventory.form.save')}</AppText>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 6, paddingBottom: 40 },
  field: { gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A2E', backgroundColor: '#fff' },
  inputRtl: { textAlign: 'right' },
  rowRtl: { flexDirection: 'row-reverse' },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  unitChipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  unitChipText: { fontSize: 13, color: '#555' },
  unitChipTextActive: { color: '#fff', fontWeight: '700' },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceCol: { flex: 1 },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 6 },
  err: { fontSize: 13, color: '#C62828', marginVertical: 4 },
  saveBtn: { backgroundColor: '#2196F3', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
