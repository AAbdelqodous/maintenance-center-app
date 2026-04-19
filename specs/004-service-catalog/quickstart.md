# Quickstart: Phase 4 — Service Catalog

**Branch**: `phase-4-service-catalog` | **Status**: ✅ Implemented

---

## Prerequisites

- Phase 1–3 working (login, bookings, profile)
- Center profile already created (Phase 3 setup-center done)
- Docker Compose running: `docker-compose up -d`
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web
```

---

## Smoke Test Checklist

### Category List Display

- [ ] Open profile/catalog screen → category chips load from `GET /categories`
- [ ] All 6 categories appear: Cars, Electronics, Home Appliances, Restaurant, Hotel, Other
- [ ] With Arabic locale: categories display in Arabic (`nameAr`)
- [ ] With English locale: categories display in English (`nameEn`)

### Category Selection

- [ ] Tap an unselected category → it becomes selected (visual toggle)
- [ ] Tap a selected category → it becomes deselected
- [ ] Multiple categories can be selected simultaneously
- [ ] Previously saved categories are pre-selected when the form loads

### Saving Category Assignment

- [ ] Select one or more categories and save → `PUT /centers/my` sent with `categoryIds`
- [ ] Re-open the profile → selected categories are still checked
- [ ] Deselect all categories and save → validation error ("Select at least one category")

### Center Profile Sync

- [ ] After saving, `GET /centers/my/profile` returns updated `categories` array
- [ ] Dashboard and other screens that show category info reflect the update
