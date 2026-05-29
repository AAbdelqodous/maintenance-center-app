# Data Model: Inventory & Parts Management (Owner)

**Feature**: 025-inventory-parts-management
**Date**: 2026-05-29

> Frontend types (`types/inventory.ts`) + backend entities. Prices **KD, 3 decimals**
> (`lib/utils/pricing.ts → formatKD`). On-hand is **derived from movements** (R2); the backend is
> authoritative.

---

## Enums

### `Unit`
`'PIECE' | 'LITRE' | 'SET' | 'METER' | 'PAIR'`

### `MovementType`
| Value | Sign | Meaning |
|-------|------|---------|
| `RECEIVE` | + | Restock; optional unit cost |
| `ADJUST` | ± | Count correction; reason required |
| `CONSUME` | − | Used on a booking (via quote commit) |
| `CONSUME_REVERSAL` | + | Compensating return on quote cancel/decline (R5) |

---

## Frontend Types (`types/inventory.ts`)

### `Part`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `number` | ✅ | |
| `nameAr` / `nameEn` | `string` | ✅ | Bilingual |
| `sku` | `string` | ✅ | Part number; unique per center |
| `category` | `string?` | optional | Free grouping |
| `unit` | `Unit` | ✅ | |
| `costPrice` | `number` | ✅ | KD |
| `salePrice` | `number` | ✅ | KD |
| `supplier` | `string?` | optional | Free text |
| `reorderThreshold` | `number` | ✅ | Low-stock trigger |
| `onHand` | `number` | ✅ | Derived from movements |
| `isActive` | `boolean` | ✅ | Deactivated parts excluded from new quotes |

### `StockMovement`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | |
| `partId` | `number` | |
| `type` | `MovementType` | |
| `quantity` | `number` | **Signed** |
| `unitCost` | `number?` | For `RECEIVE` |
| `reason` | `string?` | For `ADJUST` |
| `bookingId` | `number?` | For `CONSUME`/`CONSUME_REVERSAL` |
| `actorName` | `string` | Who performed it |
| `createdAt` | `string` (ISO) | |

### `CreatePartRequest` / update

`{ nameAr, nameEn, sku, category?, unit, costPrice, salePrice, supplier?, reorderThreshold }`
(update allows `isActive`).

### `ReceiveStockRequest`
`{ quantity: number; unitCost?: number }`

### `AdjustStockRequest`
`{ newOnHand: number; reason: string }` (backend records the delta as a signed `ADJUST`)

### `LowStockItem`
`{ partId, nameAr, nameEn, sku, onHand, reorderThreshold, supplier?, suggestedReorderQty }`

### `InventoryReport`

| Field | Type | Notes |
|-------|------|-------|
| `from` / `to` | `string` (ISO date) | Range |
| `stockValue` | `number` | Σ(onHand × costPrice) at cost |
| `usage` | `{ partId; nameEn; nameAr; consumedQty; }[]` | Over the range |
| `fastMovers` / `slowMovers` | `partId[]` | Top/bottom by consumed qty |
| `partsMargin` | `number` | Σ((sale − cost) × consumed) on consumed parts |
| `reorder` | `LowStockItem[]` | Current low-stock list |

### Modified: `types/quote.ts → QuoteLineItem`

| Field | Change |
|-------|--------|
| `partId` | NEW optional `number` — catalogued part ref (null = pure labor or ad-hoc) |
| `quantity` | NEW optional `number` — units consumed (default 1 for a part line) |
| `adHoc` | NEW optional `boolean` — true = one-off part not in the catalog (no stock effect) |

> `partsCost` continues to hold the line's parts price (snapshotted from `salePrice × quantity` at add
> time, R4); `laborCost` unchanged. Existing `kind` (`STANDARD`/`DIAGNOSTIC_FEE`) is untouched.

---

## Backend Entities (`service-center/.../inventory`)

### `Part`
`id`, `center` (`@ManyToOne`), `nameAr`, `nameEn`, `sku`, `category`, `unit` (enum), `costPrice`
DECIMAL(10,3), `salePrice` DECIMAL(10,3), `supplier`, `reorderThreshold`, `isActive`, audit listener.
**Unique `(center_id, sku)`**. `onHand` is **derived** (not stored) or maintained as a cached column
updated atomically alongside each movement.

### `StockMovement`
`id`, `part` (`@ManyToOne`), `type` (enum), `quantity` (signed), `unitCost` (nullable), `reason`
(nullable), `booking` (`@ManyToOne` nullable), `actor` (`@ManyToOne User`), `@CreatedDate createdAt`.

### Quote line (existing `quote` package) — MODIFIED
`QuoteLineItem` gains `part` (`@ManyToOne Part` nullable), `quantity`, `adHoc`. Sale price snapshotted
into the existing parts-cost field at add time.

---

## State Transitions

### Stock lifecycle

```
create Part (MANAGE_INVENTORY) → onHand 0
RECEIVE qty (+cost) ───────────► onHand += qty   [movement RECEIVE]
ADJUST to newOnHand (+reason) ─► onHand  = newOnHand   [movement ADJUST signed delta]
add Part to a quote (CONSUME_PARTS) → line snapshots salePrice×qty (R4)
   quote committed/approved ───► onHand −= qty (ATOMIC, R3)   [movement CONSUME, booking-linked]
   quote cancelled/declined ───► onHand += qty   [movement CONSUME_REVERSAL] (R5)
onHand ≤ reorderThreshold ─────► LOW_STOCK Attention item + reorder list (R7)
restock above threshold ───────► leaves low-stock list
deactivate Part (onHand>0 ok) ─► excluded from new quotes; flagged in reports
```

### Consume guard (concurrency)

```
two technicians commit quotes consuming part P simultaneously
   → backend decrements P under row lock / atomic conditional update
   → second sees updated onHand; no double-spend (SC-002)
   → if requested qty > onHand → warn; flagged backorder/negative (never silent, R3)
```

### Quote line kinds

```
QuoteLineItem:
  partId set, adHoc false  → catalogued part → affects stock on commit, price snapshot
  adHoc true               → one-off part    → priced on quote, NO stock effect
  partId null, adHoc false → pure labor line (existing behavior)
```

---

## Validation Rules

- `sku` unique per center; creating a duplicate SKU is rejected.
- `costPrice`, `salePrice`, `reorderThreshold` ≥ 0; KD via shared formatter.
- On-hand = Σ(movements); reports MUST reconcile to that sum (SC-004); never store a quantity that
  diverges from its movements.
- **Consume is atomic**; consuming > on-hand is warned and any resulting negative/backorder is **flagged**
  and surfaced in alerts, never silent (R3).
- Catalogued part line **snapshots** `salePrice` at add time; later catalog price edits don't change
  committed quote lines (R4).
- Cancelling/declining a quote with consumed parts writes a **reversal** movement returning stock (R5).
- Catalog CRUD + receive/adjust require `MANAGE_INVENTORY`; adding parts to a quote requires
  `CONSUME_PARTS`; reports require `VIEW_REPORTS` (export `GENERATE_REPORTS`). Client disables;
  backend enforces (R6).
- Stock, movements, reports scoped to the **active center**; deactivating a part with on-hand > 0 is
  allowed but the part is excluded from new quotes and flagged in reports.
- Ad-hoc lines never affect stock and are visibly tagged ad-hoc.
