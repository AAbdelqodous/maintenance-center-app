# Quickstart: Phase 2 — Booking Management

**Branch**: `phase-2-booking-management` | **Status**: ✅ Implemented

---

## Prerequisites

- Phase 1 (Foundation) working — login, session, dashboard
- Docker Compose running: `docker-compose up -d`
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- At least one CENTER_OWNER account approved and logged in

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web        # web (fastest for testing)
npx expo start              # native (requires emulator)
```

---

## Seeding Test Data

To test booking management, create bookings via the customer app or directly via the API:

```bash
# Create a test PENDING booking (requires a customer JWT)
curl -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer <customer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": 1,
    "serviceType": "CAR",
    "bookingDate": "2026-04-10",
    "bookingTime": "09:00:00",
    "notes": "Oil change"
  }'
```

---

## Smoke Test Checklist

### Booking List

- [ ] Tap the Bookings tab → list appears with booking cards
- [ ] "All" filter tab shows all bookings from all statuses
- [ ] Tap "Pending" tab → only PENDING bookings shown; URL param `status=PENDING` sent
- [ ] Scroll to bottom of list → next page loads automatically (pagination)
- [ ] Pull down to refresh → list resets to page 0 and reloads

### Overdue Indicator

- [ ] A PENDING booking whose `bookingDate`+`bookingTime` is in the past shows an overdue badge/indicator
- [ ] CONFIRMED or other status bookings do NOT show overdue indicator even if past

### Booking Detail

- [ ] Tap a booking card → detail screen opens with full booking info
- [ ] `bookingDate` displays in human-readable format (e.g. "April 10, 2026")
- [ ] `bookingTime` displays correctly (e.g. "9:00 AM")

### Accept Flow

- [ ] Open a PENDING booking → "Accept" button visible
- [ ] Tap Accept → confirmation dialog appears
- [ ] Confirm → booking status changes to CONFIRMED; list updates
- [ ] Toast or success indicator shown

### Reject Flow

- [ ] Open a PENDING booking → "Reject" button visible
- [ ] Tap Reject → bottom sheet modal slides up with list of rejection reasons
- [ ] Select a reason → "Confirm Rejection" button becomes active
- [ ] Confirm → booking status changes to REJECTED; list updates
- [ ] On web: modal also works (not `Alert.alert`)

### Progress & Complete

- [ ] Open a CONFIRMED booking → "Mark In Progress" button visible
- [ ] Confirm → status changes to IN_PROGRESS
- [ ] Open an IN_PROGRESS booking → "Mark Completed" button visible
- [ ] Confirm → status changes to COMPLETED

### Dashboard Stats

- [ ] Dashboard shows correct `pendingCount` — matches count of PENDING bookings
- [ ] Dashboard shows correct `activeCount`
- [ ] After accepting a booking, dashboard pending count decreases by 1

### RTL (Arabic)

- [ ] Switch to Arabic → booking list and detail labels display in Arabic
- [ ] Layout direction is RTL (status badges, buttons on correct side)
