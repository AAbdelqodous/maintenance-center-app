import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CenterRole } from '@/types/staff';

interface RoleBadgeProps {
  role: CenterRole;
}

const ROLE_COLORS: Record<CenterRole, { bg: string; text: string }> = {
  OWNER: { bg: '#FEF3C7', text: '#92400E' },
  BRANCH_MANAGER: { bg: '#DBEAFE', text: '#1E40AF' },
  RECEPTIONIST: { bg: '#D1FAE5', text: '#065F46' },
  TECHNICIAN: { bg: '#FFEDD5', text: '#9A3412' },
  ACCOUNTANT: { bg: '#EDE9FE', text: '#5B21B6' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const { t, i18n } = useTranslation();
  const colors = ROLE_COLORS[role];
  const isArabic = i18n.language === 'ar';

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 12,
        },
      ]}
    >
      <Text
        style={[
          {
            color: colors.text,
            fontSize: 12,
            fontWeight: '600',
          },
          isArabic && { fontFamily: 'Cairo' },
        ]}
      >
        {t(`staff.roles.${role}`)}
      </Text>
    </View>
  );
}
