import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerFieldProps {
  label: string;
  value: string;              // HH:mm:ss or ''
  onChange: (time: string) => void;
  placeholder?: string;
  isRTL?: boolean;
}

const parseHHMMSS = (v: string): { h: number; m: number } => {
  const parts = v.split(':');
  const h = parseInt(parts[0] ?? '9', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m };
};

const toHHMMSS = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

const formatDisplay = (v: string): string => {
  if (!v) return '';
  const { h, m } = parseHHMMSS(v);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export function TimePickerField({
  label,
  value,
  onChange,
  placeholder = 'HH:mm',
  isRTL = false,
}: TimePickerFieldProps) {
  const initial = value ? parseHHMMSS(value) : { h: 9, m: 0 };
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (value) {
      const { h, m } = parseHHMMSS(value);
      setHour(h);
      setMinute(m);
    }
    setOpen(true);
  };

  const applyTime = () => {
    onChange(toHHMMSS(hour, minute));
    setOpen(false);
  };

  if (Platform.OS === 'web') {
    // <input type="time"> returns HH:mm; backend needs HH:mm:ss
    const webValue = value ? value.slice(0, 5) : '';
    return (
      <View style={styles.wrap}>
        <Text style={[styles.label, isRTL && styles.rtl]}>{label}</Text>
        <View style={styles.inputBox}>
          <Ionicons name="time-outline" size={18} color="#6B7280" />
          <input
            type="time"
            value={webValue}
            onChange={(e: any) => {
              if (e.target.value) onChange(e.target.value + ':00');
            }}
            style={{
              flex: 1,
              height: 44,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: value ? '#111827' : '#9CA3AF',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            } as any}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, isRTL && styles.rtl]}>{label}</Text>
      <TouchableOpacity style={styles.inputBox} onPress={openPicker} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={18} color="#6B7280" />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Time</Text>

            <View style={styles.spinnerRow}>
              {/* Hour */}
              <View style={styles.spinnerCol}>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setHour(h => (h + 1) % 24)}>
                  <Ionicons name="chevron-up" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.spinValue}>
                  <Text style={styles.spinValueText}>{String(hour).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setHour(h => (h + 23) % 24)}>
                  <Ionicons name="chevron-down" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.spinLabel}>Hour</Text>
              </View>

              <Text style={styles.separator}>:</Text>

              {/* Minute */}
              <View style={styles.spinnerCol}>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setMinute(m => (m + 5) % 60)}>
                  <Ionicons name="chevron-up" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.spinValue}>
                  <Text style={styles.spinValueText}>{String(minute).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity style={styles.spinBtn} onPress={() => setMinute(m => (m + 55) % 60)}>
                  <Ionicons name="chevron-down" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.spinLabel}>Minute</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyTime}>
                <Text style={styles.applyText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 6 },
  rtl: { textAlign: 'right' },
  inputBox: {
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputText: { flex: 1, fontSize: 15, color: '#111827' },
  placeholderText: { color: '#9CA3AF' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 260,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  spinnerCol: { alignItems: 'center', gap: 4 },
  spinBtn: { padding: 6 },
  spinValue: {
    width: 64,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  spinValueText: { fontSize: 26, fontWeight: '700', color: '#4F46E5' },
  spinLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  separator: { fontSize: 30, fontWeight: '700', color: '#374151', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  applyBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  applyText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
});
