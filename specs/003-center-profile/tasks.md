# Tasks: Phase 3 — Center Profile Management

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-3-center-profile`

---

## Phase 1: Foundational

- [x] T001 Create `store/api/centerApi.ts` — endpoints:
  - `getCenterProfile()` → `MaintenanceCenterResponse` (`GET /centers/my/profile`), tag `'CenterProfile'`
  - `updateCenter(body: MaintenanceCenterRequest)` → `MaintenanceCenterResponse` (`PUT /centers/my`), invalidates `'CenterProfile'`
  - `uploadCenterImage(formData: FormData)` → `MaintenanceCenterResponse` (`POST /centers/my/images`), invalidates `'CenterImages'`
  - `getCategories()` → `ServiceCategory[]` (`GET /categories`), tag `'CenterProfile'`

---

## Phase 2: User Story 1 + 2 — View & Edit Profile (P1)

**Goal**: Profile tab shows all center fields; edit form pre-populated with validation.

- [x] T002 Create `app/(app)/(tabs)/profile/index.tsx` — profile screen:
  - `useGetCenterProfileQuery()` → displays all fields (nameAr, nameEn, descriptionAr, descriptionEn, phone, address, categories, rating, isActive)
  - Edit mode toggle or navigate to edit sub-screen
  - React Hook Form + Zod validation on edit form:
    - Required: `nameAr`, `nameEn`, phone, `streetAr`, `cityAr`, `governorateAr` (and EN variants)
    - Optional: descriptions (max 500 chars each)
    - Inline per-field errors
  - `useUpdateCenterMutation()` → on success, invalidates and refetches profile
  - Discard-changes confirmation on back navigation when form is dirty

---

## Phase 3: User Story 3 — Operating Hours (P1)

**Goal**: Owner sets hours per day; closing must be after opening; persisted in `HH:mm:ss` format.

- [x] T003 Add operating hours section to profile edit form:
  - 7 day rows (Sunday–Saturday), each with open/closed toggle
  - When open: `openingTime` + `closingTime` inputs in `HH:mm` (sent as `HH:mm:ss`)
  - Zod validation: closing must be after opening for each open day
  - Inline error per day if closing ≤ opening

---

## Phase 4: User Story 4 — Center Photos (P2)

**Goal**: Owner can add and remove center photos; individual upload progress shown.

- [x] T004 Add photos section to profile screen:
  - `useGetCenterProfileQuery()` exposes images array
  - "Add Photo" button opens picker (camera / library via `expo-image-picker`)
  - Upload via `useUploadCenterImageMutation()` with `FormData`
  - Loading indicator per uploading photo
  - Remove photo (if backend supports DELETE — otherwise hide UI if not yet implemented)
- [x] T005 Create `app/(app)/setup-center.tsx` — same form as profile edit but shown to new owners with no profile yet; navigates to dashboard on save

---

## Phase 5: Polish

- [x] T006 Add i18n keys for profile: all field labels, validation errors, day names (AR + EN)
- [x] T007 Verify bilingual address fields: `cityAr`, `cityEn`, `streetAr`, `streetEn`, `governorateAr`, `governorateEn` — never single `city`/`street`
- [x] T008 Verify RTL layout: form labels right-aligned in Arabic, address fields flow RTL

---

## Dependencies

- T001 (centerApi) must complete before T002–T004
- T003 extends T002 (hours inside profile form)
- T004 extends T002 (photos inside profile screen)
