import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetDepartmentsQuery } from '@/store/api/departmentsApi';
import { useRerouteBookingMutation } from '@/store/api/bookingsApi';
import { REROUTE_REASONS, type RerouteReason, type RerouteErrorCode } from '@/types/reroute';

interface Props {
  visible: boolean;
  bookingId: number;
  currentDepartmentId: number | undefined;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Spec 022 §New i18n keys §Re-route errors — wire code → i18n key. */
const REROUTE_ERROR_KEY_MAP: Record<RerouteErrorCode, string> = {
  CANNOT_REROUTE_INTO_DIAGNOSTIC: 'reroute.errors.cannotIntoDiagnostic',
  NO_OP_REROUTE: 'reroute.errors.noOp',
  INVALID_BOOKING_STATUS_FOR_REROUTE: 'reroute.errors.terminalStatus',
  REROUTE_CONFLICT: 'reroute.errors.conflict',
  FORBIDDEN_REROUTE: 'reroute.errors.forbidden',
  BOOKING_NOT_FOUND: 'reroute.errors.forbidden',
  DEPARTMENT_NOT_FOUND: 'reroute.errors.noOp',
  INVALID_REROUTE_REASON: 'reroute.errors.noOp',
  NOTE_TOO_LONG: 'reroute.errors.noOp',
};

export function RerouteForm({ visible, bookingId, currentDepartmentId, onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [targetId, setTargetId] = useState<number | null>(null);
  const [reason, setReason] = useState<RerouteReason | null>(null);
  const [note, setNote] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const { data: departments = [], isLoading: deptsLoading } = useGetDepartmentsQuery(undefined, {
    skip: !visible,
  });
  const [reroute, { isLoading: isSubmitting }] = useRerouteBookingMutation();

  // Target dept dropdown excludes the current dept AND any diagnostic dept (spec 022 FR-DR-017
  // — re-routing INTO a diagnostic dept is forbidden; the backend enforces it, but hiding the
  // option in the UI avoids dead-end taps).
  const targetOptions = useMemo(
    () => departments.filter(
      (d) => d.isActive
        && d.id !== currentDepartmentId
        && !d.isDiagnostic,
    ),
    [departments, currentDepartmentId],
  );

  const reset = () => {
    setTargetId(null);
    setReason(null);
    setNote('');
    setErrorKey(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!targetId || !reason) return;
    setErrorKey(null);
    try {
      await reroute({
        id: bookingId,
        body: { targetDepartmentId: targetId, reason, note: note.trim() || undefined },
      }).unwrap();
      reset();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      const code = err?.data?.error as RerouteErrorCode | undefined;
      setErrorKey(code ? REROUTE_ERROR_KEY_MAP[code] : null);
    }
  };

  const canSubmit = targetId !== null && reason !== null && !isSubmitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={[styles.header, isRTL && styles.rowRtl]}>
            <Text style={styles.title}>{t('reroute.action')}</Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {errorKey && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{t(errorKey)}</Text>
              </View>
            )}

            <Text style={[styles.label, isRTL && styles.textRtl]}>{t('reroute.targetDept')}</Text>
            {deptsLoading ? (
              <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.options}>
                {targetOptions.map((d) => {
                  const selected = d.id === targetId;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setTargetId(d.id)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {i18n.language === 'ar' ? d.nameAr : d.nameEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {targetOptions.length === 0 && (
                  <Text style={styles.emptyHint}>{t('reroute.errors.noOp')}</Text>
                )}
              </View>
            )}

            <Text style={[styles.label, isRTL && styles.textRtl]}>{t('reroute.reason.label')}</Text>
            <View style={styles.options}>
              {REROUTE_REASONS.map((r) => {
                const selected = r === reason;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setReason(r)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {t(`reroute.reason.${r}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, isRTL && styles.textRtl]}>{t('reroute.notePlaceholder')}</Text>
            <TextInput
              style={[styles.noteInput, isRTL && styles.textRtl]}
              value={note}
              onChangeText={setNote}
              placeholder={t('reroute.notePlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TouchableOpacity
              style={[styles.submit, !canSubmit && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>{t('reroute.submit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    padding: 16,
    gap: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  textRtl: {
    textAlign: 'right',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  option: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
