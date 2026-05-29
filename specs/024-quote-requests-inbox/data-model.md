# Data Model: Quote Requests Inbox & Bidding (Owner)

**Feature**: 024-quote-requests-inbox
**Date**: 2026-05-29

> Frontend types (`types/quoteRequests.ts`) + backend entities. Prices **KD, 3 decimals**
> (`lib/utils/pricing.ts → formatKD`). The center is given **only its own** response (sealed, R4).

---

## Enums

### `QuoteRequestStatus` (request lifecycle, mirrors customer 009)

`'OPEN' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'`

### `QuoteResponseStatus` (this center's quote)

| Value | Meaning |
|-------|---------|
| `NONE` | Center has not quoted yet |
| `SUBMITTED` | Quote sent |
| `UPDATED` | Quote revised |
| `WITHDRAWN` | Center withdrew it |
| `SELECTED` | Customer accepted → won |
| `NOT_SELECTED` | Another center won |

---

## Frontend Types (`types/quoteRequests.ts`)

### `InboxItem` (list row)

| Field | Type | Notes |
|-------|------|-------|
| `requestId` | `number` | |
| `categoryNameAr` / `categoryNameEn` | `string` | Bilingual |
| `descriptionPreview` | `string` | Truncated |
| `areaGovernorate` | `string?` | Customer area |
| `distance` | `number?` | km from center |
| `attachmentThumbUrls` | `string[]` | Thumbnails |
| `receivedAt` | `string` (ISO) | |
| `expiresAt` | `string` (ISO) | Remaining window |
| `requestStatus` | `QuoteRequestStatus` | |
| `myResponseStatus` | `QuoteResponseStatus` | Whether this center responded |

### `QuoteRequestDetail`

| Field | Type | Notes |
|-------|------|-------|
| `requestId` | `number` | |
| `categoryId` | `number` | |
| `categoryNameAr` / `categoryNameEn` | `string` | |
| `serviceId` | `number?` | If the customer specified one (pre-fill key, R7) |
| `description` | `string` | Full text |
| `attachmentUrls` | `string[]` | View-only |
| `vehicleOrApplianceNote` | `string?` | |
| `areaGovernorate` | `string?` | |
| `distance` | `number?` | |
| `fulfillmentHint` | `'DROP_OFF' \| 'PICKUP_DELIVERY' \| 'AT_HOME'` | optional |
| `requestStatus` | `QuoteRequestStatus` | |
| `expiresAt` | `string` (ISO) | |
| `myResponse` | `QuoteResponse \| null` | This center's quote only (sealed) |

### `QuoteResponse` (this center's)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | |
| `priceMin` | `number` | KD |
| `priceMax` | `number` | KD (== min when fixed) |
| `estimatedDurationMinutes` | `number?` | |
| `inclusions` | `string?` | |
| `message` | `string?` | |
| `status` | `QuoteResponseStatus` | |
| `submittedAt` | `string?` (ISO) | |
| `updatedAt` | `string?` (ISO) | |

### `SubmitQuoteRequest`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `priceMin` | `number` | ✅ | KD |
| `priceMax` | `number` | ✅ | == priceMin for a fixed price |
| `estimatedDurationMinutes` | `number` | optional | |
| `inclusions` | `string` | optional | |
| `message` | `string` | optional | |

### `LeadPreferences`

| Field | Type | Notes |
|-------|------|-------|
| `optedIn` | `boolean` | Master switch |
| `categoryIds` | `number[]` | Covered categories to receive |
| `areaGovernorates` | `string[]` | Areas to receive |
| `quietHoursStart` | `string?` | `HH:mm` — suppress push |
| `quietHoursEnd` | `string?` | `HH:mm` |

### `LeadMetrics`

| Field | Type | Notes |
|-------|------|-------|
| `from` / `to` | `string` (ISO date) | Range |
| `received` | `number` | Matching requests received |
| `responded` | `number` | Requests this center quoted |
| `won` | `number` | Accepted quotes |
| `winRate` | `number` | won ÷ responded |
| `avgResponseMinutes` | `number` | Mean time received→responded |

---

## Backend Entities (`service-center/.../quoterequest`)

### `QuoteRequest` (shared with customer 009)

`id`, `customer` (`@ManyToOne`), `category` (`@ManyToOne ServiceCategory`), `service` (`@ManyToOne`
nullable), `description`, `attachments` (refs), `areaGovernorate`, `fulfillmentHint`,
`status` (`QuoteRequestStatus`), `expiresAt`, `acceptedResponse` (`@ManyToOne QuoteResponse` nullable),
`@CreatedDate createdAt`, auditing listener.

### `QuoteResponse`

`id`, `request` (`@ManyToOne QuoteRequest`), `center` (`@ManyToOne MaintenanceCenter`),
`priceMin`/`priceMax` (DECIMAL(10,3)), `estimatedDurationMinutes`, `inclusions`, `message`,
`status` (`QuoteResponseStatus`), `submittedAt`, `updatedAt`,
**unique constraint `(request_id, center_id)`** → enforces one-quote-per-center (R3).

### `LeadPreferences`

`id`, `center` (`@OneToOne MaintenanceCenter`), `optedIn`, `@ManyToMany categories`,
`areaGovernorates` (collection), `quietHoursStart`, `quietHoursEnd`, audit fields.

---

## State Transitions

### Lead lifecycle (center view)

```
customer broadcasts → matching (R2) → appears in this center's inbox  [myResponseStatus = NONE]
   center submits quote (RESPOND_TO_QUOTES) → myResponseStatus SUBMITTED
        ├─ center edits → UPDATED (customer notified)
        ├─ center withdraws → WITHDRAWN
        ├─ customer accepts THIS center (009) → SELECTED  → "won" event:
        │       booking created, enters normal pipeline (assign/self-claim, work-progress, payment)
        ├─ customer accepts ANOTHER center → NOT_SELECTED ("not selected" event)
        └─ request EXPIRES/ CANCELLED → lead closes
                (no response submitted → counts against response rate, not win rate, R8)
```

### Quote submit (one-per-center)

```
open request → QuoteResponseForm
   pre-fill suggested price from 014 pricing if available (R7)
   submit → upsert QuoteResponse (unique per center) → SUBMITTED/UPDATED
   second staff submitting → edits the SAME response (no duplicate, R3)
```

### Notification gating

```
new matching request
   → NEW_QUOTE_REQUEST Attention item (016) [always]
   → push notification  [only if optedIn AND not within quiet hours] (R6)
```

---

## Validation Rules

- The center receives **only its own** `QuoteResponse`; the client must never request or render
  competitor quotes/counts (R4).
- **One quote per center per request** (backend unique constraint); a re-submit updates, never duplicates (R3).
- `priceMin ≤ priceMax`; a fixed price sets `priceMin === priceMax`; KD via shared formatter.
- Submit/edit/withdraw require `RESPOND_TO_QUOTES`; preferences require `EDIT_CENTER_PROFILE`; metrics
  require `VIEW_REPORTS`. Client disables (defense-in-depth); backend enforces.
- Inbox + metrics are scoped to the **active center** (`activeCenterId`); a multi-branch owner sees each
  branch's inbox separately (no cross-branch pooling).
- Expiry counts against **response rate** only; **win rate = won ÷ responded** (R8).
- Quiet hours suppress only the push; the lead still appears in the inbox + Attention panel (R6).
- Quoting on an `OPEN` request only; quoting a now-cancelled/expired request fails gracefully.
