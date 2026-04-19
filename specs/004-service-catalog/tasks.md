# Tasks: Phase 4 — Service Catalog Management

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-4-service-catalog`

---

## Phase 1: Foundational

- [x] T001 Add service CRUD endpoints to RTK Query slice (centerApi or new servicesApi):
  - `getServices()` → `ServiceResponse[]` (GET center's services)
  - `createService(body)` → `ServiceResponse` (POST)
  - `updateService({ id, data })` → `ServiceResponse` (PUT), invalidates service tags
  - `deleteService(id)` → void (DELETE), invalidates service tags
  - Tag: `'CenterProfile'` (or dedicated `'Services'` tag)
- [x] T002 Verify `getCategories()` endpoint in `centerApi.ts` returns `ServiceCategory[]` — used for the category dropdown in add/edit form

---

## Phase 2: User Story 1 — View Service Catalog (P1)

**Goal**: Owner sees grouped list of services with status badges.

- [x] T003 Create `app/(app)/(tabs)/profile/services/_layout.tsx` — Stack navigator
- [x] T004 Create `app/(app)/(tabs)/profile/services/index.tsx` — service list screen:
  - `useGetServicesQuery()` with `ActivityIndicator` + error banner
  - Group services by category (using `reduce` or `SectionList`)
  - Each service item: `nameAr` or `nameEn` per locale, price `KD X.XXX`, duration, active/paused badge (green/grey)
  - Paused services: opacity-50 or grey styling
  - Empty state: "No services added yet. Tap '+' to add your first service."
  - FAB or header "+" navigates to `./add`
- [x] T005 Add "Manage Services" navigation row to `app/(app)/(tabs)/profile/index.tsx`

---

## Phase 3: User Story 2 + 3 — Add & Edit Service (P1)

**Goal**: Form with bilingual name, category, price (3dp), duration, optional descriptions; pre-populated on edit.

- [x] T006 Create Zod schema for service form:
  ```typescript
  z.object({
    nameAr:       z.string().min(1),
    nameEn:       z.string().min(1),
    categoryId:   z.number(),
    price:        z.number().min(0),
    durationMinutes: z.number().int().min(1),
    descriptionAr: z.string().optional(),
    descriptionEn: z.string().optional(),
    isActive:     z.boolean(),
  })
  ```
- [x] T007 Create `app/(app)/(tabs)/profile/services/add.tsx` — add service screen:
  - `useForm` with Zod resolver, empty defaults
  - Fields: nameAr, nameEn, category picker (`useGetCategoriesQuery()`), price (decimal-pad), duration (number-pad), descriptionAr, descriptionEn, isActive switch
  - `useCreateServiceMutation()` on submit → navigate back on success → inline error banner on failure
- [x] T008 Create `app/(app)/(tabs)/profile/services/[id].tsx` — edit service screen:
  - Pre-populate form from `useGetServicesQuery()` data by ID
  - Same form fields as add
  - `useUpdateServiceMutation()` on submit
  - `usePreventRemove` (or back-button interception) for discard-changes dialog

---

## Phase 4: User Story 4 + 5 — Pause & Delete (P2)

**Goal**: Toggle active/paused immediately; delete with destructive confirmation.

- [x] T009 Add active/paused toggle to `[id].tsx` edit screen (or inline on list):
  - Separate from form save — calls `updateService({ id, data: { isActive: !current } })` immediately on toggle
  - Platform-aware confirmation before pausing: `window.confirm` on web, `Alert.alert` on native
- [x] T010 Add "Delete Service" button to `[id].tsx`:
  - Platform-aware destructive confirmation
  - `useDeleteServiceMutation(id)` → navigate back on success → inline error banner on failure

---

## Phase 5: Polish

- [x] T011 Add i18n keys for service catalog: all field labels, validation errors, status badges, empty state, confirmation messages
- [x] T012 Verify price display: `KD X.XXX` 3-decimal format everywhere (use utility or `.toFixed(3)`)
- [x] T013 Verify RTL: form labels, service list items, category dropdown all correct in Arabic

---

## Dependencies

- T001 (API) must complete before T003–T010
- T002 (categories) required before T007 (add form — category dropdown)
- T003 (layout) before T004 (list), T007 (add), T008 (edit)
- T008 (edit) extends T007 (same form schema, shared Zod schema)
- T009 + T010 extend T008 (edit screen)
