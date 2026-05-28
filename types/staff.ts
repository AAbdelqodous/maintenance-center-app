export type CenterRole =
  | 'OWNER'
  | 'BRANCH_MANAGER'
  | 'RECEPTIONIST'
  | 'TECHNICIAN'
  | 'ACCOUNTANT';

export type MembershipStatus =
  | 'INVITED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_DECLINED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REMOVED';

export type CenterPermission =
  | 'MANAGE_BOOKINGS'
  | 'CLAIM_BOOKING'
  | 'ASSIGN_TECHNICIAN_MANUAL'
  | 'VIEW_BOOKING_BASIC'
  | 'VIEW_BOOKINGS_READONLY'
  | 'UPDATE_WORK_STAGE'
  | 'UPLOAD_PROGRESS_MEDIA'
  | 'MANAGE_CHAT'
  | 'RESPOND_REVIEWS'
  | 'EDIT_CENTER_PROFILE'
  | 'MANAGE_NON_MANAGER_STAFF'
  | 'MANAGE_ALL_STAFF'
  | 'VIEW_REVENUE'
  | 'VIEW_PRICE_LIST'
  | 'MANAGE_PRICING'
  | 'MANAGE_OFFERS'
  | 'VIEW_REPORTS'
  | 'GENERATE_REPORTS'
  | 'VIEW_CALENDAR'
  | 'VIEW_ASSIGNED_BOOKINGS'
  // Spec 022 — re-route. ANY is held by OWNER/BRANCH_MANAGER (re-route any booking at
  // the center); ASSIGNED is held by TECHNICIAN (re-route only bookings assigned to them).
  | 'REROUTE_BOOKING_ANY'
  | 'REROUTE_BOOKING_ASSIGNED';

export interface CenterMembership {
  id: number;
  userId: number;
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  role: CenterRole;
  roleAr: string;
  roleEn: string;
  status: MembershipStatus;
  invitedByName?: string;
  activatedAt?: string;
  centerId: number;
}

export interface MembershipSummary {
  // Optional for back-compat with older backend builds; spec 022's reroute flow needs it
  // to determine whether the current user is the booking's assigned technician.
  id?: number;
  centerId: number;
  centerNameAr: string;
  centerNameEn: string;
  centerLogoUrl?: string;
  role: CenterRole;
  roleAr: string;
  roleEn: string;
  status: MembershipStatus;
}

export interface InvitationDetails {
  id: number;
  centerNameAr: string;
  centerNameEn: string;
  centerLogoUrl?: string;
  inviterName: string;
  targetEmail: string;
  targetRole: CenterRole;
  roleAr: string;
  roleEn: string;
  expiresAt: string;
  status: 'PENDING' | 'REDEEMED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
}

export interface InviteStaffRequest {
  targetEmail: string;
  targetRole: CenterRole;
}

export const ROLE_PERMISSIONS: Record<CenterRole, CenterPermission[]> = {
  OWNER: [
    'MANAGE_BOOKINGS', 'ASSIGN_TECHNICIAN_MANUAL', 'VIEW_BOOKING_BASIC',
    'VIEW_BOOKINGS_READONLY', 'UPDATE_WORK_STAGE', 'UPLOAD_PROGRESS_MEDIA',
    'MANAGE_CHAT', 'RESPOND_REVIEWS', 'EDIT_CENTER_PROFILE',
    'MANAGE_NON_MANAGER_STAFF', 'MANAGE_ALL_STAFF',
    'VIEW_REVENUE', 'VIEW_PRICE_LIST', 'MANAGE_PRICING', 'MANAGE_OFFERS',
    'VIEW_REPORTS', 'GENERATE_REPORTS', 'VIEW_CALENDAR', 'REROUTE_BOOKING_ANY',
  ],
  BRANCH_MANAGER: [
    'MANAGE_BOOKINGS', 'ASSIGN_TECHNICIAN_MANUAL', 'MANAGE_CHAT', 'RESPOND_REVIEWS',
    'EDIT_CENTER_PROFILE', 'MANAGE_NON_MANAGER_STAFF', 'VIEW_REVENUE', 'VIEW_REPORTS',
    'MANAGE_PRICING', 'MANAGE_OFFERS', 'REROUTE_BOOKING_ANY',
  ],
  RECEPTIONIST: [
    'MANAGE_BOOKINGS', 'MANAGE_CHAT', 'VIEW_CALENDAR', 'VIEW_BOOKING_BASIC', 'VIEW_PRICE_LIST',
    'MANAGE_PRICING', 'MANAGE_OFFERS',
  ],
  TECHNICIAN: [
    'CLAIM_BOOKING', 'VIEW_ASSIGNED_BOOKINGS', 'UPDATE_WORK_STAGE', 'UPLOAD_PROGRESS_MEDIA',
    'REROUTE_BOOKING_ASSIGNED',
  ],
  ACCOUNTANT: [
    'VIEW_REVENUE', 'VIEW_BOOKINGS_READONLY', 'GENERATE_REPORTS',
  ],
};
