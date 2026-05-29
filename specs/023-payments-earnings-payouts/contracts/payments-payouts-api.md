# API Contracts: Payments, Earnings & Payouts (Owner)

**Feature**: 023-payments-earnings-payouts
**Date**: 2026-05-29
**Backend base**: `GET|POST|PUT /api/v1/...`
**Auth**: All endpoints require `Authorization: Bearer <jwt>` and are **center-scoped** to the active center.
**Money**: All amounts are **KD (`KWD`), 3 decimal places**.

> **Status: BACKEND NOT YET IMPLEMENTED.** New `payment` (shared with customer 007) + `payout`
> packages. The gateway (MyFatoorah / Tap) settlement + disbursement adapter and webhook are part of
> this. Frontend builds against an MSW/stub of these shapes. Permission column = required
> `CenterPermission` (see `types/staff.ts`).

---

## GET /centers/my/earnings

**Consumer**: `profile/earnings/index.tsx` · **Permission**: `VIEW_REVENUE`
**Purpose**: Balances by bucket + lifetime aggregates for the active center.

### Request
```
GET /api/v1/centers/my/earnings?from=2026-05-01&to=2026-05-29
Authorization: Bearer <jwt>
```

### Response — 200 OK
```json
{
  "held": 124.500,
  "available": 380.250,
  "paidOut": 1500.000,
  "lifetimeGross": 2210.750,
  "lifetimeCommission": 110.500,
  "lifetimeNet": 2100.250,
  "currency": "KWD",
  "from": "2026-05-01",
  "to": "2026-05-29"
}
```

### Errors
| Status | Client behavior |
|--------|----------------|
| 401 | Redux middleware → auth |
| 403 | Lacks `VIEW_REVENUE` → hide Earnings entry / show no-access state |
| 5xx / network | Cached data if present, else error + retry |

---

## GET /bookings/{id}/settlement

**Consumer**: `SettlementCard` on `bookings/[id].tsx` · **Permission**: `VIEW_REVENUE`
**Purpose**: The owner's money view of one booking (itemized, commission, net, status).

### Response — 200 OK
```json
{
  "bookingId": 123,
  "lines": [
    { "labelEn": "Brake pad replacement", "labelAr": "تغيير تيل الفرامل", "amount": 18.000, "kind": "SERVICE" },
    { "labelEn": "Brake pads (front)",     "labelAr": "تيل فرامل أمامي",   "amount": 12.500, "kind": "PART" },
    { "labelEn": "Diagnostic fee",          "labelAr": "رسوم الفحص",        "amount":  5.000, "kind": "DIAGNOSTIC_FEE" },
    { "labelEn": "Loyalty discount",        "labelAr": "خصم الولاء",        "amount": -2.000, "kind": "LOYALTY" }
  ],
  "gross": 33.500,
  "commissionRate": 0.05,
  "commissionAmount": 1.675,
  "refundedAmount": 0.000,
  "net": 31.825,
  "paymentStatus": "HELD",
  "releaseEligible": false,
  "disputed": false,
  "autoReleaseAt": null,
  "depositApplied": 0.000
}
```
**Reconcile rule**: client verifies `net == gross − commissionAmount − refundedAmount` (fils-safe) else shows mismatch.

### Errors
| Status | Client behavior |
|--------|----------------|
| 401 | → auth |
| 403 | Lacks `VIEW_REVENUE` → hide settlement card |
| 404 | No settlement yet (unpaid) → show "not paid yet" |
| 5xx / network | Error + retry |

---

## POST /bookings/{id}/complete

**Consumer**: **Mark Complete** on `bookings/[id].tsx` · **Permission**: `UPDATE_WORK_STAGE`
**Purpose**: Mark work complete → sets customer-side `releaseEligible = true` + starts auto-release (R3).

### Request
```
POST /api/v1/bookings/{id}/complete
Body: {}
```
### Response — 200 OK
```json
{ "bookingId": 123, "releaseEligible": true, "autoReleaseAt": "2026-06-01T12:00:00Z" }
```
> Integrates with work-progress completion — the same terminal stage. Invalidates `Settlement`.

### Errors
| Status | Client behavior |
|--------|----------------|
| 403 | Lacks `UPDATE_WORK_STAGE` → action hidden |
| 409 | Already complete / not in a completable state → refetch |
| 5xx / network | Error + retry |

---

## POST /bookings/{id}/refund

**Consumer**: **Refund** on `bookings/[id].tsx` · **Permission**: `MANAGE_PAYOUTS`
**Purpose**: Center-initiated full/partial refund within policy.

### Request
```json
{ "amount": 5.000, "target": "ORIGINAL", "reason": "Customer overcharged for part" }
```
### Response — 200 OK
```json
{ "bookingId": 123, "paymentStatus": "REFUNDED", "refundedAmount": 5.000, "net": 26.825 }
```
**Rule**: `amount` ≤ captured net; larger is rejected (409/400).

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Amount > net / invalid → inline message |
| 403 | Lacks `MANAGE_PAYOUTS` → action hidden |
| 409 | Not refundable in current state → refetch |
| 5xx / network | Error + retry |

---

## GET /centers/my/deposit-config  ·  PUT /centers/my/deposit-config

**Consumer**: `DepositConfigForm` (under earnings or `profile/pricing`) · **Permission**: `MANAGE_PRICING`
**Purpose**: Read/update the center's deposit policy (cut no-shows).

### GET Response — 200 OK
```json
{ "centerId": 10, "mode": "PERCENT", "flatAmount": null, "percent": 20, "appliesToServiceId": null, "cancellationPolicy": "RETAIN" }
```
### PUT Request
```json
{ "mode": "FLAT", "flatAmount": 5.000, "appliesToServiceId": 42, "cancellationPolicy": "REFUND" }
```

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Invalid (percent>100, negative) → inline |
| 403 | Lacks `MANAGE_PRICING` → read-only |
| 5xx / network | Error + retry |

---

## GET /centers/my/payout-account  ·  POST /centers/my/payout-account

**Consumer**: `payout-account.tsx` · **Permission**: `MANAGE_PAYOUTS`
**Purpose**: Register/verify the bank account that receives payouts.

### GET Response — 200 OK
```json
{ "id": 7, "iban": "KW81CBKU0000000000001234560101", "holderName": "Gulf Center Co", "bankName": "CBK", "status": "VERIFIED" }
```
Empty/404 → no account; client guides registration.

### POST Request
```json
{ "iban": "KW81CBKU0000000000001234560101", "holderName": "Gulf Center Co" }
```
Response — 201 with `status: "UNVERIFIED"` (verification async/manual).

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Bad IBAN format → inline |
| 403 | Lacks `MANAGE_PAYOUTS` → action hidden |
| 5xx / network | Error + retry |

---

## GET /centers/my/payouts  ·  POST /centers/my/payouts

**Consumer**: `payouts.tsx` · **Permission**: `MANAGE_PAYOUTS`
**Purpose**: List payouts and request a new one from Available balance.

### GET Response — 200 OK
```json
[
  { "id": 31, "amount": 380.250, "accountId": 7, "status": "PROCESSING", "reference": "PO-31", "requestedAt": "2026-05-28T09:00:00Z", "completedAt": null, "failureReason": null }
]
```

### POST Request
```json
{ "amount": 380.250, "accountId": 7 }
```
Response — 201 `{ "id": 32, "status": "REQUESTED", ... }`.
**Rule**: `amount` ≤ Available **and** ≥ platform minimum; account `VERIFIED`.

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Below minimum / above available → inline with the minimum stated |
| 403 | Lacks `MANAGE_PAYOUTS` → action hidden |
| 409 | Account not verified → prompt to verify |
| 5xx / network | Error + retry |

---

## GET /centers/my/financial-report

**Consumer**: `reports.tsx` · **Permission**: `GENERATE_REPORTS`
**Purpose**: Date-ranged statement; `format=json` for in-app, `format=csv|pdf` for export.

### Request
```
GET /api/v1/centers/my/financial-report?from=2026-05-01&to=2026-05-29&format=json
```
### Response — 200 OK (json)
```json
{
  "from": "2026-05-01", "to": "2026-05-29",
  "rows": [
    { "bookingId": 123, "gross": 33.500, "commission": 1.675, "net": 31.825, "refund": 0.000, "payout": null }
  ],
  "totals": { "gross": 2210.750, "commission": 110.500, "net": 2100.250, "refunds": 12.000, "payouts": 1500.000 }
}
```
`format=csv|pdf` → a file (download/share). Totals MUST reconcile to `GET /centers/my/earnings`.

### Errors
| Status | Client behavior |
|--------|----------------|
| 403 | Lacks `GENERATE_REPORTS` → export hidden |
| 5xx / network | Error + retry |

---

## Gateway webhook (server ↔ gateway — NOT a client endpoint)

The gateway calls a backend webhook on capture / release / payout / refund events; this is **what makes
the owner reads above authoritative** and moves balances between Held / Available / Paid-out. The center
app never calls or trusts the gateway directly.

---

## RTK Query tag invalidation

| Mutation | Invalidates |
|----------|-------------|
| `markComplete` (POST /bookings/{id}/complete) | `Settlement` (id=bookingId) |
| `refund` (POST /bookings/{id}/refund) | `Settlement` (id=bookingId), `Earnings` |
| `requestPayout` (POST /centers/my/payouts) | `Payout`, `Earnings` |
| `upsertPayoutAccount` | `PayoutAccount` |
| `updateDepositConfig` | `DepositConfig` |
| customer release / auto-release (webhook) | `Earnings`, `Settlement` (refetch on focus) |

---

## i18n Key Set (namespaces)

`earnings.*` (balances: held/available/paidOut/lifetime; settlement: gross/commission/net/status labels;
markComplete; refund; mismatch), `payouts.*` (request/history/status REQUESTED|PROCESSING|PAID|FAILED;
account/IBAN/holder/verify; minimum), `deposit.*` (mode NONE|FLAT|PERCENT; amount/percent; cancellation
REFUND|RETAIN), `reports.*` (range/export/totals). English in `en.json`, Arabic mirror in `ar.json`.
