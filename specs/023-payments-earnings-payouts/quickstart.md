# Quickstart: Payments, Earnings & Payouts (Owner)

**Branch**: `023-payments-earnings-payouts`
**Date**: 2026-05-29

---

## Prerequisites

- Center app builds and runs (it is feature-complete for prior phases).
- `009-work-progress-quotes` in place — the **approved quote** is the settlement basis and the
  **work-progress completion** is the mark-complete signal (`research.md` R3).
- `011-center-staff-permissions` in place — finance is gated by `VIEW_REVENUE` / new `MANAGE_PAYOUTS`.
- Pairs with customer `007-payments-wallet-escrow` (same backend `payment` domain). For end-to-end
  escrow flows, the customer app pays/releases; this app receives/settles.

Verify the money helper exists (reused, not recreated):
```bash
cd ~/MaintenanceCenter/maintenance-center-app
grep -n "export function formatKD" lib/utils/pricing.ts   # must exist
```

---

## New packages

**None on the frontend.** All money formatting reuses `lib/utils/pricing.ts`. The gateway
(MyFatoorah/Tap) settlement + disbursement SDK is **backend-only**.

---

## Environment Setup

No new frontend env vars. Gateway/merchant credentials and the payout rail live on the **backend**,
never in the app.

```bash
# .env (already configured)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
```

---

## Backend Requirements

| Endpoint | Status | Required for |
|----------|--------|--------------|
| `GET /centers/my/earnings` | **Not yet implemented** | Earnings dashboard |
| `GET /bookings/{id}/settlement` | **Not yet implemented** | Settlement card |
| `POST /bookings/{id}/complete` | **Not yet implemented** | Mark Complete (release trigger) |
| `POST /bookings/{id}/refund` | **Not yet implemented** | Center refund |
| `GET|PUT /centers/my/deposit-config` | **Not yet implemented** | Deposit config |
| `GET|POST /centers/my/payout-account` | **Not yet implemented** | Bank account |
| `GET|POST /centers/my/payouts` | **Not yet implemented** | Payout history + request |
| `GET /centers/my/financial-report` | **Not yet implemented** | Reports + export |
| Gateway webhook (server↔gateway) | **Not yet implemented** | Makes balances authoritative |

See `contracts/payments-payouts-api.md` for exact shapes.

**Develop without the backend (stub):** return a fixed `CenterBalances`, a `Settlement` per booking
(flip `releaseEligible` false→true to exercise Mark Complete → customer release), a verified
`PayoutAccount`, and a `Payout` that advances `REQUESTED → PROCESSING → PAID`. Components degrade
gracefully when an endpoint is absent (empty balances, hidden settlement card).

---

## Running the App

```bash
# Web (fastest for the dashboard / settlement UI)
npx expo start --web

# Native
npx expo start   # press a (Android) / i (iOS)
```

---

## New files to create

```
types/payments.ts
store/api/paymentsApi.ts
store/api/payoutsApi.ts
components/earnings/BalanceCards.tsx
components/earnings/SettlementCard.tsx
components/earnings/PayoutRow.tsx
components/earnings/PayoutAccountForm.tsx
components/earnings/DepositConfigForm.tsx
app/(app)/(tabs)/profile/earnings/_layout.tsx
app/(app)/(tabs)/profile/earnings/index.tsx
app/(app)/(tabs)/profile/earnings/payouts.tsx
app/(app)/(tabs)/profile/earnings/payout-account.tsx
app/(app)/(tabs)/profile/earnings/reports.tsx
```

## Files to modify

```
lib/utils/pricing.ts                 # add formatKDSigned + sumFils
types/staff.ts                       # add 'MANAGE_PAYOUTS' to CenterPermission + ROLE_PERMISSIONS
store/index.ts                       # register paymentsApi + payoutsApi
app/(app)/(tabs)/profile/index.tsx   # "Earnings & Payouts" entry (gated by VIEW_REVENUE)
app/(app)/(tabs)/bookings/[id].tsx   # settlement card + Mark Complete + Refund
lib/i18n/locales/en.json             # earnings.* payouts.* deposit.* reports.*
lib/i18n/locales/ar.json             # mirror
app/(app)/(tabs)/_layout.tsx         # register profile/earnings routes (href:null, not a tab)
```

---

## Smoke test (happy paths)

1. **See net earnings on a paid booking** — open a booking the customer paid (stub `HELD`): settlement
   card shows itemized lines, commission (rate + amount), and **net**, with `gross − commission == net`.
2. **Mark Complete → customer can release** — on a `HELD` booking, tap **Mark Complete** (needs
   `UPDATE_WORK_STAGE`) → `releaseEligible` true + `autoReleaseAt` set; customer app's Confirm & Release
   becomes enabled. After release, the amount appears in **Available** on the dashboard.
3. **Configure a deposit** — set a 20% deposit on a service; a new customer booking shows/collects the
   deposit; the settlement shows `depositApplied` and the remainder.
4. **Register account + request payout** — register an IBAN (stub → VERIFIED) → with Available above the
   minimum, request a payout → it appears `REQUESTED` and Available decreases; advance the stub to
   `PAID` → it moves to **Paid-out**.
5. **Refund** — issue a partial refund on a settled booking → `refundedAmount` increases, `net`
   decreases, customer is notified (stub).
6. **Export a statement** — pick a date range → export CSV/PDF → totals reconcile to the dashboard.
7. **Permissions** — sign in as a RECEPTIONIST/TECHNICIAN (no `VIEW_REVENUE`) → the Earnings entry and
   settlement card are hidden; as ACCOUNTANT → finance visible and payouts allowed (`MANAGE_PAYOUTS`).

---

## Verification checklist

- [ ] All amounts via `formatKD` / `formatKDSigned` (3 decimals) — no inline `toFixed`, no hardcoded `KD`.
- [ ] `net == gross − commissionAmount − refundedAmount` verified fils-safe; mismatch shows a warning.
- [ ] Commission rate/amount are read-only snapshots; changing the platform rate (stub) does not alter a past settlement.
- [ ] **Mark Complete** hidden without `UPDATE_WORK_STAGE`; **payout/refund/account** hidden without `MANAGE_PAYOUTS`; **export** hidden without `GENERATE_REPORTS`.
- [ ] A `disputed` settlement shows release paused; no force-release action exists.
- [ ] Payout blocked below the minimum or with an unverified account, with a clear message.
- [ ] Refund > captured net is rejected.
- [ ] Multi-branch: switching `activeCenterId` refetches balances/payouts; no cross-branch leakage.
- [ ] RTL spot-check: KD placement, balance cards, settlement rows, payout list, statement.
- [ ] IBAN never logged; no gateway payloads in logs (Principle VI).
