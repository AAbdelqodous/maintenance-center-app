import React, { useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetCenterStaffQuery } from '@/store/api/staffApi';
import { RoleBadge } from '@/components/staff/RoleBadge';
import type { CenterMembership } from '@/types/staff';

interface TechnicianPickerProps {
  visible: boolean;
  currentMembershipId: number | null;
  onSelect: (membershipId: number | null, reason?: string) => void;
  onClose: () => void;
}

export function TechnicianPicker({ visible, currentMembershipId, onSelect, onClose }: TechnicianPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [reason, setReason] = useState('');

  const { data, isLoading } = useGetCenterStaffQuery({ status: 'ACTIVE' });
  const technicians = (data?.content ?? []).filter((m: CenterMembership) => m.role === 'TECHNICIAN');

  const handleSelect = (membershipId: number | null) => {
    onSelect(membershipId, reason.trim() || undefined);
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavWrapper}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={[styles.sheetHeader, isRTL && styles.rowRtl]}>
              <Text style={styles.sheetTitle}>{t('bookings.assignTechnician')}</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
            ) : (
              <FlatList
                data={technicians}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[styles.row, currentMembershipId === null && styles.rowSelected, isRTL && styles.rowRtl]}
                    onPress={() => handleSelect(null)}
                  >
                    <Ionicons name="person-remove-outline" size={20} color="#9CA3AF" />
                    <Text style={[styles.unassignText, isRTL && styles.textRtl]}>{t('bookings.unassigned')}</Text>
                    {currentMembershipId === null && (
                      <Ionicons name="checkmark" size={20} color="#2196F3" style={styles.checkmark} />
                    )}
                  </TouchableOpacity>
                }
                renderItem={({ item }) => {
                  const isSelected = item.id === currentMembershipId;
                  return (
                    <TouchableOpacity
                      style={[styles.row, isSelected && styles.rowSelected, isRTL && styles.rowRtl]}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {item.userFirstname.charAt(0)}{item.userLastname.charAt(0)}
                        </Text>
                      </View>
                      <Text style={[styles.nameText, isRTL && styles.textRtl]}>
                        {item.userFirstname} {item.userLastname}
                      </Text>
                      <RoleBadge role={item.role} />
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#2196F3" style={styles.checkmark} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>{t('staff.emptyState')}</Text>
                }
                ListFooterComponent={
                  <View style={styles.reasonSection}>
                    <Text style={[styles.reasonLabel, isRTL && styles.textRtl]}>
                      {t('bookings.assignReason')}
                    </Text>
                    <TextInput
                      style={[styles.reasonInput, isRTL && styles.textRtl]}
                      value={reason}
                      onChangeText={setReason}
                      placeholder={t('bookings.assignReasonPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={2}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                }
              />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  loader: { marginVertical: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  rowSelected: { backgroundColor: '#EFF6FF' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  nameText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  unassignText: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  textRtl: { textAlign: 'right' },
  checkmark: { marginLeft: 'auto' },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 24,
  },
  reasonSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
