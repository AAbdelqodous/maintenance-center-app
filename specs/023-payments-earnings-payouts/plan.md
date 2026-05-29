# Implementation Plan: Payments, Earnings & Payouts (Owner)

**Branch**: `023-payments-earnings-payouts` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-payments-earnings-payouts/spec.md`

---

## Summary

Give center owners the financial surface behind in-app payments: an **earnings dashboard** (Held /
Available / Paid-out / lifetime, net of commission), a **per-booking settlement view** (itemized
invoice, commission rate + amount, net-to-center) with the **mark-work-complete** action that makes
held escrow release-eligible, **deposit configuration** per service/center, **bank payout** registration
+ request + tracking, **center-initiated refunds**, and **exportable financial reports**.

This is the **owner mirror of customer `007-payments-wallet-escrow`** — the same backend `payment`
domain, viewed and acted on from the supply side. The customer captures and releases; the center
**receives, settles, and withdraws**. Escrow mechanics are entirely backend; this app reads the
settlement/payout state machine and triggers the few owner-side actions (`mark complete`, `request
payout`, `configure deposit`, `refund`). All financial visibility and payout actions are gated by
`011-center-staff-permissions`.

**Scope spans two repos** (per center-app convention): `[Frontend]` = `maintenance-center-app/`,
`[Backend]` = `service-center/.../payment` + `payout` packages. The gateway provider is **MyFatoorah /
Tap** (per spec Assumptions); merchant settlement + payout feasibility is a backend research spike.

**Frontend — files to add (9)**: `types/payments.ts`, `store/api/paymentsApi.ts`,
`store/api/payoutsApi.ts`, `lib/utils/money.ts` (extend existing `pricing.ts` helpers),
`app/(app)/(tabs)/profile/earnings/index.tsx`, `.../profile/earnings/payouts.tsx`,
`.../profile/earnings/payout-account.tsx`, `.../profile/earnings/reports.tsx`,
`components/earnings/` (BalanceCards, SettlementCard, PayoutРRow, DepositConfigForm).
**Frontend — files to modify (6)**: `app/(app)/(tabs)/bookings/[id].tsx` (settlement + mark-complete +
refund), `app/(app)/(tabs)/profile/index.tsx` (Earnings entry), `types/staff.ts` (add `MANAGE_PAYOUTS`),
`store/index.ts`, `lib/i18n/locales/en.json`, `ar.json`.

---

## Technical Context

**Language/Version**: TypeScript (React Native 0.81.5, Expo SDK 54) — frontend; Java 17, Spring Boot 3.5.6 — backend
**Primary Dependencies**: RTK Query + Redux Toolkit (frontend); Spring Data JPA + Hibernate (backend); MyFatoorah/Tap gateway SDK (backend only); Expo Router
**Storage**: PostgreSQL 15 (new `payment`, `escrow_hold`, `payout`, `payout_account`, `deposit_config`, `refund` tables); RTK Query cache (frontend)
**Testing**: `tsc --noEmit` (frontend); Spring Boot test slice + settlement-math unit tests (backend)
**Target Platform**: iOS, Android, Web (react-native-web)
**Project Type**: Mobile app (frontend) + REST API extension (backend)
**Performance Goals**: Earnings dashboard < 300ms p95; settlement view reconciles to the fils; payout request acknowledged < 1s; held→available reflected within one RTK Query poll cycle of release
**Constraints**: All amounts **KD, 3 decimals** (reuse `lib/utils/pricing.ts → formatKD`); all strings bilingual + RTL; all endpoints **center-scoped via JWT identity + `activeCenterId`**; finance gated by `VIEW_REVENUE` / new `MANAGE_PAYOUTS`; commission rate **snapshotted at capture** (never retroactive); no raw bank/card data logged
**Scale/Scope**: 1 center context active at a time (multi-branch via existing `activeCenterId`); up to thousands of settlements per center; KD-only

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md approved before plan |
| II. Bilingual First | ✅ Pass | Invoice lines, statement labels, deposit/payout UI all via i18n; KD via shared `formatKD`; RTL on all new screens |
| III. Component-Driven UI | ✅ Pass | BalanceCards, SettlementCard, PayoutRow, DepositConfigForm, PayoutAccountForm as independent components |
| IV. API Contract Adherence | ✅ Pass | All access via RTK Query; JWT auth; `BusinessErrorCode` for validation; no hardcoded URLs |
| V. Owner-Context Awareness | ✅ Pass | Every endpoint center-scoped (`centers/my/earnings`, `…/payouts`); finance + payout gated by `VIEW_REVENUE`/`MANAGE_PAYOUTS`; balances scoped to `activeCenterId` |
| VI. Security & Privacy | ⚠️ Gated | Bank IBAN + payout data are sensitive; never logged; gateway/PCI handled backend-side; commission snapshot prevents retroactive tampering. See Complexity Tracking |
| VII. Production Readiness | ✅ Pass | No feature flags; error boundaries on new screens; no placeholder UI; disputes withhold release rather than failing silently |

The Principle VI item is a **constraint to satisfy**, recorded in Complexity Tracking.

---

## Project Structure

### Documentation (this feature)

```text
specs/023-payments-earnings-payouts/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── payments-payouts-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source code

```text
# ── Frontend (maintenance-center-app/) ──
types/
└── payments.ts                       NEW — settlement, balances, payout, deposit, refund types
store/api/
├── paymentsApi.ts                    NEW — earnings, settlement, mark-complete, deposit config, refund
└── payoutsApi.ts                     NEW — payout account, request payout, payout history, reports
lib/utils/
└── pricing.ts                        MODIFIED — reuse formatKD; add formatKDSigned + sumFils helpers
app/(app)/(tabs)/profile/
├── index.tsx                         MODIFIED — add "Earnings & Payouts" entry (gated)
└── earnings/
    ├── index.tsx                     NEW — earnings dashboard (balances + recent settlements)
    ├── payouts.tsx                   NEW — Available balance + request payout + payout history
    ├── payout-account.tsx            NEW — register/verify bank account (IBAN)
    └── reports.tsx                   NEW — date-ranged statement + export
app/(app)/(tabs)/bookings/
└── [id].tsx                          MODIFIED — settlement section, Mark Complete, Refund
components/earnings/                  NEW
├── BalanceCards.tsx                  Held / Available / Paid-out / lifetime
├── SettlementCard.tsx                itemized invoice + commission + net
├── PayoutRow.tsx                     payout status row
├── PayoutAccountForm.tsx             IBAN + holder name + verify
└── DepositConfigForm.tsx             per-service/center deposit amount/percentage
app/(app)/(tabs)/profile/
└── earnings/_layout.tsx              NEW — Stack for the earnings routes
store/index.ts                        MODIFIED — register paymentsApi + payoutsApi
types/staff.ts                        MODIFIED — add 'MANAGE_PAYOUTS' to CenterPermission + ROLE_PERMISSIONS
lib/i18n/locales/{en,ar}.json         MODIFIED — earnings.* / payouts.* / deposit.* keys

# ── Backend (service-center/src/main/java/com/maintainance/service_center/) ──
payment/                              NEW (shared with customer 007)
├── Payment.java, PaymentStatus.java, EscrowHold.java
├── Settlement.java (view/derived), Commission snapshot fields
├── PaymentController.java (owner reads), PaymentService.java
└── DepositConfig.java, Refund.java
payout/                               NEW
├── Payout.java, PayoutStatus.java, PayoutAccount.java
├── PayoutController.java, PayoutService.java
└── gateway/  (MyFatoorah/Tap settlement + disbursement adapter)
booking/                              MODIFIED — markComplete() triggers release-eligibility (ties to workProgress completion)
```

**Structure Decision**: Owner finance screens live under `profile/earnings/` (the established home for
owner config like `profile/pricing`, `profile/offers`, `profile/staff`), reachable from the Profile
tab — **not** a new bottom tab. The booking-level settlement + mark-complete + refund actions live on
the existing `bookings/[id].tsx`. Backend adds a `payment` package (shared with customer 007) plus a
`payout` package; `booking.markComplete` integrates with the existing work-progress completion rather
than a parallel concept.

---

## Phase 0: Research

> Full decision records in `research.md`. Summary:

- **R1 — Shared backend `payment` domain.** 023 and customer 007 read/write the *same* payment/escrow
  records; 023 adds owner-facing reads (settlement, balances), payout, deposit config, and refund. No
  duplicate payment model.
- **R2 — Commission is snapshotted at capture.** The rate in effect when funds are captured is stored
  on the Payment/Settlement; later rate changes never alter past settlements (FR-010). The client only
  displays the snapshot.
- **R3 — Mark-complete reuses work-progress completion.** The owner/technician completion signal
  (existing `workProgressApi` / booking stages) is what sets `releaseEligible = true` on the customer
  side; no separate completion concept. Permission: `UPDATE_WORK_STAGE` already gates stage changes.
- **R4 — Payout feasibility spike (backend).** Confirm whether MyFatoorah/Tap supports sub-merchant
  disbursement to center IBANs; if not, the platform settles to its own merchant account and disburses
  via a bank/IBAN rail. The frontend payout contract is identical either way.
- **R5 — Permissions mapping.** Reuse existing `VIEW_REVENUE` for earnings/settlement visibility; add a
  new `MANAGE_PAYOUTS` for payout-account + request-payout + refund actions. Grant `MANAGE_PAYOUTS` to
  OWNER, BRANCH_MANAGER, ACCOUNTANT; `VIEW_REVENUE` already held by those three.
- **R6 — Multi-branch scoping.** All balances/payouts/settlements are scoped to the active center via
  the existing `activeCenterId` + `centers/my/...` pattern; switching branch refetches.
- **R7 — Money formatting.** Reuse `lib/utils/pricing.ts → formatKD`; add `formatKDSigned` (for
  refunds/credits) and a fils-safe `sumFils` for the settlement reconcile check. No new dependency.
- **R8 — Dispute withholds release.** A disputed booking shows release as paused on the owner side; no
  resolution UI here (separate admin spec). Settlement stays Held.

---

## Phase 1: Design & Contracts

### Data model (`data-model.md`)

Frontend types in `types/payments.ts` — `CenterBalances`, `Settlement`, `SettlementLine`,
`PaymentStatus`, `DepositConfig`, `PayoutAccount`, `Payout`, `PayoutStatus`, `RefundRequest`,
`FinancialStatement`. Backend entities — `Payment` (+ commission snapshot), `EscrowHold`, `Payout`,
`PayoutAccount`, `DepositConfig`, `Refund`. Full field tables + state transitions in `data-model.md`.

### Contracts (`contracts/payments-payouts-api.md`)

Owner endpoints (all `Authorization: Bearer <jwt>`, center-scoped):

| Method & Path | Consumer | Permission |
|---|---|---|
| `GET /centers/my/earnings?from&to` | earnings dashboard | `VIEW_REVENUE` |
| `GET /bookings/{id}/settlement` | settlement card on `[id].tsx` | `VIEW_REVENUE` |
| `POST /bookings/{id}/complete` | Mark Complete | `UPDATE_WORK_STAGE` |
| `POST /bookings/{id}/refund` | center refund | `MANAGE_PAYOUTS` |
| `GET /centers/my/deposit-config` / `PUT …` | deposit config | `MANAGE_PRICING` |
| `GET /centers/my/payout-account` / `POST …` | payout account | `MANAGE_PAYOUTS` |
| `GET /centers/my/payouts` / `POST /centers/my/payouts` | payout history + request | `MANAGE_PAYOUTS` |
| `GET /centers/my/financial-report?from&to&format` | reports export | `GENERATE_REPORTS` |

> Webhook (gateway↔backend) updates settlement/payout state — makes owner reads authoritative.

### RTK Query slices

`store/api/paymentsApi.ts` (tagTypes `['Earnings','Settlement','DepositConfig']`) and
`store/api/payoutsApi.ts` (tagTypes `['Payout','PayoutAccount']`), both using the center app's inline
`fetchBaseQuery` + Bearer `prepareHeaders` pattern. Mark-complete invalidates `Settlement`; release
(customer-side) and payout invalidate `Earnings`.

### Permissions

`types/staff.ts`: add `'MANAGE_PAYOUTS'` to `CenterPermission`; add to `ROLE_PERMISSIONS` for OWNER,
BRANCH_MANAGER, ACCOUNTANT. Screens/actions check via the existing permission hook.

### Agent context update

```powershell
.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
```

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|-----------|--------------------------------------|
| New backend `payout` package + gateway disbursement adapter | Centers must withdraw Available balance to a bank account | Manual off-platform payouts defeat the purpose (the whole value is "get paid through the app") |
| Commission snapshot at capture | Rate changes must not rewrite history (FR-010) | Computing commission live at read time would change past settlements when the rate changes |
| Principle VI gated (IBAN/sensitive finance) | Bank + settlement data are sensitive | None — handled by center-scoping, permission gating, no logging, backend-side gateway |
