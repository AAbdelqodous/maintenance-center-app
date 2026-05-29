# Data Model: Payments, Earnings & Payouts (Owner)

**Feature**: 023-payments-earnings-payouts
**Date**: 2026-05-29

> Frontend TypeScript shapes (`types/payments.ts`) + backend entities. All amounts **KD, 3 decimals**.
> The backend is authoritative for every amount and status; the client formats (`formatKD`) and reconciles.

---

## Frontend Types (`types/payments.ts`)

### `PaymentStatus`

Mirrors the customer-side escrow machine, read from the center's vantage.

| Value | Center meaning | Settlement bucket |
|-------|----------------|-------------------|
| `PENDING` | Customer has not paid yet | — |
| `HELD` | Customer paid into escrow; work not yet released | **Held** |
| `RELEASED` | Released (customer-confirmed or auto); settling | **Available** (net) |
| `PAID` | Fully settled | **Available** → counts toward payout |
| `REFUNDED` | Refunded to customer | reduces balances |
| `FAILED` | Capture failed; no funds | — |

### `CenterBalances`

Returned by `GET /centers/my/earnings`. Scoped to the active center.

| Field | Type | Notes |
|-------|------|-------|
| `held` | `number` | Sum of net held in escrow (work not released) |
| `available` | `number` | Net released, eligible to pay out |
| `paidOut` | `number` | Lifetime paid out to bank |
| `lifetimeGross` | `number` | Lifetime gross captured |
| `lifetimeCommission` | `number` | Lifetime platform commission |
| `lifetimeNet` | `number` | Lifetime net to center |
| `currency` | `'KWD'` | Constant |
| `from` / `to` | `string` (ISO date) | Filter window applied to lifetime aggregates |

### `SettlementLine`

| Field | Type | Notes |
|-------|------|-------|
| `labelEn` / `labelAr` | `string` | Bilingual line label |
| `amount` | `number` | KD; negative for discounts/loyalty |
| `kind` | `'SERVICE' \| 'PART' \| 'DIAGNOSTIC_FEE' \| 'FULFILLMENT_FEE' \| 'DISCOUNT' \| 'LOYALTY'` | Matches the customer invoice |

### `Settlement`

Returned by `GET /bookings/{id}/settlement`. The owner's view of one booking's money.

| Field | Type | Notes |
|-------|------|-------|
| `bookingId` | `number` | |
| `lines` | `SettlementLine[]` | Itemized invoice (same lines the customer paid) |
| `gross` | `number` | Authoritative gross total (KD) |
| `commissionRate` | `number` | **Snapshotted** at capture (e.g. `0.05`) |
| `commissionAmount` | `number` | KD |
| `refundedAmount` | `number` | KD (0 if none) |
| `net` | `number` | `gross − commissionAmount − refundedAmount` |
| `paymentStatus` | `PaymentStatus` | Current state |
| `releaseEligible` | `boolean` | True once work marked complete |
| `disputed` | `boolean` | True if customer raised a problem (release paused) |
| `autoReleaseAt` | `string?` (ISO) | When held funds auto-release |
| `depositApplied` | `number?` | Deposit credited against this invoice |

### `DepositConfig`

| Field | Type | Notes |
|-------|------|-------|
| `centerId` | `number` | |
| `mode` | `'NONE' \| 'FLAT' \| 'PERCENT'` | Deposit type |
| `flatAmount` | `number?` | KD, when `mode === FLAT` |
| `percent` | `number?` | 0–100, when `mode === PERCENT` |
| `appliesToServiceId` | `number?` | Null = center-wide default |
| `cancellationPolicy` | `'REFUND' \| 'RETAIN'` | On cancel, refund or keep the deposit |

### `PayoutAccount`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | |
| `iban` | `string` | Kuwaiti IBAN (validated format) |
| `holderName` | `string` | |
| `bankName` | `string?` | Derived/entered |
| `status` | `'UNVERIFIED' \| 'VERIFIED' \| 'REJECTED'` | |

### `Payout` / `PayoutStatus`

`PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED'`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | |
| `amount` | `number` | KD, from Available balance |
| `accountId` | `number` | Target `PayoutAccount` |
| `status` | `PayoutStatus` | |
| `reference` | `string?` | Bank/gateway reference |
| `requestedAt` | `string` (ISO) | |
| `completedAt` | `string?` (ISO) | |
| `failureReason` | `string?` | On `FAILED` |

### `RefundRequest`

| Field | Type | Notes |
|-------|------|-------|
| `bookingId` | `number` | |
| `amount` | `number` | KD; ≤ captured net |
| `target` | `'ORIGINAL' \| 'WALLET'` | Back to method or customer wallet |
| `reason` | `string` | Required |

### `FinancialStatement`

Returned by `GET /centers/my/financial-report` (also exportable CSV/PDF).

| Field | Type | Notes |
|-------|------|-------|
| `from` / `to` | `string` (ISO date) | Range |
| `rows` | `StatementRow[]` | Per-transaction: bookingId, gross, commission, net, refund, payout |
| `totals` | `{ gross; commission; net; refunds; payouts }` | Reconciles to the dashboard |

---

## Backend Entities (`service-center/.../payment`, `.../payout`)

### `Payment` (shared with customer 007)

`id`, `booking` (`@ManyToOne`), `customer` (`@ManyToOne User`), `center` (`@ManyToOne`),
`grossAmount` (DECIMAL(10,3)), `commissionRate` (DECIMAL(5,4) **snapshot**),
`commissionAmount` (DECIMAL(10,3)), `netAmount` (DECIMAL(10,3)),
`status` (`PaymentStatus` enum), `method`, `gatewayReference`, `idempotencyKey`,
`@CreatedDate capturedAt`, `releasedAt`, `@EntityListeners(AuditingEntityListener.class)`.

### `EscrowHold`

`id`, `payment` (`@OneToOne`), `heldAmount`, `heldAt`, `releaseEligibleAt`, `autoReleaseAt`,
`releasedAt`, `disputed` (boolean), `disputeReason`.

### `DepositConfig`

`id`, `center` (`@ManyToOne`), `mode` enum, `flatAmount`, `percent`, `service` (`@ManyToOne` nullable
= center-wide), `cancellationPolicy` enum, audit fields.

### `PayoutAccount`

`id`, `center` (`@ManyToOne`), `iban`, `holderName`, `bankName`, `status` enum, audit fields.

### `Payout`

`id`, `center` (`@ManyToOne`), `account` (`@ManyToOne PayoutAccount`), `amount`, `status` enum,
`reference`, `requestedBy` (`@ManyToOne User`), `@CreatedDate requestedAt`, `completedAt`,
`failureReason`.

### `Refund`

`id`, `payment` (`@ManyToOne`), `amount`, `target` enum, `reason`, `initiatedBy` (`@ManyToOne User`),
`status`, audit fields.

---

## State Transitions

### Settlement bucket flow (owner view)

```
customer pays → PaymentStatus HELD ───────────────► counts in CenterBalances.held
   owner marks work complete (UPDATE_WORK_STAGE)
        └─ sets escrow releaseEligible = true (customer side)
customer releases  OR  autoReleaseAt elapses
        └─ PaymentStatus RELEASED/PAID ───────────► moves to CenterBalances.available (net)
   owner requests payout (MANAGE_PAYOUTS)
        └─ Payout REQUESTED → PROCESSING → PAID ──► moves available → paidOut
                                         └─ FAILED → amount returns to available
customer dispute (HELD) ──────────────────────────► EscrowHold.disputed = true (release paused; stays held)
refund (owner or auto) ───────────────────────────► PaymentStatus REFUNDED; reduces net/available
```

### Mark-complete gate

```
booking work stage reaches terminal (workProgress completion)
   → POST /bookings/{id}/complete (UPDATE_WORK_STAGE)
   → backend sets releaseEligible = true + starts autoReleaseAt
   → customer 007 enables "Confirm & Release"
```

### Payout request gate

```
available >= minimumPayout  AND  payoutAccount.status === VERIFIED
   → POST /centers/my/payouts { amount, accountId }
   → Payout REQUESTED ; available -= amount
   else → blocked (minimum stated / account not verified)
```

---

## Validation Rules

- `net === gross − commissionAmount − refundedAmount` MUST hold; the client verifies with fils-safe
  `sumFils` and shows a mismatch warning rather than displaying an unverified net (R2/R7).
- `commissionRate`/`commissionAmount` are **read-only snapshots**; the client never recomputes them and
  never lets a rate change alter a past settlement (FR-010).
- **Mark Complete** is allowed only for users with `UPDATE_WORK_STAGE`; **payout/refund/account** actions
  only for `MANAGE_PAYOUTS`; **earnings/settlement/report views** only for `VIEW_REVENUE`
  (`GENERATE_REPORTS` for export). The client disables (defense-in-depth) and the backend enforces.
- Payout `amount` MUST be ≤ `available` and ≥ the platform minimum; account MUST be `VERIFIED`.
- Refund `amount` MUST be ≤ the captured net; a refund larger than captured is rejected.
- A `disputed` settlement MUST show release as paused and MUST NOT offer a force-release action (R8/FR-012).
- All balances/settlements/payouts are scoped to the **active center**; switching branch refetches (R6).
- IBAN is validated for Kuwaiti format client-side (cheap check) and verified server-side; raw IBAN is
  never logged (Principle VI).
- All amounts render via `formatKD` / `formatKDSigned` (3 decimals) — no inline `toFixed`/hardcoded `KD`.
