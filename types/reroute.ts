import type { Booking } from '@/store/api/bookingsApi';

export type RerouteReason =
  | 'WRONG_DIAGNOSIS'
  | 'OUT_OF_SCOPE'
  | 'SPECIALIST_NEEDED'
  | 'STAFF_UNAVAILABLE'
  | 'CUSTOMER_REQUEST'
  | 'OTHER';

export interface RerouteRequest {
  targetDepartmentId: number;
  reason: RerouteReason;
  note?: string;
}

export interface RerouteAudit {
  id: number;
  bookingId: number;
  fromDepartmentId: number;
  fromDepartmentNameAr: string;
  fromDepartmentNameEn: string;
  toDepartmentId: number;
  toDepartmentNameAr: string;
  toDepartmentNameEn: string;
  fromMembershipId: number | null;
  fromMembershipDisplayName: string | null;
  triggeredByUserId: number;
  triggeredByUserDisplayName: string;
  reason: RerouteReason;
  note: string | null;
  /** True only on the audit row that recorded the move OUT of the diagnostic department. */
  isInitialDiagnosticClassification: boolean;
  createdAt: string;
}

export interface RerouteResponse {
  audit: RerouteAudit;
  updatedBooking: Booking;
}

/** Wire-contract error codes returned in `err.data.error` by POST /bookings/{id}/reroute. */
export type RerouteErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'FORBIDDEN_REROUTE'
  | 'DEPARTMENT_NOT_FOUND'
  | 'CANNOT_REROUTE_INTO_DIAGNOSTIC'
  | 'NO_OP_REROUTE'
  | 'INVALID_BOOKING_STATUS_FOR_REROUTE'
  | 'REROUTE_CONFLICT'
  | 'INVALID_REROUTE_REASON'
  | 'NOTE_TOO_LONG';

export const REROUTE_REASONS: RerouteReason[] = [
  'WRONG_DIAGNOSIS',
  'OUT_OF_SCOPE',
  'SPECIALIST_NEEDED',
  'STAFF_UNAVAILABLE',
  'CUSTOMER_REQUEST',
  'OTHER',
];
