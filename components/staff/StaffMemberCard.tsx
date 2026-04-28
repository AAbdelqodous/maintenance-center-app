import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CenterMembership } from '@/types/staff';
import { RoleBadge } from './RoleBadge';
import { MembershipStatusBadge } from './MembershipStatusBadge';
import { Ionicons } from '@expo/vector-icons';

interface StaffMemberCardProps {
  membership: CenterMembership;
  onPress: () => void;
}

export function StaffMemberCard({ membership, onPress }: StaffMemberCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <View style={styles.leftSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(membership.userFirstname, membership.userLastname)}
            </Text>
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.name}>
              {membership.userFirstname} {membership.userLastname}
            </Text>
            <Text style={styles.email}>{membership.userEmail}</Text>
          </View>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={24}
          color="#9CA3AF"
        />
      </View>
      <View style={[styles.row, isRTL && styles.rowRtl, styles.badgesRow]}>
        <RoleBadge role={membership.role} />
        <MembershipStatusBadge status={membership.status} />
      </View>
      {membership.invitedByName && (
        <View style={[styles.row, isRTL && styles.rowRtl]}>
          <Text style={styles.label}>
            {t('staff.member.invitedBy', { name: membership.invitedByName })}
          </Text>
        </View>
      )}
      {membership.activatedAt && (
        <View style={[styles.row, isRTL && styles.rowRtl]}>
          <Text style={styles.label}>
            {t('staff.member.since', { date: formatDate(membership.activatedAt) })}
          </Text>
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
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#666666',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  badgesRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#666666',
  },
});
