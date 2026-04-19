# API Contract: Review Endpoints

**Feature**: Phase 5 — Review Management
**Base path**: `/api/v1/reviews/`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scope**: Returns only reviews for the authenticated center owner's center.

---

## GET /reviews/center

Returns a paginated list of reviews for the authenticated center.

### Query Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `page` | integer | No | 0-indexed, default `0` |
| `size` | integer | No | Default `20` |

### Response `200 OK`

```json
{
  "content": [
    {
      "id": 5,
      "userFirstname": "Sara",
      "userLastname": "Al-Mutairi",
      "rating": 5,
      "comment": "Excellent service, very professional!",
      "ownerReply": null,
      "createdAt": "2026-03-15T14:30:00Z"
    },
    {
      "id": 3,
      "userFirstname": "Khalid",
      "userLastname": "Al-Rashid",
      "rating": 3,
      "comment": "Service was okay but took longer than expected.",
      "ownerReply": "We apologize for the delay. We've improved our scheduling.",
      "createdAt": "2026-03-10T09:00:00Z"
    }
  ],
  "totalElements": 38,
  "totalPages": 2,
  "number": 0,
  "size": 20
}
```

**Field notes:**
- `userFirstname` + `userLastname` — NOT `customerName`
- `ownerReply` — NOT `centerReply` or `reply`; `null` if no reply yet
- `rating` — integer 1–5

---

## POST /reviews/{id}/reply

Submits or updates the center owner's reply to a specific review.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Review ID |

### Request Body

```json
{ "reply": "Thank you for your feedback! We're glad you had a great experience." }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `reply` | string | Yes | The owner's reply text |

### Response `200 OK`

Returns the updated `ReviewResponse` with `ownerReply` populated:

```json
{
  "id": 5,
  "userFirstname": "Sara",
  "userLastname": "Al-Mutairi",
  "rating": 5,
  "comment": "Excellent service, very professional!",
  "ownerReply": "Thank you for your feedback! We're glad you had a great experience.",
  "createdAt": "2026-03-15T14:30:00Z"
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `404` | Review not found or does not belong to this center |
| `400` | `reply` field missing or empty |

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 404,
  "businessErrorDescription": "Review not found",
  "error": "Resource not found",
  "validationErrors": []
}
```
