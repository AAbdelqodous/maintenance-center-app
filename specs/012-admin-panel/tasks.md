# Tasks: Admin Panel — Center Owner Approval

**Branch**: `012-admin-panel`
**Input**: Design documents from `specs/012-admin-panel/`
**Backend root**: `service-center/src/main/java/com/maintainance/service_center/`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (independent files, no outstanding dependencies)
- **[Story]**: User story this task belongs to (US1–US6)
- No story label = Setup or Foundational phase

---

## Phase 1: Setup

**Purpose**: Confirm the baseline compiles before any changes.

- [ ] T001 Verify backend builds clean — run `./mvnw test -q` from `service-center/`, confirm zero failures before touching any file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks required by every user story. Complete this phase before starting any story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Create `user/ApprovalStatus.java` — enum with values `PENDING_APPROVAL`, `APPROVED`, `REJECTED`
- [ ] T003 [P] Create `auth/AccountRejectedException.java` — extends `RuntimeException`, message `"Account rejected"`
- [ ] T004 [P] Create `admin/UserResponse.java` — `@Builder @Getter` DTO with fields: `id`, `firstname`, `lastname`, `email`, `userType`, `approvalStatus`, `rejectionReason`, `enabled`, `createdDate`; add a static factory `UserResponse.from(User user)` that maps all fields (see data-model.md §3)
- [ ] T005 [P] Create `admin/AdminRejectRequest.java` — `@Getter @NoArgsConstructor` DTO with optional `@Size(max=500) String reason`
- [ ] T006 Add two fields to `user/User.java` after `userType`: `@Enumerated(EnumType.STRING) private ApprovalStatus approvalStatus;` and `@Column(length = 500) private String rejectionReason;` — Hibernate will add `rejection_reason` column automatically (depends on T002)
- [ ] T007 [P] Add `ACCOUNT_REJECTED(305, HttpStatus.FORBIDDEN, "Account has been rejected by the platform administrator / تم رفض الحساب من قبل إدارة المنصة")` to `handler/BusinessErrorCodes.java`
- [ ] T008 Add `@ExceptionHandler(AccountRejectedException.class)` handler to `handler/GlobalExceptionHandling.java` — returns `403 FORBIDDEN` with `businessErrorCode = 305` (depends on T003, T007)
- [ ] T009 Add two Spring Data query methods to `user/UserRepository.java`: `findByUserTypeAndApprovalStatus(UserType, ApprovalStatus, Pageable)` and `findByUserType(UserType, Pageable)` (depends on T006)
- [ ] T010 [P] Add `application.admin.email` and `application.admin.password` properties to `src/main/resources/application-dev.yml` under the existing `application:` block (values: `admin@experience.com` / `Admin@12345`)
- [ ] T011 Add `.requestMatchers("/admin/**").hasRole("ADMIN")` before `.anyRequest().authenticated()` in `security/SecurityConfig.java`

**Checkpoint**: All new types exist, `User` has `approvalStatus`, `SecurityConfig` guards `/admin/**`, error code 305 is mapped. Compile must pass.

---

## Phase 3: User Story 5 — Default Admin Account (Priority: P1)

**Goal**: A default admin user is available immediately after first startup — no manual DB work required.

**Independent Test**: Start the application against a clean database; confirm `POST /auth/authenticate` with `admin@experience.com` / `Admin@12345` returns `200 OK` with a valid JWT.

- [ ] T012 [US5] Create `config/DataInitializer.java` — `@Component @RequiredArgsConstructor @Slf4j implements CommandLineRunner`; seeds `ROLE_ADMIN` role if absent, then creates admin user from `${application.admin.email}` / `${application.admin.password}` (BCrypt-encoded) with `userType=ADMIN`, `enabled=true`, `accountLocked=false`; fully idempotent (depends on T010)

**Checkpoint**: Start the app, log shows seed messages, admin login succeeds via `POST /auth/authenticate`.

---

## Phase 4: User Story 4 — OWNER Login Returns approvalStatus (Priority: P1)

**Goal**: OWNER registration sets `PENDING_APPROVAL`; login response carries `approvalStatus`; REJECTED owners are blocked at login.

**Independent Test**: Register a OWNER → verify email → login → confirm `approvalStatus=PENDING_APPROVAL` in response. Then reject via DB → login → confirm `403` with code `305`.

- [ ] T013 [P] [US4] Add optional `private UserType userType;` field (no `@NotNull`) to `auth/RegistrationRequest.java`
- [ ] T014 [P] [US4] Add `private ApprovalStatus approvalStatus;` field to `auth/AuthenticationResponse.java`
- [ ] T015 [US4] Update `AuthenticationService.register()` — resolve effective `userType` from request (default `CUSTOMER`; silently override `ADMIN`/`SUPER_ADMIN` to `CUSTOMER`); if `OWNER`, call `user.setApprovalStatus(ApprovalStatus.PENDING_APPROVAL)` before `userRepository.save()` (depends on T013, T002, T006)
- [ ] T016 [US4] Update `AuthenticationService.authenticate()` — after extracting principal, throw `AccountRejectedException` if `user.getApprovalStatus() == REJECTED`; include `approvalStatus` in the returned `AuthenticationResponse` (depends on T014, T003, T015)
- [ ] T017 [US4] Create `user/UserController.java` — `@RestController @RequestMapping("users")`; single endpoint `GET /users/me` extracts `User` from `Authentication` principal and maps directly to `admin/UserResponse` using a static factory method `UserResponse.from(User user)` — do NOT inject `AdminService` here (depends on T004, T006)

**Checkpoint**: Register OWNER → activate via OTP → login returns `PENDING_APPROVAL`. CUSTOMER login returns `approvalStatus: null`. `GET /users/me` returns the user's profile.

---

## Phase 5: User Story 2 — Admin Lists Pending Registrations (Priority: P1)

**Goal**: Admin can retrieve a paginated list of OWNER accounts awaiting approval.

**Independent Test**: Register two OWNERs → admin calls `GET /admin/users/pending` → both appear; approve one via DB → list shows only the other.

- [ ] T018 [US2] Create `admin/AdminService.java` — `@Service @RequiredArgsConstructor @Slf4j`; add a static `UserResponse.from(User user)` factory method to `admin/UserResponse.java` for reuse, then implement `public Page<UserResponse> getPendingOwners(Pageable pageable)` using `userRepository.findByUserTypeAndApprovalStatus(OWNER, PENDING_APPROVAL, pageable).map(UserResponse::from)` (depends on T004, T009)
- [ ] T019 [US2] Create `admin/AdminController.java` — `@RestController @RequestMapping("admin") @Tag(name="Admin")`; implement `GET /admin/users/pending` with `@PageableDefault(sort="createdDate")` — delegates to `adminService.getPendingOwners()` (depends on T018, T011)

**Checkpoint**: Admin JWT → `GET /admin/users/pending` returns page of pending owners. Non-admin JWT → `403 Forbidden`.

---

## Phase 6: User Story 1 — Admin Approves a OWNER (Priority: P1)

**Goal**: Admin can approve a specific OWNER by ID; operation is idempotent.

**Independent Test**: Find a pending owner ID from the list → `PUT /admin/users/{id}/approve` → response shows `APPROVED` → owner's next login has `approvalStatus=APPROVED`.

- [ ] T020 [US1] Add `public UserResponse approveOwner(Integer id)` to `admin/AdminService.java` — load user by ID (throw `EntityNotFoundException` if missing), validate `userType == OWNER` (throw `IllegalArgumentException` if not), set `approvalStatus = APPROVED`, save, return `toResponse()` (depends on T018)
- [ ] T021 [US1] Add `PUT /admin/users/{id}/approve` to `admin/AdminController.java` — `@PutMapping("/{id}/approve")` delegates to `adminService.approveOwner(id)` (depends on T020, T019)

**Checkpoint**: Full approval flow works: register → pending list → approve → approved login.

---

## Phase 7: User Story 3 — Admin Rejects a OWNER (Priority: P2)

**Goal**: Admin can reject a OWNER with an optional reason; rejected owners are blocked at login.

**Independent Test**: Approve an owner, then reject them → their next login returns `403` with `businessErrorCode: 305`.

- [ ] T022 [US3] Add `public UserResponse rejectOwner(Integer id, AdminRejectRequest request)` to `admin/AdminService.java` — same ID/type validation as approve; set `approvalStatus = REJECTED` and `rejectionReason = request.getReason()` (nullable); save (depends on T018, T005)
- [ ] T023 [US3] Add `PUT /admin/users/{id}/reject` to `admin/AdminController.java` — `@PutMapping("/{id}/reject")`, `@RequestBody(required = false) AdminRejectRequest request`, delegates to `adminService.rejectOwner(id, request)` (depends on T022, T019)

**Checkpoint**: Reject a OWNER → their login attempt returns `403` with bilingual error message and code `305`.

---

## Phase 8: User Story 6 — Admin Lists All Users with Filtering (Priority: P3)

**Goal**: Admin can list all platform users, optionally filtered by `UserType`.

**Independent Test**: `GET /admin/users?type=OWNER` returns only OWNER accounts; `GET /admin/users` returns all types.

- [ ] T024 [US6] Add `public Page<UserResponse> getAllUsers(UserType type, Pageable pageable)` to `admin/AdminService.java` — if `type != null` use `findByUserType(type, pageable)`, else use `findAll(pageable)` (depends on T018, T009)
- [ ] T025 [US6] Add `GET /admin/users` to `admin/AdminController.java` — `@GetMapping` with optional `@RequestParam(required=false) UserType type` and `@PageableDefault Pageable`, delegates to `adminService.getAllUsers(type, pageable)` (depends on T024, T019)

**Checkpoint**: Admin can page through all users and filter by type. Non-admin JWT → `403 Forbidden`.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Exception handling completeness and end-to-end smoke test.

- [ ] T026 [P] Add `@ExceptionHandler(IllegalArgumentException.class)` handler to `handler/GlobalExceptionHandling.java` — returns `400 BAD_REQUEST` with `error` field (needed by approve/reject type validation)
- [ ] T027 [P] Add `@ExceptionHandler(EntityNotFoundException.class)` handler to `handler/GlobalExceptionHandling.java` — returns `404 NOT_FOUND` with `error` field (needed by approve/reject missing-ID case)
- [ ] T028 Run the full end-to-end verification sequence from `specs/012-admin-panel/quickstart.md` — all 9 steps must pass before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all story phases**
- **Phase 3 (US5)**: Depends on Phase 2 (needs `application.admin.*` config — T010)
- **Phase 4 (US4)**: Depends on Phase 2 (needs `ApprovalStatus`, `User.approvalStatus`, `AccountRejectedException`)
- **Phase 5 (US2)**: Depends on Phase 2 + Phase 3 (needs admin user to test) + Phase 4 (needs owners in PENDING state to list)
- **Phase 6 (US1)**: Depends on Phase 5 (`AdminService` base exists)
- **Phase 7 (US3)**: Depends on Phase 5 (`AdminService` base exists) — can run in parallel with Phase 6
- **Phase 8 (US6)**: Depends on Phase 5 (`AdminService` base exists) — can run after Phase 6/7
- **Phase 9 (Polish)**: Depends on Phase 6 + Phase 7 (exception handlers serve approve/reject actions)

### User Story Dependencies

- **US5 (P1)**: Requires Phase 2 only
- **US4 (P1)**: Requires Phase 2 only — parallel with US5
- **US2 (P1)**: Requires US4 + US5 (needs PENDING owners to appear, needs admin to authenticate)
- **US1 (P1)**: Requires US2 (AdminService base)
- **US3 (P2)**: Requires US2 (AdminService base) — parallel with US1
- **US6 (P3)**: Requires US2 (AdminService base)

### Parallel Opportunities within Phase 2

```
T002 ApprovalStatus.java        ──┐
T003 AccountRejectedException   ──┤
T004 UserResponse.java          ──┤  All parallelizable (separate new files)
T005 AdminRejectRequest.java    ──┤
T007 BusinessErrorCodes.java    ──┤
T009 UserRepository.java        ──┤  (after T002+T006)
T010 application-dev.yml        ──┘
```

Sequential within Phase 2:
- T006 (User.java) → requires T002 to exist
- T008 (GlobalExceptionHandling) → requires T003 + T007
- T011 (SecurityConfig) → can start once Phase 2 tasks are otherwise underway

### Parallel Opportunities within Phase 4 (US4)

```
T013 RegistrationRequest.java   ──┐  Both touch different files
T014 AuthenticationResponse.java ─┘  Start together
```

### Parallel Opportunities: US1 and US3

Once Phase 5 is done, US1 (T020–T021) and US3 (T022–T023) can proceed in parallel — they add different methods to `AdminService` and `AdminController`.

---

## Parallel Execution Example: Phase 2

```
# Start these together (all new files, no conflicts):
T002: Create user/ApprovalStatus.java
T003: Create auth/AccountRejectedException.java
T004: Create admin/UserResponse.java
T005: Create admin/AdminRejectRequest.java
T007: Add ACCOUNT_REJECTED to BusinessErrorCodes.java
T010: Add admin config to application-dev.yml

# Then (depend on T002):
T006: Add approvalStatus field to User.java
T009: Add query methods to UserRepository.java

# Then (depend on T003+T007):
T008: Add AccountRejectedException handler to GlobalExceptionHandling.java
T011: Add /admin/** rule to SecurityConfig.java
```

---

## Implementation Strategy

### MVP (US5 + US4 + US2 + US1 only)

1. Complete **Phase 1** (verify baseline)
2. Complete **Phase 2** (foundational — all 10 tasks)
3. Complete **Phase 3** (US5 — admin seeding, 1 task)
4. Complete **Phase 4** (US4 — auth flow changes, 5 tasks)
5. Complete **Phase 5** (US2 — list pending, 2 tasks)
6. Complete **Phase 6** (US1 — approve, 2 tasks)
7. **STOP and VALIDATE**: Approve Fahd via Swagger UI — the original use case is now solved

### Incremental Delivery

- After Phase 6 MVP → Platform can onboard OWNERs end-to-end
- Add Phase 7 (US3) → Adds rejection capability
- Add Phase 8 (US6) → Adds user browsing for operations
- Add Phase 9 (Polish) → Hardened error handling + smoke test

---

## Notes

- **Same-file tasks in Phases 6–8**: `AdminService.java` and `AdminController.java` grow incrementally — each story phase adds methods to an existing file, not creates a new one
- **No test tasks generated**: The spec does not request TDD; verification is done via curl/Swagger as described in `quickstart.md`
- **Compile check**: After Phase 2 and after each story phase, the project must compile cleanly via `./mvnw compile -q`
- **`EntityNotFoundException`**: Use `jakarta.persistence.EntityNotFoundException` (already on the classpath via Spring Data JPA)
