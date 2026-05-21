import React from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetCenterStaffQuery } from '@/store/api/staffApi';
import { RoleBadge } from '@/components/staff/RoleBadge';
import type { CenterMembership } from '@/types/staff';

interface TechnicianPickerProps {
  visible: boolean;
  currentMembershipId: number | null;
  onSelect: (membershipId: number | null) => void;
  onClose: () => void;
}

export function TechnicianPicker({ visible, currentMembershipId, onSelect, onClose }: TechnicianPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data, isLoading } = useGetCenterStaffQuery({ status: 'ACTIVE' });
  const technicians = (data?.content ?? []).filter((m: CenterMembership) => m.role === 'TECHNICIAN');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={[styles.sheetHeader, isRTL && styles.rowRtl]}>
            <Text style={styles.sheetTitle}>{t('bookings.assignTechnician')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
          ) : (
            <FlatList
              data={technicians}
              keyExtractor={(item) => String(item.id)}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.row, currentMembershipId === null && styles.rowSelected, isRTL && styles.rowRtl]}
                  onPress={() => { onSelect(null); onClose(); }}
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
                    onPress={() => { onSelect(item.id); onClose(); }}
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
            />
          )}
        </View>
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
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '70%',
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
});
