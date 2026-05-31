// Spec 023 — dependency-free in-memory mock for the center payments domain (earnings, settlement,
// deposits, payouts, refunds). Used only when EXPO_PUBLIC_USE_MOCKS=true (see centerPaymentsApi).
// No MSW / no new deps — mirrors the quoteRequestsMock approach (the center app has no jest harness).
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type {
  CenterBalances,
  DepositConfig,
  Payout,
  PayoutAccount,
  RefundRequest,
  RequestPayoutRequest,
  Settlement,
  UpdateDepositConfigRequest,
  UpsertPayoutAccountRequest,
} from '@/types/payments';
import { MIN_PAYOUT_KD } from '@/types/payments';

const COMMISSION_RATE = 0.05;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ── Mutable in-memory state ───────────────────────────────────────────────
let balances: CenterBalances = {
  held: 27.075,
  available: 52.0,
  paidOut: 100.0,
  lifetimeGross: 188.5,
  lifetimeCommission: 9.425,
  lifetimeNet: 179.075,
  currency: 'KWD',
};

// Two settled-ish bookings to demo the per-booking settlement + refund flow.
const settlements: Record<number, Settlement> = {
  5001: {
    bookingId: 5001,
    lines: [
      { labelEn: 'AC repair', labelAr: 'إصلاح مكيف', amount: 18.0, kind: 'SERVICE' },
      { labelEn: 'Labor', labelAr: 'أجور عمل', amount: 10.5, kind: 'SERVICE' },
    ],
    gross: 28.5,
    commissionRate: COMMISSION_RATE,
    commissionAmount: 1.425,
    refundedAmount: 0,
    net: 27.075,
    paymentStatus: 'HELD',
    releaseEligible: false,
    disputed: false,
    autoReleaseAt: new Date(Date.now() + 60 * 3600_000).toISOString(),
  },
  5002: {
    bookingId: 5002,
    lines: [{ labelEn: 'Brake pads + fitting', labelAr: 'تيل فرامل وتركيب', amount: 40.0, kind: 'SERVICE' }],
    gross: 40.0,
    commissionRate: COMMISSION_RATE,
    commissionAmount: 2.0,
    refundedAmount: 0,
    net: 38.0,
    paymentStatus: 'RELEASED',
    releaseEligible: true,
    disputed: false,
    autoReleaseAt: null,
  },
};

let depositConfig: DepositConfig = {
  mode: 'NONE',
  flatAmount: null,
  percent: null,
  appliesToServiceId: null,
  cancellationPolicy: 'REFUND',
};

let payoutAccount: PayoutAccount | null = null;
let nextAccountId = 700;

const payouts: Payout[] = [
  {
    id: 9001,
    amount: 100.0,
    accountId: 699,
    status: 'PAID',
    reference: 'PO-2026-0412',
    requestedAt: new Date(Date.now() - 12 * 24 * 3600_000).toISOString(),
    completedAt: new Date(Date.now() - 10 * 24 * 3600_000).toISOString(),
    failureReason: null,
  },
];
let nextPayoutId = 9002;

// ── Result helpers ────────────────────────────────────────────────────────
type Result = { data: unknown } | { error: FetchBaseQueryError };
const ok = (data: unknown): Result => ({ data });
const fail = (status: number, message?: string): Result => ({
  error: { status, data: message ? { businessErrorDescription: message } : undefined } as FetchBaseQueryError,
});

function handle(url: string, method: string, body: any): Result {
  // GET /centers/my/earnings
  if (url === 'centers/my/earnings' && method === 'GET') {
    return ok(balances);
  }

  // GET|PUT /centers/my/deposit-config
  if (url === 'centers/my/deposit-config') {
    if (method === 'PUT') {
      const req = body as UpdateDepositConfigRequest;
      depositConfig = {
        mode: req.mode,
        flatAmount: req.mode === 'FLAT' ? req.flatAmount ?? null : null,
        percent: req.mode === 'PERCENT' ? req.percent ?? null : null,
        appliesToServiceId: req.appliesToServiceId ?? null,
        cancellationPolicy: req.cancellationPolicy ?? depositConfig.cancellationPolicy ?? 'REFUND',
      };
      return ok(depositConfig);
    }
    return ok(depositConfig);
  }

  // GET|POST /centers/my/payout-account
  if (url === 'centers/my/payout-account') {
    if (method === 'POST') {
      const req = body as UpsertPayoutAccountRequest;
      if (!req?.iban || !req?.holderName) return fail(400, 'IBAN and holder name are required');
      payoutAccount = {
        id: payoutAccount?.id ?? nextAccountId++,
        iban: req.iban,
        holderName: req.holderName,
        bankName: 'Demo Bank',
        status: 'VERIFIED', // stub auto-verifies
      };
      return ok(payoutAccount);
    }
    // GET — backend returns null/404 when unset; surface 404 so the query data is undefined.
    return payoutAccount ? ok(payoutAccount) : fail(404);
  }

  // GET|POST /centers/my/payouts
  if (url === 'centers/my/payouts') {
    if (method === 'POST') {
      const req = body as RequestPayoutRequest;
      if (!payoutAccount) return fail(409, 'Add a payout account first');
      if (req.amount < MIN_PAYOUT_KD) return fail(422, `Minimum payout is ${MIN_PAYOUT_KD.toFixed(3)} KD`);
      if (req.amount > balances.available) return fail(422, 'Amount exceeds available balance');
      const payout: Payout = {
        id: nextPayoutId++,
        amount: round3(req.amount),
        accountId: payoutAccount.id,
        status: 'REQUESTED',
        reference: null,
        requestedAt: new Date().toISOString(),
        completedAt: null,
        failureReason: null,
      };
      payouts.unshift(payout);
      balances = {
        ...balances,
        available: round3(balances.available - req.amount),
        paidOut: round3(balances.paidOut + req.amount),
      };
      return ok(payout);
    }
    return ok([...payouts]);
  }

  // GET /bookings/{id}/settlement
  const settlementMatch = url.match(/^bookings\/(\d+)\/settlement$/);
  if (settlementMatch && method === 'GET') {
    const s = settlements[Number(settlementMatch[1])];
    return s ? ok(s) : fail(404);
  }

  // POST /bookings/{id}/refund
  const refundMatch = url.match(/^bookings\/(\d+)\/refund$/);
  if (refundMatch && method === 'POST') {
    const s = settlements[Number(refundMatch[1])];
    if (!s) return fail(404);
    const req = body as RefundRequest;
    const alreadyRefunded = s.refundedAmount;
    if (req.amount <= 0) return fail(422, 'Refund must be positive');
    if (alreadyRefunded + req.amount > s.gross) return fail(422, 'Refund exceeds captured amount');
    const refundedAmount = round3(alreadyRefunded + req.amount);
    const fullyRefunded = refundedAmount >= s.gross;
    const net = round3(s.gross - s.commissionAmount - refundedAmount);
    s.refundedAmount = refundedAmount;
    s.net = net;
    s.paymentStatus = fullyRefunded ? 'REFUNDED' : s.paymentStatus;
    // Reflect the give-back in the earnings dashboard.
    balances = { ...balances, available: round3(balances.available - req.amount) };
    return ok({ bookingId: s.bookingId, paymentStatus: s.paymentStatus, refundedAmount, net });
  }

  return fail(404);
}

export const centerPaymentsMockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args) => {
    const url = typeof args === 'string' ? args : args.url;
    const method = (typeof args === 'string' ? 'GET' : args.method ?? 'GET').toUpperCase();
    const body = typeof args === 'string' ? undefined : args.body;
    await new Promise((r) => setTimeout(r, 250)); // visible loading states for the demo
    return handle(url.replace(/^\//, ''), method, body) as
      | { data: unknown }
      | { error: FetchBaseQueryError };
  };
