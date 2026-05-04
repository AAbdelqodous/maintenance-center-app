# API Contract: Offers & Promotions

**Branch**: `013-offers-promotions` | **Date**: 2026-05-03
**Base path**: `/api/v1/`
**Auth**: All endpoints require `Authorization: Bearer <jwt>` (OWNER role).

---

## Endpoints

### GET /centers/my/offers

Returns all offers for the authenticated owner's center, ordered by `createdAt` descending. Optional status filter.

**Query parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | `OfferStatus` | (none) | Optional. Values: `SCHEDULED`, `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `page` | int | `0` | Zero-based |
| `size` | int | `20` | |

**Response `200 OK`**
```json
{
  "content": [
    {
      "id": 1,
      "titleAr": "خصم العيد على تغيير الزيت",
      "titleEn": "Eid Oil Change Discount",
      "descriptionAr": "خصم 20% على جميع خدمات تغيير الزيت",
      "descriptionEn": "20% off all oil change services",
      "discountType": "PERCENTAGE",
      "discountValue": 20.000,
      "applicableServiceTypes": ["MAINTENANCE"],
      "startDate": "2026-06-01",
      "endDate": "2026-06-10",
      "maxRedemptions": 100,
      "currentRedemptions": 0,
      "status": "SCHEDULED",
      "cancelledAt": null,
      "createdAt": "2026-05-03T10:00:00"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

### POST /centers/my/offers

Creates a new offer for the authenticated owner's center.

**Request body**
```json
{
  "titleAr": "خصم العيد على تغيير الزيت",
  "titleEn": "Eid Oil Change Discount",
  "descriptionAr": "خصم 20% على جميع خدمات تغيير الزيت",
  "descriptionEn": "20% off all oil change services",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "applicableServiceTypes": ["MAINTENANCE"],
  "startDate": "2026-06-01",
  "endDate": "2026-06-10",
  "maxRedemptions": 100
}
```

`applicableServiceTypes` is optional — omit or send `[]` for all services.
`maxRedemptions` is optional — omit for unlimited.

**Response `201 Created`** — `OfferResponse` (same shape as list item above)

**Response `400 Bad Request`** — validation failure
```json
{ "validationErrors": ["End date must be after start date"] }
```

**Response `400 Bad Request`** — offer cap reached
```json
{
  "businessErrorDescription": "You have reached the maximum of 10 active or scheduled offers",
  "error": "Offer limit exceeded"
}
```

---

### GET /centers/my/offers/{id}

Returns a single offer by ID.

**Response `200 OK`** — `OfferResponse`

**Response `404 Not Found`** — offer does not belong to this center

---

### PUT /centers/my/offers/{id}

Updates an offer. Field restrictions apply based on current status (see FR-006 / FR-007).

**Request body** — same shape as `POST /centers/my/offers`

**Response `200 OK`** — updated `OfferResponse`

**Response `400 Bad Request`** — editing EXPIRED or CANCELLED offer
```json
{
  "businessErrorDescription": "Cannot edit an offer with status EXPIRED",
  "error": "Invalid offer state"
}
```

**Response `400 Bad Request`** — attempting to change a locked field on an ACTIVE offer
```json
{
  "businessErrorDescription": "Discount value cannot be changed while the offer is active",
  "error": "Field locked"
}
```

**Response `400 Bad Request`** — setting endDate earlier than current endDate on ACTIVE offer
```json
{
  "businessErrorDescription": "End date can only be extended for active offers",
  "error": "Invalid end date"
}
```

---

### PUT /centers/my/offers/{id}/cancel

Cancels a SCHEDULED or ACTIVE offer immediately.

**Request body**: none

**Response `200 OK`** — updated `OfferResponse` with `status: "CANCELLED"` and `cancelledAt` populated

**Response `400 Bad Request`** — offer is already EXPIRED or CANCELLED
```json
{
  "businessErrorDescription": "Cannot cancel an offer with status EXPIRED",
  "error": "Invalid offer state"
}
```

**Response `404 Not Found`** — offer does not belong to this center

---

## RTK Query Slice (`store/api/offersApi.ts`)

```typescript
export const offersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyOffers: builder.query<PageResponse<CenterOffer>, { status?: OfferStatus; page?: number; size?: number }>({
      query: ({ status, page = 0, size = 20 } = {}) => ({
        url: 'centers/my/offers',
        params: { ...(status && { status }), page, size },
      }),
      providesTags: ['Offers'],
    }),
    getOffer: builder.query<CenterOffer, number>({
      query: (id) => `centers/my/offers/${id}`,
      providesTags: ['Offers'],
    }),
    createOffer: builder.mutation<CenterOffer, CreateOfferRequest>({
      query: (body) => ({ url: 'centers/my/offers', method: 'POST', body }),
      invalidatesTags: ['Offers'],
    }),
    updateOffer: builder.mutation<CenterOffer, { id: number; data: UpdateOfferRequest }>({
      query: ({ id, data }) => ({ url: `centers/my/offers/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Offers'],
    }),
    cancelOffer: builder.mutation<CenterOffer, number>({
      query: (id) => ({ url: `centers/my/offers/${id}/cancel`, method: 'PUT' }),
      invalidatesTags: ['Offers'],
    }),
  }),
});
```

---

## Error Code Reference

No new `BusinessErrorCodes` entries needed — validation errors use the existing `validationErrors` array and business errors use `businessErrorDescription` + `error` fields via `IllegalArgumentException` / `IllegalStateException` handlers already in `GlobalExceptionHandling`.
