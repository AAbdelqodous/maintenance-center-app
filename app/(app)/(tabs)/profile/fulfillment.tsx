import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyCapabilityQuery, useUpdateMyCapabilityMutation } from '@/store/api/fulfillmentApi';

// Spec 008 (Part B) — owner authors the center's fulfillment capability: which modes it offers, the
// governorates it serves, and the pickup / at-home fees. DROP_OFF is always available (handled at the
// center), so only pickup & at-home are toggleable. Empty / unset values fall back to platform defaults.
export default function FulfillmentCapabilityScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { data: capability, isLoading } = useGetMyCapabilityQuery();
  const [save, { isLoading: isSaving }] = useUpdateMyCapabilityMutation();

  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [atHomeEnabled, setAtHomeEnabled] = useState(false);
  const [pickupBase, setPickupBase] = useState('');
  const [pickupPerKm, setPickupPerKm] = useState('');
  const [atHomeFlat, setAtHomeFlat] = useState('');
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    if (!capability) return;
    setPickupEnabled(capability.supportedModes.includes('PICKUP_DELIVERY'));
    setAtHomeEnabled(capability.supportedModes.includes('AT_HOME'));
    const pickup = capability.feeByMode.PICKUP_DELIVERY;
    const atHome = capability.feeByMode.AT_HOME;
    setPickupBase(pickup?.baseAmount != null ? String(pickup.baseAmount) : '');
    setPickupPerKm(pickup?.perKm != null ? String(pickup.perKm) : '');
    setAtHomeFlat(atHome?.flatAmount != null ? String(atHome.flatAmount) : '');
    setGovernorates(capability.serviceAreaGovernorates ?? []);
  }, [capability]);

  const feedback = (type: 'success' | 'error', text: string) => {
    if (Platform.OS === 'web') window.alert(text);
    else Alert.alert(type === 'success' ? t('common.save') : t('common.error'), text);
  };

  const addArea = () => {
    const v = newArea.trim();
    if (v && !governorates.includes(v)) setGovernorates([...governorates, v]);
    setNewArea('');
  };

  const handleSave = async () => {
    const supportedModes: string[] = [];
    if (pickupEnabled) supportedModes.push('PICKUP_DELIVERY');
    if (atHomeEnabled) supportedModes.push('AT_HOME');

    if (pickupEnabled) {
      const b = parseFloat(pickupBase);
      const k = parseFloat(pickupPerKm);
      if (isNaN(b) || b < 0 || isNaN(k) || k < 0) {
        feedback('error', t('fulfillment.feeRequiredPickup'));
        return;
      }
    }
    if (atHomeEnabled && (isNaN(parseFloat(atHomeFlat)) || parseFloat(atHomeFlat) < 0)) {
      feedback('error', t('fulfillment.feeRequiredAtHome'));
      return;
    }

    try {
      await save({
        supportedModes,
        serviceAreaGovernorates: governorates,
        pickupBase: pickupEnabled ? parseFloat(pickupBase) : null,
        pickupPerKm: pickupEnabled ? parseFloat(pickupPerKm) : null,
        atHomeFlat: atHomeEnabled ? parseFloat(atHomeFlat) : null,
      }).unwrap();
      feedback('success', t('fulfillment.capabilitySaved'));
    } catch (e: any) {
      feedback('error', e?.data?.businessErrorDescription ?? t('common.error'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  const feeInput = (label: string, value: string, onChange: (s: string) => void) => (
    <View style={styles.feeField}>
      <Text style={styles.feeLabel}>{label}</Text>
      <TextInput
        style={[styles.feeInput, { textAlign: isRTL ? 'right' : 'left' }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0.000"
        placeholderTextColor="#9E9E9E"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: t('fulfillment.capabilityTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('fulfillment.capabilityIntro')}</Text>

        {/* Drop-off — always on */}
        <View style={styles.card}>
          <View style={[styles.modeRow, isRTL && styles.rowRtl]}>
            <Ionicons name="storefront-outline" size={20} color="#2E7D32" />
            <View style={styles.modeText}>
              <Text style={styles.modeTitle}>{t('fulfillment.mode.DROP_OFF')}</Text>
              <Text style={styles.modeSub}>{t('fulfillment.alwaysAvailable')}</Text>
            </View>
            <Text style={styles.freeTag}>{t('fulfillment.free')}</Text>
          </View>
        </View>

        {/* Pickup & delivery */}
        <View style={styles.card}>
          <View style={[styles.modeRow, isRTL && styles.rowRtl]}>
            <Ionicons name="car-outline" size={20} color="#1565C0" />
            <View style={styles.modeText}>
              <Text style={styles.modeTitle}>{t('fulfillment.mode.PICKUP_DELIVERY')}</Text>
              <Text style={styles.modeSub}>{t('fulfillment.pickupSub')}</Text>
            </View>
            <Switch value={pickupEnabled} onValueChange={setPickupEnabled} />
          </View>
          {pickupEnabled && (
            <View style={styles.feeRow}>
              {feeInput(t('fulfillment.pickupBase'), pickupBase, setPickupBase)}
              {feeInput(t('fulfillment.pickupPerKm'), pickupPerKm, setPickupPerKm)}
            </View>
          )}
        </View>

        {/* At-home */}
        <View style={styles.card}>
          <View style={[styles.modeRow, isRTL && styles.rowRtl]}>
            <Ionicons name="home-outline" size={20} color="#6A1B9A" />
            <View style={styles.modeText}>
              <Text style={styles.modeTitle}>{t('fulfillment.mode.AT_HOME')}</Text>
              <Text style={styles.modeSub}>{t('fulfillment.atHomeSub')}</Text>
            </View>
            <Switch value={atHomeEnabled} onValueChange={setAtHomeEnabled} />
          </View>
          {atHomeEnabled && (
            <View style={styles.feeRow}>{feeInput(t('fulfillment.atHomeFlat'), atHomeFlat, setAtHomeFlat)}</View>
          )}
        </View>

        {/* Service area */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('fulfillment.serviceArea')}</Text>
          <View style={[styles.addRow, isRTL && styles.rowRtl]}>
            <TextInput
              style={[styles.areaInput, { textAlign: isRTL ? 'right' : 'left' }]}
              value={newArea}
              onChangeText={setNewArea}
              placeholder={t('fulfillment.addGovernorate')}
              placeholderTextColor="#9E9E9E"
              onSubmitEditing={addArea}
            />
            <TouchableOpacity style={styles.addButton} onPress={addArea}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.chips}>
            {governorates.length === 0 ? (
              <Text style={styles.emptyAreas}>{t('fulfillment.noAreas')}</Text>
            ) : (
              governorates.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, isRTL && styles.rowRtl]}
                  onPress={() => setGovernorates(governorates.filter((x) => x !== g))}
                >
                  <Text style={styles.chipText}>{g}</Text>
                  <Ionicons name="close-circle" size={16} color="#1565C0" />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  intro: { fontSize: 14, color: '#616161', marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  modeSub: { fontSize: 13, color: '#757575', marginTop: 2 },
  freeTag: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  feeRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  feeField: { flex: 1 },
  feeLabel: { fontSize: 13, color: '#616161', marginBottom: 6 },
  feeInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A2E' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  areaInput: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A2E' },
  addButton: { width: 44, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  emptyAreas: { fontSize: 13, color: '#9E9E9E', fontStyle: 'italic' },
  saveButton: { backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveButtonDisabled: { backgroundColor: '#90CAF9' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
