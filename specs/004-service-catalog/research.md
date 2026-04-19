# Research: Phase 4 — Service Catalog

**Branch**: `phase-4-service-catalog` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Service Categories — Seeded, Read-Only from Center Owner Perspective

**Decision**: Center owners select from a pre-seeded global list of `ServiceCategory` items. They cannot create new categories.

**Rationale**:
- `service_categories` table is seeded with 6 rows by the backend (CAR, ELECTRONICS, HOME_APPLIANCE, RESTAURANT, HOTEL, OTHER).
- Allowing custom categories would require admin moderation to prevent spam.
- `GET /categories` returns the full list; center owner assigns from this list via `categoryIds` in the center profile update.
- Phase 4 spec is about surfacing the category assignment UI in a dedicated "Service Catalog" context.

---

## Decision 2: No Standalone Service Items — Category Assignment Only

**Decision**: Phase 4 does not introduce individual service line items (e.g. "Oil change — 15 KD"). It manages which top-level categories the center serves.

**Rationale**:
- Granular service pricing belongs to Phase 3.5.
- Phase 4 is bounded to what the center advertises: which service verticals it covers.
- Keeping scope minimal avoids backend schema changes.

---

## Decision 3: Category Display — Chips with Bilingual Labels

**Decision**: Categories rendered as selectable chips using `nameAr` or `nameEn` based on active language.

**Rationale**:
- Small, fixed list (~6 items) fits a horizontal chip row or a 2-column grid.
- `i18n.language === 'ar'` selects `nameAr`; otherwise `nameEn`.
- Selected state toggled in local `categoryIds` array; committed on form save.

---

## Decision 4: Category Data Sharing with Profile

**Decision**: `useGetCategoriesQuery` defined in `centerApi.ts` and shared between the profile editor and any standalone service catalog view.

**Rationale**:
- RTK Query caches the category list globally — no duplicate fetches.
- `providesTags` not needed (categories are static); no `invalidatesTags` required.
- `transformResponse` normalizes both plain array and `PageResponse` wrapper.

---

## Resolved Clarifications

- ✅ Categories: global pre-seeded list, center owner selects from it
- ✅ No individual service items in this phase
- ✅ Display: bilingual chips based on active language
- ✅ Data: reuses `useGetCategoriesQuery` from centerApi
