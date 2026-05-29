# Research: Inventory & Parts Management (Owner)

**Feature**: 025-inventory-parts-management
**Date**: 2026-05-29

> Phase 0 decision records. Each is a standalone decision with rationale and rejected alternatives.

---

## R1 — Parts reach the invoice via the existing quote line items

**Decision**: Parts are added to a customer invoice through the existing `009-work-progress-quotes`
quote, not a new invoicing path. `types/quote.ts` `QuoteLineItem` is extended with `partId?` (catalog
ref), `quantity?`, and `adHoc?`. A catalogued line carries the part's snapshotted sale price; an ad-hoc
line is a one-off that does not touch stock.

**Rationale**: The platform already prices, sends, and approves quotes; the customer sees one quote/
invoice. Bolting a second parts-invoicing mechanism beside it would double the surface and let the two
disagree. The spec says explicitly: "Parts are added to the customer invoice via the existing `009`
quote mechanism; this spec supplies the catalog and stock."

**Alternatives considered**: A separate parts-invoice attached to the booking — rejected: two totals,
two approval flows, reconciliation pain.

---

## R2 — On-hand quantity is derived from a movement ledger

**Decision**: Each part's on-hand is the sum of its `StockMovement`s (`RECEIVE` +, `ADJUST` ±,
`CONSUME` −). Every stock change writes an auditable movement (quantity, actor, reason/booking,
timestamp). Stock value = Σ(on-hand × current cost price).

**Rationale**: A movement ledger gives an audit trail (who changed what, why, tied to which booking),
makes reversal natural (R5), and lets reports reconcile to the sum of movements (SC-004). A bare
`quantity` column would lose all of that.

**Alternatives considered**: Store `quantity` directly and overwrite — rejected: no history, no
reconcile, no reversal; "why is stock wrong?" becomes unanswerable.

---

## R3 — Consumption decrement is atomic; shortfalls are flagged, not hidden

**Decision**: When a quote with catalogued part lines is committed, the backend decrements stock under
a **row lock / atomic conditional update** so two technicians consuming the same part cannot
double-spend (SC-002). Consuming more than on-hand is **warned** at add time and, if allowed by policy,
produces a **flagged backorder/negative** state surfaced in alerts — never a silent negative.

**Rationale**: Concurrency is the classic inventory bug; read-modify-write in app code races. Atomicity
at the DB is the only correct fix. Hiding negative stock would mask real shortages and corrupt reports.

**Alternatives considered**: App-level check-then-decrement — rejected: races under concurrent consume.
Hard-block any consume beyond on-hand — deferred to policy (the spec leaves allow-backorder-vs-block to
`plan`); either way the shortfall must be visible.

---

## R4 — Sale price is snapshotted onto committed quote lines

**Decision**: When a catalogued part is added to a quote, its **sale price is snapshotted** onto the
line. Later edits to the catalog's sale price do **not** change the price on already-committed quotes.

**Rationale**: A quote/invoice the customer saw (or approved) must be stable. Re-pricing history when an
owner adjusts the catalog would change what the customer agreed to.

**Alternatives considered**: Live price lookup at render — rejected: rewrites historical quotes;
breaks the customer's approved total and the settlement (`023`).

---

## R5 — Reversal on quote cancel/decline

**Decision**: If a quote whose parts were already consumed is cancelled or declined, the backend writes
a **compensating reversal movement** that returns the consumed quantity to stock (linked to the same
booking for audit).

**Rationale**: Spec edge case. Parts physically not used should come back to stock; a reversal movement
keeps the ledger honest rather than mutating the original `CONSUME`.

**Alternatives considered**: Delete the original consume movement — rejected: destroys audit history;
a compensating entry is the accounting-correct approach.

---

## R6 — Two permissions: `MANAGE_INVENTORY` and `CONSUME_PARTS`

**Decision**: Add **`MANAGE_INVENTORY`** (catalog CRUD + `RECEIVE`/`ADJUST`; granted OWNER,
BRANCH_MANAGER) and **`CONSUME_PARTS`** (add catalogued/ad-hoc parts to a quote on a booking; granted
OWNER, BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN).

**Rationale**: The spec explicitly distinguishes "catalog management vs. consume-only" — "technicians
may consume parts onto a booking they're assigned, owners/managers manage the catalog." Unlike the
single-new-permission stance taken in `023`/`024`, here the two capabilities are genuinely different
trust levels, so faithful modeling wins: a technician must add parts to their job but must not edit
prices or adjust stock counts.

**Alternatives considered**: One `MANAGE_INVENTORY` for everything — rejected: would either block
technicians from recording the parts they used or let them rewrite the catalog and stock counts.

---

## R7 — Low-stock surfaces in the Attention panel

**Decision**: Items at/below their `reorderThreshold` appear in a `LOW_STOCK` Attention category
(`types/attention.ts` + `ATTENTION_CATEGORY_ORDER`) and in a dedicated reorder list; they leave both
when restocked above threshold.

**Rationale**: Spec US3 + FR-006. The Attention panel (`016`) is the center's "what needs me now" hub;
"reorder this before you run out" belongs there next to overdue bookings and unanswered chats.

**Alternatives considered**: A separate notifications-only alert — rejected: fragments "needs
attention" across two surfaces; the panel already exists for exactly this.

---

## R8 — Barcode scan is a later, optional story (no MVP dependency)

**Decision**: The MVP search is **by name/SKU** (no new dependency). A **barcode scan** to find a part
is a later, optional story (US-Scan, P3) that adds **`expo-camera`** (`CameraView` barcode settings).
The catalog + consume loop ships without it.

**Rationale**: The spec marks scan as optional ("Search & scan… optional barcode scan"). Keeping it out
of US1/US2 means the MVP needs zero new packages and no camera-permission flow; centers can adopt
immediately and scan can follow.

**Alternatives considered**: Bundle barcode in the MVP — rejected: adds a dependency + camera
permissions for a convenience that isn't core to the catalog/consume value.

---

## R9 — Per-center stock; simple cost-price valuation

**Decision**: Stock, movements, and reports are isolated **per center** via the existing `activeCenterId`
+ `centers/my/...` pattern. v1 valuation uses the **current cost price** (no FIFO / weighted-average);
no multi-warehouse, no per-unit serial/lot tracking.

**Rationale**: Spec out-of-scope is explicit on all three. Per-center isolation matches every other
center domain. Current-cost valuation is the simplest correct number for a v1 dashboard; advanced
costing is a later finance concern.

**Alternatives considered**: Weighted-average/FIFO valuation in v1 — rejected by scope; adds costing
complexity disproportionate to the first release.
