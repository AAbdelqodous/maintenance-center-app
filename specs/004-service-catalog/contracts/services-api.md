# API Contract: Service Catalog Endpoints

**Feature**: Phase 4 — Service Catalog
**Base path**: `/api/v1/categories/` and `/api/v1/centers/`
**Auth**: Category listing requires no auth. Center category assignment requires `Authorization: Bearer <jwt>`.

---

## GET /categories

Returns all available service categories.

**Auth**: None required.

### Response `200 OK`

```json
[
  {
    "id": 1,
    "nameAr": "سيارات",
    "nameEn": "Cars",
    "descriptionAr": null,
    "descriptionEn": null
  },
  {
    "id": 2,
    "nameAr": "إلكترونيات",
    "nameEn": "Electronics",
    "descriptionAr": null,
    "descriptionEn": null
  },
  {
    "id": 3,
    "nameAr": "أجهزة منزلية",
    "nameEn": "Home Appliances",
    "descriptionAr": null,
    "descriptionEn": null
  }
]
```

**Note**: The response may alternatively be wrapped in a `PageResponse` `{ content: [...], totalElements, ... }`. Frontend `transformResponse` handles both shapes.

---

## PUT /centers/my (category assignment)

The center's category assignments are updated via the main profile update endpoint. There is no standalone category-only endpoint.

### Relevant field in request body

```json
{
  "categoryIds": [1, 3]
}
```

The full request body is documented in [center-api.md](../contracts/center-api.md).

### Response `200 OK`

Returns the full updated `MaintenanceCenterResponse` with the updated `categories` array:

```json
{
  "categories": [
    { "id": 1, "nameAr": "سيارات", "nameEn": "Cars" },
    { "id": 3, "nameAr": "أجهزة منزلية", "nameEn": "Home Appliances" }
  ]
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | `categoryIds` is empty or contains non-existent IDs |
