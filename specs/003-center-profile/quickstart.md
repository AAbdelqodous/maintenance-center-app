# Quickstart: Phase 3 — Center Profile Management

**Branch**: `phase-3-center-profile` | **Status**: ✅ Implemented

---

## Prerequisites

- Phase 1 & 2 working (login, session, bookings)
- Docker Compose running: `docker-compose up -d`
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- Logged in as an APPROVED CENTER_OWNER

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web
```

---

## Smoke Test Checklist

### First-Time Setup

- [ ] Log in as a CENTER_OWNER with no existing center → redirected to `setup-center` screen
- [ ] Fill in Arabic name, English name, phone, address fields, opening/closing time, select ≥1 category
- [ ] Submit → center created; redirected to the main dashboard

### Profile Editor

- [ ] Tap Profile tab → center profile loads with current data pre-filled in form
- [ ] Both Arabic and English name fields are visible and editable
- [ ] All address fields show bilingual pairs (city, district, street, governorate in AR + EN)
- [ ] Opening time and closing time show in `HH:mm` format

### Validation

- [ ] Clear the Arabic name field and save → validation error appears ("Arabic name is required")
- [ ] Enter closing time earlier than opening time → validation error ("Closing time must be after opening time")
- [ ] Select no categories and save → validation error ("Select at least one category")
- [ ] Enter invalid email format → validation error

### Saving

- [ ] Make a valid change to a text field and tap Save → success message shown
- [ ] Re-open profile tab → saved values are displayed (RTK cache invalidated)

### Category Selection

- [ ] Category chips/toggles load from `/categories`
- [ ] Toggle multiple categories → all selected categories saved on submit
- [ ] Previously selected categories are pre-checked when opening the form

### Image Upload

- [ ] Tap "Change Image" → image picker opens
- [ ] Select an image → uploads to `POST /centers/my/images`
- [ ] Profile screen shows the new image after upload

### Active Status Toggle

- [ ] Toggle the center's "Active" status switch → saved on form submit
- [ ] `isActive: false` shows the center as inactive/closed

### RTL (Arabic)

- [ ] Switch to Arabic → all form labels appear in Arabic
- [ ] Form layout is RTL
