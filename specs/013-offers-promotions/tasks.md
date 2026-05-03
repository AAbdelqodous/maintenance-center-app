# Tasks: Offers & Promotions

**Branch**: `013-offers-promotions`
**Input**: Design documents from `specs/013-offers-promotions/`
**Backend root**: `service-center/src/main/java/com/maintainance/service_center/offer/`
**Frontend root**: `maintenance-center-app/`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (independent files, no outstanding dependencies)
- **[Story]**: User story this task belongs to (US1â€“US5)
- No story label = Setup or Foundational phase

---

## Phase 1: Setup

**Purpose**: Confirm the baseline builds before any changes.

- [x] T001 Verify backend builds clean â€” run `./mvnw compile -q` from `service-center/`, confirm zero errors before touching any file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared enums, entity, DTOs, TypeScript types, and i18n keys required by every user story. Complete entirely before starting any story phase.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create `offer/DiscountType.java` â€” enum with values `PERCENTAGE`, `FIXED_AMOUNT`
- [x] T003 [P] Create `offer/OfferStatus.java` â€” enum with values `SCHEDULED`, `ACTIVE`, `EXPIRED`, `CANCELLED` and a javadoc note that this is computed, never stored
- [x] T004 [P] Create `types/offers.ts` â€” TypeScript interfaces `CenterOffer`, `CreateOfferRequest`, `UpdateOfferRequest`, `DiscountType`, `OfferStatus` as per data-model.md Â§7
- [x] T005 [P] Add `'Offers'` to the `tagTypes` array in the base RTK Query API slice (find where other tags like `'Pricing'` are declared, add `'Offers'` to that same array)
- [x] T006 [P] Add all `offers.*` i18n keys to `lib/i18n/locales/en.json` â€” full key set from data-model.md Â§8 English block
- [x] T007 [P] Add all `offers.*` i18n keys to `lib/i18n/locales/ar.json` â€” full key set from data-model.md Â§8 Arabic block
- [x] T008 Create `offer/OfferRequest.java` â€” `@Getter @NoArgsConstructor` DTO with `@Valid` annotations as per data-model.md Â§3 (depends on T002)
- [x] T009 Create `offer/CenterOffer.java` â€” JPA entity with `@ElementCollection applicableServiceTypes`, `cancelledAt: LocalDateTime`, `discountValue: BigDecimal DECIMAL(10,3)`, bilingual title/description fields, `@CreatedDate`/`@LastModifiedDate` â€” full spec in data-model.md Â§2 and plan.md Implementation Details (depends on T002, T003)
- [x] T010 Create `offer/OfferResponse.java` â€” `@Builder @Getter` DTO with all fields from data-model.md Â§4, including a `static OfferResponse from(CenterOffer offer, OfferStatus status)` factory method (depends on T002, T003, T009)
- [x] T011 Create `offer/OfferRepository.java` â€” extends `JpaRepository<CenterOffer, Long>`; add `findByCenterIdOrderByCreatedAtDesc(Long centerId)` and the `@Query countActiveOrScheduled(@Param centerId, @Param today)` as per data-model.md Â§5 (depends on T009)
- [x] T012 Create `components/offers/OfferStatusBadge.tsx` â€” pill-shaped status chip using colours from plan.md (ACTIVE=green, SCHEDULED=blue, EXPIRED=grey, CANCELLED=red); accepts `status: OfferStatus` prop; uses `t('offers.status.<STATUS>')` for label (depends on T004, T006, T007)

**Checkpoint**: Backend compiles with new entity and enums. Frontend has TypeScript types, i18n keys, status badge component, and `'Offers'` tag type registered.

---

## Phase 3: User Story 1 â€” Create an Offer (Priority: P1) ðŸŽ¯ MVP

**Goal**: A CENTER_OWNER can create a new promotional offer via both the API and the app form.

**Independent Test**: `POST /centers/my/offers` with valid payload returns `201` with correct `status` field; offer appears in DB; add.tsx form submits and navigates back.

- [x] T013 [US1] Create `offer/OfferService.java` â€” `@Service @RequiredArgsConstructor @Slf4j`; implement `private OfferStatus computeStatus(CenterOffer offer)` helper (logic in plan.md) and `public OfferResponse createOffer(Long centerId, OfferRequest request)`: validate dates, discount value, PERCENTAGE â‰¤ 100, cap check via `countActiveOrScheduled < 10` (throw `IllegalStateException` if exceeded), build entity, save, return `OfferResponse.from(saved, computeStatus(saved))` (depends on T008, T009, T010, T011)
- [x] T014 [P] [US1] Create `offer/OfferController.java` â€” `@RestController @RequestMapping("centers/my/offers") @RequiredArgsConstructor @Tag(name="Offers")`; implement `POST /centers/my/offers` â†’ `@ResponseStatus(CREATED)` calling `offerService.createOffer(centerId, request)`; resolve `centerId` from `SecurityContextHolder` using the same pattern as other `/my/` controllers (depends on T013)
- [x] T015 [P] [US1] Create `components/offers/OfferForm.tsx` â€” React Hook Form + Zod form component; fields: titleAr, titleEn, descriptionAr, descriptionEn, discountType (toggle PERCENTAGE / FIXED_AMOUNT), discountValue, applicableServiceTypes (multi-select chips from ServiceType enum â€” empty = all), startDate, endDate (date string inputs), maxRedemptions (optional); Zod validates endDate > startDate; locked fields array prop for ACTIVE offer editing (render as read-only Text instead of input when locked); uses i18n keys from `offers.*` (depends on T004, T006, T007)
- [x] T016 [P] [US1] Create `store/api/offersApi.ts` â€” RTK Query slice injected into baseApi; add `createOffer` mutation: `POST centers/my/offers`, `invalidatesTags: ['Offers']`; full slice shape from contracts/offers-api.md (depends on T004, T005)
- [x] T017 [P] [US1] Create `app/(app)/(tabs)/profile/offers/_layout.tsx` â€” Stack navigator with `headerShown: true`, title from `t('offers.title')`, back arrow; no dependencies on other new files
- [x] T018 [US1] Create `app/(app)/(tabs)/profile/offers/add.tsx` â€” imports `OfferForm`; calls `createOffer` mutation on submit; shows error banner on failure (same pattern as `pricing/add.tsx`); on success calls `router.back()` (depends on T015, T016, T017)

**Checkpoint**: `POST /centers/my/offers` returns `201` with correct fields. Add screen submits and navigates back. Offer cap error shows a banner.

---

## Phase 4: User Story 2 â€” View Offers List (Priority: P1)

**Goal**: CENTER_OWNER can see all their offers with status badges and filter by status.

**Independent Test**: Seed 3 offers with different statuses in DB â†’ `GET /centers/my/offers` returns all 3 â†’ filter by `?status=ACTIVE` returns only 1 â†’ list screen renders correctly with filter tabs and FAB.

- [x] T019 [US2] Add `getMyOffers(Long centerId, OfferStatus statusFilter)` to `offer/OfferService.java` â€” fetch via `findByCenterIdOrderByCreatedAtDesc`, compute status for each, apply in-memory status filter if non-null, return `List<OfferResponse>` (wrapped in `PageImpl` for PageResponse shape) (depends on T013)
- [x] T020 [US2] Add `GET /centers/my/offers` endpoint to `offer/OfferController.java` â€” `@GetMapping`, optional `@RequestParam(required=false) OfferStatus status` + `@PageableDefault Pageable`, delegates to `offerService.getMyOffers()` (depends on T019, T014)
- [x] T021 [P] [US2] Create `components/offers/OfferCard.tsx` â€” card showing: bilingual title (language-aware), `OfferStatusBadge`, discount summary ("15% off" or "KD 5.000 off"), date range, applicable services (or "All Services"), redemption count ("X / Y redeemed" or "X redeemed" if no cap); `onPress` prop for navigation (depends on T004, T012)
- [x] T022 [US2] Add `getMyOffers` query to `store/api/offersApi.ts` â€” `query: ({ status, page=0, size=20 }) => ({ url: 'centers/my/offers', params: { ...(status && { status }), page, size } })`, `providesTags: ['Offers']`; also add `getOffer` single-item query for use in [id].tsx (depends on T016)
- [x] T023 [US2] Create `app/(app)/(tabs)/profile/offers/index.tsx` â€” FlatList of `OfferCard` components; 4 filter tabs (All / Active / Scheduled / Expired) using `FILTER_TABS` constant from plan.md; floating `+` FAB navigating to `add`; empty state with icon + `t('offers.noOffers')` + Add button; pull-to-refresh (same pattern as `pricing/index.tsx`) (depends on T021, T022, T017)
- [x] T024 [US2] Add Offers navigation card to `app/(app)/(tabs)/profile/index.tsx` â€” same visual style as existing Pricing card; label `t('offers.title')`; navigates to `/(app)/(tabs)/profile/offers` (depends on T023)

**Checkpoint**: Profile screen shows Offers card â†’ tapping opens list â†’ filter tabs work â†’ FAB navigates to add â†’ empty state shows when no offers exist.

---

## Phase 5: User Story 3 â€” Edit an Offer (Priority: P2)

**Goal**: Owner can edit SCHEDULED offers (all fields) and ACTIVE offers (title, description, end date extension only).

**Independent Test**: Edit SCHEDULED offer's discount â†’ `200 OK`. Edit ACTIVE offer's discountValue â†’ `400 Bad Request`. Edit ACTIVE offer's endDate to a later date â†’ `200 OK`. Edit ACTIVE offer's endDate to an earlier date â†’ `400 Bad Request`.

- [x] T025 [US3] Add `updateOffer(Long centerId, Long offerId, OfferRequest request)` to `offer/OfferService.java` â€” load offer (throw `EntityNotFoundException` if not found or wrong center); compute status; if EXPIRED/CANCELLED throw `IllegalArgumentException`; if ACTIVE enforce field-lock rules and endDate-extension-only rule (both from plan.md); run same date/value validations as create; save and return `OfferResponse.from()` (depends on T013)
- [x] T026 [US3] Add `GET /centers/my/offers/{id}` and `PUT /centers/my/offers/{id}` to `offer/OfferController.java` â€” GET returns single `OfferResponse`; PUT accepts `@RequestBody @Valid OfferRequest`, delegates to `offerService.updateOffer()` (depends on T025, T020)
- [x] T027 [US3] Add `updateOffer` mutation to `store/api/offersApi.ts` â€” `PUT centers/my/offers/${id}`, `invalidatesTags: ['Offers']` (the `getOffer` query was already added in T022) (depends on T022)
- [x] T028 [US3] Create `app/(app)/(tabs)/profile/offers/[id].tsx` â€” fetches offer via `useGetOfferQuery(id)`; shows `OfferForm` pre-filled with existing values; derives `lockedFields` array from status (`ACTIVE` â†’ lock discountType, discountValue, startDate, applicableServiceTypes); shows "Save Changes" button when editable; renders read-only view for EXPIRED/CANCELLED offers; no cancel button yet (added in US4) (depends on T027, T015, T017)

**Checkpoint**: Tapping an offer in the list opens [id].tsx â†’ SCHEDULED offer allows editing all fields â†’ ACTIVE offer shows locked fields as read-only text â†’ save updates the offer in the list.

---

## Phase 6: User Story 4 â€” Cancel an Offer Early (Priority: P2)

**Goal**: Owner can cancel a SCHEDULED or ACTIVE offer; EXPIRED/CANCELLED offers show no cancel action.

**Independent Test**: Cancel ACTIVE offer â†’ `200 OK` with `status: "CANCELLED"` â†’ list shows CANCELLED badge â†’ attempt to cancel again â†’ `400 Bad Request`.

- [x] T029 [US4] Add `cancelOffer(Long centerId, Long offerId)` to `offer/OfferService.java` â€” load offer; verify ownership; compute status; if EXPIRED or CANCELLED throw `IllegalArgumentException`; set `cancelledAt = LocalDateTime.now()`; save; return `OfferResponse.from()` (depends on T013)
- [x] T030 [US4] Add `PUT /centers/my/offers/{id}/cancel` to `offer/OfferController.java` â€” no request body; delegates to `offerService.cancelOffer()` (depends on T029, T026)
- [x] T031 [US4] Add `cancelOffer` mutation to `store/api/offersApi.ts` â€” `PUT centers/my/offers/${id}/cancel`, `invalidatesTags: ['Offers']` (depends on T027)
- [x] T032 [US4] Add cancel button and confirmation dialog to `app/(app)/(tabs)/profile/offers/[id].tsx` â€” show "Cancel Offer" button only when `status === 'SCHEDULED' || status === 'ACTIVE'`; use `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)` before calling `cancelOffer(id)`; on success call `router.back()` (depends on T031, T028)

**Checkpoint**: [id].tsx shows Cancel button for SCHEDULED/ACTIVE â†’ confirmation dialog appears â†’ offer moves to CANCELLED â†’ list refreshes automatically â†’ Cancel button absent for EXPIRED/CANCELLED offers.

---

## Phase 7: User Story 5 â€” View Redemption Count (Priority: P3)

**Goal**: Redemption count is prominently visible in both the list card and the detail screen.

**Independent Test**: Create offer with `maxRedemptions=50` â†’ `OfferCard` shows "0 / 50 redeemed" â†’ offer with no cap shows "0 redeemed" â†’ [id].tsx shows the same counter.

- [x] T033 [US5] Update `components/offers/OfferCard.tsx` â€” ensure redemption count row is visible: show `"${currentRedemptions} / ${maxRedemptions} ${t('offers.redeemed')}"` when cap set, or `"${currentRedemptions} ${t('offers.redeemed')}"` when no cap; style as muted secondary text below the date range (depends on T021)
- [x] T034 [US5] Add redemption count section to `app/(app)/(tabs)/profile/offers/[id].tsx` â€” display a dedicated row showing current vs max redemptions; when `currentRedemptions === maxRedemptions` (and maxRedemptions is set) show a "Fully redeemed" badge (depends on T028)

**Checkpoint**: Both list card and detail screen show redemption count correctly. Offer with cap shows fraction; offer without cap shows raw count.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification and any remaining cross-story concerns.

- [ ] T035 [P] Verify `GlobalExceptionHandling` already handles `IllegalArgumentException` (â†’ 400) and `EntityNotFoundException` (â†’ 404) from Phase 6 admin panel work â€” if not present, add both handlers following the same pattern established in `012-admin-panel`
- [ ] T036 Run the full end-to-end verification sequence from `specs/013-offers-promotions/quickstart.md` â€” all 11 steps must pass before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 â€” **BLOCKS all story phases**
- **Phase 3 (US1)**: Depends on Phase 2 (needs entity, DTOs, types, i18n)
- **Phase 4 (US2)**: Depends on Phase 3 (OfferService base exists; offersApi slice started)
- **Phase 5 (US3)**: Depends on Phase 4 (GET /offers/{id} needed; getOffer query added in T022)
- **Phase 6 (US4)**: Depends on Phase 5 ([id].tsx exists to add cancel button)
- **Phase 7 (US5)**: Depends on Phase 3 (OfferCard and [id].tsx exist; no backend changes)
- **Phase 8 (Polish)**: Depends on all story phases

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 only â€” first deliverable
- **US2 (P1)**: Requires US1 (OfferService base, offersApi stub)
- **US3 (P2)**: Requires US2 (GET /offers/{id} and getOffer query from T022)
- **US4 (P2)**: Requires US3 ([id].tsx screen exists to add cancel button)
- **US5 (P3)**: Requires US2 (OfferCard) + US3 ([id].tsx) â€” display only, no new backend

### Parallel Opportunities within Phase 2

```
Batch 1 (all independent new files â€” start together):
  T002  offer/DiscountType.java
  T003  offer/OfferStatus.java
  T004  types/offers.ts
  T005  Add 'Offers' tagType
  T006  en.json offers keys
  T007  ar.json offers keys

Batch 2 (depend on T002 and/or T003):
  T008  offer/OfferRequest.java      (needs T002)
  T009  offer/CenterOffer.java       (needs T002, T003)

Batch 3 (depend on T009):
  T010  offer/OfferResponse.java     (needs T009)
  T011  offer/OfferRepository.java   (needs T009)

Batch 4 (depend on T004, T006, T007):
  T012  OfferStatusBadge.tsx         (needs T004, T006, T007)
```

### Parallel Opportunities within Phase 3 (US1)

```
T013  OfferService.createOffer()     â† backend
T015  OfferForm.tsx component        â† frontend (parallel with T013)
T016  offersApi.ts createOffer       â† frontend (parallel with T013)
T017  offers/_layout.tsx             â† frontend (parallel with everything)

T014  OfferController POST           â† needs T013
T018  offers/add.tsx                 â† needs T015, T016, T017
```

---

## Parallel Execution Example: Phase 2

```
# Launch all Batch 1 tasks simultaneously (no conflicts â€” all new files):
T002: Create offer/DiscountType.java
T003: Create offer/OfferStatus.java
T004: Create types/offers.ts
T005: Add 'Offers' to tagTypes
T006: Add offers.* keys to en.json
T007: Add offers.* keys to ar.json

# Then Batch 2 (after T002+T003 done):
T008: Create offer/OfferRequest.java
T009: Create offer/CenterOffer.java

# Then Batch 3 (after T009 done):
T010: Create offer/OfferResponse.java    â† can run parallel with T011
T011: Create offer/OfferRepository.java  â† can run parallel with T010

# Then Batch 4 (after T004+T006+T007):
T012: Create OfferStatusBadge.tsx
```

---

## Implementation Strategy

### MVP (US1 + US2 only â€” 23 tasks)

1. Complete Phase 1 + Phase 2 (T001â€“T012)
2. Complete Phase 3 / US1 (T013â€“T018) â€” create offer via app
3. Complete Phase 4 / US2 (T019â€“T024) â€” list + navigate
4. **STOP and VALIDATE**: Owner can create, view, and filter offers â€” core value delivered

### Incremental Delivery

- MVP (Phases 1â€“4): Create + view offers â†’ demonstrable to stakeholders
- Add Phase 5 (US3): Edit offers â†’ operators can fix mistakes
- Add Phase 6 (US4): Cancel offers â†’ operators have full control
- Add Phase 7 (US5): Redemption display â†’ analytics visible
- Add Phase 8: Polish + verification â†’ ship-ready

---

## Notes

- **No test tasks generated**: spec does not request TDD; verification via quickstart.md curl sequence
- **OfferService grows incrementally**: T013 creates it with `createOffer()`; T019, T025, T029 add methods in later phases
- **offersApi grows incrementally**: T016 creates it with `createOffer`; T022 adds `getMyOffers`+`getOffer`; T027 adds `updateOffer`; T031 adds `cancelOffer`
- **T035**: The `IllegalArgumentException` and `EntityNotFoundException` handlers may already exist from the admin panel (Phase 6.0). Verify before adding duplicates.
- **`applicableServiceTypes` display**: empty list = "All Services" â€” handle this in `OfferCard` and `OfferForm` display logic
