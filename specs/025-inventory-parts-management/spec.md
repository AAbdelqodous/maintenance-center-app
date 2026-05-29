# Feature Specification: Inventory & Parts Management (Owner)

**Feature Branch:** `025-inventory-parts-management`
**Status:** Draft
**Created:** 2026-05-29
**Phase:** specify (next: plan → tasks → implement)
**Input:** Operational feature for centers — track parts/consumables stock, attach parts to a booking's quote so they flow onto the customer invoice, decrement stock as parts are used, and get low-stock alerts. Turns the app from a booking tool into the shop's daily operations tool (stickiness).

> **Spec Kit reminder:** This describes WHAT and WHY. Tables, endpoints, and barcode-SDK choices belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Requires** `specs/009-work-progress-quotes` — parts are added as line items on the quote; this spec supplies the catalog and stock behind those lines.
- **Requires** `specs/011-center-staff-permissions` — a `MANAGE_INVENTORY` permission gates stock edits; technicians may consume parts onto a booking they're assigned, owners/managers manage the catalog.
- **Relates to** `specs/023-payments-earnings-payouts` — parts lines become part of the settled invoice; `specs/020-center-departments` — stock and usage may be viewed per department; `specs/018-staff-performance-board` — parts usage can attribute to staff.

---

## 1. Summary

Service centers live and die by parts: what's in stock, what a job consumed, and what to reorder.
Today the platform has no concept of inventory, so parts on a quote are free-text and stock lives in a
notebook or a separate system. This feature gives the center a **parts catalog with live stock**,
the ability to **attach catalogued parts to a booking's quote** (which decrements stock on use), and
**low-stock alerts** — making the app the place the shop runs its day, not just where bookings arrive.

Capabilities:

1. **Parts catalog**: items with bilingual name, SKU/part number, category, cost price, sale price,
   unit, supplier, and current quantity on hand.
2. **Stock movements**: receive stock (restock), adjust (count correction), and consume (onto a booking).
3. **Parts on a quote**: add catalogued parts (or ad-hoc parts) to a booking quote at the configured
   sale price; on quote approval/use the quantity is decremented and a consumption movement recorded.
4. **Low-stock alerts**: per-item reorder threshold; items at/below it surface in an alerts view and the
   `016` Attention panel.
5. **Inventory reports**: stock value, usage over a period, fast/slow movers, reorder list.

---

## 2. Why Now

- It deepens daily engagement: an owner who tracks stock in the app opens it many times a day, which
  makes the platform sticky and raises the cost of leaving — the strongest retention lever for the supply side.
- It closes a correctness gap in quotes/invoices: parts are currently free-text, so prices are
  inconsistent and the customer-facing invoice can't be trusted to reflect real parts and margins.
- It composes with payments (`023`) — accurate parts lines mean accurate invoices, commissions, and
  margins; the owner finally sees cost vs. sale margin per job.
- Centers repeatedly ask for "do you also handle my parts?" as a buying objection; answering yes
  removes a reason to keep a separate (or paper) system.

---

## 3. Scope

### In scope

- **Parts catalog CRUD**: create/edit/deactivate items — bilingual name, SKU/part number, optional
  category/grouping, unit (piece/litre/set), cost price, sale price, supplier (free text), reorder threshold.
- **Stock on hand** per item; **stock movements**: `RECEIVE` (restock with quantity + optional cost),
  `ADJUST` (correction with reason), `CONSUME` (tied to a booking).
- **Add parts to a booking quote**: pick from the catalog (search by name/SKU) or add an ad-hoc part;
  quantity and sale price flow to the quote as line items per `009`.
- **Consumption on approval/use**: when the quote's parts are committed (approved/used), stock
  decrements and a `CONSUME` movement is recorded against the booking and the acting user.
- **Low-stock alerts**: items at/below reorder threshold appear in an alerts list and the `016` Attention panel.
- **Search & scan**: search catalog by name/SKU; optional **barcode scan** to find an item.
- **Inventory reports**: total stock value (at cost), usage over a date range, low-stock/reorder list,
  and per-item movement history; exportable.
- **Permissions**: catalog management vs. consume-only, per `011`.
- **Multi-branch**: stock is per center (active center context).

### Out of scope (explicitly deferred)

- **Purchase orders & supplier integration** (auto-ordering, supplier APIs). v1 records receipts manually.
- **Multi-warehouse / stock transfer between branches.** Stock is per center; transfers are a follow-up.
- **Serialized/lot tracking** (per-unit serial numbers, expiry/batch for fluids). v1 tracks quantity only.
- **Automatic parts suggestions** by service type / vehicle (ML). v1 is manual selection.
- **Customer-facing parts catalog or e-commerce.** Inventory is owner-internal; only the parts on a
  given quote are shown to that booking's customer.
- **Costing methods beyond a simple cost price** (FIFO/weighted-average valuation). v1 uses the current
  cost price for valuation.

---

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **Part / Item** | A catalogued stock-keeping unit the center buys and sells/consumes. |
| **Stock on hand** | Current quantity available for an item at this center. |
| **Movement** | A change to stock: `RECEIVE`, `ADJUST`, or `CONSUME`, each timestamped and attributed. |
| **Consume** | Using a part on a booking, decrementing stock and creating a quote line. |
| **Reorder threshold** | The quantity at/below which an item is flagged low-stock. |
| **Stock value** | Sum of (on-hand × cost price) across items, used in reports. |
| **Ad-hoc part** | A one-off part on a quote that is not (yet) in the catalog; does not affect stock. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain a Parts Catalog with Stock (Priority: P1)

An owner adds parts to the catalog (name, SKU, cost/sale price, unit, reorder threshold), receives
stock for them, and sees the on-hand quantity and stock value update.

**Why this priority**: The catalog with live quantities is the foundation; nothing can be consumed or reported without it.

**Independent Test**: Create an item, receive 10 units at a cost, and verify on-hand shows 10, the movement history records the receipt, and stock value reflects 10 × cost.

**Acceptance Scenarios**:

1. **Given** the catalog, **When** a permitted user creates an item with bilingual name, SKU, unit, cost/sale price, and reorder threshold, **Then** it is saved and listed with on-hand 0.
2. **Given** an item, **When** the user records a `RECEIVE` of 10 units, **Then** on-hand becomes 10 and a receipt movement is logged with quantity, cost, and timestamp.
3. **Given** a miscount, **When** the user records an `ADJUST` with a reason, **Then** on-hand updates and the adjustment (with reason and actor) is in the movement history.
4. **Given** a user without `MANAGE_INVENTORY`, **When** they attempt to edit the catalog or receive stock, **Then** the action is unavailable per `011`.

---

### User Story 2 - Add Parts to a Quote and Decrement Stock (Priority: P1)

A technician working a booking adds two catalogued parts to the quote; the parts appear as priced line
items on the customer's quote, and when the quote is approved/used, stock decrements and the usage is recorded.

**Why this priority**: This is where inventory connects to revenue and the customer invoice — the core integration with quotes/payments.

**Independent Test**: On a booking quote, add a part (qty 2) from the catalog; approve/use the quote; verify the quote shows the part lines at sale price, on-hand dropped by 2, and a `CONSUME` movement is tied to the booking and the technician.

**Acceptance Scenarios**:

1. **Given** a booking with a quote in progress, **When** a permitted user searches the catalog and adds a part with a quantity, **Then** it appears on the quote as a line item at the item's sale price (editable per `009`).
2. **Given** parts on a quote, **When** the quote is approved/committed, **Then** stock for each part decrements by its quantity and a `CONSUME` movement is recorded against the booking and acting user.
3. **Given** a part with insufficient on-hand, **When** the user tries to consume more than available, **Then** they are warned and may proceed as a backorder or add as ad-hoc per policy (decided in plan), never silently going negative without a flag.
4. **Given** an ad-hoc (non-catalog) part, **When** it is added to a quote, **Then** it prices onto the quote but does not affect stock and is flagged as ad-hoc.

---

### User Story 3 - Low-Stock Alerts & Reorder List (Priority: P2)

An item drops to/below its reorder threshold after consumption; it appears in a low-stock alerts view
and in the `016` Attention panel so the owner knows to reorder.

**Why this priority**: Prevents stockouts that stall jobs; high operational value but the catalog+consume loop works without it.

**Acceptance Scenarios**:

1. **Given** an item with a reorder threshold of 3, **When** consumption brings on-hand to 3 or below, **Then** it appears in the low-stock list and the `016` Attention panel.
2. **Given** low-stock items, **When** the owner opens the reorder list, **Then** items are listed with on-hand, threshold, supplier, and suggested reorder quantity.
3. **Given** a low-stock item is restocked above threshold, **When** the receipt is recorded, **Then** it leaves the low-stock list and Attention panel.

---

### User Story 4 - Inventory Reports & Margin Visibility (Priority: P3)

The owner reviews stock value, usage over the last month, fast/slow movers, and the cost-vs-sale margin
on parts consumed.

**Why this priority**: Valuable management insight; not required for the operational core.

**Acceptance Scenarios**:

1. **Given** a date range, **When** the owner opens inventory reports, **Then** total stock value (at cost), parts usage, fast/slow movers, and parts margin (sale − cost on consumed parts) are shown and exportable.
2. **Given** movement history for an item, **When** the owner opens it, **Then** every RECEIVE/ADJUST/CONSUME is listed with quantity, actor, related booking (for consume), and timestamp.

### Edge Cases

- Concurrent consumption of the same item by two technicians → stock is decremented atomically; the second sees the updated on-hand (no double-spend).
- Quote with parts is declined/cancelled after consumption was recorded → consumption is reversed (stock returns) and a compensating movement is logged.
- Re-route (`022`) of a booking after parts were consumed → consumed parts stay attributed to the booking; the new department continues from there.
- Editing an item's sale price → does not retroactively change prices on already-committed quotes (price snapshotted at add time).
- Deactivating an item with on-hand > 0 → allowed, but it is excluded from new quotes and flagged in reports.
- Negative stock from a backorder → clearly flagged, not hidden, and surfaced in alerts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A permitted user MUST be able to create, edit, and deactivate catalog items with bilingual name, SKU/part number, optional category, unit, cost price, sale price, supplier, and reorder threshold.
- **FR-002**: The system MUST track stock on hand per item per center and record every change as a `RECEIVE`, `ADJUST`, or `CONSUME` movement with quantity, actor, reason/booking, and timestamp.
- **FR-003**: Users MUST be able to add catalogued parts (searchable by name/SKU, optionally via barcode scan) or ad-hoc parts to a booking's quote as priced line items per `009`.
- **FR-004**: On quote approval/commit, catalogued parts MUST decrement stock and record a `CONSUME` movement tied to the booking and acting user; ad-hoc parts MUST NOT affect stock.
- **FR-005**: The system MUST warn (not silently allow) when consuming more than on-hand, and MUST flag any resulting negative/backorder stock.
- **FR-006**: Items at/below their reorder threshold MUST appear in a low-stock alerts view and in the `016` Attention Required panel, and leave it when restocked above threshold.
- **FR-007**: Part sale prices on a committed quote MUST be snapshotted and not change when the catalog price later changes.
- **FR-008**: Cancelling/declining a quote whose parts were consumed MUST reverse the consumption with a compensating movement returning stock.
- **FR-009**: The system MUST provide inventory reports — stock value at cost, usage over a date range, fast/slow movers, parts margin, and a reorder list — exportable and bilingual.
- **FR-010**: Catalog management vs. consume-only actions MUST be gated by `011-center-staff-permissions` (`MANAGE_INVENTORY`).
- **FR-011**: Stock and reports MUST be scoped to the active center for multi-branch owners.
- **FR-012**: Concurrent consumption MUST be atomic so stock cannot be double-spent.
- **FR-013**: All monetary values MUST be KD (3 decimals) and labels bilingual (AR/EN).

### Key Entities

- **Part / Catalog Item**: bilingual name, SKU/part number, category, unit, cost price, sale price, supplier, reorder threshold, active flag, on-hand quantity (derived from movements).
- **Stock Movement**: item, type (`RECEIVE/ADJUST/CONSUME`), quantity (signed), unit cost (for receive), reason (for adjust), related booking + actor (for consume), timestamp.
- **Quote Part Line** (extends `009` quote): catalog item reference or ad-hoc, quantity, snapshotted sale price, ad-hoc flag.
- **Low-Stock Alert** (derived): items at/below reorder threshold.
- **Inventory Report** (derived): stock value, usage, movers, margins, reorder list over a period.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can add a part and receive stock in under 60 seconds.
- **SC-002**: Adding a catalogued part to a quote and committing it correctly decrements stock 100% of the time, including under concurrent use (no double-spend in testing).
- **SC-003**: Low-stock items appear in alerts within seconds of crossing the threshold.
- **SC-004**: Inventory reports reconcile to the sum of movements with zero discrepancy in testing.
- **SC-005**: Centers using inventory open the app on more days per week than centers that don't (engagement/stickiness lift) within 3 months.
- **SC-006**: Parts lines on customer invoices reflect catalogued prices (consistency), eliminating free-text parts pricing errors.

## Assumptions

- Parts are added to the customer invoice via the existing `009` quote mechanism; this spec supplies the catalog and stock, not a parallel invoicing path.
- v1 valuation uses the current cost price (no FIFO/weighted-average).
- Barcode scanning uses the device camera and a standard scanning library; exact library is a `plan.md` decision.
- Backorder policy (allow negative with a flag vs. block) is finalized in plan; the spec requires it be visible either way.
- Multi-branch stock is isolated per center using the existing `activeCenterId` context.
