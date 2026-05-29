# Research: Payments, Earnings & Payouts (Owner)

**Feature**: 023-payments-earnings-payouts
**Date**: 2026-05-29

> Phase 0 decision records. Each is a standalone decision with rationale and rejected alternatives.

---

## R1 — Shared backend `payment` domain with customer 007

**Decision**: 023 (owner) and `maintenance-customer-app/specs/007` (customer) operate on the **same**
backend `payment`/`escrow_hold` records. 023 does **not** introduce a parallel payment model; it adds
**owner-facing reads** (settlement, balances, statements), **payout**, **deposit config**, and
**center-initiated refund**, plus the **mark-complete** trigger that flips release-eligibility on the
customer side.

**Rationale**: A payment has exactly one truth. The customer captures and releases; the center
receives and withdraws — two views of one ledger. Duplicating the payment entity would create
reconciliation drift between the two apps, exactly what the platform is selling against.

**Alternatives considered**:
- *Separate owner-side payment records linked to customer ones* — rejected: two sources of truth for
  one transaction, guaranteed to diverge.

---

## R2 — Commission is snapshotted at capture

**Decision**: The platform commission rate in effect **at the moment funds are captured** is stored on
the `Payment`/`Settlement` (`commissionRate` + `commissionAmount`). Later platform rate changes never
alter existing settlements. The client only displays the snapshot; `net = gross − commission − refunds`.

**Rationale**: FR-010. A center that earned under a 5% rate must keep seeing 5% on that job even if the
platform later moves to 7%. Snapshotting also makes the owner's historical statements stable and
auditable, and prevents any appearance of retroactive tampering (Principle VI).

**Alternatives considered**:
- *Compute commission live at read time from the current rate* — rejected: rewrites history on every
  rate change; breaks reconciliation with already-issued statements and with the customer's receipt.

---

## R3 — Mark-complete reuses work-progress completion

**Decision**: The owner/technician "work complete" signal is the **existing work-progress completion**
(`workProgressApi` / booking stage reaching the terminal stage), not a new parallel concept. Reaching
completion sets `releaseEligible = true` on the customer's escrow and starts the auto-release window.
The action is gated by the existing **`UPDATE_WORK_STAGE`** permission (held by OWNER, BRANCH_MANAGER,
TECHNICIAN).

**Rationale**: Spec §Assumptions explicitly says mark-complete "integrates with the existing
work-progress stages (`009`) rather than introducing a parallel completion concept." Reusing it means
one definition of "done" across the booking, the escrow release gate, and analytics.

**Edge note**: If a completed booking is **re-opened/re-routed** (`022`), release handling must not
double-pay — the spec assumes a single release per booking; the backend guards against a second
release. The client simply reflects the current settlement state.

**Alternatives considered**:
- *A dedicated "mark paid/complete for payment" button independent of work stages* — rejected: two
  notions of completion that can disagree.

---

## R4 — Payout feasibility spike (backend)

**Decision**: Backend `plan` must confirm whether **MyFatoorah / Tap** supports **sub-merchant /
supplier disbursement** directly to a center's Kuwaiti IBAN. If yes, payouts disburse via the gateway.
If not, the platform settles all captures into its **own merchant account** and disburses center
payouts via a **bank/IBAN rail** (manual or banking-API batch). **The frontend payout contract is
identical in both cases** — the client requests a payout of Available balance and tracks
`REQUESTED → PROCESSING → PAID | FAILED`.

**Rationale**: This is the single biggest backend unknown and it is invisible to the client. Designing
the client against the abstract payout state machine means the gateway decision can be made (or
changed) without any frontend rework — mirrors the escrow-mechanism abstraction in customer 007 R2.

**Alternatives considered**:
- *Block the whole feature until the disbursement rail is chosen* — rejected: the entire earnings
  dashboard, settlement view, deposits, and refunds can ship while payout disbursement is finalized.

---

## R5 — Permissions mapping (reuse + one new permission)

**Decision**: Reuse the existing **`VIEW_REVENUE`** permission for earnings/settlement/report
*visibility*. Add a new **`MANAGE_PAYOUTS`** permission for the *actions*: register/verify a payout
account, request a payout, and initiate a center refund. Grant `MANAGE_PAYOUTS` to **OWNER,
BRANCH_MANAGER, ACCOUNTANT** in `ROLE_PERMISSIONS`. (`VIEW_REVENUE` is already held by those three;
`GENERATE_REPORTS` already gates exports.)

**Rationale**: `types/staff.ts` already models finance roles — `VIEW_REVENUE`, `VIEW_REPORTS`,
`GENERATE_REPORTS`, and an `ACCOUNTANT` role whose whole purpose is finance. Reusing them avoids a
permission explosion; only *moving money out* warrants a new, tightly-scoped permission.

**Alternatives considered**:
- *Add separate `VIEW_EARNINGS`, `REQUEST_PAYOUT`, `MANAGE_DEPOSITS`, `ISSUE_REFUND`* — rejected as
  over-granular; the spec's intent (OWNER + BRANCH_MANAGER, plus ACCOUNTANT) is met with one new
  permission layered on the existing `VIEW_REVENUE`/`GENERATE_REPORTS`.
- *Reuse `MANAGE_PRICING` for deposits* — **accepted** for deposit config specifically (deposits are a
  pricing decision); payouts/refunds get `MANAGE_PAYOUTS`.

---

## R6 — Multi-branch scoping via `activeCenterId`

**Decision**: All balances, settlements, payouts, deposit config, and reports are scoped to the
**active center** using the established `centers/my/...` + `activeCenterId` context (documented in the
center-app CLAUDE.md). Switching branch refetches all finance data; payout accounts and balances are
per center.

**Rationale**: A multi-branch owner must not see Branch A's money commingled with Branch B's. The
center app already resolves owner context this way for every other domain; finance follows the same rule.

**Alternatives considered**:
- *Aggregate balances across an owner's branches* — rejected for v1: settlement and payout are legally
  and operationally per-center; cross-branch rollups are a later analytics feature.

---

## R7 — Money formatting reuses `lib/utils/pricing.ts`

**Decision**: Reuse the existing `formatKD(amount)` (KD, 3 decimals) for all amounts. Add two helpers
to `pricing.ts`: `formatKDSigned(amount)` (prefixes `−`/`+` for refunds/credits) and
`sumFils(amounts: number[])` (integer-fils sum for the settlement reconcile check `gross − commission
=== net`). No new dependency.

**Rationale**: The center app already standardizes KD display in one util; finance must not introduce a
second formatter. Fils-safe summing prevents the displayed net from disagreeing with the gateway by a
fraction at the thousandths place.

**Alternatives considered**:
- *Inline `toFixed(3)` in components* — rejected: violates the single-formatter convention and risks
  locale/`KD` drift.

---

## R8 — Dispute withholds release on the owner side

**Decision**: When a customer raises a problem (dispute) on a `HELD` booking, the owner's settlement
view shows release as **paused / under dispute**; funds stay Held and do not move to Available. No
dispute-resolution UI is built here.

**Rationale**: Spec FR-012 + Out-of-scope. The center needs to *see* that a release is blocked and why;
adjudication is a separate admin-mediated spec. Showing the paused state prevents the owner from
expecting funds that are legitimately frozen.

**Alternatives considered**:
- *Let the owner force-release a disputed payment* — rejected: defeats the customer protection that
  makes escrow trustworthy.

---

## R9 — Deposits cut no-shows; applied to the final invoice

**Decision**: A center configures a deposit per service or center-wide (amount **or** percentage).
Customers booking that service pay the deposit up front (customer 007/008 flow); the backend applies it
against the final invoice so only the remainder is charged at completion. Cancellation policy decides
whether a deposit is refunded or retained.

**Rationale**: Spec US3. Deposits are the owner-requested no-show remedy. Treating the deposit as a
pre-applied credit on the same invoice keeps the settlement math clean (one invoice, one net).

**Alternatives considered**:
- *Deposit as a separate non-refundable fee outside the invoice* — rejected: complicates reconciliation
  and the customer's single-total expectation; policy (refund vs. retain) is configurable instead.
