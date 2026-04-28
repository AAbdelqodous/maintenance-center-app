import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MembershipStatus } from '@/types/staff';

interface MembershipStatusBadgeProps {
  status: MembershipStatus;
}

const STATUS_COLORS: Record<MembershipStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  INVITED: { bg: '#DBEAFE', text: '#1E40AF' },
  SUSPENDED: { bg: '#FEE2E2', text: '#991B1B' },
  REMOVED: { bg: '#F3F4F6', text: '#4B5563' },
  INVITATION_EXPIRED: { bg: '#FEF3C7', text: '#92400E' },
  INVITATION_DECLINED: { bg: '#F3F4F6', text: '#6B7280' },
};

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps) {
  const { t, i18n } = useTranslation();
  const colors = STATUS_COLORS[status];
  const isArabic = i18n.language === 'ar';

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        },
      ]}
    >
      <Text
        style={[
          {
            color: colors.text,
            fontSize: 11,
            fontWeight: '500',
          },
          isArabic && { fontFamily: 'Cairo' },
        ]}
      >
        {t(`staff.statuses.${status}`)}
      </Text>
    </View>
  );
}
