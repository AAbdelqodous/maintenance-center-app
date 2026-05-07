import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerFieldProps {
  label: string;
  value: string;              // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  placeholder?: string;
  isRTL?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  isRTL = false,
}: DatePickerFieldProps) {
  const today = new Date();

  const parseValue = (): Date | null => {
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseValue()?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseValue()?.getMonth() ?? today.getMonth());

  const openPicker = () => {
    const d = parseValue();
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    setOpen(true);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setOpen(false);
  };

  const displayValue = () => {
    const d = parseValue();
    if (!d) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Build calendar grid cells
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(<View key={`e${i}`} style={styles.cell} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const selected = value === iso;
    const isToday =
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d;
    cells.push(
      <TouchableOpacity
        key={d}
        style={[styles.cell, selected && styles.selectedCell, isToday && !selected && styles.todayCell]}
        onPress={() => handleDay(d)}
      >
        <Text style={[styles.cellText, selected && styles.selectedCellText, isToday && !selected && styles.todayCellText]}>
          {d}
        </Text>
      </TouchableOpacity>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.label, isRTL && styles.rtl]}>{label}</Text>
        <View style={styles.inputBox}>
          <Ionicons name="calendar-outline" size={18} color="#6B7280" />
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
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
        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? displayValue() : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.monthYear}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.dayNamesRow}>
              {DAY_NAMES.map(n => (
                <Text key={n} style={styles.dayName}>{n}</Text>
              ))}
            </View>

            <View style={styles.grid}>{cells}</View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
    padding: 20,
    width: 308,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: { padding: 6 },
  monthYear: { fontSize: 16, fontWeight: '700', color: '#111827' },
  dayNamesRow: { flexDirection: 'row', marginBottom: 6 },
  dayName: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  cellText: { fontSize: 14, color: '#374151' },
  selectedCell: { backgroundColor: '#4F46E5', borderRadius: 100 },
  selectedCellText: { color: '#FFFFFF', fontWeight: '700' },
  todayCell: { borderWidth: 1.5, borderColor: '#4F46E5', borderRadius: 100 },
  todayCellText: { color: '#4F46E5', fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelText: { fontSize: 15, color: '#6B7280' },
});
