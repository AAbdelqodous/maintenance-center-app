import type { BookingStatus } from '@/store/api/bookingsApi';
import type { CenterRole } from '@/types/staff';

export type StaffStatus = 'AVAILABLE' | 'ON_TASK' | 'OVERLOADED' | 'OFFLINE';

export type PerformanceTier =
  | 'TOP_PERFORMER'
  | 'STRONG'
  | 'ON_TRACK'
  | 'NEEDS_ATTENTION';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

export interface ActiveBookingSummary {
  bookingId: number;
  customerName: string;
  serviceType: string;
  bookingDate: string;
  bookingTime: string;
  bookingStatus: BookingStatus;
}

export interface StaffPerformanceCard {
  membershipId: number;
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: CenterRole;

  status: StaffStatus;
  activeBookingsCount: number;

  // Performance fields — absent for TECHNICIAN-role viewers (ethics guardrail)
  tier?: PerformanceTier;
  isNew?: boolean;
  avgRatingThisMonth?: number | null;
  avgCompletionTimeMinutes?: number | null;
  completedThisMonth?: number;
  onTimeRateThisMonth?: number | null;

  // Trend fields — absent for TECHNICIAN-role viewers
  trendDirection?: TrendDirection;
  compositeScore?: number;
  previousMonthScore?: number;

  // Overload flag — absent for TECHNICIAN-role viewers
  isOverloaded?: boolean;

  // Active bookings list — present only for OWNER / BRANCH_MANAGER
  activeBookings?: ActiveBookingSummary[];
}

export interface PerformanceTierConfig {
  topPerformerMinRating: number;
  topPerformerMinOnTime: number;
  topPerformerMinVolume: number;
  strongMinRating: number;
  strongMinOnTime: number;
  needsAttentionMaxRating: number;
  needsAttentionMinDecline: number;
  needsAttentionMaxOnTime: number;
  trendThreshold: number;
  overloadMultiplier: number;
}

export interface StaffPerformanceBoardResponse {
  staff: StaffPerformanceCard[];
  branchAverageActiveLoad: number;
  config: PerformanceTierConfig;
  generatedAt: string;
}

export interface StaffMonthlyMetrics {
  year: number;
  month: number;
  completedBookings: number;
  avgRating: number | null;
  avgCompletionTimeMinutes: number | null;
  onTimeRate: number | null;
  complaintCount: number;
}

export interface StaffHistoryResponse {
  membershipId: number;
  firstName: string;
  lastName: string;
  months: StaffMonthlyMetrics[];
  recentBookings: ActiveBookingSummary[];
}

export interface RebalanceSuggestion {
  overloadedStaff: StaffPerformanceCard[];
  eligibleRecipients: StaffPerformanceCard[];
}

export function sortBoard(staff: StaffPerformanceCard[]): StaffPerformanceCard[] {
  return [...staff].sort((a, b) => {
    const aOv = a.isOverloaded ? 0 : 1;
    const bOv = b.isOverloaded ? 0 : 1;
    if (aOv !== bOv) return aOv - bOv;

    const aNa = a.tier === 'NEEDS_ATTENTION' ? 0 : 1;
    const bNa = b.tier === 'NEEDS_ATTENTION' ? 0 : 1;
    if (aNa !== bNa) return aNa - bNa;

    if (b.activeBookingsCount !== a.activeBookingsCount) {
      return b.activeBookingsCount - a.activeBookingsCount;
    }
    return (a.lastName ?? '').localeCompare(b.lastName ?? '');
  });
}
