# API Contracts: Inventory & Parts (Owner)

**Feature**: 025-inventory-parts-management
**Date**: 2026-05-29
**Backend base**: `GET|POST|PUT|DELETE /api/v1/...`
**Auth**: All endpoints require `Authorization: Bearer <jwt>` and are **center-scoped** to the active center.
**Money**: Prices are **KD (`KWD`), 3 decimal places**.

> **Status: BACKEND NOT YET IMPLEMENTED.** New `inventory` package + a consumption hook on quote commit.
> Build against an MSW/stub. Permission column = required `CenterPermission` (`types/staff.ts`).
> Consumption is **not** a standalone endpoint — it happens server-side when a quote with part lines is
> committed (and reverses on cancel).

---

## GET /centers/my/parts

**Consumer**: catalog `inventory/index.tsx`, `PartPicker` (quote builder) · **Permission**: `MANAGE_INVENTORY` (catalog) / `CONSUME_PARTS` (picker)
**Purpose**: List/search the catalog; `lowStock=true` filters to at/below-threshold.

### Request
```
GET /api/v1/centers/my/parts?search=brake&lowStock=false
Authorization: Bearer <jwt>
```

### Response — 200 OK
```json
[
  {
    "id": 12, "nameAr": "تيل فرامل أمامي", "nameEn": "Front brake pads", "sku": "BP-FRT-001",
    "category": "Brakes", "unit": "SET", "costPrice": 8.000, "salePrice": 12.500,
    "supplier": "AutoParts Co", "reorderThreshold": 3, "onHand": 7, "isActive": true
  }
]
```
Empty `[]` → catalog empty-state.

### Errors
| Status | Client behavior |
|--------|----------------|
| 401 | Redux middleware → auth |
| 403 | Lacks permission → hide catalog / picker |
| 5xx / network | Cached data if present, else error + retry |

---

## POST /centers/my/parts  ·  PUT /centers/my/parts/{id}  ·  DELETE /centers/my/parts/{id}

**Consumer**: `PartForm` · **Permission**: `MANAGE_INVENTORY`
**Purpose**: Create / edit / deactivate a catalog item.

### POST/PUT body
```json
{ "nameAr": "تيل فرامل أمامي", "nameEn": "Front brake pads", "sku": "BP-FRT-001", "category": "Brakes", "unit": "SET", "costPrice": 8.000, "salePrice": 12.500, "supplier": "AutoParts Co", "reorderThreshold": 3 }
```
PUT may also send `"isActive": false` (deactivate; allowed with on-hand > 0, excluded from new quotes).

### Response — 200/201 — the `Part`.

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Duplicate SKU / negative price/threshold → inline message |
| 403 | Lacks `MANAGE_INVENTORY` → form hidden / read-only |
| 5xx / network | Error + retry |

---

## GET /centers/my/parts/{id}/movements

**Consumer**: item detail `inventory/[id].tsx` · **Permission**: `MANAGE_INVENTORY`
**Purpose**: Full movement history for one part.

### Response — 200 OK
```json
[
  { "id": 501, "partId": 12, "type": "RECEIVE", "quantity": 10, "unitCost": 8.000, "reason": null, "bookingId": null, "actorName": "Sara (Owner)", "createdAt": "2026-05-20T09:00:00Z" },
  { "id": 540, "partId": 12, "type": "CONSUME", "quantity": -2, "unitCost": null, "reason": null, "bookingId": 123, "actorName": "Ali (Tech)", "createdAt": "2026-05-28T14:00:00Z" },
  { "id": 541, "partId": 12, "type": "ADJUST",  "quantity": -1, "unitCost": null, "reason": "Damaged in storage", "bookingId": null, "actorName": "Sara (Owner)", "createdAt": "2026-05-29T08:00:00Z" }
]
```
`sum(quantity)` == `Part.onHand` (reconcile, SC-004).

---

## POST /centers/my/parts/{id}/receive  ·  POST /centers/my/parts/{id}/adjust

**Consumer**: item detail receive/adjust · **Permission**: `MANAGE_INVENTORY`

### receive body → onHand += quantity (movement RECEIVE)
```json
{ "quantity": 10, "unitCost": 8.000 }
```
### adjust body → onHand = newOnHand (movement ADJUST = signed delta; reason required)
```json
{ "newOnHand": 6, "reason": "Stock count correction" }
```
### Response — 200 OK — the updated `Part` (new `onHand`).

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | Negative quantity / missing reason → inline |
| 403 | Lacks `MANAGE_INVENTORY` |
| 5xx / network | Error + retry |

---

## GET /centers/my/inventory/low-stock

**Consumer**: reorder list + `LOW_STOCK` Attention feed · **Permission**: `MANAGE_INVENTORY`
**Purpose**: Items at/below `reorderThreshold`.

### Response — 200 OK
```json
[
  { "partId": 12, "nameAr": "تيل فرامل أمامي", "nameEn": "Front brake pads", "sku": "BP-FRT-001", "onHand": 3, "reorderThreshold": 3, "supplier": "AutoParts Co", "suggestedReorderQty": 10 }
]
```

---

## GET /centers/my/inventory/report

**Consumer**: `inventory/reports.tsx` · **Permission**: `VIEW_REPORTS` (export `GENERATE_REPORTS`)
**Purpose**: Stock value / usage / movers / margin / reorder over a range; `format=csv|pdf` exports.

### Request
```
GET /api/v1/centers/my/inventory/report?from=2026-05-01&to=2026-05-29&format=json
```
### Response — 200 OK (json)
```json
{
  "from": "2026-05-01", "to": "2026-05-29",
  "stockValue": 1840.000,
  "usage": [ { "partId": 12, "nameEn": "Front brake pads", "nameAr": "تيل فرامل أمامي", "consumedQty": 14 } ],
  "fastMovers": [12, 7], "slowMovers": [99],
  "partsMargin": 63.000,
  "reorder": [ { "partId": 12, "nameEn": "Front brake pads", "nameAr": "تيل فرامل أمامي", "sku": "BP-FRT-001", "onHand": 3, "reorderThreshold": 3, "supplier": "AutoParts Co", "suggestedReorderQty": 10 } ]
}
```
`stockValue` and `usage` MUST reconcile to the movement ledger (SC-004).

---

## Quote integration (existing `009` endpoints — MODIFIED)

Parts reach the invoice through the existing quote create/update (`POST /bookings/{id}/quotes`). A
`QuoteLineItem` may carry `partId` + `quantity` + `adHoc`:

| Line shape | Stock effect on quote commit |
|------------|------------------------------|
| `partId` set, `adHoc:false` | `CONSUME` − quantity (atomic, R3); price snapshotted |
| `adHoc:true` | none (one-off part) |
| `partId` null | none (labor line) |

On quote **cancel/decline** of a committed quote with consumed parts → `CONSUME_REVERSAL` returns stock
(R5). Adding part lines requires `CONSUME_PARTS`.

---

## RTK Query tag invalidation

| Mutation | Invalidates |
|----------|-------------|
| `createPart` / `updatePart` / `deactivatePart` | `Part` (id), `PartList`, `LowStock` |
| `receiveStock` / `adjustStock` | `Part` (id), `Movements` (id), `LowStock`, `InvReport` |
| quote commit/cancel (via `quotesApi`) | `Part` (consumed ids), `LowStock`, `InvReport` (refetch on focus) |

---

## i18n Key Set (namespace `inventory.*`)

`catalog.*` (title, empty, search, add, onHand, lowStock badge), `form.*` (name, sku, category, unit:
piece/litre/set/meter/pair, costPrice, salePrice, supplier, reorderThreshold, save, deactivate),
`movements.*` (receive, adjust, consume, reversal, quantity, reason, history), `lowStock.*` (title,
reorder, suggestedQty), `reports.*` (stockValue, usage, fastMovers, slowMovers, margin, export),
`quote.*` (addFromCatalog, adHocPart, quantity). English in `en.json`, Arabic mirror in `ar.json`.
