import React, { ReactNode } from 'react';
import { useAppSelector } from '@/store';
import type { CenterPermission } from '@/types/staff';

interface PermissionGateProps {
  permission: CenterPermission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const hasPermission = activePermissions.includes(permission);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
