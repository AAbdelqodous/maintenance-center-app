# Tasks: Payments, Earnings & Payouts (Owner)

**Feature**: 023-payments-earnings-payouts
**Input**: Design documents from `specs/023-payments-earnings-payouts/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/payments-payouts-api.md ✓, research.md ✓, quickstart.md ✓

**Repos**: Two repos in scope — `[Frontend]` → `maintenance-center-app/`, `[Backend]` → `service-center/src/main/java/com/maintainance/service_center/`. The `payment` package is **shared with customer `007-payments-wallet-escrow`** — if 007's backend tasks already created it, extend rather than recreate.

**Tests**: Targeted tests only — settlement math (`net = gross − commission − refunds`) and commission-snapshot immutability are required by the spec's correctness guarantees (SC-001, FR-010). No broad UI suite.

**Organization**: Tasks grouped by user story (US1–US5) for independent delivery. Setup + Foundational carry no Story label.

## Format: `[ID] [P?] [Repo] [Story] Description`

- **[P]**: Parallelizable (different files, no incomplete dependency)
- **[Story]**: [US1]…[US5]
- Exact file paths included

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Frontend types, permission, money helpers, i18n, store registration. No backend dependency — can run immediately.

- [ ] T001 [Frontend] Create `types/payments.ts` — `PaymentStatus`, `CenterBalances`, `SettlementLine`, `Settlement`, `DepositConfig`, `PayoutAccount`, `Payout`, `PayoutStatus`, `RefundRequest`, `FinancialStatement` interfaces; copy verbatim from `data-model.md §Frontend Types`.
- [ ] T002 [Frontend] Modify `lib/utils/pricing.ts` — add `formatKDSigned(amount: number): string` (prefix `+`/`−`, reuse `formatKD`) and `sumFils(amounts: number[]): number` (`reduce((a,x)=>a+Math.round(x*1000),0)/1000`) for the settlement reconcile check (`research.md` R7). Do not change existing exports.
- [ ] T003 [P] [Frontend] Modify `types/staff.ts` — add `'MANAGE_PAYOUTS'` to the `CenterPermission` union, and add it to `ROLE_PERMISSIONS` for `OWNER`, `BRANCH_MANAGER`, and `ACCOUNTANT` (per `research.md` R5). Leave all other entries unchanged.
- [ ] T004 [P] [Frontend] Create `store/api/paymentsApi.ts` — `createApi({ reducerPath:'paymentsApi', tagTypes:['Earnings','Settlement','DepositConfig'], baseQuery: inline fetchBaseQuery + Bearer prepareHeaders })`; endpoints `getEarnings` (`centers/my/earnings`), `getBookingSettlement` (`bookings/${id}/settlement`), `markComplete` (`POST bookings/${id}/complete`, invalidates `Settlement`), `refundBooking` (`POST bookings/${id}/refund`, invalidates `Settlement`+`Earnings`), `getDepositConfig`/`updateDepositConfig` (`centers/my/deposit-config`, invalidates `DepositConfig`); export hooks. Mirror shapes from `contracts/payments-payouts-api.md`.
- [ ] T005 [P] [Frontend] Create `store/api/payoutsApi.ts` — `createApi({ reducerPath:'payoutsApi', tagTypes:['Payout','PayoutAccount'], … })`; endpoints `getPayoutAccount`/`upsertPayoutAccount` (`centers/my/payout-account`), `getPayouts`/`requestPayout` (`centers/my/payouts`, invalidates `Payout`+`Earnings`), `getFinancialReport` (`centers/my/financial-report`); export hooks.
- [ ] T006 [Frontend] Register both slices in `store/index.ts` (depends T004, T005) — add to the `reducer` map and `middleware` chain, matching the existing 17-slice pattern.
- [ ] T007 [P] [Frontend] Add `earnings.* / payouts.* / deposit.* / reports.*` keys to `lib/i18n/locales/en.json` per `contracts/…#i18n Key Set`.
- [ ] T008 [P] [Frontend] Add the mirrored Arabic keys to `lib/i18n/locales/ar.json` (KD suffix produced by `formatKD`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend payment/payout entities, schema, commission snapshot, and the gateway/webhook scaffold that ALL stories depend on.

**⚠️ CRITICAL**: No user story endpoint works until these exist. If customer `007` already created the `payment` package, **extend** it here.

- [ ] T009 [Backend] Create/extend `payment/Payment.java` — `@Entity` with `grossAmount`, `commissionRate` (snapshot), `commissionAmount`, `netAmount` (all DECIMAL(10,3)/(5,4)), `status` (`PaymentStatus`), `method`, `gatewayReference`, `idempotencyKey`, `@ManyToOne booking/customer/center`, `@CreatedDate capturedAt`, `releasedAt`, auditing listener — per `data-model.md §Backend Entities`.
- [ ] T010 [Backend] Create `payment/EscrowHold.java` — `@OneToOne Payment`, `heldAmount`, `heldAt`, `releaseEligibleAt`, `autoReleaseAt`, `releasedAt`, `disputed`, `disputeReason`.
- [ ] T011 [P] [Backend] Create `payment/DepositConfig.java` + `payment/Refund.java` per `data-model.md` (deposit mode/flat/percent/service/cancellationPolicy; refund amount/target/reason/status/initiatedBy).
- [ ] T012 [P] [Backend] Create `payout/PayoutAccount.java` (`iban`, `holderName`, `bankName`, `status`) + `payout/Payout.java` (`account`, `amount`, `status`, `reference`, `requestedBy`, `requestedAt`, `completedAt`, `failureReason`) + `payout/PayoutStatus.java`.
- [ ] T013 [Backend] Create `payout/gateway/` adapter interface for MyFatoorah/Tap **settlement + disbursement**, plus the **webhook controller** that updates `Payment`/`EscrowHold`/`Payout` on gateway events (`research.md` R4). Stub the live calls behind the interface so the rest can be built/tested.
- [ ] T014 [Backend] DB migration creating `payment`, `escrow_hold`, `deposit_config`, `refund`, `payout_account`, `payout` tables with the indexes implied by the entities; `commission_rate` is persisted at capture and never updated.
- [ ] T015 [Backend] Add `MANAGE_PAYOUTS` to the backend permission enum + role mapping (mirror of `types/staff.ts`) so endpoint authorization matches the frontend gating.

**Checkpoint**: `tsc --noEmit` (frontend) passes; backend compiles, tables exist, webhook scaffold receives events. Build the frontend stub (per `quickstart.md`) so US phases run without the live gateway.

---

## Phase 3: User Story 1 — See Held Funds & Net Earnings (Priority: P1) 🎯 MVP

**Goal**: An owner sees the earnings dashboard (Held/Available/Paid-out/lifetime) and, per booking, the itemized invoice + commission + net, reconciling to the captured amount.

**Independent Test**: With the stub returning `CenterBalances` and a `HELD` `Settlement`, the dashboard shows the four buckets and the booking settlement card shows `gross − commission == net`.

- [ ] T016 [Backend] [US1] `PaymentController.getEarnings` (`GET /centers/my/earnings`) + `PaymentService` aggregation by bucket (Held/Available/Paid-out + lifetime), center-scoped, gated `VIEW_REVENUE`.
- [ ] T017 [Backend] [US1] `PaymentController.getBookingSettlement` (`GET /bookings/{id}/settlement`) returning itemized lines + commission snapshot + net + status, gated `VIEW_REVENUE`; `net = gross − commissionAmount − refundedAmount`.
- [ ] T018 [P] [Frontend] [US1] Create `components/earnings/BalanceCards.tsx` — four cards (Held/Available/Paid-out + lifetime gross/commission/net) using `formatKD`; loading/empty/error.
- [ ] T019 [P] [Frontend] [US1] Create `components/earnings/SettlementCard.tsx` — itemized `SettlementLine[]` (bilingual, `formatKDSigned` for discounts), commission row (rate + amount), bold **Net**; verify `sumFils` reconcile else show `earnings.mismatch`.
- [ ] T020 [Frontend] [US1] Create `app/(app)/(tabs)/profile/earnings/_layout.tsx` (Stack) + `app/(app)/(tabs)/profile/earnings/index.tsx` — `useGetEarningsQuery` + `<BalanceCards>` + a recent-settlements list; gated by `VIEW_REVENUE` (hide/redirect otherwise).
- [ ] T021 [Frontend] [US1] Modify `app/(app)/(tabs)/profile/index.tsx` — add a gated **"Earnings & Payouts"** row navigating to `/(app)/(tabs)/profile/earnings`; add i18n label. Register `profile/earnings/*` in `app/(app)/(tabs)/_layout.tsx` with `href:null` (not a bottom tab).
- [ ] T022 [Frontend] [US1] Modify `app/(app)/(tabs)/bookings/[id].tsx` — render `<SettlementCard>` (via `useGetBookingSettlementQuery`) when the user has `VIEW_REVENUE` and the booking has a settlement; show `PaymentStatus` prominently.
- [ ] T023 [P] [test] [US1] Backend unit test: settlement math — `net == gross − commission − refunds` across cases incl. discounts and a partial refund; and **commission-snapshot immutability** (changing the platform rate does not alter an existing settlement) — FR-010 / SC-001.

**Checkpoint US1**: Owner sees balances and per-booking net-of-commission, reconciling to the fils. Shippable MVP.

---

## Phase 4: User Story 2 — Mark Work Complete to Trigger Release (Priority: P1)

**Goal**: A permitted user marks work complete → customer-side release-eligibility + auto-release window; released funds move Held→Available.

**Independent Test**: From a `HELD` booking, Mark Complete sets `releaseEligible:true` + `autoReleaseAt`; after the customer releases (or auto), the amount appears in Available.

- [ ] T024 [Backend] [US2] `POST /bookings/{id}/complete` — integrate with **work-progress completion** (`research.md` R3): set `EscrowHold.releaseEligibleAt`/`autoReleaseAt`, gated `UPDATE_WORK_STAGE`; emit customer notification. Guard against double-release on re-routed/re-opened bookings.
- [ ] T025 [Backend] [US2] Scheduled job: auto-release held funds after `autoReleaseAt` if not disputed; move net Held→Available; notify both parties.
- [ ] T026 [Frontend] [US2] Extend `app/(app)/(tabs)/bookings/[id].tsx` — **Mark Complete** button (gated `UPDATE_WORK_STAGE`) → `markComplete(bookingId)` → toast + refetch settlement; when `disputed`, show release **paused** (no force-release, `research.md` R8); show `autoReleaseAt` countdown when present.

**Checkpoint US2**: The owner can trigger release-eligibility; released funds surface in Available. US1+US2 satisfy both P1 stories.

---

## Phase 5: User Story 3 — Configure Deposits (Priority: P2)

**Goal**: Owner sets a deposit (flat/percent) per service/center; it is collected at booking and applied to the final invoice.

**Independent Test**: Set 20% deposit → a new booking shows/collects it → settlement shows `depositApplied` and the remainder.

- [ ] T027 [Backend] [US3] `GET|PUT /centers/my/deposit-config` (gated `MANAGE_PRICING`); booking creation applies the deposit and records `depositApplied` on the settlement; cancellation honors `cancellationPolicy`.
- [ ] T028 [P] [Frontend] [US3] Create `components/earnings/DepositConfigForm.tsx` — mode (NONE/FLAT/PERCENT), amount/percent, optional service scope, cancellation policy; validation (percent ≤ 100, non-negative).
- [ ] T029 [Frontend] [US3] Surface `DepositConfigForm` (under `profile/earnings` or `profile/pricing`) wired to `getDepositConfig`/`updateDepositConfig`; gated `MANAGE_PRICING`.

**Checkpoint US3**: Deposits configurable and applied to invoices.

---

## Phase 6: User Story 4 — Register Account & Request Payout (Priority: P2)

**Goal**: Owner registers/verifies a bank account, sees Available, requests a payout, tracks it to Paid.

**Independent Test**: Register IBAN (stub→VERIFIED) → with Available above minimum, request payout → `REQUESTED`, Available decreases → advance stub to `PAID` → moves to Paid-out.

- [ ] T030 [Backend] [US4] `GET|POST /centers/my/payout-account` (validate IBAN, async/manual verify) + `GET|POST /centers/my/payouts` (request from Available ≥ minimum, `REQUESTED→PROCESSING→PAID|FAILED` via the disbursement adapter; failure returns funds to Available), gated `MANAGE_PAYOUTS`.
- [ ] T031 [P] [Frontend] [US4] Create `components/earnings/PayoutAccountForm.tsx` (IBAN + holder, Kuwaiti-IBAN format check, status badge) and `components/earnings/PayoutRow.tsx` (amount + `PayoutStatus` + reference + date).
- [ ] T032 [Frontend] [US4] Create `app/(app)/(tabs)/profile/earnings/payout-account.tsx` (register/verify) and `app/(app)/(tabs)/profile/earnings/payouts.tsx` (Available + **Request Payout** with minimum check + history list); gated `MANAGE_PAYOUTS`.

**Checkpoint US4**: Owner can register an account and withdraw Available balance with tracked status.

---

## Phase 7: User Story 5 — Financial Report Export (Priority: P3)

**Goal**: Owner exports a date-ranged statement (CSV/PDF) whose totals reconcile to the dashboard.

**Independent Test**: Pick a range → export → rows + totals match `GET /centers/my/earnings`.

- [ ] T033 [Backend] [US5] `GET /centers/my/financial-report?from&to&format=json|csv|pdf` (gated `GENERATE_REPORTS`); totals reconcile to earnings aggregation.
- [ ] T034 [Frontend] [US5] Create `app/(app)/(tabs)/profile/earnings/reports.tsx` — date range picker, in-app totals table, and CSV/PDF export (share/download); gated `GENERATE_REPORTS`.

**Checkpoint US5**: Exportable statements reconcile to the dashboard.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T035 [P] [Frontend] RTL spot-check (Arabic): KD placement, balance cards, settlement rows, payout list, statement table, deposit form.
- [ ] T036 [P] [Frontend] Permission audit — Earnings entry + settlement card hidden without `VIEW_REVENUE`; Mark Complete hidden without `UPDATE_WORK_STAGE`; payout/refund/account hidden without `MANAGE_PAYOUTS`; export hidden without `GENERATE_REPORTS`. Verify ACCOUNTANT sees finance + payouts; RECEPTIONIST/TECHNICIAN do not.
- [ ] T037 [P] [Frontend] Multi-branch check — switching `activeCenterId` refetches all finance data; no cross-branch leakage (`research.md` R6).
- [ ] T038 [Frontend] Refund flow on `bookings/[id].tsx` — **Refund** action (gated `MANAGE_PAYOUTS`) with amount ≤ net validation, reason required, target ORIGINAL/WALLET; reflects updated `refundedAmount`/`net`.
- [ ] T039 End-to-end smoke (stub or live + customer 007): pay→HELD→Mark Complete→customer release→Available→request payout→Paid; deposit applied; refund; export reconciles. Confirm every amount via `formatKD`, IBAN/gateway payloads never logged (Principle VI).

**Checkpoint Final**: All five stories pass independent tests; permissions + RTL + multi-branch verified; settlement math proven; no sensitive data logged.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: immediate. T001, T002, T003, T004, T005, T007, T008 parallel; **T006 depends on T004+T005**.
- **Phase 2 (Foundation)**: backend entities + webhook + migration; **BLOCKS all US backend endpoints**. T009→T010; T011, T012 parallel; T013, T014, T015 follow.
- **US1 (P1)**: needs Foundation. T016, T017 (backend) → T018, T019 (components, parallel) → T020, T021, T022; T023 test alongside.
- **US2 (P1)**: needs US1 settlement + work-progress completion. T024→T025 (backend); T026 (frontend) extends `[id].tsx`.
- **US3 (P2)**: independent of US1/US2 beyond Foundation.
- **US4 (P2)**: needs Available balance from the release path (US2) for a live test; UI buildable against stub independently.
- **US5 (P3)**: needs earnings aggregation (US1) for reconciliation.
- **Phase 8 (Polish)**: after US phases; T035–T037 parallel.

### Parallel opportunities

| Group | Tasks |
|-------|-------|
| Setup FE | T001, T002, T003, T004, T005, T007, T008 |
| Foundation BE | T011 + T012 (after T009/T010) |
| US1 components | T018, T019 |
| US4 components | T031 |
| Polish | T035, T036, T037 |

---

## Implementation Strategy

### MVP first (US1 + US2 — both P1)
Setup → Foundation (build the frontend stub) → US1 (earnings + settlement) → US2 (mark-complete + release) → **validate** the full escrow receive→release→Available path with customer 007 → ship behind the same gate as 007 (HTTPS + live gateway/webhook).

### Incremental delivery
Foundation → US1 → US2 → US3 (deposits) → US4 (payouts) → US5 (reports) → Polish. Each US is a deployable increment.

### Backend coordination
| Task group | Backend needed? |
|------------|-----------------|
| T001–T008 (Setup) | No — pure frontend, stubbable |
| T009–T015 (Foundation) | Yes — backend repo |
| US1–US5 frontend screens | Stub sufficient to build/test; live needs the gateway webhook |
| T023, T039 | Settlement-math test = backend unit; e2e needs stub or live + customer 007 |

---

## Notes

- **Shared `payment` package**: coordinate with customer `007` — one payment domain, two app views. Do not fork the entity.
- **Commission snapshot (FR-010)**: rate + amount are frozen at capture; the client only displays them; T023 proves immutability.
- **Mark-complete = work-progress completion** (`research.md` R3) — not a parallel concept; guard against double-release on re-routed bookings (`022`).
- **Permissions**: reuse `VIEW_REVENUE` (view), `MANAGE_PRICING` (deposits), `GENERATE_REPORTS` (export); only the new `MANAGE_PAYOUTS` (payout/refund/account) is added (`research.md` R5).
- **Money**: reuse `lib/utils/pricing.ts` (`formatKD`); add `formatKDSigned` + `sumFils` only. No new dependency.
- **Multi-branch**: everything scoped to `activeCenterId` (`research.md` R6).
- **Disputes** withhold release (no force-release UI); resolution is a separate admin spec (`research.md` R8).
- **Gate live payouts** behind the same production readiness as customer 007 (HTTPS, live gateway, verified webhook).
