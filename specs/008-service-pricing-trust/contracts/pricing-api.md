# API Contract: Service Pricing & Trust Endpoints

**Feature**: Phase 3.5 — Service Pricing & Trust Badges
**Base path**: `/api/v1/centers/my/pricing` and `/api/v1/centers/my/trust`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scoping**: All endpoints are scoped to the authenticated owner's active center via `findFirstByOwnerId`. No `centerId` path parameter needed.

---

## GET /centers/my/pricing

Returns all pricing entries for the owner's center.

### Response `200 OK`

```json
[
  {
    "id": 1,
    "serviceType": "CAR",
    "serviceNameAr": "تغيير الزيت",
    "serviceNameEn": "Oil Change",
    "minPrice": 5.000,
    "maxPrice": 15.000,
    "typicalDurationMinutes": 30,
    "descriptionAr": null,
    "descriptionEn": null,
    "isActive": true,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": null
  }
]
```

Returns `[]` when no pricing entries exist. Never returns `null`.

---

## POST /centers/my/pricing

Creates a new pricing entry.

### Request Body

```json
{
  "serviceType": "CAR",
  "serviceNameAr": "تغيير الزيت",
  "serviceNameEn": "Oil Change",
  "minPrice": 5.000,
  "maxPrice": 15.000,
  "typicalDurationMinutes": 30,
  "descriptionAr": null,
  "descriptionEn": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `serviceType` | `ServiceType` enum | Yes | CAR, ELECTRONICS, HOME_APPLIANCE |
| `serviceNameAr` | `string` | Yes | Min length 1 |
| `serviceNameEn` | `string` | Yes | Min length 1 |
| `minPrice` | `number` | Yes | ≥ 0, 3 decimal places |
| `maxPrice` | `number` | Yes | ≥ minPrice |
| `typicalDurationMinutes` | `integer` | No | ≥ 1 if provided |
| `descriptionAr` | `string` | No | |
| `descriptionEn` | `string` | No | |

### Response `201 Created`

Returns the created `CenterServicePricing` object (same shape as GET item above). `isActive` defaults to `true`.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (missing required field, maxPrice < minPrice) |
| `401` | Missing or expired JWT |
| `409` | Conflict — duplicate entry for this serviceType + name combination |

---

## PUT /centers/my/pricing/{id}

Updates an existing pricing entry. Also used to pause/activate (`isActive` toggle).

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | `integer` | ID of the pricing entry to update |

### Request Body

Same fields as POST, plus:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `isActive` | `boolean` | No | Omit to keep existing value; pass `false` to pause |

### Response `200 OK`

Returns the updated `CenterServicePricing` object.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Validation failure |
| `401` | Missing or expired JWT |
| `403` | Entry does not belong to the authenticated owner's center |
| `404` | Entry not found |

---

## DELETE /centers/my/pricing/{id}

Permanently deletes a pricing entry.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | `integer` | ID of the pricing entry to delete |

### Response `204 No Content`

### Error Responses

| Status | Condition |
|--------|-----------|
| `401` | Missing or expired JWT |
| `403` | Entry does not belong to the authenticated owner's center |
| `404` | Entry not found |
| `409` | Entry cannot be deleted (referenced by open booking quotes) |

---

## GET /centers/my/trust *(tentative — may not exist yet)*

Returns trust badges and score for the owner's center.

### Response `200 OK`

```json
{
  "badges": [
    {
      "badgeType": "VERIFIED_PRICING",
      "isEarned": true,
      "earnedAt": "2026-04-16T10:00:00Z",
      "criteriaEn": "Add at least 1 active pricing entry",
      "criteriaAr": "أضف سعراً نشطاً واحداً على الأقل"
    },
    {
      "badgeType": "FAST_RESPONDER",
      "isEarned": false,
      "criteriaEn": "Respond to bookings within 2 hours on average",
      "criteriaAr": "الرد على الحجوزات خلال ساعتين في المتوسط"
    }
  ]
}
```

### Graceful degradation

If this endpoint returns `404` or `500`, the mobile app shows a "Coming Soon" placeholder. The pricing feature continues to work normally — trust data failure is non-blocking.

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 400,
  "businessErrorDescription": "Validation failed",
  "error": "maxPrice must be >= minPrice",
  "validationErrors": ["maxPrice: must be >= minPrice"]
}
```
