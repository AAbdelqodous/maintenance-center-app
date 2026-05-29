# API Contracts: Quote Requests Inbox (Owner)

**Feature**: 024-quote-requests-inbox
**Date**: 2026-05-29
**Backend base**: `GET|POST|PUT|DELETE /api/v1/...`
**Auth**: All endpoints require `Authorization: Bearer <jwt>` and are **center-scoped** to the active center.
**Money**: Prices are **KD (`KWD`), 3 decimal places**.

> **Status: BACKEND NOT YET IMPLEMENTED.** New `quoterequest` package, **shared with customer
> `009-get-quotes-marketplace`** (matching + sealed responses + expiry). The center receives **only its
> own** response (`research.md` R4). Permission column = required `CenterPermission` (`types/staff.ts`).
> Build against an MSW/stub.

---

## GET /centers/my/quote-requests

**Consumer**: `quote-requests/index.tsx` (inbox) · **Permission**: `RESPOND_TO_QUOTES`
**Purpose**: Matching open requests for the active center (the server's match set, R2).

### Request
```
GET /api/v1/centers/my/quote-requests?status=OPEN
Authorization: Bearer <jwt>
```

### Response — 200 OK
```json
[
  {
    "requestId": 900,
    "categoryNameAr": "تكييف", "categoryNameEn": "AC",
    "descriptionPreview": "AC not cold, started last week",
    "areaGovernorate": "Hawalli", "distance": 3.2,
    "attachmentThumbUrls": ["https://.../55_thumb.jpg"],
    "receivedAt": "2026-05-29T10:01:00Z",
    "expiresAt": "2026-05-31T10:00:00Z",
    "requestStatus": "OPEN",
    "myResponseStatus": "NONE"
  }
]
```
Empty `[]` → inbox empty-state. Never includes other centers' responses.

### Errors
| Status | Client behavior |
|--------|----------------|
| 401 | Redux middleware → auth |
| 403 | Lacks `RESPOND_TO_QUOTES` → hide inbox entry |
| 5xx / network | Cached data if present, else error + retry |

---

## GET /quote-requests/{id}  (center view)

**Consumer**: `quote-requests/[id].tsx` · **Permission**: `RESPOND_TO_QUOTES`
**Purpose**: Full request + **this center's** quote only (sealed).

### Response — 200 OK
```json
{
  "requestId": 900,
  "categoryId": 1, "categoryNameAr": "تكييف", "categoryNameEn": "AC",
  "serviceId": null,
  "description": "AC not cold, started last week",
  "attachmentUrls": ["https://.../55.jpg", "https://.../56.mp4"],
  "vehicleOrApplianceNote": "2018 Toyota Camry",
  "areaGovernorate": "Hawalli", "distance": 3.2,
  "fulfillmentHint": "AT_HOME",
  "requestStatus": "OPEN",
  "expiresAt": "2026-05-31T10:00:00Z",
  "myResponse": null
}
```
`myResponse` is the center's own `QuoteResponse` or `null`. **No competitor data.**

### Errors
| Status | Client behavior |
|--------|----------------|
| 401 | → auth |
| 403 | Lacks `RESPOND_TO_QUOTES` |
| 404 | Request gone / not matched to this center → back to inbox |
| 5xx / network | Error + retry |

---

## POST /quote-requests/{id}/quote

**Consumer**: `QuoteResponseForm` (submit **or** edit) · **Permission**: `RESPOND_TO_QUOTES`
**Purpose**: Upsert the center's single quote (one-per-center, R3).

### Request body
```json
{ "priceMin": 15.000, "priceMax": 25.000, "estimatedDurationMinutes": 90, "inclusions": "Gas refill + leak check", "message": "Can come tomorrow morning" }
```
A fixed price sets `priceMin === priceMax`.

### Response — 200 OK
```json
{ "id": 5001, "priceMin": 15.000, "priceMax": 25.000, "estimatedDurationMinutes": 90, "inclusions": "Gas refill + leak check", "message": "Can come tomorrow morning", "status": "SUBMITTED", "submittedAt": "2026-05-29T11:00:00Z", "updatedAt": null }
```
Re-posting **updates** (status `UPDATED`); never creates a duplicate (unique `(request, center)`).

### Errors
| Status | Client behavior |
|--------|----------------|
| 400 | priceMin>priceMax / invalid → inline |
| 401 | → auth |
| 403 | Lacks `RESPOND_TO_QUOTES` → form hidden |
| 409 | Request not OPEN (expired/cancelled/accepted) → refetch, close form |
| 5xx / network | Error + retry |

---

## DELETE /quote-requests/{id}/quote

**Consumer**: Withdraw on `[id].tsx` · **Permission**: `RESPOND_TO_QUOTES`
**Response — 200 OK**: `{ "id": 5001, "status": "WITHDRAWN" }` (customer notified; removed from their request).

### Errors
| Status | Client behavior |
|--------|----------------|
| 409 | Already accepted (cannot withdraw a won/selected quote) → refetch |
| others | as above |

---

## POST /quote-requests/{id}/chat

**Consumer**: "Message customer" on `[id].tsx` · **Permission**: `MANAGE_CHAT`
**Purpose**: Create/get a request-scoped conversation with the customer; delegates to chat.

### Response — 200 OK
```json
{ "conversationId": 777 }
```
Opens the existing chat thread (`chatApi.getMessages(777)` / `sendMessage`). After win it continues
under the booking; after expiry read-only.

---

## GET /centers/my/lead-preferences  ·  PUT /centers/my/lead-preferences

**Consumer**: `quote-requests/preferences.tsx` · **Permission**: `EDIT_CENTER_PROFILE`
**Purpose**: Opt-in, categories, areas, quiet hours.

### GET Response — 200 OK
```json
{ "optedIn": true, "categoryIds": [1, 3], "areaGovernorates": ["Hawalli", "Salmiya"], "quietHoursStart": "22:00", "quietHoursEnd": "07:00" }
```
### PUT Request
```json
{ "optedIn": true, "categoryIds": [1], "areaGovernorates": ["Hawalli"], "quietHoursStart": null, "quietHoursEnd": null }
```
`optedIn: false` → center matches no new requests.

### Errors
| Status | Client behavior |
|--------|----------------|
| 403 | Lacks `EDIT_CENTER_PROFILE` → read-only |
| 400 | Invalid quiet-hours format → inline |
| 5xx / network | Error + retry |

---

## GET /centers/my/lead-metrics

**Consumer**: metrics view (on inbox or preferences) · **Permission**: `VIEW_REPORTS`
**Purpose**: received / responded / won / win rate / avg response time over a range.

### Response — 200 OK
```json
{ "from": "2026-05-01", "to": "2026-05-29", "received": 40, "responded": 28, "won": 9, "winRate": 0.321, "avgResponseMinutes": 24 }
```

---

## Notification / Attention events (server → center)

| Event | Center behavior |
|-------|-----------------|
| New matching request | `NEW_QUOTE_REQUEST` Attention item (always); push if `optedIn` AND outside quiet hours (R6) |
| Customer accepted **this** center | "You won" notification + booking created (normal pipeline); `myResponseStatus → SELECTED` |
| Customer accepted **another** center | "Not selected" notification; `myResponseStatus → NOT_SELECTED` |
| Customer cancelled / request expired | Lead closes; metrics updated (expiry ≠ loss, R8) |

---

## RTK Query tag invalidation

| Mutation | Invalidates |
|----------|-------------|
| `submitQuote` / `withdrawQuote` | `Lead` (id), `LeadList` |
| `updateLeadPreferences` | `LeadPreferences` |
| won/lost/expiry (notification) | `Lead` (id), `LeadList`, `LeadMetrics` (refetch on focus) |

---

## i18n Key Set (namespace `quoteRequests.*`)

`inbox.*` (title, empty, received, expiresIn, responded/notResponded badge, distance), `detail.*`
(description, attachments, area, fulfillment, respond, edit, withdraw, message customer), `form.*`
(price, fixedOrRange, duration, inclusions, note, submit, suggestedPrice), `preferences.*` (optIn,
categories, areas, quietHours), `metrics.*` (received, responded, won, winRate, avgResponse), `outcome.*`
(won, notSelected, expired). English in `en.json`, Arabic mirror in `ar.json`.
