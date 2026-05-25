import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Department } from '@/types/department';

interface DepartmentCardProps {
  department: Department;
  onPress?: () => void;
}

export function DepartmentCard({ department, onPress }: DepartmentCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const name = i18n.language === 'ar' ? department.nameAr : department.nameEn;

  const memberLabel = t('departments.memberCount_other', { count: department.memberCount });

  return (
    <TouchableOpacity
      style={[styles.container, !department.isActive && styles.containerInactive]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !department.isActive && styles.nameInactive]}>{name}</Text>
          {!department.isActive && (
            <View style={styles.deactivatedBadge}>
              <Text style={styles.deactivatedText}>{t('departments.deactivated')}</Text>
            </View>
          )}
        </View>
        <View style={styles.memberBadge}>
          <Text style={styles.memberText}>{memberLabel}</Text>
        </View>
      </View>

      {department.categoryIds.length > 0 && (
        <View style={[styles.chips, isRTL && styles.chipsRtl]}>
          {department.categoryIds.map((id) => (
            <View key={id} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>#{id}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  containerInactive: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  nameInactive: {
    color: '#9CA3AF',
  },
  deactivatedBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deactivatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  memberBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  memberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipsRtl: {
    flexDirection: 'row-reverse',
  },
  categoryChip: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '500',
  },
});
