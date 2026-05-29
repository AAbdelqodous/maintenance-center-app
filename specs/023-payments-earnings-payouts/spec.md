# Feature Specification: Payments, Earnings & Payouts (Owner)

**Feature Branch:** `023-payments-earnings-payouts`
**Status:** Draft
**Created:** 2026-05-29
**Phase:** specify (next: plan → tasks → implement)
**Input:** Owner-side counterpart to in-app payments — let centers see funds customers paid into escrow, mark work complete to make funds release-eligible, watch settlements net of platform commission, configure deposits, view earnings analytics, and request/track bank payouts.

> **Spec Kit reminder:** This describes WHAT and WHY. Tables, endpoints, gateway/payout-rail choices belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Pairs with** customer `specs/007-payments-wallet-escrow` — this is the owner side of the same money flow; the customer captures and releases, the center receives and settles.
- **Requires** `specs/009-work-progress-quotes` — the "mark work complete" signal is what makes held funds release-eligible; the approved quote is the charge basis.
- **Requires** `specs/011-center-staff-permissions` — a new `MANAGE_PAYOUTS` / `VIEW_EARNINGS` permission gates who can see finances and request payouts (OWNER + BRANCH_MANAGER by default).
- **Relates to** `specs/010-analytics-dashboard` and `specs/017-dashboard-pipeline-kpi` — earnings become first-class KPIs; `specs/022-diagnostic-and-reroute` — the diagnostic fee is a settled line item; `specs/013-offers-promotions` — discounts reduce the settled amount.

---

## 1. Summary

When customers pay in-app and funds are held in escrow, the center needs a complete financial surface
to (a) understand what's owed and held, (b) trigger the completion that releases held funds, (c) see
settlements **net of platform commission**, and (d) move money to its bank account via payouts. Today
the owner app has no financial concept beyond a booking's `paymentStatus` enum.

This feature gives the owner:

1. **An earnings overview** — held (in escrow), released/available, paid out, and lifetime totals.
2. **Per-booking payment detail** — the invoice the customer paid, the commission deducted, and the
   net the center earns, plus the action to **mark work complete** (release trigger).
3. **Deposit configuration** — require an up-front deposit per service/center to cut no-shows.
4. **Payouts** — view the available balance, request a payout to a registered bank account, and track
   payout status and history.
5. **Financial reports** — exportable, date-ranged statements for accounting.

---

## 2. Why Now

- It is the mandatory mirror of customer payments: customers will not trust an "escrow" they can pay
  into if the center has no visible, reliable way to get paid out. The two specs ship together.
- "Get paid faster, less cash handling, fewer no-shows (deposits), and a clean monthly statement" is
  the strongest **retention** argument for a center owner — finances are why a business keeps using a tool.
- Commission transparency (the center sees exactly what the platform takes) is itself a trust feature
  for the supply side, mirroring the price transparency we sell to customers.
- It unlocks the platform's revenue model (commission at settlement) in a way the owner can see and accept.

---

## 3. Scope

### In scope

- **Earnings dashboard**: balances by state — `Held` (escrow, work not yet released), `Available`
  (released, payout-eligible), `Paid out`, and lifetime gross/net/commission, with a date filter.
- **Per-booking payment view**: itemized invoice (services, parts, diagnostic fee, fulfillment fee,
  discounts), gross total, commission amount + rate, and **net to center**; payment status mirroring
  the customer side (`PENDING/HELD/RELEASED/PAID/REFUNDED`).
- **Mark work complete**: the owner/technician action (subject to permissions and existing work-progress
  stages) that signals the customer to release and starts the auto-release window.
- **Deposit configuration**: per-service or per-center deposit amount/percentage, shown to customers at booking.
- **Payout account**: register/verify a bank account (IBAN) and a payout contact; one or more accounts.
- **Request payout**: move `Available` balance to a registered account; see minimum-payout rules and fees.
- **Payout history & status**: `REQUESTED → PROCESSING → PAID | FAILED`, with reference and date.
- **Refund initiation** from the center (full/partial) within policy, reflected to the customer.
- **Financial reports**: date-ranged statement of transactions, commissions, refunds, and payouts,
  exportable (CSV/PDF), bilingual labels.
- **Notifications** to the owner: funds held, funds released/available, payout paid/failed, refund processed.

### Out of scope (explicitly deferred)

- **The customer payment/escrow UX itself** — lives in `007-payments-wallet-escrow`.
- **Tax/VAT computation and invoicing compliance.** v1 records amounts; formal tax invoicing is later.
- **Multi-currency.** KD only.
- **Automated daily/weekly auto-payout scheduling.** v1 is manual request (auto-schedule is a follow-up).
- **Dispute resolution adjudication.** A disputed booking simply withholds release; the resolution
  workflow is a separate admin spec.
- **Per-staff commission/payroll splitting** of earnings — relates to staff performance but is its own spec.
- **Subscription/SaaS billing** the center pays the platform (separate from per-transaction commission).

---

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **Held** | Funds a customer paid into escrow for this center, not yet release-eligible (work not confirmed complete). |
| **Available** | Released funds, net of commission, eligible to be paid out to the center's bank. |
| **Commission** | The platform's fee, deducted at settlement; shown per booking and in aggregate. |
| **Net to center** | Gross invoice − commission − refunds for a booking. |
| **Payout** | A transfer of Available balance to the center's registered bank account. |
| **Deposit** | A configurable up-front amount the customer pays to confirm a booking, applied to the final invoice. |
| **Mark complete** | The center action that makes held funds release-eligible and starts the customer auto-release window. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Held Funds and Net Earnings per Booking (Priority: P1)

An owner opens a booking a customer paid for and sees the itemized invoice, the commission deducted,
and the net the center will receive, with the payment shown as **Held**.

**Why this priority**: Visibility into "what did I earn and what was held" is the foundation; without it the owner cannot trust in-app payment at all.

**Independent Test**: For a booking the customer paid via the customer app (sandbox), open it in the center app and verify the itemized invoice, commission amount + rate, net-to-center, and `HELD` status all display and reconcile to the captured amount.

**Acceptance Scenarios**:

1. **Given** a booking the customer paid into escrow, **When** the owner opens its payment view, **Then** the itemized invoice, gross total, commission (amount + rate), and net-to-center are shown and `gross − commission = net`.
2. **Given** the funds are held, **When** the owner views status, **Then** it shows `HELD` with an explanation that funds release after the work is confirmed complete.
3. **Given** a booking with a diagnostic fee and an offer discount, **When** the payment view renders, **Then** both appear as itemized lines and are reflected in gross and net.

---

### User Story 2 - Mark Work Complete to Trigger Release (Priority: P1)

The owner (or a permitted technician) marks the work complete; the customer is prompted to release,
the auto-release window starts, and on release the funds move from `Held` to `Available`.

**Why this priority**: This is the center's lever on the escrow lifecycle and the bridge to getting paid.

**Independent Test**: From a `HELD` booking, mark work complete; verify the customer-side release prompt fires, and after customer release (or window auto-release) the amount moves to the center's `Available` balance.

**Acceptance Scenarios**:

1. **Given** a `HELD` booking with work in progress, **When** a permitted user marks it complete, **Then** the customer is prompted to confirm and release, and the auto-release window begins.
2. **Given** a user without `MANAGE_PAYOUTS`/completion permission, **When** they attempt to mark complete, **Then** the action is unavailable per `011-center-staff-permissions`.
3. **Given** the customer releases (or the window auto-releases), **When** release occurs, **Then** the net amount is added to the center's `Available` balance and the owner is notified.
4. **Given** the customer raised a problem (dispute), **When** the owner views the booking, **Then** release is shown as paused pending resolution.

---

### User Story 3 - Configure Deposits to Reduce No-Shows (Priority: P2)

The owner sets a deposit (amount or percentage) for a service; customers booking that service must
pay the deposit, which is applied to the final invoice.

**Why this priority**: Deposits directly cut the no-show losses owners complain about; high value but not required to receive payments.

**Acceptance Scenarios**:

1. **Given** the owner sets a 20% deposit on a service, **When** a customer books it, **Then** the deposit is shown and collected at booking and recorded against that booking.
2. **Given** a deposit was paid, **When** the final invoice is computed, **Then** the deposit is applied and only the remainder is charged at completion.
3. **Given** a booking is cancelled, **When** cancellation policy applies, **Then** the deposit is refunded or retained per the configured policy and the outcome is shown to both parties.

---

### User Story 4 - Register a Bank Account and Request a Payout (Priority: P2)

The owner registers a bank account, sees their `Available` balance, requests a payout, and tracks it
through to `Paid`.

**Why this priority**: Getting money out is the end of the value chain; essential but it follows funds first becoming Available.

**Acceptance Scenarios**:

1. **Given** no payout account, **When** the owner opens Payouts, **Then** they are guided to register and verify a bank account (IBAN + holder name).
2. **Given** a verified account and Available balance above the minimum, **When** the owner requests a payout, **Then** a payout is created in `REQUESTED` and the Available balance decreases accordingly.
3. **Given** a payout in progress, **When** its status changes (`PROCESSING → PAID` or `FAILED`), **Then** the owner sees the updated status with a reference and is notified.
4. **Given** Available balance below the minimum payout, **When** the owner attempts a payout, **Then** it is blocked with the minimum clearly stated.

---

### User Story 5 - Earnings Report Export (Priority: P3)

The owner selects a date range and exports a statement of transactions, commissions, refunds, and payouts.

**Why this priority**: Needed for the center's accounting but not part of the core money loop.

**Acceptance Scenarios**:

1. **Given** a date range, **When** the owner exports, **Then** a bilingual statement (CSV/PDF) lists each transaction with gross, commission, net, refunds, and payouts, and totals reconcile to the dashboard.

### Edge Cases

- Refund issued after release but before payout → reduces Available; if it exceeds Available, the negative is carried/blocked per policy (decided in plan).
- Commission rate changes → already-held bookings keep the rate in effect at capture (rate is snapshotted per payment).
- Payout fails (bad IBAN) → balance returns to Available, owner notified to fix the account.
- Multi-branch owner → each balance/payout is scoped to a center; the dashboard respects the `activeCenterId` context.
- Work marked complete then re-opened/re-routed (`022`) → release handling must not double-pay; the spec assumes a single release per booking.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The center MUST see balances by state — Held, Available, Paid out — and lifetime gross, commission, and net, filterable by date and scoped to the active center.
- **FR-002**: Each paid booking MUST show an itemized invoice, the commission amount and rate, and the net-to-center, reconciling exactly to the customer-captured amount.
- **FR-003**: A permitted user MUST be able to mark work complete, which prompts the customer to release and starts the auto-release window.
- **FR-004**: Financial visibility and payout actions MUST be gated by `011-center-staff-permissions` (OWNER + BRANCH_MANAGER by default).
- **FR-005**: On release (customer-confirmed or auto), the net amount MUST move from Held to Available and the owner MUST be notified.
- **FR-006**: The center MUST be able to configure a deposit (amount or percentage) per service/center, collected at booking and applied to the final invoice.
- **FR-007**: The center MUST be able to register and verify one or more bank accounts (IBAN + holder name) for payouts.
- **FR-008**: The center MUST be able to request a payout of Available balance subject to a minimum, and track it through `REQUESTED → PROCESSING → PAID | FAILED` with a reference.
- **FR-009**: The center MUST be able to initiate full/partial refunds within policy, reflected to the customer and to balances.
- **FR-010**: The commission rate applied to a payment MUST be snapshotted at capture and not change retroactively.
- **FR-011**: The center MUST be able to export a date-ranged financial statement (CSV/PDF) whose totals reconcile to the dashboard.
- **FR-012**: A disputed booking MUST withhold release until the dispute is resolved.
- **FR-013**: All amounts MUST be KD (3 decimals) with bilingual (AR/EN) labels.

### Key Entities

- **Center Ledger** (derived/view): per-center balances by state and lifetime aggregates.
- **Settlement**: per-booking record — gross, commission rate + amount, net, state mirroring the payment, snapshot timestamp.
- **Deposit Config**: per-service/center amount or percentage and cancellation policy.
- **Payout Account**: IBAN, holder name, verification state.
- **Payout**: amount, account, state (`REQUESTED/PROCESSING/PAID/FAILED`), reference, timestamps.
- **Refund (center-initiated)**: amount, reason, target (original/wallet), state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can see, for any paid booking, exactly what they earn net of commission, with figures reconciling to the customer's receipt to the fils.
- **SC-002**: Funds move from Held to Available within seconds of release, visible on the dashboard.
- **SC-003**: Centers using deposits see a measurable reduction in no-show losses within 3 months.
- **SC-004**: A payout can be requested in under 60 seconds once an account is verified, with status tracked to completion.
- **SC-005**: Exported statements reconcile to the dashboard with zero discrepancy in testing.
- **SC-006**: ≥ 80% of centers that receive in-app payments register a payout account within their first 30 days.

## Assumptions

- **Target gateway: MyFatoorah or Tap (Kuwait)**, same as `007`. `plan.md` must confirm the provider's merchant-settlement and payout (supplier/sub-merchant disbursement) capabilities to KD bank accounts; if native split/payout to centers isn't supported, the platform settles to its own merchant account and disburses payouts via a bank/IBAN rail (decided in plan).
- Platform commission rate and minimum payout are platform-configured; the center sees but does not set them.
- "Mark complete" integrates with the existing work-progress stages (`009`) rather than introducing a parallel completion concept.
- Tax/VAT invoicing compliance is handled in a later spec; v1 records amounts accurately for accounting.
- Multi-branch scoping uses the existing `activeCenterId` context described in the project CLAUDE.md.
