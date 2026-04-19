# API Contract: Work Progress & Quotes Endpoints

**Feature**: Phase 4.0 — Work Progress & Quotes
**Base path**: `/api/v1/bookings/{bookingId}/`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scoping**: All endpoints scope to the authenticated owner's center. The server validates that `bookingId` belongs to the owner's center.

---

## PUT /bookings/{id}/work-stage

Updates the current repair stage of a booking.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Booking ID |

### Request Body

```json
{
  "stage": "DIAGNOSING",
  "notes": "Starting diagnostic scan",
  "notesAr": "جاري الفحص الإلكتروني",
  "internalNotes": "ECU fault codes found",
  "estimatedMinutesRemaining": 60
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `stage` | `WorkStage` enum | Yes | Must be a valid `canTransitionTo` target from current stage |
| `notes` | string | No | Customer-visible note, max 500 chars |
| `notesAr` | string | No | Arabic customer note, max 500 chars |
| `internalNotes` | string | No | Internal-only note |
| `estimatedMinutesRemaining` | integer | No | ≥ 1 if provided |

### Response `200 OK`

No body (`void`). The booking's stage is updated.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid stage or invalid transition from current stage |
| `401` | Missing or expired JWT |
| `403` | Booking does not belong to the authenticated owner's center |
| `404` | Booking not found |
| `409` | Stage has already been updated (concurrent update conflict) |

---

## POST /bookings/{id}/work-progress

Creates a new progress entry (text update, no media attachment). Photos are attached separately via `/media`.

### Request Body

```json
{
  "notes": "Completed oil change, replacing air filter",
  "internalNotes": "Air filter was clogged, upsell customer on cabin filter",
  "estimatedMinutesRemaining": 30
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `notes` | string | No | Customer-visible, max 500 chars |
| `internalNotes` | string | No | Internal only |
| `estimatedMinutesRemaining` | integer | No | ≥ 1 if provided |

### Response `201 Created`

```json
{
  "id": 42,
  "stage": "WORK_IN_PROGRESS",
  "notes": "Completed oil change, replacing air filter",
  "notesAr": null,
  "internalNotes": "Air filter was clogged",
  "photoUrl": null,
  "estimatedMinutesRemaining": 30,
  "createdAt": "2026-04-16T14:30:00Z",
  "createdByName": "Ahmed Al-Rashid"
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `401` | Missing or expired JWT |
| `403` | Booking does not belong to the authenticated owner's center |
| `404` | Booking not found |

---

## GET /bookings/{id}/work-progress

Returns all progress entries for a booking in chronological order (oldest first).

### Response `200 OK`

Array of `BookingWorkProgress` objects (same shape as POST response). Returns `[]` when no entries exist.

---

## POST /bookings/{id}/media

Uploads a photo for a booking. Called once per photo.

### Request

`multipart/form-data` with:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | binary | Yes | Image file, max 10 MB |
| `category` | string | No | `MediaCategory` enum value, defaults to `WORK_IN_PROGRESS` |
| `caption` | string | No | English caption |
| `captionAr` | string | No | Arabic caption |
| `isVisibleToCustomer` | boolean | No | Defaults to `true` |

### Response `201 Created`

```json
{
  "id": 7,
  "mediaType": "PHOTO",
  "category": "WORK_IN_PROGRESS",
  "url": "https://cdn.example.com/media/bookings/123/photo-7.jpg",
  "thumbnailUrl": "https://cdn.example.com/media/bookings/123/thumb-7.jpg",
  "caption": null,
  "captionAr": null,
  "isVisibleToCustomer": true,
  "createdAt": "2026-04-16T14:32:00Z"
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | File missing, file too large (> 10 MB), or unsupported MIME type |
| `401` | Missing or expired JWT |
| `403` | Booking does not belong to the authenticated owner's center |
| `404` | Booking not found |

---

## GET /bookings/{id}/media

Returns all media for a booking.

### Response `200 OK`

Array of `BookingMedia` objects. Returns `[]` when no media exists.

---

## GET /bookings/{id}/quotes

Returns all quotes for a booking, ordered by `version` descending (most recent first).

### Response `200 OK`

```json
[
  {
    "id": 3,
    "bookingId": 123,
    "version": 2,
    "lineItems": [
      { "description": "Oil Change", "descriptionAr": "تغيير الزيت", "partsCost": 5.000, "laborCost": 3.000 },
      { "description": "Air Filter", "descriptionAr": null, "partsCost": 8.500, "laborCost": 2.000 }
    ],
    "subtotal": 18.500,
    "discountAmount": 1.500,
    "discountReason": "Loyal customer",
    "taxAmount": 0.000,
    "totalAmount": 17.000,
    "estimatedDurationMinutes": 60,
    "notes": "All parts are OEM quality",
    "notesAr": null,
    "status": "DRAFT",
    "sentAt": null,
    "respondedAt": null,
    "responseNotes": null,
    "createdAt": "2026-04-16T14:00:00Z"
  }
]
```

Returns `[]` when no quotes exist.

---

## POST /bookings/{id}/quotes

Creates a new quote with `DRAFT` status.

### Request Body

```json
{
  "lineItems": [
    { "description": "Oil Change", "descriptionAr": "تغيير الزيت", "partsCost": 5.000, "laborCost": 3.000 }
  ],
  "discountAmount": 0,
  "discountReason": null,
  "estimatedDurationMinutes": 30,
  "notes": "All parts OEM quality",
  "notesAr": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `lineItems` | `QuoteLineItem[]` | Yes | Min 1 item |
| `lineItems[].description` | string | Yes | Min length 1 |
| `lineItems[].descriptionAr` | string | No | Arabic description |
| `lineItems[].partsCost` | number | Yes | ≥ 0, KD |
| `lineItems[].laborCost` | number | Yes | ≥ 0, KD |
| `discountAmount` | number | No | ≥ 0, ≤ subtotal |
| `discountReason` | string | No | |
| `estimatedDurationMinutes` | integer | No | ≥ 1 if provided |
| `notes` | string | No | Customer-visible |
| `notesAr` | string | No | Arabic notes |

### Response `201 Created`

Returns the created `BookingQuote` object (same shape as GET item above).

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (empty lineItems, discountAmount > subtotal) |
| `401` | Missing or expired JWT |
| `403` | Booking does not belong to authenticated owner's center |
| `404` | Booking not found |

---

## POST /bookings/{id}/quotes/{qid}/send

Sends a draft quote to the customer. Changes status from `DRAFT` to `SENT`.

### Path Parameters

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Booking ID |
| `qid` | integer | Quote ID |

### Request Body

None (empty body).

### Response `200 OK`

Returns the updated `BookingQuote` with `status: "SENT"` and `sentAt` timestamp.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Quote is not in `DRAFT` status |
| `401` | Missing or expired JWT |
| `403` | Quote/booking does not belong to authenticated owner's center |
| `404` | Quote or booking not found |

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 400,
  "businessErrorDescription": "Validation failed",
  "error": "discountAmount must be <= subtotal",
  "validationErrors": ["discountAmount: must be <= subtotal"]
}
```
