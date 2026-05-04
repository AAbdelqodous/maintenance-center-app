# Feature Specification: Offers & Promotions

**Feature Branch**: `013-offers-promotions`
**Created**: 2026-05-03
**Status**: Draft — ready for `/speckit.plan`
**Phase**: 3.6

---

## 1. Summary

Maintenance center owners currently have no way to advertise time-limited promotions — they can set standard pricing (Phase 3.5) but cannot create deals like "20% off oil changes this Eid" or "Free inspection with any repair this weekend." This feature lets owners create, manage, and cancel promotional offers from the center owner app. Customers will discover these offers on the center's profile page in the customer app (customer-side display is a separate future spec).

---

## 2. Why Now

- Offers are a primary driver of new bookings in the Kuwait service market — promotions during Eid, National Day, and Ramadan are standard practice.
- Phase 3.5 (service pricing) gave centers a credibility foundation; Phase 3.6 gives them a competitive tool.
- Without offers, center owners have no way to communicate deals through the platform and resort to WhatsApp or Instagram instead, reducing platform stickiness.

---

## 3. Scope

### In scope

- Creating an offer: title (Ar + En), description (Ar + En, optional), discount type, discount value, applicable service types, start date, end date, optional redemption cap
- Viewing the full offer list with status indicators
- Filtering offers by status (Active, Scheduled, Expired, Cancelled)
- Editing offers in SCHEDULED or ACTIVE state (with field-level restrictions for active offers)
- Cancelling an offer early (SCHEDULED or ACTIVE → CANCELLED)
- Displaying the redemption count alongside each offer (read-only)
- Backend enforcement: date validation, discount value limits, per-center offer cap

### Out of scope

- Customer-facing display of offers (separate spec for customer app)
- Promo/coupon codes (offers are automatically visible; no code entry required in this phase)
- Offer analytics beyond a simple redemption counter
- Scheduling repeat or recurring offers
- Targeting offers to specific customer segments

---

## 4. Glossary

| Term | Meaning |
|------|---------|
| **Offer** | A time-limited promotional deal created by a center owner. Has a discount, a date range, and optionally targets specific service types. |
| **DiscountType** | How the discount is expressed: `PERCENTAGE` (e.g., 20% off) or `FIXED_AMOUNT` (e.g., KD 5.000 off). |
| **OfferStatus** | Computed from dates: `SCHEDULED` (starts in the future), `ACTIVE` (within date range today), `EXPIRED` (past end date), `CANCELLED` (manually stopped). |
| **Redemption** | One instance of a customer claiming and using an offer. Counted automatically by the system when the customer app feature is built. |
| **Applicable Service Types** | Optional list of `ServiceType` values the offer applies to. Empty list means the offer applies to all services. |

---

## User Scenarios & Testing

### User Story 1 — Create an Offer (Priority: P1)

An owner decides to run an Eid promotion. They open the Offers screen, tap "Add Offer", fill in the title in Arabic and English, choose "Percentage" discount at 15%, select that it applies to all services, set the start and end date, and save. The offer appears in their list as SCHEDULED.

**Why this priority**: This is the entry point for the entire feature. Without creating offers, nothing else matters.

**Independent Test**: Create an offer, confirm it appears in the list with the correct status, discount, and dates.

**Acceptance Scenarios**:

1. **Given** a OWNER on the Add Offer screen, **When** they submit valid data (titleAr, titleEn, discountType=PERCENTAGE, discountValue=15, startDate=tomorrow, endDate=next week), **Then** the offer is saved and appears in the list as SCHEDULED.
2. **Given** a OWNER submitting an offer, **When** startDate is today and the current time is before midnight, **Then** the offer is immediately ACTIVE.
3. **Given** a OWNER submitting a PERCENTAGE offer, **When** discountValue > 100, **Then** the form shows a validation error and does not submit.
4. **Given** a OWNER submitting an offer, **When** endDate is in the past, **Then** the form shows a validation error.
5. **Given** a OWNER who already has 10 SCHEDULED or ACTIVE offers, **When** they attempt to create another, **Then** they receive an error explaining the limit and cannot save.
6. **Given** a OWNER creating an offer with applicableServiceTypes = [REPAIR, MAINTENANCE], **When** the offer is saved, **Then** only those two service types are shown as applicable on the offer detail.

---

### User Story 2 — View Offers List (Priority: P1)

An owner opens the Offers screen to see all their promotions — active, upcoming, past, and cancelled — with clear status badges, discount summaries, and date ranges at a glance.

**Why this priority**: Without visibility into existing offers, the owner cannot manage them. This screen is the hub for all offer management.

**Independent Test**: Create offers with different statuses; confirm the list shows all of them with correct status badges and filter works correctly.

**Acceptance Scenarios**:

1. **Given** a center with 3 offers (1 ACTIVE, 1 SCHEDULED, 1 EXPIRED), **When** the owner opens the Offers screen, **Then** all 3 appear with their correct status badges and discount summaries.
2. **Given** the owner applies a filter for "Active", **When** the list refreshes, **Then** only the ACTIVE offer is shown.
3. **Given** a center with no offers, **When** the owner opens the Offers screen, **Then** an empty state with an "Add Offer" call-to-action is shown.
4. **Given** an offer has `maxRedemptions = 100` and `currentRedemptions = 37`, **When** the owner views the list, **Then** the card shows "37 / 100 redeemed".

---

### User Story 3 — Edit an Offer (Priority: P2)

An owner realises they made a typo in the Arabic title of a SCHEDULED offer, or wants to extend the end date of an ACTIVE promotion that's going well.

**Why this priority**: Mistakes happen and promotions often need extension. Editing prevents cancelling and recreating offers unnecessarily.

**Independent Test**: Edit a SCHEDULED offer's title and discount; edit an ACTIVE offer's end date; confirm immutable fields are locked on active offers.

**Acceptance Scenarios**:

1. **Given** a SCHEDULED offer, **When** the owner edits any field (title, description, discount, dates, service types), **Then** all changes are saved successfully.
2. **Given** an ACTIVE offer, **When** the owner opens the edit screen, **Then** discountType, discountValue, startDate, and applicableServiceTypes fields are read-only (locked); titleAr, titleEn, descriptionAr, descriptionEn, and endDate remain editable.
3. **Given** an ACTIVE offer with endDate = Friday, **When** the owner sets endDate = Monday (earlier than current end date), **Then** the system rejects the change — end date can only be extended for active offers.
4. **Given** an EXPIRED or CANCELLED offer, **When** the owner attempts to open the edit screen, **Then** the edit option is not available — a read-only view is shown instead.

---

### User Story 4 — Cancel an Offer Early (Priority: P2)

An owner's promotion led to unexpectedly high demand and they need to stop it immediately before the scheduled end date.

**Why this priority**: Without cancellation, owners are forced to wait out an offer they no longer want to honour, which can cause disputes with customers.

**Independent Test**: Cancel an ACTIVE offer; confirm it moves to CANCELLED and can no longer be edited.

**Acceptance Scenarios**:

1. **Given** an ACTIVE offer, **When** the owner taps "Cancel Offer" and confirms, **Then** the offer status changes to CANCELLED immediately.
2. **Given** a SCHEDULED offer, **When** the owner cancels it, **Then** the status changes to CANCELLED.
3. **Given** a CANCELLED offer, **When** the owner views it, **Then** no cancel or edit actions are available.
4. **Given** the owner taps "Cancel Offer", **When** a confirmation dialog appears, **Then** the cancellation only proceeds after explicit confirmation (not a single tap).

---

### User Story 5 — View Redemption Count (Priority: P3)

An owner wants to know how effective a promotion has been — how many customers actually used it versus the cap they set.

**Why this priority**: Useful performance indicator, but the counter is read-only in this phase and starts at 0 until the customer app is built.

**Independent Test**: Create an offer with maxRedemptions=50; confirm the offer card and detail screen show "0 / 50 redeemed".

**Acceptance Scenarios**:

1. **Given** an offer with `maxRedemptions = 50`, **When** the owner views it, **Then** the redemption count is displayed as "0 / 50" (or "X / 50" once customer claims exist).
2. **Given** an offer with no `maxRedemptions` set, **When** the owner views it, **Then** only the raw count is shown (e.g., "12 redeemed") with no cap denominator.
3. **Given** `currentRedemptions` equals `maxRedemptions`, **When** the system receives a new redemption attempt, **Then** the redemption is rejected — the offer is considered fully redeemed.

---

### Edge Cases

- What if an offer's start date arrives while the owner is in the middle of editing it (status transitions from SCHEDULED to ACTIVE during the edit session)? → The server enforces field-lock rules at save time; the client receives a validation error explaining that the offer has gone active and some fields are now locked.
- What if two owners of the same center create conflicting offers simultaneously? → No conflict — multiple active offers for the same service type are allowed; the customer sees both.
- What if `discountValue` is 0? → Rejected by validation; an offer of 0 discount has no value.
- What if a FIXED_AMOUNT discount is larger than the service price? → No server-side validation on this (service prices are ranges, not fixed amounts); the owner is responsible for setting a sensible discount.
- What if the owner sets both `maxRedemptions` and a very short date range? → Both constraints are honoured; the offer expires by whichever comes first.
- What if applicableServiceTypes contains a value that doesn't exist in the ServiceType enum? → Rejected by validation with a clear error.

---

## Requirements

### Functional Requirements

- **FR-001** The system MUST allow a OWNER to create an offer with the following fields: `titleAr` (required), `titleEn` (required), `descriptionAr` (optional), `descriptionEn` (optional), `discountType` (PERCENTAGE or FIXED_AMOUNT, required), `discountValue` (required, > 0), `applicableServiceTypes` (optional list of ServiceType values — empty means all services), `startDate` (required), `endDate` (required), `maxRedemptions` (optional positive integer).
- **FR-002** The system MUST compute `offerStatus` automatically based on the current date: `SCHEDULED` if startDate is in the future, `ACTIVE` if today is within the date range, `EXPIRED` if endDate has passed, `CANCELLED` if manually cancelled. Status is never set manually by the owner.
- **FR-003** The system MUST validate at creation and edit time: `endDate > startDate`, `discountValue > 0`, `discountValue ≤ 100` when `discountType = PERCENTAGE`, `endDate` must be in the future.
- **FR-004** The system MUST prevent a center from having more than 10 simultaneous offers in SCHEDULED or ACTIVE status. Attempts to create a new offer that would exceed this limit MUST be rejected with a clear bilingual error.
- **FR-005** The system MUST allow OWNERs to retrieve their offer list paginated, with an optional status filter.
- **FR-006** The system MUST allow editing of SCHEDULED offers with no field restrictions.
- **FR-007** The system MUST allow editing of ACTIVE offers with the following restrictions: `discountType`, `discountValue`, `startDate`, and `applicableServiceTypes` are immutable; `endDate` may only be extended (moved to a later date, never earlier); `titleAr`, `titleEn`, `descriptionAr`, `descriptionEn` remain freely editable.
- **FR-008** The system MUST reject edits to EXPIRED or CANCELLED offers with a clear error.
- **FR-009** The system MUST allow cancellation of SCHEDULED and ACTIVE offers, transitioning their status to CANCELLED immediately.
- **FR-010** The system MUST expose `currentRedemptions` (read-only counter) and `maxRedemptions` (optional cap) on every offer. When `currentRedemptions` reaches `maxRedemptions`, no further redemptions are accepted.
- **FR-011** All user-visible string fields (`titleAr`/`titleEn`, `descriptionAr`/`descriptionEn`) MUST have both Arabic and English variants. The Arabic title is displayed when the app language is Arabic; the English title otherwise.
- **FR-012** Discount amounts of type FIXED_AMOUNT MUST be displayed in KD format with 3 decimal places (e.g., "KD 5.000 off"). PERCENTAGE discounts MUST be displayed as whole numbers (e.g., "15% off").

### Key Entities

- **CenterOffer** — A promotional deal owned by one `MaintenanceCenter`. Fields: `titleAr`, `titleEn`, `descriptionAr` (nullable), `descriptionEn` (nullable), `discountType` (PERCENTAGE / FIXED_AMOUNT), `discountValue` (decimal), `applicableServiceTypes` (list, empty = all), `startDate`, `endDate`, `maxRedemptions` (nullable integer), `currentRedemptions` (integer, default 0), `status` (computed or stored), `createdAt`, `updatedAt`.
- **DiscountType** — Enum: `PERCENTAGE`, `FIXED_AMOUNT`.
- **OfferStatus** — Enum: `SCHEDULED`, `ACTIVE`, `EXPIRED`, `CANCELLED`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001** A center owner can create a complete bilingual offer in under 2 minutes from opening the Add Offer screen to seeing it confirmed in the list.
- **SC-002** An offer whose end date has passed appears as EXPIRED without any manual action by the owner — automatic status transition occurs within 5 minutes of the end date.
- **SC-003** An owner with 10+ offers can locate any specific offer by filtering on status in under 10 seconds.
- **SC-004** Zero offers with invalid discounts (0%, > 100%, or negative amounts) are accepted — caught at submission with a clear inline error.
- **SC-005** A cancelled offer is reflected as CANCELLED immediately in the owner's list — no page reload required.
- **SC-006** The per-center offer cap (10 active/scheduled) is enforced 100% of the time — no center can exceed it regardless of concurrent creation attempts.

---

## Assumptions

- Redemption counting is read-only in this phase. The `currentRedemptions` counter starts at 0 and is incremented by the customer app when customers claim offers (that feature is built separately). No manual increment by the owner is supported.
- No promo/coupon codes in this phase — offers are visible automatically to customers browsing the center's profile. Code-based claiming is deferred.
- An offer with `applicableServiceTypes = []` (empty) applies to all services the center offers. The UI shows this as "All Services".
- The per-center limit of 10 simultaneous SCHEDULED + ACTIVE offers is a hard cap. It can be raised by a platform admin in the future via config.
- Offer status is computed server-side. The server runs a scheduled job or derives status dynamically from dates at query time — no client-side status computation.
- FIXED_AMOUNT discounts are in Kuwaiti Dinar (KD) with 3 decimal precision, consistent with the platform's currency standard.
- The center owner app is the only interface for offer management. There is no admin panel interface for offers in this phase.
- The customer app display of offers is a separate spec that will reference the same backend entities built here.

---

## Dependencies

- Phase 3.5 (Service Pricing) introduced `ServiceType` enum and `CenterServicePricing`. This feature reuses `ServiceType` for `applicableServiceTypes` filtering.
- The existing `MaintenanceCenter` entity is the parent of `CenterOffer` — no new ownership concept is introduced.
- Bilingual i18n keys for this feature must be added to both `en.json` and `ar.json`.

---

## Next Steps

1. Run `/speckit.plan` — schema decisions (stored vs computed status, join table for service types), backend endpoints, RTK Query tag type `Offers`, and new screens: offer list, add offer, edit offer, offer detail.
2. Run `/speckit.tasks` → `/speckit.implement`.
