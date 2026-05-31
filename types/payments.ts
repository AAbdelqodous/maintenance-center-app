// Spec 023 — center-facing payments (earnings / settlement / deposits / payouts / refunds).
// Field names mirror the backend `payment` domain records (CenterPaymentViews, CenterPayoutDtos)
// exactly — these are the wire contracts the HTTP-validated endpoints return. Money is KD, 3 dp.

export type CenterPaymentStatus =
  | 'PENDING' | 'HELD' | 'RELEASED' | 'PAID' | 'REFUNDED' | 'FAILED';

export type DepositMode = 'NONE' | 'FLAT' | 'PERCENT';
export type CancellationPolicy = 'REFUND' | 'RETAIN';
export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PayoutAccountStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

/** GET /centers/my/earnings — all amounts net of commission, scoped to the active center. */
export interface CenterBalances {
  held: number;
  available: number;
  paidOut: number;
  lifetimeGross: number;
  lifetimeCommission: number;
  lifetimeNet: number;
  currency: string;
}

export interface SettlementLine {
  labelEn: string;
  labelAr: string;
  amount: number;
  kind: string;
}

/** GET /bookings/{id}/settlement — one booking's gross − commission = net (owner view). */
export interface Settlement {
  bookingId: number;
  lines: SettlementLine[];
  gross: number;
  commissionRate: number;
  commissionAmount: number;
  refundedAmount: number;
  net: number;
  paymentStatus: CenterPaymentStatus;
  releaseEligible: boolean;
  disputed: boolean;
  autoReleaseAt?: string | null;
}

export interface RefundRequest {
  amount: number;
  target?: string;
  reason?: string;
}

export interface RefundResult {
  bookingId: number;
  paymentStatus: CenterPaymentStatus;
  refundedAmount: number;
  net: number;
}

export interface DepositConfig {
  mode: DepositMode;
  flatAmount?: number | null;
  percent?: number | null;
  appliesToServiceId?: number | null;
  cancellationPolicy?: CancellationPolicy | null;
}

export interface UpdateDepositConfigRequest {
  mode: DepositMode;
  flatAmount?: number | null;
  percent?: number | null;
  appliesToServiceId?: number | null;
  cancellationPolicy?: CancellationPolicy | null;
}

export interface PayoutAccount {
  id: number;
  iban: string;
  holderName: string;
  bankName?: string | null;
  status: PayoutAccountStatus;
}

export interface UpsertPayoutAccountRequest {
  iban: string;
  holderName: string;
}

export interface Payout {
  id: number;
  amount: number;
  accountId: number;
  status: PayoutStatus;
  reference?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
}

export interface RequestPayoutRequest {
  amount: number;
  accountId: number;
}

/** Minimum payout the backend enforces (CenterPayoutService). */
export const MIN_PAYOUT_KD = 5;
