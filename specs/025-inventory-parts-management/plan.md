# Implementation Plan: Inventory & Parts Management (Owner)

**Branch**: `025-inventory-parts-management` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/025-inventory-parts-management/spec.md`

---

## Summary

Give centers a **parts catalog with live stock**, the ability to **attach catalogued parts to a
booking's quote** (which decrements stock on commit), and **low-stock alerts**. Turns the app into the
shop's daily operations tool (stickiness) and makes customer invoices reflect real, consistently-priced
parts instead of free text.

Capabilities: catalog CRUD (bilingual name, SKU, unit, cost/sale price, supplier, reorder threshold);
stock movements (`RECEIVE` / `ADJUST` / `CONSUME`); parts-on-quote (catalogued or ad-hoc) flowing into
the existing `009-work-progress-quotes` line items; consumption decrement on quote commit with reversal
on cancel; low-stock surfacing in the `016` Attention panel; and inventory reports (stock value, usage,
movers, margin, reorder list).

This is a **standalone center feature** (no customer mirror). It **integrates** with: the quote object
(`types/quote.ts` `QuoteLineItem` — extended with a catalog part ref), permissions (`011` — new
`MANAGE_INVENTORY` + `CONSUME_PARTS`), the Attention panel (`016` — new `LOW_STOCK` category), and money
formatting (`lib/utils/pricing.ts → formatKD`).

**Scope spans two repos**: `[Frontend]` = `maintenance-center-app/`, `[Backend]` = new `inventory`
package + quote-commit consumption hook.

**Frontend — files to add (9)**: `types/inventory.ts`, `store/api/inventoryApi.ts`,
`app/(app)/(tabs)/profile/inventory/_layout.tsx`, `.../inventory/index.tsx` (catalog),
`.../inventory/[id].tsx` (item + movements), `.../inventory/reports.tsx`,
`components/inventory/PartCard.tsx`, `components/inventory/PartForm.tsx`,
`components/inventory/PartPicker.tsx` (used in the quote builder).
**Frontend — files to modify (7)**: `types/quote.ts` (`QuoteLineItem` += part ref),
`components/quotes/QuoteBuilder.tsx` (add-from-catalog), `types/staff.ts` (`MANAGE_INVENTORY`,
`CONSUME_PARTS`), `types/attention.ts` (`LOW_STOCK`), `store/index.ts`,
`app/(app)/(tabs)/profile/index.tsx` (entry), `lib/i18n/locales/{en,ar}.json`.

---

## Technical Context

**Language/Version**: TypeScript (RN 0.81.5, Expo SDK 54) — frontend; Java 17, Spring Boot 3.5.6 — backend
**Primary Dependencies**: RTK Query + Redux Toolkit; Spring Data JPA + Hibernate; Expo Router; existing `quotesApi`, `staffApi`, Attention panel. **Optional later**: `expo-camera` (barcode scan, US-Scan only — not in the MVP)
**Storage**: PostgreSQL 15 (new `part`, `stock_movement` tables; `quote_line_item` gains a part ref); RTK Query cache
**Testing**: `tsc --noEmit` (frontend); Spring Boot test slice + **stock-decrement / concurrency / reversal** unit tests (backend)
**Target Platform**: iOS, Android, Web (react-native-web)
**Project Type**: Mobile app (frontend) + REST API extension (backend)
**Performance Goals**: Add part / receive stock < 60s (SC-001); catalog list < 300ms p95; low-stock alert appears within seconds of crossing threshold (SC-003); consume decrement is **atomic** (no double-spend, SC-002)
**Constraints**: Bilingual + RTL; KD 3 decimals (reuse `formatKD`); center-scoped via JWT + `activeCenterId` (stock per center); catalog/stock gated by `MANAGE_INVENTORY`, consume by `CONSUME_PARTS`; **price snapshot** on committed quote lines (catalog price changes don't rewrite past quotes)
**Scale/Scope**: Hundreds–low-thousands of parts per center; concurrent consumption by multiple technicians

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md approved before plan |
| II. Bilingual First | ✅ Pass | Part name `nameAr/nameEn`; all UI via i18n; KD via shared formatter; RTL on catalog/forms/reports |
| III. Component-Driven UI | ✅ Pass | PartCard, PartForm, PartPicker independent; screens compose them |
| IV. API Contract Adherence | ✅ Pass | RTK Query; JWT; `BusinessErrorCode`; no hardcoded URLs |
| V. Owner-Context Awareness | ✅ Pass | Stock/movements/reports center-scoped (`centers/my/inventory`); gated by `MANAGE_INVENTORY`/`CONSUME_PARTS`; per-branch `activeCenterId` |
| VI. Security & Privacy | ✅ Pass | JWT in SecureStore; inventory is owner-internal — only parts on a given quote are exposed to that booking's customer |
| VII. Production Readiness | ✅ Pass | No feature flags; error boundaries; negative/backorder stock surfaced, never silently hidden |

No violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/025-inventory-parts-management/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── inventory-api.md ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source code

```text
# ── Frontend (maintenance-center-app/) ──
types/
├── inventory.ts                      NEW — Part, StockMovement, types, reports
├── quote.ts                          MODIFIED — QuoteLineItem += partId?, quantity?, adHoc?
├── staff.ts                          MODIFIED — add 'MANAGE_INVENTORY', 'CONSUME_PARTS'
└── attention.ts                      MODIFIED — add 'LOW_STOCK'
store/api/
└── inventoryApi.ts                   NEW — catalog CRUD, movements, low-stock, reports
store/index.ts                        MODIFIED — register inventoryApi
app/(app)/(tabs)/profile/inventory/   NEW (nested stack; href:null — reached from profile, not a tab)
├── _layout.tsx
├── index.tsx                         catalog list + search + low-stock filter
├── [id].tsx                          item detail + stock movements + receive/adjust
└── reports.tsx                       stock value / usage / movers / margin / reorder list
components/inventory/
├── PartCard.tsx                      NEW — name, SKU, on-hand, price, low-stock badge
├── PartForm.tsx                      NEW — create/edit item
└── PartPicker.tsx                    NEW — search catalog by name/SKU; used in QuoteBuilder
components/quotes/
└── QuoteBuilder.tsx                  MODIFIED — "Add part from catalog" → PartPicker → line item
app/(app)/(tabs)/profile/index.tsx    MODIFIED — "Inventory & Parts" entry (gated)
lib/i18n/locales/{en,ar}.json         MODIFIED — inventory.* keys

# ── Backend (service-center/src/main/java/com/maintainance/service_center/) ──
inventory/                            NEW
├── Part.java, Unit.java (enum)
├── StockMovement.java, MovementType.java (RECEIVE/ADJUST/CONSUME)
├── InventoryController.java, InventoryService.java (atomic decrement, reversal)
└── reports/  (stock value, usage, movers, margin, reorder)
quote/  (existing) MODIFIED — QuoteLineItem gains part ref; on quote commit → consume; on cancel → reverse
```

**Structure Decision**: Inventory screens live under `app/(app)/(tabs)/profile/inventory/` (the home for
owner config, alongside `profile/pricing` / `profile/offers`), `href:null` — reached from Profile, not a
new tab. Parts reach the customer invoice **only** via the existing `009` quote line items (extended with
a catalog ref); there is no parallel invoicing path. Backend adds an `inventory` package and a
**consumption hook on quote commit**.

---

## Phase 0: Research

> Full records in `research.md`. Summary:

- **R1 — Parts reach invoices via the existing quote.** Extend `QuoteLineItem` with `partId?`,
  `quantity?`, `adHoc?`; no parallel invoicing. Catalogued lines decrement stock on commit; ad-hoc lines
  don't touch stock.
- **R2 — On-hand is derived from movements** (`RECEIVE`/`ADJUST`/`CONSUME`); every change is an auditable
  movement. Stock value = Σ(on-hand × cost).
- **R3 — Consumption decrement is atomic.** Concurrent technicians can't double-spend; the backend
  decrements under a row lock / atomic update. Insufficient stock is **flagged** (backorder/negative
  visible), never silently negative.
- **R4 — Price snapshot on committed quote lines.** A part's sale price is snapshotted onto the quote
  line at add time; later catalog price edits don't rewrite committed quotes.
- **R5 — Reversal on quote cancel/decline.** If a quote whose parts were consumed is cancelled, a
  compensating `CONSUME`-reversal movement returns stock.
- **R6 — Two permissions.** `MANAGE_INVENTORY` (catalog CRUD + receive/adjust; OWNER, BRANCH_MANAGER) and
  `CONSUME_PARTS` (add parts to a quote; OWNER, BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN). The spec
  explicitly splits these; faithful over minimal here.
- **R7 — Low-stock → Attention.** Items at/below threshold surface in a `LOW_STOCK` Attention category
  (`016`) and a reorder list; leave when restocked.
- **R8 — Barcode scan is a later, optional story.** Search by name/SKU is the MVP path (no new dep); a
  `expo-camera` barcode scan is added only in the Scan story (US-Scan, P3).
- **R9 — Per-center stock + valuation method.** Stock isolated per `activeCenterId`; v1 valuation uses
  current cost price (no FIFO/weighted-average).

---

## Phase 1: Design & Contracts

### Data model (`data-model.md`)

Frontend `types/inventory.ts` — `Part`, `Unit`, `StockMovement`, `MovementType`, `CreatePartRequest`,
`ReceiveStockRequest`, `AdjustStockRequest`, `LowStockItem`, `InventoryReport`. `QuoteLineItem` gains
`partId?`/`quantity?`/`adHoc?`. Backend — `Part`, `StockMovement` entities + quote-line part ref. Full
tables + transitions in `data-model.md`.

### Contracts (`contracts/inventory-api.md`)

Center endpoints (all `Authorization: Bearer <jwt>`, center-scoped):

| Method & Path | Consumer | Permission |
|---|---|---|
| `GET /centers/my/parts?search&lowStock` | catalog list / PartPicker | `MANAGE_INVENTORY` (view) / `CONSUME_PARTS` (picker) |
| `POST /centers/my/parts` · `PUT /centers/my/parts/{id}` · `DELETE …` | catalog CRUD | `MANAGE_INVENTORY` |
| `GET /centers/my/parts/{id}/movements` | item movement history | `MANAGE_INVENTORY` |
| `POST /centers/my/parts/{id}/receive` · `POST …/adjust` | stock receive/adjust | `MANAGE_INVENTORY` |
| `GET /centers/my/inventory/low-stock` | reorder list / Attention | `MANAGE_INVENTORY` |
| `GET /centers/my/inventory/report?from&to&format` | reports/export | `VIEW_REPORTS` / `GENERATE_REPORTS` |

> Consumption is **not** a standalone endpoint: it happens server-side when a quote with part lines is
> committed (and reverses on cancel). The client adds part lines via the quote builder.

### RTK Query slice

`store/api/inventoryApi.ts` (tagTypes `['Part','PartList','Movements','LowStock','InvReport']`), inline
`fetchBaseQuery` + Bearer. Catalog/stock mutations invalidate `Part`/`PartList`/`Movements`/`LowStock`.

### Permissions & Attention

`types/staff.ts`: add `'MANAGE_INVENTORY'` (OWNER, BRANCH_MANAGER) + `'CONSUME_PARTS'` (OWNER,
BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN). `types/attention.ts`: add `'LOW_STOCK'` to `AttentionCategory`
+ `ATTENTION_CATEGORY_ORDER`.

### Agent context update

```powershell
.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
```

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|-----------|--------------------------------------|
| New backend `inventory` package + movements ledger | Stock, audit, and reorder need a movement-sourced quantity | A single `quantity` column with no movements loses the audit trail and breaks reversal |
| Atomic decrement on consume | Concurrent technicians must not double-spend (SC-002) | Read-modify-write in app code races; needs DB-level atomicity |
| Two permissions (`MANAGE_INVENTORY` + `CONSUME_PARTS`) | Spec explicitly splits "manage catalog" from "consume onto a booking" | One permission would either block technicians from using parts or let them edit the catalog |
| Price snapshot on quote lines (R4) | Committed customer quotes must be stable | Live price lookup rewrites historical quotes when the catalog price changes |
