# Quickstart: Phase 5 — Review Management

**Branch**: `phase-5-review-management` | **Status**: ✅ Implemented

---

## Prerequisites

- Phase 1–4 working (login, bookings, profile, catalog)
- Docker Compose running: `docker-compose up -d`
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- At least one customer review exists for the center (create via customer app or API)

---

## Seeding Test Data

To create a review, a customer must complete a booking first, then submit a review via the customer app or directly via API:

```bash
# Submit a review as a customer (requires customer JWT and completed booking ID)
curl -X POST http://localhost:8080/api/v1/reviews \
  -H "Authorization: Bearer <customer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": 1,
    "bookingId": 5,
    "rating": 4,
    "comment": "Good service overall."
  }'
```

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web
```

---

## Smoke Test Checklist

### Reviews List

- [ ] Tap the Reviews tab → list of customer reviews loads
- [ ] Each review card shows: customer name (first + last), star rating, comment, date
- [ ] Reviews without a reply show a "Reply" button
- [ ] Reviews with an existing reply show the reply text (read-only)
- [ ] Scroll to bottom → next page loads (pagination)
- [ ] Pull to refresh → list resets and reloads from page 0

### Star Rating Display

- [ ] `RatingStars` component renders correctly for ratings 1–5
- [ ] 5-star reviews show 5 filled stars
- [ ] 3-star reviews show 3 filled + 2 empty stars

### Reply Flow

- [ ] Tap "Reply" on an unreplied review → inline text input appears
- [ ] Type a reply and submit → `POST /reviews/{id}/reply` called
- [ ] On success: text input disappears, reply text shown in read-only mode
- [ ] Submitted reply persists after pull-to-refresh

### No Reply Edit

- [ ] A review that already has `ownerReply` does NOT show the "Reply" button
- [ ] The existing reply is displayed as read-only text

### Empty State

- [ ] Center with no reviews shows empty state message ("No reviews yet")

### RTL (Arabic)

- [ ] Switch to Arabic → review labels and empty state text in Arabic
- [ ] Layout is RTL (stars and buttons on correct sides)
