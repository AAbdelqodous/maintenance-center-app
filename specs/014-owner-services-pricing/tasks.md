# Tasks: My Services Screen — Owner Declares Services & Pricing

**Input**: Design documents from `/specs/014-owner-services-pricing/`
**Branch**: `014-owner-services-pricing`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: No TDD tasks generated — spec does not request a TDD approach. Manual smoke test and RTL spot-check are included in the Polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no dependency conflicts)
- **[Story]**: Maps to spec.md user story (US1 = View, US2 = Add, US3 = Edit, US4 = Delete, US5 = Profile categories)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new directory structure so all subsequent tasks have valid paths to write to.

- [x] T001 Create directory `app/(app)/(tabs)/profile/services/` and `components/services/` (mkdir only — no files yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, API endpoints, i18n keys, utility helpers, Zod schemas, and atomic form components that every screen depends on. **No user story work can begin until this phase is complete.**

- [x] T002 Add `ServiceResponse`, `CenterServiceResponse`, `CreateCenterServiceRequest`, `UpdateCenterServiceRequest` TypeScript interfaces to `store/api/centerApi.ts` (before the `endpoints` block; do NOT modify any existing interface)
- [x] T003 Expand `tagTypes` in `centerApi` to `['Center', 'ServiceCatalog', 'CenterServices']` and add 6 new endpoints (`getAllServices`, `getServicesForCategory`, `getMyCenterServices`, `addCenterService`, `updateCenterService`, `deleteCenterService`) to `store/api/centerApi.ts` per the signatures in `specs/014-owner-services-pricing/contracts/rtk-query-hooks.md`; update the named export list at the bottom of the file
- [x] T004 [P] Add all `services.*` i18n keys to `lib/i18n/locales/en.json` under a new `"services"` top-level key (keys listed in `specs/014-owner-services-pricing/plan.md` section 1.7)
- [x] T005 [P] Add all `services.*` i18n keys to `lib/i18n/locales/ar.json` with natural Arabic RTL phrasing (mirror the structure from T004)
- [x] T006 [P] Create `lib/utils/formatPrice.ts` with the `formatPriceRange(minPrice, maxPrice)` helper that returns `"KD X.XXX – Y.YYY"`, `"From KD X.XXX"`, `"Up to KD Y.YYY"`, or `"Price on request"` when both are null (implementation in `specs/014-owner-services-pricing/data-model.md`)
- [x] T007 Create `components/services/servicesSchema.ts` with `addCenterServiceSchema` (categoryId, serviceId, optional pricing fields, cross-field `maxPrice >= minPrice` refinement) and `editCenterServiceSchema` (same minus categoryId and serviceId); export both schemas and their inferred types `AddCenterServiceForm` and `EditCenterServiceForm` (full schema in data-model.md)
- [x] T008 [P] Create `components/services/PriceRangeInput.tsx` — a React Hook Form `Controller`-wrapped component accepting `{ control, errors, isRTL }` props; renders two numeric `TextInput` fields (min price, max price) with `keyboardType="decimal-pad"`, "KD" suffix label, and inline error display for the `maxPrice` cross-field error
- [x] T009 [P] Create `components/services/BilingualDescriptionFields.tsx` — a React Hook Form `Controller`-wrapped component accepting `{ control, errors, isRTL }` props; renders two multiline `TextInput` fields (Arabic, English) with `maxLength={500}`, a live character counter label below each field (e.g. `"0/500"`), and RTL text alignment for the Arabic field

**Checkpoint**: Foundation ready — all screens can now import types, hooks, schemas, and components.

---

## Phase 3: User Story 1 — View Offered Services (Priority: P1) 🎯 MVP

**Goal**: Owner opens the Services screen from the Profile menu and sees all their active service offerings grouped by category, with price and duration on each card.

**Independent Test**: Log in → Profile tab → tap "Manage Services" → see services grouped by category; empty state visible if no services exist.

- [x] T010 [P] [US1] Create `components/services/ServiceCard.tsx` — renders one `CenterServiceResponse` row: service name (locale-aware from `service.nameAr`/`service.nameEn`), price range via `formatPriceRange`, duration (`"X min"`) if set, an Edit icon button (`onEdit` prop → `router.push`), and a Delete icon button (`onDelete` prop — caller owns the confirmation dialog); min height 44pt; props: `{ item: CenterServiceResponse; onEdit: () => void; onDelete: () => void }`
- [x] T011 [P] [US1] Create `components/services/CategorySection.tsx` — renders a category name header (locale-aware from `category.nameAr`/`category.nameEn`) followed by a list of `ServiceCard` components; props: `{ category: ServiceCategory; services: CenterServiceResponse[]; onEditService: (id: number) => void; onDeleteService: (id: number) => void }`
- [x] T012 [US1] Create `app/(app)/(tabs)/profile/services/_layout.tsx` — a `<Stack>` navigator with `screenOptions={{ headerShown: true }}` and a single screen named `index` with the title coming from `t('services.title')`
- [x] T013 [US1] Create `app/(app)/(tabs)/profile/services/index.tsx` (`MyServicesScreen`):
  - Call `useGetMyCenterServicesQuery()` and render: loading spinner → error state with retry → empty state with `t('services.noServices')` + "Add your first service" button → grouped data via `CategorySection[]`
  - Grouping: use `useMemo` to build `Map<categoryId, { category, services[] }>` from the flat response, then render one `CategorySection` per map entry
  - Delete handler: platform-aware confirmation (`Platform.OS === 'web'` → `window.confirm(t('services.deleteConfirmWeb'))`, else `Alert.alert`) before calling `useDeleteCenterServiceMutation`; on success, cache auto-refreshes via `CenterServices:LIST` tag invalidation
  - FAB: "+" button (bottom-right, absolute position) → `router.push('/(app)/(tabs)/profile/services/add')`
- [x] T014 [US1] Register the new sub-route as a hidden tab in `app/(app)/(tabs)/_layout.tsx`: add `<Tabs.Screen name="profile/services" options={{ href: null }} />` alongside the existing `profile/pricing`, `profile/offers`, `profile/staff` hidden registrations (no other changes to the layout)

**Checkpoint**: MyServicesScreen is fully functional. Owner can see existing services or the empty state. Delete from the list works.

---

## Phase 4: User Story 2 — Add a New Service Offering (Priority: P1)

**Goal**: Owner taps "+" on the Services screen, walks through three steps (category → service → pricing), submits, and sees the new offering in the list.

**Independent Test**: From Services screen → tap "+" → complete all 3 steps → submit → new service card appears in the list under the correct category header.

- [x] T015 [US2] Create `app/(app)/(tabs)/profile/services/add.tsx` (`AddCenterServiceScreen`):
  - Local state: `const [step, setStep] = useState<1 | 2 | 3>(1)` and `const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)`
  - Step indicator: 3 dots at top showing current step (active dot is filled blue, others outlined)
  - **Step 1** (category): render `useGetCategoriesQuery()` result as a chip grid; tap a chip → set `selectedCategoryId` → advance to step 2
  - **Step 2** (service): fetch `useGetServicesForCategoryQuery(selectedCategoryId!, { skip: !selectedCategoryId })` and `useGetMyCenterServicesQuery()`; compute `alreadyOfferedIds = new Set(myCenterServices.filter(s => s.category.id === selectedCategoryId).map(s => s.service.id))`; render service list where already-offered services have grey background, opacity 0.5, a lock icon, and `accessibilityState={{ disabled: true }}`; tapping an enabled service sets `serviceId` in RHF and advances to step 3
  - **Step 3** (pricing + description): render `PriceRangeInput` and `BilingualDescriptionFields` from foundation components; "Save" button triggers RHF `handleSubmit` → `zodResolver(addCenterServiceSchema)` validates the whole form → calls `useAddCenterServiceMutation`; on success → `router.back()`; on error → inline error banner (not Alert)
  - Back button on steps 2 and 3 retreats one step without clearing the full form
  - "Back" on step 1 calls `router.back()` (exits add flow)

**Checkpoint**: US1 + US2 independently functional. Owner can view and add services.

---

## Phase 5: User Story 3 — Edit an Existing Service Offering (Priority: P2)

**Goal**: Owner taps the Edit icon on a service card, sees the pricing and description fields pre-filled, changes values, saves, and sees the card update.

**Independent Test**: Tap edit on a service card → pre-filled form with read-only identity labels → change max price → save → list card shows updated price.

- [x] T016 [US3] Create `app/(app)/(tabs)/profile/services/[id].tsx` (`EditCenterServiceScreen`):
  - `const { id } = useLocalSearchParams<{ id: string }>()` → `const { data: services } = useGetMyCenterServicesQuery()` → `const offering = services?.find(s => s.id === Number(id))`
  - If `offering` is undefined (deep link / cache miss): render "Service not found" text + Back button
  - Header: `t('services.editService')` via `<Stack.Screen options={{ title: t('services.editService') }} />`
  - Read-only identity section: `t('services.category')` label + chip showing `offering.category.nameAr/nameEn`; `t('services.service')` label + chip showing `offering.service.nameAr/nameEn`; no onPress handlers; greyed chip style
  - Editable fields: pre-fill RHF `defaultValues` from `offering` (minPrice, maxPrice, typicalDurationMinutes, descriptionAr, descriptionEn); render `PriceRangeInput` and `BilingualDescriptionFields`
  - "Save" button: validates with `zodResolver(editCenterServiceSchema)` → calls `useUpdateCenterServiceMutation({ id: offering.id, data: formValues })`; on success → `router.back()`
  - "Remove Service" button at bottom (red, destructive style): platform-aware confirmation → calls `useDeleteCenterServiceMutation(offering.id)`; on success → `router.back()`

**Checkpoint**: US1 + US2 + US3 independently functional. Owner can view, add, and edit services. Delete from edit screen also covers US4.

---

## Phase 6: User Story 4 — Remove a Service Offering (Priority: P2)

**Goal**: Delete capability is reachable from both the list card and the edit screen. No new files required — this phase confirms coverage across already-implemented tasks.

**Independent Test**: Delete from list (ServiceCard delete icon → confirmation → service disappears); delete from edit screen (edit → Remove button → confirmation → navigates back → service gone from list).

- [x] T017 [US4] Verify that `MyServicesScreen` (T013) correctly wires `onDeleteService` from `CategorySection` → platform-aware confirmation → `deleteCenterService` mutation → UI updates via cache invalidation; add the category-section-disappears behaviour: when the last service in a category is deleted, the `CategorySection` for that category no longer renders (naturally falls out since the `grouped` useMemo recomputes)
- [x] T018 [US4] Verify that `EditCenterServiceScreen` (T016) "Remove Service" button performs the full confirmation + mutation + `router.back()` flow on both web (`window.confirm`) and native (`Alert.alert`); confirm the Services list auto-refreshes after navigation (RTK `CenterServices:LIST` invalidation)

**Checkpoint**: Full delete coverage from both list and edit screen confirmed.

---

## Phase 7: User Story 5 — Profile Reflects Derived Categories (Priority: P3)

**Goal**: Profile screen no longer has a categories multi-select. Instead, a read-only "Categories you serve" section derived from active offerings replaces it. "Manage Services" row replaces the "Manage Pricing" row.

**Independent Test**: Add a service under a new category → go to Profile tab → "Categories you serve" section shows the new category; no category multi-select chip grid is visible.

- [x] T019 [US5] Modify `app/(app)/(tabs)/profile/index.tsx` — remove the `selectedCategoryIds` state, `useGetCategoriesQuery` import and usage, and the `categoriesGrid` JSX section (chip grid, lines ~333–355); remove `selectedCategoryIds.length === 0` from the `handleUpdateProfile` validation guard; remove `categoryIds: selectedCategoryIds` from the `updateCenter` call body; add `useGetMyCenterServicesQuery` import and call; add `derivedCategories` useMemo (implementation in data-model.md); render a new read-only "Categories you serve" section using chip-style labels (no `onPress`) for each derived category; change the "Manage Pricing" `menuRow` to navigate to `/(app)/(tabs)/profile/services` and use `t('services.manageServices')` as the label

**Checkpoint**: All 5 user stories are independently functional. Profile correctly derives categories from service offerings.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: RTL validation, accessibility pass, and end-to-end smoke test.

- [ ] T020 [P] RTL spot-check: switch app locale to Arabic (`i18n.changeLanguage('ar')`) → open Services list, Add flow, and Edit screen → verify all text aligns right, chip grids wrap correctly, price inputs flow RTL, and no text overflows; fix any layout issues found
- [ ] T021 [P] Accessibility pass: verify all interactive elements in `ServiceCard`, `CategorySection`, `AddCenterServiceScreen`, and `EditCenterServiceScreen` have `accessibilityLabel` props set; disabled services in step 2 have `accessibilityState={{ disabled: true }}`; confirm min 44pt touch targets on all buttons
- [ ] T022 End-to-end smoke test per `specs/014-owner-services-pricing/quickstart.md`: cold start → login → Profile → Manage Services → empty state → add service (with pricing) → list shows card → return to Profile → verify derived category → tap card → edit price → save → verify update → delete → verify removal → verify Profile derived category removed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US1 View)**: Depends on Phase 2 completion
- **Phase 4 (US2 Add)**: Depends on Phase 2 completion; can start in parallel with Phase 3
- **Phase 5 (US3 Edit)**: Depends on Phase 2 completion; can start in parallel with Phases 3–4
- **Phase 6 (US4 Delete verification)**: Depends on Phase 3 (T013) and Phase 5 (T016) being complete
- **Phase 7 (US5 Profile)**: Depends on Phase 2 (T003 for `useGetMyCenterServicesQuery`); can start after Phase 2
- **Phase 8 (Polish)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 View (P1)**: Depends only on Phase 2 foundation
- **US2 Add (P1)**: Depends only on Phase 2 foundation (+ US1 screens as context, but technically independent)
- **US3 Edit (P2)**: Depends only on Phase 2 foundation
- **US4 Delete (P2)**: Verification task depends on T013 (US1) and T016 (US3) being complete
- **US5 Profile (P3)**: Depends only on T003 (endpoint exists in centerApi)

### Within Each Phase

- Foundation components (T008, T009) → screen components (T010, T011) → screens (T012, T013)
- RHF schemas (T007) must precede screens that use the forms (T015, T016)
- i18n keys (T004, T005) must precede all screens (any `t()` call)

### Parallel Opportunities

Within Phase 2: T004 ∥ T005 ∥ T006 (different files, no conflicts)
Within Phase 2: T008 ∥ T009 (different component files)
Within Phase 3: T010 ∥ T011 (different component files; both depend on T007 for types)
Within Phase 8: T020 ∥ T021

---

## Parallel Example: Phase 2 Foundation

```
# Can all start immediately after T001:
T002 → T003 (sequential, same file)
T004 (en.json) ∥ T005 (ar.json) ∥ T006 (formatPrice.ts)

# After T007 (schemas):
T008 (PriceRangeInput) ∥ T009 (BilingualDescriptionFields)
```

## Parallel Example: Phase 3 (US1)

```
# After Phase 2 complete:
T010 (ServiceCard) ∥ T011 (CategorySection)

# After T010 + T011:
T012 (_layout.tsx)

# After T012:
T013 (MyServicesScreen)

# After Phase 2 (independent of T010–T013):
T014 (tab registration — touch only _layout.tsx)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 2 (T002–T009) — **critical blocker**
3. Complete Phase 3 (T010–T014) — list screen fully functional
4. **STOP and VALIDATE**: Open app → Profile → Manage Services → confirm list, empty state, delete from list all work
5. Ship or demo this slice before continuing

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 → US1: Owner can view services (**MVP**)
3. Phase 4 → US2: Owner can add services
4. Phase 5 → US3: Owner can edit services
5. Phase 6 → US4: Delete fully verified
6. Phase 7 → US5: Profile derives categories from offerings
7. Phase 8 → Polish: RTL + accessibility + full smoke test

### Backend Prerequisite Check

Tasks T002–T009 and component tasks T010–T011 can be done against a mocked backend.
Tasks T013 (list), T015 (add), T016 (edit), and the smoke test (T022) **require the backend Phase 3.6 endpoints to be live**.

---

## Notes

- **Never run a command or modify a file without asking the user first** (project constitution rule 1 and 2)
- **Run tests after any file change and report results** (project constitution rule 3)
- **No placeholders or TODOs in production code** (project constitution rule 4)
- All `Alert.alert` multi-button calls must have a `Platform.OS === 'web'` guard using `window.confirm`
- `categoryIds` must NOT be sent in the `PUT /centers/my` body after T019 — verify this does not cause a 400
- The old `profile/pricing/` screens and `pricingApi.ts` remain untouched; profile no longer links to them after T019
- Commit after each completed task or logical group using conventional commit format (`feat:`, `fix:`, `chore:`)
