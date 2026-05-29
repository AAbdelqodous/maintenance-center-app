# Tasks: Inventory & Parts Management (Owner)

**Feature**: 025-inventory-parts-management
**Input**: Design documents from `specs/025-inventory-parts-management/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/inventory-api.md ✓, research.md ✓, quickstart.md ✓

**Repos**: `[Frontend]` → `maintenance-center-app/`, `[Backend]` → `service-center/src/main/java/com/maintainance/service_center/`.

**Tests**: Targeted backend tests only — **stock decrement / concurrency / movement reconcile / reversal** (correctness-critical: SC-002, SC-004, R3, R5). No broad UI suite.

**Organization**: Tasks grouped by user story (US1–US4 + optional US-Scan). Setup + Foundational carry no Story label.

## Format: `[ID] [P?] [Repo] [Story] Description`

- **[P]**: Parallelizable · **[Story]**: [US1]…[US4], [US-Scan] · exact paths included

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Frontend types, permissions, Attention category, quote-type extension, i18n, store registration. No backend dependency.

- [ ] T001 [Frontend] Create `types/inventory.ts` — `Unit`, `MovementType`, `Part`, `StockMovement`, `CreatePartRequest`, `ReceiveStockRequest`, `AdjustStockRequest`, `LowStockItem`, `InventoryReport`; copy verbatim from `data-model.md`.
- [ ] T002 [Frontend] Modify `types/quote.ts` — add optional `partId?: number`, `quantity?: number`, `adHoc?: boolean` to `QuoteLineItem` (per `data-model.md`); leave `kind`/`partsCost`/`laborCost` unchanged.
- [ ] T003 [P] [Frontend] Modify `types/staff.ts` — add `'MANAGE_INVENTORY'` (grant OWNER, BRANCH_MANAGER) and `'CONSUME_PARTS'` (grant OWNER, BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN) to `CenterPermission` + `ROLE_PERMISSIONS` (R6).
- [ ] T004 [P] [Frontend] Modify `types/attention.ts` — add `'LOW_STOCK'` to `AttentionCategory` and to `ATTENTION_CATEGORY_ORDER` (R7).
- [ ] T005 [Frontend] Create `store/api/inventoryApi.ts` — `createApi({ reducerPath:'inventoryApi', tagTypes:['Part','PartList','Movements','LowStock','InvReport'], baseQuery: inline fetchBaseQuery + Bearer })`; endpoints `getParts` (`centers/my/parts?search&lowStock`, providesTags `PartList`), `createPart`/`updatePart`/`deactivatePart` (invalidate `Part`/`PartList`/`LowStock`), `getMovements` (`centers/my/parts/${id}/movements`, providesTags `[{type:'Movements',id}]`), `receiveStock`/`adjustStock` (invalidate `Part`/`Movements`/`LowStock`/`InvReport`), `getLowStock` (`centers/my/inventory/low-stock`, providesTags `LowStock`), `getInventoryReport` (`centers/my/inventory/report`); export hooks. Mirror `contracts/…`.
- [ ] T006 [Frontend] Register `inventoryApi` in `store/index.ts` (depends T005) — reducer map + middleware, matching the existing 18-slice pattern.
- [ ] T007 [P] [Frontend] Add `inventory.*` keys to `lib/i18n/locales/en.json` per `contracts/…#i18n Key Set`.
- [ ] T008 [P] [Frontend] Add the mirrored Arabic keys to `lib/i18n/locales/ar.json` (KD via `formatKD`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend `inventory` entities, movement ledger, atomic decrement, and the quote-commit consumption hook that US2+ depend on.

**⚠️ CRITICAL**: No stock endpoint or consumption works until these exist.

- [ ] T009 [Backend] Create `inventory/Part.java` + `inventory/Unit.java` — `@ManyToOne center`, `nameAr`, `nameEn`, `sku`, `category`, `unit`, `costPrice`/`salePrice` DECIMAL(10,3), `supplier`, `reorderThreshold`, `isActive`, audit; **unique `(center_id, sku)`**; `onHand` as a cached column maintained atomically with movements (per `data-model.md`).
- [ ] T010 [Backend] Create `inventory/StockMovement.java` + `inventory/MovementType.java` (`RECEIVE`/`ADJUST`/`CONSUME`/`CONSUME_REVERSAL`) — `@ManyToOne part`, signed `quantity`, `unitCost?`, `reason?`, `@ManyToOne booking?`, `@ManyToOne actor`, `@CreatedDate createdAt`.
- [ ] T011 [Backend] DB migration: `part` (unique center+sku), `stock_movement`, and `quote_line_item` columns `part_id` (FK nullable), `quantity`, `ad_hoc`; indexes for center + low-stock queries.
- [ ] T012 [Backend] `InventoryService` core: create/update/deactivate; `receive`/`adjust` (write movement + update onHand); **atomic `consume(partId, qty, bookingId, actor)`** under row lock / conditional update (R3); `reverseConsume(bookingId)` writing `CONSUME_REVERSAL` (R5).
- [ ] T013 [Backend] Add `MANAGE_INVENTORY` + `CONSUME_PARTS` to the backend permission enum + role mapping (mirror `types/staff.ts`) so endpoint authorization matches the frontend.
- [ ] T014 [Backend] Quote-commit hook (in the `quote` package): when a quote with catalogued part lines is approved/committed → call `consume(...)` per line; on cancel/decline of a committed quote → `reverseConsume(...)`. Snapshot `salePrice × quantity` onto the line at add time (R4). Emit `LOW_STOCK` Attention when onHand crosses the threshold (R7).
- [ ] T015 [P] [test] [Backend] Unit tests: (a) onHand == Σ(movements) after receive/adjust/consume; (b) **concurrent consume** of one part never double-spends (atomicity, SC-002); (c) reversal returns exact qty (R5); (d) report stockValue/usage reconcile to the ledger (SC-004).

**Checkpoint**: `tsc --noEmit` (FE) passes; backend compiles, tables exist, atomicity + reconcile tests green. Build the frontend stub (per `quickstart.md`).

---

## Phase 3: User Story 1 — Maintain a Parts Catalog with Stock (Priority: P1) 🎯 MVP

**Goal**: Owner adds parts, receives/adjusts stock, sees on-hand + stock value update; every change is an audited movement.

**Independent Test**: Create an item, receive 10, verify on-hand 10, the receipt movement, and stock value = 10 × cost; adjust with a reason and see it in history.

- [ ] T016 [Backend] [US1] `GET /centers/my/parts` (search + lowStock filter), `POST|PUT|DELETE /centers/my/parts[/{id}]`, `GET /centers/my/parts/{id}/movements`, `POST …/receive`, `POST …/adjust` — gated `MANAGE_INVENTORY`, center-scoped.
- [ ] T017 [P] [Frontend] [US1] Create `components/inventory/PartCard.tsx` — name (bilingual), SKU, on-hand, sale price (`formatKD`), low-stock badge.
- [ ] T018 [P] [Frontend] [US1] Create `components/inventory/PartForm.tsx` — name Ar/En, SKU, category, unit, cost/sale price, supplier, reorder threshold; validation (unique SKU surfaced from 400, non-negative).
- [ ] T019 [Frontend] [US1] Create `app/(app)/(tabs)/profile/inventory/_layout.tsx` (Stack) + `index.tsx` — catalog list (virtualized `PartCard`), search, low-stock filter, **Add part**; gated `MANAGE_INVENTORY`; empty/loading/error.
- [ ] T020 [Frontend] [US1] Create `app/(app)/(tabs)/profile/inventory/[id].tsx` — item detail + **Receive** / **Adjust** actions (with reason) + movement history (`getMovements`); on-hand + stock value reflect changes.
- [ ] T021 [Frontend] [US1] Add a gated **"Inventory & Parts"** entry in `app/(app)/(tabs)/profile/index.tsx`; register `profile/inventory/*` routes in `app/(app)/(tabs)/_layout.tsx` with `href:null`.

**Checkpoint US1**: Catalog with live, audited stock. Foundation for everything else.

---

## Phase 4: User Story 2 — Add Parts to a Quote & Decrement Stock (Priority: P1)

**Goal**: A technician adds catalogued parts to a booking's quote; they price onto the customer invoice; on commit, stock decrements and a CONSUME movement is recorded.

**Independent Test**: Add a part (qty 2) to a quote, commit, verify the line at sale price, on-hand −2, and a booking-linked CONSUME movement; ad-hoc part prices but doesn't touch stock.

- [ ] T022 [P] [Frontend] [US2] Create `components/inventory/PartPicker.tsx` — search the catalog by name/SKU (`getParts`), pick a part + quantity; returns a line `{ partId, quantity, description(from part), partsCost = salePrice×qty (snapshot), adHoc:false }`.
- [ ] T023 [Frontend] [US2] Modify `components/quotes/QuoteBuilder.tsx` — add an **"Add part from catalog"** action (alongside the existing `append({description,partsCost,laborCost})`) that opens `PartPicker` and appends a catalogued line; allow an **ad-hoc** part toggle (`adHoc:true`, no stock effect). Gated `CONSUME_PARTS`. Insufficient on-hand → warn (backend authoritative).
- [ ] T024 [Frontend] [US2] Show consumed-parts provenance on the quote/booking detail (part name + qty + that it's catalogued vs ad-hoc); rely on the T014 backend hook for the actual decrement/reversal.

**Checkpoint US2**: Parts flow onto invoices and decrement stock on commit; US1+US2 = both P1 stories.

---

## Phase 5: User Story 3 — Low-Stock Alerts & Reorder List (Priority: P2)

**Goal**: Items at/below threshold appear in the reorder list and the `LOW_STOCK` Attention panel; leave when restocked.

**Independent Test**: Consume to ≤ threshold → item shows in low-stock + Attention; restock above → it leaves.

- [ ] T025 [Backend] [US3] `GET /centers/my/inventory/low-stock` (items ≤ threshold + suggestedReorderQty), gated `MANAGE_INVENTORY`; ensure the T014 hook emits/clears the `LOW_STOCK` Attention item on threshold crossings.
- [ ] T026 [Frontend] [US3] Surface low stock — a reorder list (in `inventory/index.tsx` filter or a section) via `getLowStock`, and `LOW_STOCK` items in the Attention panel (`016`) navigating to `inventory/[id]`.

**Checkpoint US3**: Reorder visibility prevents stockouts.

---

## Phase 6: User Story 4 — Inventory Reports & Margin (Priority: P3)

**Goal**: Owner reviews stock value, usage, fast/slow movers, and parts margin; exports.

**Independent Test**: Pick a range → report shows value/usage/movers/margin/reorder; export reconciles to movements.

- [ ] T027 [Backend] [US4] `GET /centers/my/inventory/report?from&to&format=json|csv|pdf` — stock value (Σ onHand×cost), usage, fast/slow movers, parts margin (Σ (sale−cost)×consumed), reorder; gated `VIEW_REPORTS` (export `GENERATE_REPORTS`); reconciles to the ledger (SC-004).
- [ ] T028 [Frontend] [US4] Create `app/(app)/(tabs)/profile/inventory/reports.tsx` — date range, in-app figures (value/usage/movers/margin), reorder list, CSV/PDF export; gated `VIEW_REPORTS`.

**Checkpoint US4**: Management insight + margin visibility.

---

## Phase 7 (Optional): User Story Scan — Barcode Lookup (Priority: P3)

**Goal**: Find a part by scanning its barcode (convenience over name/SKU search).

**Independent Test**: Scan a barcode → the matching part is selected in `PartPicker` / catalog search.

- [ ] T029 [Frontend] [US-Scan] Add `expo-camera` (`npx expo install expo-camera`); add a scan affordance to `PartPicker` / catalog search using `CameraView` barcode settings → resolve the code to a SKU and select the part. Camera permission flow + graceful fallback to manual search. (Deferred from the MVP — `research.md` R8.)

**Checkpoint Scan**: Optional scan convenience; manual search remains the default.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T030 [P] [Frontend] RTL spot-check (Arabic): catalog rows, part form, movement history, reports, quote part lines.
- [ ] T031 [P] [Frontend] Permission audit — catalog/receive/adjust hidden without `MANAGE_INVENTORY`; add-to-quote hidden without `CONSUME_PARTS`; reports hidden without `VIEW_REPORTS`. TECHNICIAN can consume onto an assigned booking but not edit the catalog.
- [ ] T032 [P] [Frontend] Multi-branch — switching `activeCenterId` swaps catalog/stock/reports; no cross-branch leakage; deactivating a part with on-hand > 0 excludes it from new quotes.
- [ ] T033 End-to-end smoke (stub or live): add part → receive → add to quote → commit (−stock) → low-stock alert → reorder → reversal on cancel → report reconciles. Prices via `formatKD`; negative/backorder flagged not hidden.

**Checkpoint Final**: All P1–P3 stories pass; permissions + RTL + multi-branch + atomicity/reconcile verified.

---

## Dependencies & Execution Order

- **Phase 1 Setup**: immediate. T001, T002, T003, T004, T007, T008 parallel; **T005** then **T006 (after T005)**.
- **Phase 2 Foundation**: backend entities + ledger + atomic consume + quote hook; BLOCKS US2+. T009→T010→T011; T012, T013 follow; **T014 after T012**; T015 alongside.
- **US1**: T016 (backend) → T017, T018 (components, parallel) → T019, T020 → T021.
- **US2**: needs US1 catalog + T014 hook. T022 (parallel) → T023 → T024.
- **US3**: needs T014/T025 (threshold events). T026 frontend.
- **US4**: needs the ledger (US1) for reconcile. T027 → T028.
- **US-Scan**: optional, after US2 (extends `PartPicker`).
- **Polish**: after US phases; T030–T032 parallel.

### Parallel opportunities

| Group | Tasks |
|-------|-------|
| Setup FE | T001, T002, T003, T004, T007, T008 |
| US1 components | T017, T018 |
| US2 picker | T022 |
| Polish | T030, T031, T032 |

---

## Implementation Strategy

### MVP first (US1 + US2 — both P1)
Setup → Foundation (stub + atomicity tests) → US1 (catalog + stock) → US2 (parts on quote + decrement) →
**validate** add→receive→quote→commit→stock-down with reversal → ship.

### Incremental delivery
Foundation → US1 → US2 → US3 (low-stock) → US4 (reports) → US-Scan (optional) → Polish.

### Backend coordination
| Task group | Backend needed? |
|------------|-----------------|
| T001–T008 (Setup) | No — pure frontend, stubbable |
| T009–T015 (Foundation) | Yes — `inventory` package + quote hook |
| US1–US4 frontend | Stub sufficient to build/test; live needs the consume/reverse hook |
| T015, T033 | Atomicity/reconcile = backend unit; e2e needs stub or live |

---

## Notes

- **Parts reach invoices via the existing quote** (R1) — no parallel invoicing path; `QuoteLineItem` gains `partId/quantity/adHoc`.
- **On-hand = Σ movements** (R2); reports reconcile to the ledger (SC-004); T015 proves it.
- **Atomic consume** (R3) — concurrent technicians can't double-spend; shortfalls are flagged, never silent.
- **Price snapshot** on committed quote lines (R4); **reversal** on cancel/decline (R5).
- **Two permissions** (R6): `MANAGE_INVENTORY` (catalog/stock) vs `CONSUME_PARTS` (add to quote) — the spec's explicit split; technicians consume, owners/managers manage.
- **Low-stock → `LOW_STOCK` Attention** (R7). **Barcode scan is optional/deferred** (R8) — MVP needs no new dependency.
- **Money**: reuse `lib/utils/pricing.ts → formatKD`. **Per-center** stock via `activeCenterId`; current-cost valuation (R9).
