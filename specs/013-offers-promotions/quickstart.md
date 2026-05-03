# Quickstart: Offers & Promotions

**Branch**: `013-offers-promotions`

---

## Prerequisites

- Backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- Frontend running: `npx expo start --web`
- Logged in as an approved CENTER_OWNER

---

## 1. Get a CENTER_OWNER JWT

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"fahd@bumber2bumber.com","password":"<password>"}'
```

Copy the `token`.

---

## 2. Create a PERCENTAGE offer (starts tomorrow)

```bash
curl -s -X POST http://localhost:8080/api/v1/centers/my/offers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titleAr": "خصم العيد",
    "titleEn": "Eid Discount",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "applicableServiceTypes": ["MAINTENANCE"],
    "startDate": "2026-06-01",
    "endDate": "2026-06-10"
  }'
```

Expected: `201 Created` with `status: "SCHEDULED"`.

---

## 3. Create a FIXED_AMOUNT offer (starts today — should be ACTIVE)

```bash
curl -s -X POST http://localhost:8080/api/v1/centers/my/offers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titleAr": "خصم ثابت",
    "titleEn": "Flat KD 5 Off",
    "discountType": "FIXED_AMOUNT",
    "discountValue": 5.000,
    "startDate": "2026-05-03",
    "endDate": "2026-05-31",
    "maxRedemptions": 50
  }'
```

Expected: `201 Created` with `status: "ACTIVE"`.

---

## 4. List all offers

```bash
curl -s http://localhost:8080/api/v1/centers/my/offers \
  -H "Authorization: Bearer <token>"
```

Expected: both offers appear with correct statuses.

---

## 5. Filter by ACTIVE status

```bash
curl -s "http://localhost:8080/api/v1/centers/my/offers?status=ACTIVE" \
  -H "Authorization: Bearer <token>"
```

Expected: only the FIXED_AMOUNT offer appears.

---

## 6. Edit the ACTIVE offer (extend end date — allowed)

```bash
curl -s -X PUT http://localhost:8080/api/v1/centers/my/offers/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titleAr": "خصم ثابت",
    "titleEn": "Flat KD 5 Off",
    "discountType": "FIXED_AMOUNT",
    "discountValue": 5.000,
    "startDate": "2026-05-03",
    "endDate": "2026-06-30",
    "maxRedemptions": 50
  }'
```

Expected: `200 OK`, endDate updated to June 30.

---

## 7. Attempt to change discount value on ACTIVE offer (should fail)

```bash
curl -s -X PUT http://localhost:8080/api/v1/centers/my/offers/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titleAr": "خصم ثابت",
    "titleEn": "Flat KD 5 Off",
    "discountType": "FIXED_AMOUNT",
    "discountValue": 10.000,
    "startDate": "2026-05-03",
    "endDate": "2026-06-30"
  }'
```

Expected: `400 Bad Request` with "Discount value cannot be changed while the offer is active".

---

## 8. Cancel the ACTIVE offer

```bash
curl -s -X PUT http://localhost:8080/api/v1/centers/my/offers/<id>/cancel \
  -H "Authorization: Bearer <token>"
```

Expected: `200 OK` with `status: "CANCELLED"` and `cancelledAt` populated.

---

## 9. Attempt to cancel already-cancelled offer (should fail)

```bash
curl -s -X PUT http://localhost:8080/api/v1/centers/my/offers/<id>/cancel \
  -H "Authorization: Bearer <token>"
```

Expected: `400 Bad Request`.

---

## 10. Test offer cap (create 10 offers, then attempt an 11th)

Create 10 offers with future dates, then:

```bash
curl -s -X POST http://localhost:8080/api/v1/centers/my/offers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "titleAr":"test","titleEn":"test","discountType":"PERCENTAGE","discountValue":5,"startDate":"2026-07-01","endDate":"2026-07-31" }'
```

Expected: `400 Bad Request` with offer limit message.

---

## 11. Frontend — verify in the app

1. Open `localhost:8081/profile` → tap "Offers & Promotions" card
2. Confirm offer list shows with status badges
3. Tap the **+** FAB → fill and save → confirm SCHEDULED offer appears
4. Tap an offer → tap Edit → confirm locked fields for ACTIVE offers
5. Tap Cancel → confirm dialog → confirm status changes to CANCELLED
