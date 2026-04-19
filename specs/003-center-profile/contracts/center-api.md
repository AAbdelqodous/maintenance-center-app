# API Contract: Center Profile Endpoints

**Feature**: Phase 3 — Center Profile Management
**Base path**: `/api/v1/centers/` and `/api/v1/categories/`
**Auth**: `Authorization: Bearer <jwt>` required on all center endpoints.

---

## GET /centers/my/profile

Returns the full profile of the authenticated center owner's center.

### Response `200 OK`

```json
{
  "id": 1,
  "nameAr": "مركز الخليج للصيانة",
  "nameEn": "Gulf Maintenance Center",
  "descriptionAr": "نخصص في إصلاح السيارات",
  "descriptionEn": "Specializing in car repair",
  "phone": "+96522000001",
  "email": "gulf@example.com",
  "address": {
    "cityAr": "الكويت",
    "cityEn": "Kuwait City",
    "districtAr": "الصالحية",
    "districtEn": "Salhiya",
    "streetAr": "شارع الخليج",
    "streetEn": "Gulf Street",
    "governorateAr": "العاصمة",
    "governorateEn": "Capital"
  },
  "openingTime": "08:00:00",
  "closingTime": "18:00:00",
  "isActive": true,
  "imageUrl": "https://storage.example.com/centers/1/main.jpg",
  "categories": [
    { "id": 1, "nameAr": "سيارات", "nameEn": "Cars" }
  ],
  "averageRating": 4.7,
  "totalReviews": 38,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

**Field notes:**
- `isActive` — NOT `isOpen`
- `totalReviews` — NOT `reviewCount`
- `openingTime` / `closingTime` — `"HH:mm:ss"` format

### Error Responses

| Status | Condition |
|--------|-----------|
| `404` | No center profile exists for this owner — redirect to setup-center screen |

---

## PUT /centers/my

Updates the center profile.

### Request Body

```json
{
  "nameAr": "مركز الخليج للصيانة",
  "nameEn": "Gulf Maintenance Center",
  "descriptionAr": "نخصص في إصلاح السيارات",
  "descriptionEn": "Specializing in car repair",
  "phone": "+96522000001",
  "email": "gulf@example.com",
  "address": {
    "cityAr": "الكويت",
    "cityEn": "Kuwait City",
    "districtAr": "الصالحية",
    "districtEn": "Salhiya",
    "streetAr": "شارع الخليج",
    "streetEn": "Gulf Street",
    "governorateAr": "العاصمة",
    "governorateEn": "Capital"
  },
  "openingTime": "08:00:00",
  "closingTime": "18:00:00",
  "isActive": true,
  "categoryIds": [1, 3]
}
```

**Note**: `openingTime` and `closingTime` must be `"HH:mm:ss"` — append `:00` to user-entered `HH:mm`.

### Response `200 OK`

Returns the full updated `MaintenanceCenterResponse` (same shape as GET above).

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (missing required fields) |

---

## POST /centers/my/images

Uploads a new main image for the center.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Notes |
|-------|------|-------|
| `file` | binary | JPEG or PNG image |

### Response `200 OK`

Returns the updated `MaintenanceCenterResponse` with the new `imageUrl`.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | File missing or unsupported format |
| `413` | File too large |

---

## GET /categories

Returns all available service categories.

**Auth**: No auth required.

### Response `200 OK`

```json
[
  { "id": 1, "nameAr": "سيارات", "nameEn": "Cars", "descriptionAr": null, "descriptionEn": null },
  { "id": 2, "nameAr": "إلكترونيات", "nameEn": "Electronics", "descriptionAr": null, "descriptionEn": null },
  { "id": 3, "nameAr": "أجهزة منزلية", "nameEn": "Home Appliances", "descriptionAr": null, "descriptionEn": null }
]
```

**Note**: May also be wrapped in a `PageResponse` — frontend `transformResponse` handles both.

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 400,
  "businessErrorDescription": "Validation failed",
  "error": "Invalid request body",
  "validationErrors": ["nameAr: must not be blank"]
}
```
