# API Contract: Bookings Endpoints

**Feature**: Phase 2 — Booking Management
**Base path**: `/api/v1/bookings/`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scope**: Returns only bookings belonging to the authenticated center owner's center.

---

## GET /bookings

Returns a paginated list of bookings for the authenticated center.

### Query Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `page` | integer | No | 0-indexed, default `0` |
| `size` | integer | No | Default `20` |
| `status` | string | No | One of `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`. Omit for all. |

### Response `200 OK`

```json
{
  "content": [
    {
      "id": 1,
      "customerName": "Ali Al-Fahad",
      "customerPhone": "+96550000001",
      "serviceType": "CAR",
      "bookingStatus": "PENDING",
      "bookingDate": "2026-04-10",
      "bookingTime": "09:00:00",
      "notes": "Oil change + tire rotation",
      "rejectionReason": null,
      "cancelledBy": null,
      "paymentMethod": "CASH",
      "paymentStatus": "PENDING",
      "createdAt": "2026-04-02T08:30:00Z"
    }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

**Field notes:**
- `bookingStatus` — NOT `status`
- `bookingDate` — NOT `scheduledDate`
- `bookingTime` — NOT `scheduledTime`
- `totalElements` used by frontend to determine if more pages exist

---

## GET /bookings/{id}

Returns a single booking by ID.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Booking ID |

### Response `200 OK`

```json
{
  "id": 1,
  "customerName": "Ali Al-Fahad",
  "customerPhone": "+96550000001",
  "serviceType": "CAR",
  "bookingStatus": "PENDING",
  "bookingDate": "2026-04-10",
  "bookingTime": "09:00:00",
  "notes": "Oil change + tire rotation",
  "rejectionReason": null,
  "cancelledBy": null,
  "paymentMethod": "CASH",
  "paymentStatus": "PENDING",
  "createdAt": "2026-04-02T08:30:00Z"
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `404` | Booking not found or does not belong to this center |

---

## GET /bookings/stats

Returns booking statistics for the authenticated center's dashboard.

### Response `200 OK`

```json
{
  "pendingCount": 5,
  "activeCount": 2,
  "completedCount": 143,
  "totalReviews": 38,
  "averageRating": 4.7
}
```

| Field | Notes |
|-------|-------|
| `totalReviews` | NOT `reviewCount` |
| `averageRating` | Float, 1–5 scale |

---

## PUT /bookings/{id}/status

Updates the status of a booking. Allowed transitions depend on current status.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Booking ID |

### Request Body

```json
{
  "status": "CONFIRMED",
  "reason": null,
  "notes": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | Yes | Target status |
| `reason` | string | Conditional | Required when `status = REJECTED`. One of the predefined rejection reasons. |
| `notes` | string | No | Optional internal notes |

### Allowed Transitions

| From | To (allowed values) |
|------|---------------------|
| `PENDING` | `CONFIRMED`, `REJECTED` |
| `CONFIRMED` | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` |

### Response `200 OK`

Returns the updated `BookingResponse` object (same shape as GET /bookings/{id}).

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid transition or missing required `reason` for rejection |
| `404` | Booking not found |

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 404,
  "businessErrorDescription": "Booking not found",
  "error": "Resource not found",
  "validationErrors": []
}
```
