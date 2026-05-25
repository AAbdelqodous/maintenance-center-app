# Tasks: Center Departments

**Feature**: 020-center-departments  
**Input**: Design documents from `specs/020-center-departments/`  
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/departments-api.md ✓, research.md ✓, quickstart.md ✓

**Repos**: Two repos in scope — tasks prefixed `[Frontend]` target `maintenance-center-app/`, tasks prefixed `[Backend]` target `service-center/src/main/java/com/maintainance/service_center/`

**Tests**: No test tasks — spec does not request TDD.

**Organization**: Tasks grouped by user story to enable independent implementation, validation, and delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story [US1], [US2], [US3]
- Setup and Foundational phases carry no Story label
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Frontend type definitions, API slice, i18n keys, and store registration. No backend dependency — can run immediately.

- [x] T001 [Frontend] Create `types/department.ts` — `Department`, `CreateDepartmentRequest`, `UpdateDepartmentRequest`, `DepartmentMembershipUpdate` interfaces; copy verbatim from `specs/020-center-departments/data-model.md §Frontend Types`
- [x] T002 [Frontend] Create `store/api/departmentsApi.ts` — RTK Query `createApi` slice with all 7 endpoints (`getDepartments`, `createDepartment`, `updateDepartment`, `deactivateDepartment`, `getDepartmentMembers`, `addDepartmentMember`, `removeDepartmentMember`) and all exported hooks; copy verbatim from `specs/020-center-departments/contracts/departments-api.md §RTK Query Slice`
- [x] T003 [P] [Frontend] Register `departmentsApi` in `store/index.ts` — add `departmentsApi: departmentsApi.reducer` to the `reducer` map and `departmentsApi.middleware` to the `middleware` chain, matching the pattern used by `staffApi` and other existing slices
- [x] T004 [P] [Frontend] Add `departments.*` i18n keys to `lib/i18n/locales/en.json` — copy the English key set verbatim from `specs/020-center-departments/contracts/departments-api.md §i18n Key Set §English`
- [x] T005 [P] [Frontend] Add `departments.*` i18n keys to `lib/i18n/locales/ar.json` — copy the Arabic key set verbatim from `specs/020-center-departments/contracts/departments-api.md §i18n Key Set §Arabic`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend entity, database schema, and seeding migrations that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — database tables and the Department entity must exist before any endpoint or routing logic can run.

- [ ] T006 [Backend] Create `department/Department.java` — `@Entity` with fields: `id` (BIGSERIAL PK, auto-increment), `center` (`@ManyToOne MaintenanceCenter NOT NULL`), `nameAr` (`String 200 NOT NULL`), `nameEn` (`String 200 NOT NULL`), `displayOrder` (`Integer NOT NULL default 0`), `isActive` (`Boolean NOT NULL default true`), `createdAt` (`@CreatedDate NOT NULL`), `updatedAt` (`@LastModifiedDate nullable`); `@EntityListeners(AuditingEntityListener.class)`; `@ManyToMany ServiceCategory categories` via join table `department_categories`; `@ManyToMany CenterMembership memberships` via join table `department_memberships` — per `specs/020-center-departments/data-model.md §Backend Entities §Department`
- [ ] T007 [P] [Backend] Create `department/DepartmentRequest.java` — `@NotBlank @Size(max=200) String nameAr`, `@NotBlank @Size(max=200) String nameEn`, optional `List<Long> categoryIds`, optional `Integer displayOrder`
- [ ] T008 [P] [Backend] Create `department/DepartmentResponse.java` — fields: `id`, `centerId`, `nameAr`, `nameEn`, `displayOrder`, `isActive`, `List<Long> categoryIds`, `int memberCount` — per `specs/020-center-departments/contracts/departments-api.md §Response shape`
- [ ] T009 [Backend] Create `department/DepartmentRepository.java` extending `JpaRepository<Department, Long>` — add `findByCenterIdAndIsActiveTrue(Long centerId): List<Department>` and `findByCenterAndCategoriesContainingAndIsActiveTrue(MaintenanceCenter center, ServiceCategory category): List<Department>` (used by routing logic) — per `specs/020-center-departments/quickstart.md §Backend: new Department package`
- [ ] T010 [Backend] Create Flyway migration `src/main/resources/db/migration/V{n}__create_department_tables.sql` — creates `department` table, partial unique indexes `uq_dept_name_ar_center` and `uq_dept_name_en_center` (`WHERE is_active = TRUE`), `department_categories` join table, `department_memberships` join table, and `ALTER TABLE booking ADD COLUMN department_id BIGINT REFERENCES department(id)` — copy SQL from `specs/020-center-departments/data-model.md §Migration Plan §V{n}`; **verify actual table names against existing `\dt` output and existing migrations before writing** (center table may be `maintenance_centers`, membership table may differ from `center_membership`)
- [ ] T011 [Backend] Create Flyway migration `src/main/resources/db/migration/V{n+1}__seed_general_departments.sql` — seeds one `General/عام` department per center that has none; assigns all active TECHNICIAN memberships to it; assigns all non-terminal bookings to it — copy SQL from `specs/020-center-departments/data-model.md §Migration Plan §V{n+1}`; **verify `center_membership` table name and `booking.center_id` column name against actual schema before writing**

**Checkpoint**: Run `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — both migrations apply cleanly, `department` table exists, one General department row exists per center.

---

## Phase 3: User Story 1 — Department Management (Priority: P1) 🎯 MVP

**Goal**: OWNER and BRANCH_MANAGER can create departments with bilingual names and ServiceCategory coverage, edit them, and deactivate them. Validation blocks duplicate names and unsafe deactivation (open bookings, active members, last active).

**Scenarios covered**: 6.1 (create dept), 6.2 (edit categories), 6.4 (deactivation blocked), 6.5 (deactivation succeeds), 6.7 (duplicate name rejected)

**Independent Test**: Log in as OWNER → open Department Management screen → create "Body Shop" / "ورشة الهيكل" with CAR category → verify it appears in list → attempt to create second "Body Shop" → verify `DEPT_DUPLICATE_NAME_EN` error → deactivate "Body Shop" → verify deactivated label. All error text must appear in Arabic when app is in Arabic locale.

### Implementation for User Story 1

- [ ] T012 [Backend] [US1] Implement `department/DepartmentService.java` — `@RequiredArgsConstructor @Slf4j`; method `create(Long centerId, DepartmentRequest req)`: validates unique `nameAr`/`nameEn` among active depts for center (throw `DEPT_DUPLICATE_NAME_AR` / `DEPT_DUPLICATE_NAME_EN`), validates each `categoryId` exists (throw `DEPT_INVALID_CATEGORY`), assigns `displayOrder = MAX + 1` if omitted, persists and returns `DepartmentResponse`; method `update(Long id, Long centerId, DepartmentRequest req)`: same validations excluding self; method `deactivate(Long id, Long centerId)`: guard 1 — count non-terminal bookings for dept (COMPLETED/CANCELLED/NO_SHOW are terminal) → throw `DEPT_HAS_OPEN_BOOKINGS`; guard 2 — count active memberships in `department_memberships` for dept → throw `DEPT_HAS_ACTIVE_MEMBERS`; guard 3 — count active depts for center > 1 → throw `DEPT_LAST_ACTIVE`; all guards checked before setting `isActive=false`; `deactivate()` must be `@Transactional` with last-active check safe under concurrency (use `SELECT COUNT(*) ... FOR UPDATE` or pessimistic lock) — per `specs/020-center-departments/data-model.md §Validation Rules`
- [ ] T013 [Backend] [US1] Implement `department/DepartmentController.java` — `@RestController @RequestMapping("centers/my/departments") @RequiredArgsConstructor`; 4 endpoints: `GET /` (calls `service.list(centerId)`, returns `List<DepartmentResponse>`); `POST /` (calls `service.create()`, returns `201`); `PUT /{id}` (calls `service.update()`, returns `200`); `DELETE /{id}` (calls `service.deactivate()`, returns `204`); center resolved from authenticated user's JWT (call `centerService.findFirstByOwnerId` or equivalent); POST/PUT/DELETE gated behind `MANAGE_ALL_STAFF` or `MANAGE_NON_MANAGER_STAFF` — per `specs/020-center-departments/contracts/departments-api.md §Endpoints`
- [x] T014 [P] [Frontend] [US1] Create `components/departments/CategoryPicker.tsx` — calls `useGetCategoriesQuery()`; renders a list of toggleable chips or checkboxes for each ServiceCategory; displays `nameAr` vs `nameEn` based on `i18n.language === 'ar'`; accepts `value: number[]` and `onChange: (ids: number[]) => void` props; used by `DepartmentForm`
- [x] T015 [P] [Frontend] [US1] Create `components/departments/DepartmentForm.tsx` — React Hook Form with Zod schema; fields: `nameAr` (`required`, max 200), `nameEn` (`required`, max 200), `CategoryPicker` (optional, `categoryIds`); accepts optional `defaultValues: Partial<CreateDepartmentRequest>` for edit pre-fill; exposes `onSubmit(data: CreateDepartmentRequest | UpdateDepartmentRequest)` callback; shows field-level validation errors; used by both `add.tsx` and `[id].tsx` screens
- [x] T016 [P] [Frontend] [US1] Create `components/departments/DepartmentCard.tsx` — renders: name (locale-aware: `nameAr` if Arabic, `nameEn` otherwise); category chip list (category names from a `categories` prop or just IDs until categories endpoint is available); `memberCount` badge using `departments.memberCount_one` / `departments.memberCount_other` i18n keys; `(Deactivated)` label using `departments.deactivated` key when `isActive === false`; accepts `Department` prop and optional `onPress` callback
- [x] T017 [Frontend] [US1] Create `app/(app)/(tabs)/staff/departments/index.tsx` (DepartmentListScreen) — calls `useGetDepartmentsQuery()`; renders `FlatList` of `DepartmentCard` (active first, inactive after, separated visually); shows `departments.empty` text with "Add Department" CTA when list is empty; header button or FAB navigates to `staff/departments/add`; each card press navigates to `staff/departments/[id]`; pull-to-refresh; loading and error states; wrap in error boundary
- [x] T018 [Frontend] [US1] Create `app/(app)/(tabs)/staff/departments/add.tsx` (AddDepartmentScreen) — renders `DepartmentForm`; on submit calls `useCreateDepartmentMutation()`; on success shows `departments.saved` toast/banner and navigates back to list; on API error maps `businessErrorCode` through `DEPT_ERROR_MAP` (defined inline per `specs/020-center-departments/contracts/departments-api.md §businessErrorCode → i18n key map`); displays mapped error as inline banner (not `Alert.alert` — CLAUDE.md restriction); `DEPT_MEMBER_ALREADY_ASSIGNED` is silently ignored per the map
- [x] T019 [Frontend] [US1] Add `DEPT_ERROR_MAP` constant to `app/(app)/(tabs)/staff/departments/add.tsx` and reuse in `[id].tsx` — `Record<string, string | undefined>` with all 8 codes from `specs/020-center-departments/contracts/departments-api.md §businessErrorCode → i18n key map`; extract to a shared helper if both screens import it

**Checkpoint**: DepartmentListScreen renders list with active/inactive distinction. AddDepartmentScreen creates a department and it appears in list on success. Duplicate name shows localized error. Backend returns correct 400/409/404 codes for each guard.

---

## Phase 4: User Story 2 — Booking Routing (Priority: P2)

**Goal**: Every new booking is automatically assigned to a department based on its ServiceCategory. Bookings with no configured department match route to General. Department label appears on booking detail for owners.

**Scenarios covered**: 6.6 (seeding assigns existing bookings), 6.8 (unroutable category → General)

**Independent Test**: POST a booking whose ServiceCategory is covered by "Body Shop" → confirm `departmentId` in response matches "Body Shop". POST a booking whose ServiceCategory is not covered by any specific department → confirm `departmentId` matches the "General" department. Check that legacy bookings (pre-migration) have `departmentId` set after seeding migration runs.

### Implementation for User Story 2

- [ ] T020 [Backend] [US2] Implement `DepartmentService.resolveForCategory(MaintenanceCenter center, ServiceCategory category): Department` — step 1: call `repository.findByCenterAndCategoriesContainingAndIsActiveTrue(center, category)` ordered by `displayOrder ASC`; if non-empty, return first; step 2 (fallback): call `repository.findByCenterIdAndIsActiveTrue(center.getId())` ordered by `displayOrder ASC`, return first (General by convention of lowest order); method must never return null (FR-D-006 guarantees at least one active dept) — per `specs/020-center-departments/data-model.md §Routing Logic`
- [ ] T021 [Backend] [US2] Extend `booking/Booking.java` — add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id") Department department` nullable field; no `cascade = REMOVE` (deactivation is blocked by open bookings — application enforces this, not DB cascade)
- [ ] T022 [Backend] [US2] Extend `booking/BookingService.create()` — after the line that resolves `ServiceCategory` (`category = offering.getCategory()`), add: `Department department = departmentService.resolveForCategory(center, category); // then builder.department(department)` — inject `DepartmentService` via constructor; per `specs/020-center-departments/quickstart.md §Backend: extend BookingService`
- [ ] T023 [P] [Backend] [US2] Add `departmentId` (Long, nullable), `departmentNameAr` (String, nullable), `departmentNameEn` (String, nullable) to `booking/BookingResponse.java` and its mapper — null for legacy rows where `booking.department == null`; null-safe mapping (do not call `department.getNameAr()` without null check)
- [x] T024 [P] [Frontend] [US2] Add `departmentId?: number`, `departmentNameAr?: string`, `departmentNameEn?: string` optional fields to the booking response type in `store/api/bookingsApi.ts` (or the `BookingResponse` type used by that slice) — these are nullable for legacy bookings; no other changes required in this task

**Checkpoint**: New booking created via app shows non-null `departmentId` in the API response. Booking detail screen does not crash on null `departmentId` (legacy booking). Flyway seeding migration confirms legacy bookings now have `departmentId` set.

---

## Phase 5: User Story 3 — Department Member Management (Priority: P3)

**Goal**: OWNER and BRANCH_MANAGER can add and remove technician memberships from departments via the Edit Department screen. Technicians see a department label on each booking in their queue. Technicians with no department assignment see a clear empty-state message.

**Scenarios covered**: 6.3 (technician combined queue with dept label), 6.9 (zero department assignments empty state)

**Independent Test**: Open Edit Department screen → add Mohammed's membership → Mohammed's queue shows bookings from that department with a dept label → remove Mohammed → his queue shows zero-department empty state message. All text in both locales.

### Implementation for User Story 3

- [ ] T025 [Backend] [US3] Implement 3 member endpoints in `department/DepartmentController.java` — `GET /{id}/members` (returns active TECHNICIAN memberships as `CenterMembership[]` per `specs/020-center-departments/contracts/departments-api.md §GET /centers/my/departments/{id}/members`); `POST /{id}/members` (body: `{ membershipId }`); `DELETE /{id}/members/{membershipId}` — all endpoints validate dept belongs to caller's center; write endpoints gated by `MANAGE_ALL_STAFF`/`MANAGE_NON_MANAGER_STAFF`
- [ ] T026 [Backend] [US3] Implement member service methods in `department/DepartmentService.java` — `getMembers(Long deptId, Long centerId): List<CenterMembership>`: returns active memberships in dept filtered to TECHNICIAN role; `addMember(Long deptId, Long membershipId, Long centerId)`: validate membership role == TECHNICIAN (throw `DEPT_MEMBER_NOT_TECHNICIAN`), validate not already assigned (throw `DEPT_MEMBER_ALREADY_ASSIGNED`), validate membership.centerId matches (throw `DEPT_MEMBER_WRONG_CENTER`), persist join row; `removeMember(Long deptId, Long membershipId, Long centerId)`: validate dept exists in center, remove join row, 404 if not found — per `specs/020-center-departments/contracts/departments-api.md §POST .../members errors` and `§DELETE .../members/{membershipId}`
- [x] T027 [Frontend] [US3] Create `app/(app)/(tabs)/staff/departments/[id].tsx` (EditDepartmentScreen) — load dept from `useGetDepartmentsQuery()` filtered by `id`; pre-fill `DepartmentForm` with existing values; on save calls `useUpdateDepartmentMutation()`; member list section: calls `useGetDepartmentMembersQuery(id)`, renders each member with name and "Remove" action calling `useRemoveDepartmentMemberMutation()`; "Add Technician" button (`departments.addMember`) opens a picker of center's TECHNICIAN memberships not yet in this dept, calls `useAddDepartmentMemberMutation()`; Deactivate button (`departments.deactivate`) at bottom — confirm dialog: `Platform.OS === 'web'` uses `window.confirm(t('departments.deactivateConfirm'))`, native uses `Alert.alert`; hide Deactivate button if this is the only active department (check `departments.length === 1` from list query or derive from a flag); on deactivate success show `departments.deactivateSuccess` and navigate back; all errors mapped through `DEPT_ERROR_MAP`
- [x] T028 [P] [Frontend] [US3] Update `app/(app)/staff/bookings/queue.tsx` — add department label to each booking row: when `departmentNameAr`/`departmentNameEn` is present on the booking, show locale-aware label below the booking title or status badge; add zero-department empty state: detect when the queue is empty and the user has zero department memberships (no bookings at all, plus a backend signal or local check), show `staff.queue.noDepartment` i18n key text; add `staff.queue.noDepartment` to both `lib/i18n/locales/en.json` ("You are not assigned to any department. Contact your branch manager to be added.") and `lib/i18n/locales/ar.json` ("لم يتم تعيينك لأي قسم. تواصل مع مدير الفرع ليضيفك إلى قسم.")
- [x] T029 [P] [Frontend] [US3] Update `components/bookings/BookingCard.tsx` — add optional `departmentLabel?: string` prop; when present, render a small chip or subtitle line below the primary booking info; locale-aware caller (pass `i18n.language === 'ar' ? departmentNameAr : departmentNameEn`); default `departmentLabel={undefined}` so all existing callers are unaffected

**Checkpoint**: Edit department screen shows current members. Owner can add/remove technicians from the UI. Technician queue shows department label on each booking card. Mohammed with zero departments sees the no-department message rather than a generic empty state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Acceptance checklist verification, RTL validation, TypeScript hygiene, and navigation wiring.

- [x] T030 [P] Run `tsc --noEmit` in `maintenance-center-app/` and fix all TypeScript errors introduced by new files — common issues: missing imports of `Department` type, incorrect RTK Query argument types, unhandled nullable `departmentId` on booking types
- [ ] T031 [P] Verify RTL layout on all department screens and components — switch app locale to Arabic; check `app/(app)/(tabs)/staff/departments/index.tsx`, `add.tsx`, `[id].tsx`, `components/departments/DepartmentForm.tsx`, `DepartmentCard.tsx`, `CategoryPicker.tsx`; verify text alignment, row/flex direction, chip layout, and that Arabic text renders correctly in all fields
- [ ] T032 Walk through every item in `specs/020-center-departments/quickstart.md §Acceptance checklist` — empty state renders, inactive dept shows "(Deactivated)" label, form rejects empty submission, deactivate button hidden when last active, all error codes surface localized messages, RTL correct, `Platform.OS === 'web'` confirm fallback used, backend `resolveForCategory` returns General when no match, concurrent deactivation safe, Flyway migrations apply on fresh and existing DB
- [ ] T033 [P] Verify `app/(app)/(tabs)/staff/departments/` route group is accessible from the owner staff management navigation — confirm Expo Router auto-discovers the folder; if a manual link from `app/(app)/(tabs)/staff/index.tsx` or equivalent is needed, add a navigation entry with `departments.title` i18n key
- [ ] T034 [P] Confirm `staff.queue.noDepartment` i18n key was added to both locale files in T028 — if T028 was done in parallel and the key is missing, add it now to `lib/i18n/locales/en.json` and `lib/i18n/locales/ar.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 for type imports in service layer — **BLOCKS all user stories**; DB tables must exist before any endpoint can run
- **Phase 3 (US1)**: Depends on Phase 2 complete. Within US1: backend T012 → T013 before frontend screens T017 → T018. Frontend components T014, T015, T016 can start as soon as types (T001) are done.
- **Phase 4 (US2)**: Depends on Phase 2 (entity T006, repo T009 must exist). T021 (Booking.java) before T022 (BookingService). T020 (resolveForCategory) before T022. Can run in parallel with US1 backend tasks.
- **Phase 5 (US3)**: Depends on Phase 3 backend complete (DepartmentService T012, DepartmentController T013 must exist for member methods T025, T026) and Phase 4 (T023, T024 for department label on bookings). Frontend T028/T029 depend on T024 (departmentName on booking type).
- **Phase 6 (Polish)**: Depends on all prior phases complete.

### Within Each User Story

- Backend entity → repo → service → controller
- Flyway migrations before service business logic
- Frontend components before screens that compose them
- `resolveForCategory` (T020) before `BookingService` extension (T022)

### Parallel Opportunities

| Group | Tasks |
|---|---|
| Phase 1, after T001+T002 | T003, T004, T005 — all independent files |
| Phase 2 DTOs | T007, T008 — parallel after T006 |
| US1 frontend components | T014, T015, T016 — all independent files |
| US1 screens | T017, T018 — parallel after their component deps |
| US2 response additions | T023, T024 — parallel after T021 |
| US3 queue + card | T028, T029 — parallel after T024 |
| Polish | T030, T031, T033, T034 — all independent |

---

## Parallel Example: User Story 1

```
# After Phase 2 Foundational is complete, launch two tracks in parallel:

Backend track:
  T012 — DepartmentService.java (create, update, deactivate guards)
  T013 — DepartmentController.java (4 CRUD endpoints)

Frontend track (can start as soon as T001 types exist):
  T014 — CategoryPicker.tsx  ┐
  T015 — DepartmentForm.tsx  ├── all parallel
  T016 — DepartmentCard.tsx  ┘
  → T017 — DepartmentListScreen (after T016)
  → T018 — AddDepartmentScreen (after T015)
  → T019 — DEPT_ERROR_MAP wiring (after T018)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) — types, API slice, i18n, store wiring
2. Complete Phase 2 (Foundational) — entity, migrations applied to dev DB
3. Complete Phase 3 (US1) — backend service + controller, frontend components + list/add screens
4. **STOP and VALIDATE**: Owner can create a department, see it in the list, and attempt to create a duplicate (verify error)
5. Demo before continuing to US2

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready (no visible UI yet)
2. + Phase 3 (US1) → Owner manages departments — **MVP deliverable**
3. + Phase 4 (US2) → Bookings auto-route to departments
4. + Phase 5 (US3) → Member management + technician queue dept labels
5. + Phase 6 → RTL verified, acceptance checklist green

### Parallel Team Strategy

With two developers after Phase 2 is complete:

- **Developer A (Backend)**: T012 → T013 → T020 → T021 → T022 → T023 → T025 → T026
- **Developer B (Frontend)**: T014 + T015 + T016 (parallel) → T017 → T018 → T019 → T024 → T027 → T028 + T029 (parallel)

---

## Task Summary

| Phase | Tasks | Count |
|---|---|---|
| Phase 1: Setup | T001–T005 | 5 |
| Phase 2: Foundational | T006–T011 | 6 |
| Phase 3: US1 Department Management (P1) | T012–T019 | 8 |
| Phase 4: US2 Booking Routing (P2) | T020–T024 | 5 |
| Phase 5: US3 Member Management + Queue (P3) | T025–T029 | 5 |
| Phase 6: Polish | T030–T034 | 5 |
| **Total** | | **34** |

---

## Notes

- `[P]` = different files, no cross-file dependency — safe to parallelise within same phase
- **Before writing T010/T011**: run `\dt` in the dev DB to verify actual table names (`center_membership` vs `center_memberships`, `maintenance_centers` vs `maintenance_center`, etc.)
- **`Platform.OS === 'web'` confirm guard required** for all destructive dialogs per CLAUDE.md — use `window.confirm()` on web, `Alert.alert` on native (T027)
- **No `Alert.alert` multi-button on web** — use inline state banners per project feedback memory (T018, T027)
- **Both locale files always updated together** — every i18n task touches `en.json` AND `ar.json` in the same task
- **`tsc --noEmit` after all frontend file additions** — run T030 before declaring any phase complete
