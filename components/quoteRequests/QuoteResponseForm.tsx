import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { QuoteResponse, SubmitQuoteRequest } from '@/types/quoteRequests';

interface QuoteResponseFormProps {
  existing?: QuoteResponse | null;
  submitting: boolean;
  onSubmit: (data: SubmitQuoteRequest) => void;
}

// Spec 024 US1 — submit or edit this center's quote (fixed price or range).
export function QuoteResponseForm({ existing, submitting, onSubmit }: QuoteResponseFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const initialRange = !!existing && existing.priceMin !== existing.priceMax;
  const [isRange, setIsRange] = useState(initialRange);
  const [priceMin, setPriceMin] = useState(existing ? String(existing.priceMin) : '');
  const [priceMax, setPriceMax] = useState(
    existing && initialRange ? String(existing.priceMax) : '',
  );
  const [duration, setDuration] = useState(
    existing?.estimatedDurationMinutes != null ? String(existing.estimatedDurationMinutes) : '',
  );
  const [inclusions, setInclusions] = useState(existing?.inclusions ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [touched, setTouched] = useState(false);

  const min = parseFloat(priceMin);
  const max = isRange ? parseFloat(priceMax) : min;
  const priceInvalid = isNaN(min) || min <= 0;
  const rangeInvalid = isRange && (isNaN(max) || max < min);

  const handleSubmit = () => {
    setTouched(true);
    if (priceInvalid || rangeInvalid) return;
    onSubmit({
      priceMin: min,
      priceMax: isRange ? max : min,
      estimatedDurationMinutes: duration ? parseInt(duration, 10) : undefined,
      inclusions: inclusions.trim() || undefined,
      message: message.trim() || undefined,
    });
  };

  const inputStyle = [styles.input, isRTL && styles.rtlInput];

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{t('quoteRequests.form.title')}</AppText>

      {/* Fixed / range toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, !isRange && styles.toggleActive]}
          onPress={() => setIsRange(false)}
        >
          <AppText style={[styles.toggleText, !isRange && styles.toggleTextActive]}>
            {t('quoteRequests.form.fixed')}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, isRange && styles.toggleActive]}
          onPress={() => setIsRange(true)}
        >
          <AppText style={[styles.toggleText, isRange && styles.toggleTextActive]}>
            {t('quoteRequests.form.range')}
          </AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.label}>{t('quoteRequests.form.priceMin')}</AppText>
      <TextInput
        style={[...inputStyle, touched && priceInvalid && styles.inputError]}
        value={priceMin}
        onChangeText={setPriceMin}
        keyboardType="decimal-pad"
        placeholder="0.000"
        placeholderTextColor="#9E9E9E"
      />
      {touched && priceInvalid && (
        <AppText style={styles.errorText}>{t('quoteRequests.form.priceError')}</AppText>
      )}

      {isRange && (
        <>
          <AppText style={styles.label}>{t('quoteRequests.form.priceMax')}</AppText>
          <TextInput
            style={[...inputStyle, touched && rangeInvalid && styles.inputError]}
            value={priceMax}
            onChangeText={setPriceMax}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor="#9E9E9E"
          />
          {touched && rangeInvalid && (
            <AppText style={styles.errorText}>{t('quoteRequests.form.rangeError')}</AppText>
          )}
        </>
      )}

      <AppText style={styles.label}>{t('quoteRequests.form.duration')}</AppText>
      <TextInput
        style={inputStyle}
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor="#9E9E9E"
      />

      <AppText style={styles.label}>{t('quoteRequests.form.inclusions')}</AppText>
      <TextInput
        style={inputStyle}
        value={inclusions}
        onChangeText={setInclusions}
        placeholder={t('quoteRequests.form.inclusionsPlaceholder')}
        placeholderTextColor="#9E9E9E"
        textAlign={isRTL ? 'right' : 'left'}
      />

      <AppText style={styles.label}>{t('quoteRequests.form.note')}</AppText>
      <TextInput
        style={[...inputStyle, styles.textArea]}
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        textAlign={isRTL ? 'right' : 'left'}
      />

      <TouchableOpacity
        style={[styles.submit, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
      >
        <AppText style={styles.submitText}>
          {existing ? t('quoteRequests.form.update') : t('quoteRequests.form.submit')}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleActive: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  toggleText: { fontSize: 14, color: '#616161', fontWeight: '500' },
  toggleTextActive: { color: '#1565C0', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rtlInput: { writingDirection: 'rtl' },
  textArea: { minHeight: 80 },
  inputError: { borderColor: '#E53935' },
  errorText: { color: '#E53935', fontSize: 13, marginTop: 6 },
  submit: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
