# Quickstart: Inventory & Parts Management (Owner)

**Branch**: `025-inventory-parts-management`
**Date**: 2026-05-29

---

## Prerequisites

- Center app builds and runs (feature-complete for prior phases).
- `009-work-progress-quotes` — parts attach to the existing quote line items.
- `011-center-staff-permissions` — gating (new `MANAGE_INVENTORY` + `CONSUME_PARTS`).
- `016-attention-required-panel` — low-stock surfaces there (new `LOW_STOCK` category).

Verify reuse / integration points:
```bash
cd ~/MaintenanceCenter/maintenance-center-app
grep -n "export interface QuoteLineItem" types/quote.ts        # extended by T-quote (partId/quantity/adHoc)
grep -n "append({ description" components/quotes/QuoteBuilder.tsx  # where catalog add hooks in
grep -n "export function formatKD" lib/utils/pricing.ts        # reused (must exist)
grep -n "MANAGE_INVENTORY\|CONSUME_PARTS" types/staff.ts        # added by this feature
grep -n "LOW_STOCK" types/attention.ts                          # added by this feature
```

---

## New packages

**None for the MVP** (US1–US4). Search is by name/SKU. Barcode scan (US-Scan, P3) adds **`expo-camera`**
later — deferred to keep the MVP dependency-free (`research.md` R8).

---

## Environment Setup

No new frontend env vars.
```bash
# .env (already configured)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
```

---

## Backend Requirements

| Endpoint | Status | Required for |
|----------|--------|--------------|
| `GET /centers/my/parts` (+search/lowStock) | **Not yet implemented** | Catalog / PartPicker |
| `POST|PUT|DELETE /centers/my/parts[/{id}]` | **Not yet implemented** | Catalog CRUD |
| `GET /centers/my/parts/{id}/movements` | **Not yet implemented** | Movement history |
| `POST /centers/my/parts/{id}/receive` · `…/adjust` | **Not yet implemented** | Stock ops |
| `GET /centers/my/inventory/low-stock` | **Not yet implemented** | Reorder list / Attention |
| `GET /centers/my/inventory/report` | **Not yet implemented** | Reports / export |
| Quote-commit consume + cancel-reverse hook | **Not yet implemented** | Stock decrement/reversal |

See `contracts/inventory-api.md` for exact shapes.

**Develop without the backend (stub):** `GET /centers/my/parts` → a few `Part`s with `onHand`;
`POST …/receive` → onHand += qty; quote commit (stub) decrements; `GET …/low-stock` → an item at
threshold; verified `InventoryReport`. Flip an item to/below threshold to exercise the `LOW_STOCK`
Attention path.

---

## Running the App

```bash
npx expo start --web      # fastest for catalog + forms + reports
npx expo start            # native (a/i)
```

---

## New files to create

```
types/inventory.ts
store/api/inventoryApi.ts
components/inventory/PartCard.tsx
components/inventory/PartForm.tsx
components/inventory/PartPicker.tsx
app/(app)/(tabs)/profile/inventory/_layout.tsx
app/(app)/(tabs)/profile/inventory/index.tsx
app/(app)/(tabs)/profile/inventory/[id].tsx
app/(app)/(tabs)/profile/inventory/reports.tsx
```

## Files to modify

```
types/quote.ts                       # QuoteLineItem += partId?, quantity?, adHoc?
types/staff.ts                       # add 'MANAGE_INVENTORY' (OWNER/BRANCH_MANAGER) + 'CONSUME_PARTS' (+RECEPTIONIST/TECHNICIAN)
types/attention.ts                   # add 'LOW_STOCK' to AttentionCategory + ATTENTION_CATEGORY_ORDER
store/index.ts                       # register inventoryApi
components/quotes/QuoteBuilder.tsx    # "Add part from catalog" → PartPicker → line item (price snapshot)
app/(app)/(tabs)/profile/index.tsx   # "Inventory & Parts" entry (gated by MANAGE_INVENTORY)
app/(app)/(tabs)/_layout.tsx          # register profile/inventory routes (href:null, not a tab)
lib/i18n/locales/en.json             # inventory.* keys
lib/i18n/locales/ar.json             # mirror
```

---

## Smoke test (happy paths)

1. **Catalog + stock** — add a part (name, SKU, cost/sale, unit, reorder threshold) → receive 10 →
   on-hand shows 10; movement history shows the receipt; stock value reflects 10 × cost.
2. **Adjust** — record an adjust to 8 with a reason → on-hand 8; ADJUST movement logged with reason + actor.
3. **Parts on a quote** — open a booking quote → **Add part from catalog** (qty 2) → it appears as a
   priced line at sale price → approve/commit → on-hand drops by 2; a CONSUME movement is tied to the
   booking + actor.
4. **Ad-hoc part** — add a one-off part to a quote → it prices onto the quote but stock is unaffected; tagged ad-hoc.
5. **Low stock** — consume until on-hand ≤ threshold → the item appears in the reorder list and the
   `LOW_STOCK` Attention panel; restock above threshold → it leaves both.
6. **Reversal** — cancel/decline a committed quote that consumed parts → stock returns (CONSUME_REVERSAL).
7. **Reports** — pick a range → stock value, usage, fast/slow movers, parts margin, reorder list; export
   CSV/PDF; totals reconcile to movements.
8. **Permissions** — TECHNICIAN can add parts to their assigned booking's quote (`CONSUME_PARTS`) but
   cannot edit the catalog or receive/adjust stock (`MANAGE_INVENTORY`); OWNER/BRANCH_MANAGER can.

---

## Verification checklist

- [ ] On-hand == sum of movements; reports reconcile to the ledger (no divergence).
- [ ] Consume is atomic — concurrent consume of the same part never double-spends; shortfall is flagged, not silent.
- [ ] Catalogued quote line snapshots sale price; later catalog price edits don't change committed quotes.
- [ ] Cancel/decline of a consumed quote reverses stock.
- [ ] Catalog/receive/adjust gated by `MANAGE_INVENTORY`; add-to-quote by `CONSUME_PARTS`; reports by `VIEW_REPORTS`.
- [ ] Low-stock items appear in the `LOW_STOCK` Attention panel + reorder list; leave when restocked.
- [ ] Prices via `formatKD` (3 decimals); no inline `toFixed`/hardcoded `KD`.
- [ ] Multi-branch: switching `activeCenterId` swaps the catalog/stock; no cross-branch leakage.
- [ ] Deactivating a part with on-hand > 0 is allowed and excludes it from new quotes.
- [ ] RTL spot-check: catalog rows, part form, movement history, reports, quote part lines.
