# Tasks: Center Staff & Permissions

**Input**: Design documents from `specs/011-center-staff-permissions/`  
**Branch**: `011-center-staff-permissions`  
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/staff-api.md ✅ · quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story. Each phase is independently testable.

**Repos involved**:
- **Backend**: `~/IdeaProjects/life-experience-app/service-center/` (Spring Boot)
- **Frontend**: this repo, `maintenance-center-app/` (React Native + Expo)

**⚠️ Prerequisite**: The seven known backend bugs (JwtService.parseClaimsJwt, uninjected userDetailsService, etc.) MUST be fixed before Phase 3+ implementation. See spec §12.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on in-progress tasks)
- **[Story]**: US1–US4, mapped to user story phases below

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New dependencies, configuration, and base wiring needed before any feature code.

- [ ] T001 Add `spring-boot-starter-cache` and `com.github.ben-manes.caffeine:caffeine` to `service-center/pom.xml`
- [ ] T002 [P] Create `service-center/src/main/java/com/maintainance/service_center/config/CacheConfig.java` — `@EnableCaching` + `CaffeineCacheManager` bean with `maximumSize=10000,expireAfterWrite=60s` spec
- [ ] T003 [P] Add `'Staff'` to the `tagTypes` array in `store/api/baseApi.ts` (or wherever RTK `createApi` is defined)
- [ ] T004 [P] Create `types/staff.ts` — `CenterRole`, `MembershipStatus`, `CenterPermission`, `CenterMembership`, `MembershipSummary`, `InvitationDetails`, `InviteStaffRequest`, `ROLE_PERMISSIONS` constant (full content in data-model.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema, Java enums/entities, TypeScript state extensions. MUST complete before any user story work.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

### Database Migrations (run in order)

- [ ] T005 Create `service-center/src/main/resources/db/migration/V011_1__create_center_membership.sql` — `center_membership` table with `id`, `user_id`, `center_id`, `role`, `status`, `invited_by_user_id`, `created_at`, `activated_at`, `suspended_at`, `removed_at`, `last_modified_at` columns; partial unique index on `(user_id, center_id) WHERE status IN ('ACTIVE','SUSPENDED')` (schema in data-model.md)
- [ ] T006 Create `service-center/src/main/resources/db/migration/V011_2__create_staff_invitation.sql` — `staff_invitation` table with `id`, `center_id`, `inviter_user_id`, `target_email`, `target_role`, `token_hash` (UNIQUE), `status`, `expires_at`, `redeemed_at`, `created_at`; indexes on `center_id` and `target_email` (schema in data-model.md)
- [ ] T007 Create `service-center/src/main/resources/db/migration/V011_3__backfill_owner_memberships.sql` — idempotent `INSERT INTO center_membership … SELECT … FROM maintenance_centers mc JOIN _user u ON u.id = mc.owner_id WHERE mc.is_active = true AND NOT EXISTS (SELECT 1 FROM center_membership WHERE user_id = u.id AND center_id = mc.id AND role = 'OWNER' AND status = 'ACTIVE')` with `role='OWNER'`, `status='ACTIVE'`, `created_at=NOW()`, `last_modified_at=NOW()`
- [ ] T008 Create `service-center/src/main/resources/db/migration/V011_4__add_booking_status_history.sql` — `booking_status_history` table with `id`, `booking_id`, `acting_user_id`, `acting_role`, `old_status`, `new_status`, `notes`, `acted_at`; index on `booking_id` (schema in data-model.md)

### Backend Enums & Entities

- [ ] T009 [P] Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterPermission.java` — enum with all 16 permission values from data-model.md
- [ ] T010 [P] Create `service-center/src/main/java/com/maintainance/service_center/membership/MembershipStatus.java` — enum: `INVITED`, `INVITATION_EXPIRED`, `INVITATION_DECLINED`, `ACTIVE`, `SUSPENDED`, `REMOVED`
- [ ] T011 [P] Create `service-center/src/main/java/com/maintainance/service_center/invitation/InvitationStatus.java` — enum: `PENDING`, `REDEEMED`, `DECLINED`, `EXPIRED`, `CANCELLED`
- [ ] T012 Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterRole.java` — enum with embedded `Set<CenterPermission>` per role (depends on T009); implement `hasPermission(CenterPermission)` method; full mapping in data-model.md
- [ ] T013 [P] Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterMembership.java` — `@Entity`, `@Table("center_membership")`, all columns mapped, `@ManyToOne` to `User` and `MaintenanceCenter`, `@EntityListeners(AuditingEntityListener.class)`, `@CreatedDate`/`@LastModifiedDate`
- [ ] T014 [P] Create `service-center/src/main/java/com/maintainance/service_center/invitation/StaffInvitation.java` — `@Entity`, `@Table("staff_invitation")`, all columns mapped, `@ManyToOne` to `User` (inviter) and `MaintenanceCenter`
- [ ] T015 [P] Create `service-center/src/main/java/com/maintainance/service_center/booking/BookingStatusHistory.java` — `@Entity`, `@Table("booking_status_history")`, all columns mapped, `@ManyToOne` to `Booking` and `User`

### Backend Repositories

- [ ] T016 [P] Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterMembershipRepository.java` — `JpaRepository<CenterMembership, Long>`; custom finders: `findByUserIdAndCenterIdAndStatus`, `findByCenterIdAndStatus`, `countByCenterIdAndStatusIn`
- [ ] T017 [P] Create `service-center/src/main/java/com/maintainance/service_center/invitation/StaffInvitationRepository.java` — `JpaRepository<StaffInvitation, Long>`; custom finders: `findByTokenHash`, `findByTargetEmailAndCenterIdAndStatus`, `findByCenterIdAndTargetEmailOrderByCreatedAtDesc`
- [ ] T018 [P] Create `service-center/src/main/java/com/maintainance/service_center/booking/BookingStatusHistoryRepository.java` — `JpaRepository<BookingStatusHistory, Long>`; finder: `findByBookingIdOrderByActedAtAsc`

### CenterPermissionService (the authorization hub)

- [ ] T019 Create `service-center/src/main/java/com/maintainance/service_center/security/CenterPermissionService.java` — `@Service`, `@RequiredArgsConstructor`; inject `CenterMembershipRepository`; implement: `@Cacheable("membershipCache") getActiveMembership(Long userId, Long centerId)`; `@CacheEvict("membershipCache") evictMembership(Long userId, Long centerId)`; `hasPermission(Long userId, Long centerId, CenterPermission perm)`; `requirePermission(Long userId, Long centerId, CenterPermission perm)` — throws `AccessDeniedException` if check fails; extract `userId` from `SecurityContextHolder` (depends on T009, T010, T012, T016, T002)

### Frontend State Extensions

- [ ] T020 Modify `store/centerSlice.ts` — add `activeUserRole: CenterRole | null` and `activePermissions: CenterPermission[]` to `CenterState`; add `setActiveCenter(state, action: PayloadAction<{ centerId: number; role: CenterRole; permissions: CenterPermission[] }>)` action; update `clearCenter` to reset new fields; import types from `types/staff.ts` (depends on T004)
- [ ] T021 [P] Modify `store/authSlice.ts` — add `userType: 'CUSTOMER' | 'OWNER' | 'ADMIN' | null` to the `session` shape; update `setSession` action and `clearSession` action accordingly; ensure existing login flow populates `userType` from the auth response

**Checkpoint**: Database tables exist, enums and entities compiled, `CenterPermissionService` wired, Redux state extended. No user story work can begin before this checkpoint.

---

## Phase 3: User Story 1 — Invitation Flow (P1) 🎯 MVP

**Goal**: An owner or branch manager can invite a person by email to join the center with a specific role. The invitee receives an email (+ push if they have an account), can accept or decline via a deep link, and the membership becomes ACTIVE on acceptance. Expired invitations show an error. Branch managers cannot invite peers or superiors.

**Independent Test (ST-03, ST-04, ST-10 from quickstart.md)**: Send an invitation from the app, check MailDev for the email, open the deep link as the invitee, accept, verify membership is ACTIVE in the staff list. Manually expire an invitation in the DB and confirm the "expired" screen appears.

### Backend — Invitation DTOs & Service

- [ ] T022 [P] [US1] Create `service-center/src/main/java/com/maintainance/service_center/membership/InviteStaffRequest.java` — `@Valid` DTO: `@Email targetEmail`, `@NotNull CenterRole targetRole`
- [ ] T023 [P] [US1] Create `service-center/src/main/java/com/maintainance/service_center/invitation/InvitationDetailsResponse.java` — DTO: `id`, `centerNameAr`, `centerNameEn`, `centerLogoUrl`, `inviterName`, `targetRole`, `roleAr`, `roleEn`, `expiresAt`, `status`
- [ ] T024 [US1] Create `service-center/src/main/java/com/maintainance/service_center/invitation/InvitationService.java` — `@Service`, `@Transactional`; implement:
  - `sendInvitation(Long centerId, Long inviterUserId, InviteStaffRequest req)`: validate inviter permission scope, check staff cap (NFR-007: `countByCenterIdAndStatusIn(centerId, [ACTIVE,INVITED]) >= maxStaff`), cancel any existing PENDING invitation for same email+center, generate 32-byte `SecureRandom` token, store `SHA256(token)` in `staff_invitation`, send Thymeleaf email via `EmailService`, async push notification if invitee has FCM token
  - `getByToken(String rawToken)`: lookup by `SHA256(rawToken)`, lazy-expire if past `expires_at`
  - `acceptInvitation(String rawToken, Long userId)`: validate email match, atomically set invitation→REDEEMED + create/update membership→ACTIVE, evict membership cache, notify inviter
  - `declineInvitation(String rawToken)`: set invitation→DECLINED, set membership→INVITATION_DECLINED, notify inviter
  - `resendInvitation(Long invitationId, Long inviterUserId)`: cancel old, create new invitation row (depends on T017, T019, T022)
- [ ] T025 [US1] Create `service-center/src/main/resources/templates/staff-invitation-ar.html` — Thymeleaf email template in Arabic: center name, inviter name, role label, CTA button with deep link `maintenancecenter://invite?token=${token}`, 7-day expiry note
- [ ] T026 [P] [US1] Create `service-center/src/main/resources/templates/staff-invitation-en.html` — English variant of the same Thymeleaf template

### Backend — Invitation Controller

- [ ] T027 [US1] Create `service-center/src/main/java/com/maintainance/service_center/invitation/InvitationController.java` — `@RestController`, `@RequestMapping("/api/v1/invitations")`; implement:
  - `GET /{token}` → call `invitationService.getByToken(token)` → return `InvitationDetailsResponse` (no auth required; return 410 GONE for expired/redeemed)
  - `POST /{token}/accept` → extract authenticated userId from SecurityContext, call `invitationService.acceptInvitation(token, userId)` → return `MembershipResponse` 201
  - `POST /{token}/decline` → call `invitationService.declineInvitation(token)` → 204 No Content
  (depends on T024)

### Backend — Invite Endpoint on CenterMembershipController

- [ ] T028 [US1] Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterMembershipController.java` (initial version, expanded in later phases) — `@RestController`, `@RequestMapping("/api/v1/centers/my/staff")`; add `POST /invite` → `requirePermission(userId, centerId, MANAGE_NON_MANAGER_STAFF or MANAGE_ALL_STAFF based on targetRole)`, call `invitationService.sendInvitation(...)`, return 201 `{ invitationId }` (depends on T024, T019, T022)
- [ ] T029 [US1] Add `POST /invitations/{id}/resend` to `CenterMembershipController` — `requirePermission`, call `invitationService.resendInvitation(invitationId, userId)`, return 200 `{ invitationId }`

### Frontend — Invitation Accept Screen

- [ ] T030 [US1] Create `app/(app)/accept-invite.tsx` — reads `token` from `useLocalSearchParams()`; calls `useGetInvitationDetailsQuery(token)`; shows center name (bilingual), inviter name, role label (bilingual), expiry; if `PENDING` + user authenticated: shows Accept and Decline buttons; if unauthenticated: shows "Sign in or create account" prompt; calls `useAcceptInvitationMutation` / `useDeclineInvitationMutation`; on success: invalidates memberships query and redirects to `branch-select`; on error: shows inline error banner (no `Alert.alert` on web)
- [ ] T031 [P] [US1] Add invite-related endpoints to `store/api/staffApi.ts` — `getInvitationDetails`, `acceptInvitation`, `declineInvitation`, `resendInvitation` (full shapes in data-model.md); create the file with only these four endpoints initially

### Frontend — Invite Form Screen

- [ ] T032 [P] [US1] Create `components/staff/staffSchema.ts` — Zod `inviteStaffSchema`: `targetEmail` (email), `targetRole` (enum of BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN, ACCOUNTANT — OWNER excluded)
- [ ] T033 [US1] Create `app/(app)/(tabs)/staff/invite.tsx` — React Hook Form + `inviteStaffSchema`; email field; role picker (dropdown/select showing only roles the caller is permitted to invite — derived from `activeUserRole` in Redux); submit calls `useInviteStaffMutation`; success: inline banner + navigate back to staff list; error: inline banner; web-safe confirmation pattern (no `Alert.alert`) (depends on T031, T032, T020)

**Checkpoint**: Owner/Branch Manager can send invitations. Invitee receives email, opens deep link, accepts, and membership becomes ACTIVE. Verify ST-03 and ST-04 from quickstart.md.

---

## Phase 4: User Story 2 — Permission Enforcement (P1)

**Goal**: Every center-scoped API endpoint enforces the caller's role permission. UI hides or disables actions the user lacks permission for. Technicians see only their assigned bookings. Receptionists see price list but not financials.

**Independent Test (ST-05, ST-06 from quickstart.md)**: Log in as Technician → bookings list shows only assigned bookings, no financial columns visible. Log in as Accountant → booking status buttons absent. Log in as Receptionist → Chat tab accessible, financial fields absent.

### Backend — Permission Checks on Existing Endpoints

- [ ] T034 [US2] Modify `service-center/src/main/java/com/maintainance/service_center/booking/BookingService.java` — inject `CenterPermissionService`; in `getBookings()`: call `requirePermission(userId, centerId, VIEW_BOOKING_BASIC or VIEW_BOOKINGS_READONLY or VIEW_ASSIGNED_BOOKINGS)`; if caller has only `VIEW_ASSIGNED_BOOKINGS`, add `WHERE assigned_technician_id = :userId` filter; strip financial fields from response when `VIEW_BOOKING_BASIC` (no `VIEW_REVENUE`); in `updateBookingStatus()`: `requirePermission(userId, centerId, MANAGE_BOOKINGS)`; record row in `booking_status_history` with `acting_user_id` and `acting_role` (depends on T019, T018)
- [ ] T035 [P] [US2] Modify `service-center/src/main/java/com/maintainance/service_center/booking/BookingService.java` (work stage methods) — in `updateWorkStage()` and `createWorkProgress()`: `requirePermission(userId, centerId, UPDATE_WORK_STAGE)`; in `uploadMedia()`: `requirePermission(userId, centerId, UPLOAD_PROGRESS_MEDIA)`; record in `booking_status_history` (depends on T019)
- [ ] T036 [P] [US2] Modify `service-center/src/main/java/com/maintainance/service_center/review/ReviewService.java` — in `replyToReview()`: `requirePermission(userId, centerId, RESPOND_REVIEWS)` (depends on T019)
- [ ] T037 [P] [US2] Modify `service-center/src/main/java/com/maintainance/service_center/chat/ChatService.java` — in `sendMessage()`: `requirePermission(userId, centerId, MANAGE_CHAT)`; in `getConversations()` for a technician: filter to only conversations linked to their assigned bookings (depends on T019)
- [ ] T038 [P] [US2] Modify `service-center/src/main/java/com/maintainance/service_center/center/MaintenanceCenterService.java` — in `updateCenter()` and `uploadImage()`: `requirePermission(userId, centerId, EDIT_CENTER_PROFILE)` (depends on T019)
- [ ] T039 [P] [US2] Modify `service-center/src/main/java/com/maintainance/service_center/center/CenterController.java` (pricing endpoints from Phase 3.5) — `GET /centers/my/pricing`: allow `VIEW_PRICE_LIST` or `VIEW_REVENUE`; `POST/PUT/DELETE /centers/my/pricing/{id}`: require `VIEW_REVENUE` (Branch Manager/Owner only) (depends on T019)

### Frontend — PermissionGate Component

- [ ] T040 [US2] Create `components/staff/PermissionGate.tsx` — reads `activePermissions` from Redux store; props: `permission: CenterPermission`, `fallback?: ReactNode` (default `null`); renders `children` if permission present, `fallback` otherwise; import from `types/staff.ts` (depends on T004, T020)
- [ ] T041 [P] [US2] Create `components/staff/RoleBadge.tsx` — props: `role: CenterRole`; displays `t('staff.roles.' + role)` with color-coded badge (OWNER=gold, BRANCH_MANAGER=blue, RECEPTIONIST=green, TECHNICIAN=orange, ACCOUNTANT=purple); bilingual via i18n
- [ ] T042 [P] [US2] Create `components/staff/MembershipStatusBadge.tsx` — props: `status: MembershipStatus`; displays `t('staff.statuses.' + status)` with appropriate color

### Frontend — Conditional UI via PermissionGate

- [ ] T043 [US2] Modify `app/(app)/(tabs)/_layout.tsx` — wrap the Chat tab rendering in `<PermissionGate permission="MANAGE_CHAT">`; wrap the Staff tab in a check for OWNER or BRANCH_MANAGER (`activeUserRole === 'OWNER' || activeUserRole === 'BRANCH_MANAGER'`); Staff tab is hidden for Technicians, Accountants, Receptionists (depends on T040, T020)
- [ ] T044 [P] [US2] Modify `app/(app)/(tabs)/bookings/[id].tsx` — wrap status action buttons (Confirm, Reject, Cancel, Update Stage) in `<PermissionGate permission="MANAGE_BOOKINGS">`; wrap Update Stage specifically in `<PermissionGate permission="UPDATE_WORK_STAGE">`; wrap Reply to Review in `<PermissionGate permission="RESPOND_REVIEWS">`; hide financial fields (`finalAmount`, `quotedAmount`) when `activePermissions` does not include `VIEW_REVENUE` (depends on T040, T020)

**Checkpoint**: Technician account sees only assigned bookings with no financial data. Accountant account cannot trigger any state-change action. Chat tab hidden for Technicians. Verify ST-05 and ST-06 from quickstart.md.

---

## Phase 5: User Story 3 — Staff Lifecycle & Staff UI (P1)

**Goal**: Owners can view the full staff list, remove members, suspend/reinstate members. Branch Managers can manage Technicians and Receptionists. Any active staff member can voluntarily leave. Owner cannot remove themselves.

**Independent Test (ST-07, ST-08, ST-09, ST-12, ST-13 from quickstart.md)**: Owner removes a Technician → status becomes REMOVED, cache evicts within 60s. Owner suspends a Branch Manager → status becomes SUSPENDED, Branch Manager loses center access but account still works. Branch Manager tries to remove another Branch Manager → permission denied. Owner attempts to remove self → denied with bilingual error.

### Backend — Staff Management DTOs & Service

- [ ] T045 [P] [US3] Create `service-center/src/main/java/com/maintainance/service_center/membership/MembershipResponse.java` — DTO: `id`, `userId`, `userFirstname`, `userLastname`, `userEmail`, `role`, `roleAr`, `roleEn`, `status`, `invitedByName`, `activatedAt`, `centerId`
- [ ] T046 [P] [US3] Create `service-center/src/main/java/com/maintainance/service_center/membership/UpdateMembershipRequest.java` — DTO: `@NotNull CenterRole role`
- [ ] T047 [US3] Create `service-center/src/main/java/com/maintainance/service_center/membership/CenterMembershipService.java` — `@Service`, `@Transactional`; implement:
  - `getStaffPage(Long centerId, Long callerId, Pageable pageable)`: `requirePermission(callerId, centerId, MANAGE_NON_MANAGER_STAFF or MANAGE_ALL_STAFF)`, query `center_membership` by centerId
  - `updateRole(Long membershipId, Long callerId, UpdateMembershipRequest req)`: validate caller has MANAGE_ALL_STAFF, validate target is not OWNER, call `centerPermissionService.evictMembership(targetUserId, centerId)`
  - `removeMember(Long membershipId, Long callerId)`: validate caller permission scope, validate target is not OWNER, set status→REMOVED + `removed_at`, evict cache, notify Owner+Branch Managers if target had open assigned bookings, notify removed member
  - `suspendMember(Long membershipId, Long callerId)`: similar validation, status→SUSPENDED, evict cache
  - `reinstateMember(Long membershipId, Long callerId)`: status→ACTIVE, evict cache
  - `leaveCenter(Long centerId, Long userId)`: validate caller is not OWNER, set status→REMOVED, evict cache, notify Owner+Branch Managers
  (depends on T016, T019, T045, T046)

### Backend — Staff Management Endpoints (expand CenterMembershipController)

- [ ] T048 [US3] Expand `service-center/src/main/java/com/maintainance/service_center/membership/CenterMembershipController.java` — add:
  - `GET /centers/my/staff?page=&size=&status=` → `membershipService.getStaffPage(...)` → `Page<MembershipResponse>`
  - `PUT /centers/my/staff/{membershipId}` → `membershipService.updateRole(...)` → `MembershipResponse`
  - `DELETE /centers/my/staff/{membershipId}` → `membershipService.removeMember(...)` → 204
  - `PUT /centers/my/staff/{membershipId}/suspend` → `membershipService.suspendMember(...)` → `MembershipResponse`
  - `PUT /centers/my/staff/{membershipId}/reinstate` → `membershipService.reinstateMember(...)` → `MembershipResponse`
  - `DELETE /centers/my/staff/leave` → `membershipService.leaveCenter(centerId, userId)` → 204
  (depends on T047)

### Frontend — Staff RTK Slice (remaining endpoints)

- [ ] T049 [US3] Expand `store/api/staffApi.ts` — add `getCenterStaff`, `updateMembershipRole`, `removeMember`, `suspendMember`, `reinstateMember`, `leaveCenter` endpoints (shapes in data-model.md); all `invalidatesTags: ['Staff']` (depends on T003)

### Frontend — Staff Screens & Components

- [ ] T050 [US3] Create `components/staff/StaffMemberCard.tsx` — props: `membership: CenterMembership`, `onPress: () => void`; shows avatar initials, full name, `RoleBadge`, `MembershipStatusBadge`, `invitedByName`, `activatedAt` date; tappable card (depends on T041, T042)
- [ ] T051 [US3] Create `app/(app)/(tabs)/staff/_layout.tsx` — `Stack` navigator exposing `index`, `invite`, and `[membershipId]` screens
- [ ] T052 [US3] Create `app/(app)/(tabs)/staff/index.tsx` — staff list screen; calls `useGetCenterStaffQuery`; renders `FlatList` of `StaffMemberCard`; "Invite Staff" button wrapped in `<PermissionGate permission="MANAGE_NON_MANAGER_STAFF">`; pull-to-refresh; empty state: "No staff yet. Tap 'Invite Staff' to add your first team member." (bilingual) (depends on T049, T050, T040)
- [ ] T053 [US3] Create `app/(app)/(tabs)/staff/[membershipId].tsx` — member detail screen; reads `membershipId` from `useLocalSearchParams()`; shows member info, role, status; action buttons: Change Role (`<PermissionGate permission="MANAGE_ALL_STAFF">`), Suspend/Reinstate (`<PermissionGate permission="MANAGE_NON_MANAGER_STAFF">`), Remove (same gate); "Leave Center" button shown only when `membershipId` matches the current user's own membership (and they are not the OWNER); all destructive actions use inline confirmation banner (no `Alert.alert` on web); calls appropriate mutations (depends on T049, T040, T041, T042)

**Checkpoint**: Owner can view all staff, remove/suspend members, and re-invite. Technician can leave voluntarily. Owner cannot remove themselves. Verify ST-07, ST-08, ST-09, ST-12, ST-13.

---

## Phase 6: User Story 4 — Multi-Center Selector & Migration (P1)

**Goal**: A user with memberships at multiple centers sees a center selector with their role displayed per center. Existing OWNER accounts are unaffected (they have auto-created OWNER memberships from the Flyway backfill). A CUSTOMER with no memberships who reaches the app sees a "no access" screen.

**Independent Test (ST-01, ST-02, ST-11 from quickstart.md)**: Existing owner logs in → no change in behaviour, dashboard reached. A user with 2 memberships logs in → center selector shows both centers with role labels. CUSTOMER with no memberships logs into center owner app → "No Center Access" screen.

### Backend — Memberships Discovery Endpoint

- [ ] T054 [US4] Add `GET /users/me/memberships` to `service-center/src/main/java/com/maintainance/service_center/user/UserController.java` — returns `List<MembershipSummaryResponse>` of all `ACTIVE` memberships for the authenticated user; query `center_membership` by `user_id` and `status = ACTIVE`; join `maintenance_centers` for name + logo fields; include `roleAr`/`roleEn` from a server-side i18n map (depends on T016)
- [ ] T055 [P] [US4] Create `service-center/src/main/java/com/maintainance/service_center/membership/MembershipSummaryResponse.java` — DTO: `centerId`, `centerNameAr`, `centerNameEn`, `centerLogoUrl`, `role`, `roleAr`, `roleEn`, `status`

### Frontend — Updated Center Selector

- [ ] T056 [US4] Add `getMyMemberships` endpoint to `store/api/staffApi.ts` — `builder.query<MembershipSummary[], void>({ query: () => 'users/me/memberships', providesTags: ['Staff'] })` (depends on T049)
- [ ] T057 [US4] Modify `app/(app)/branch-select.tsx` — replace `useGetMyCentersQuery()` with `useGetMyMembershipsQuery()` from `staffApi`; update card to display role label (`t('staff.roles.' + membership.role)`) below center name; on selection call `dispatch(setActiveCenter({ centerId: m.centerId, role: m.role, permissions: ROLE_PERMISSIONS[m.role] }))` then navigate to dashboard (depends on T056, T020, T004)
- [ ] T058 [US4] Modify `app/(app)/_layout.tsx` — update session-restore logic: after `GET /users/me`, call `GET /users/me/memberships`; if result is empty array AND `userType === 'CUSTOMER'` → redirect to `no-center-access`; if exactly one membership → auto-select and `dispatch(setActiveCenter(...))` without showing selector; if multiple → show `branch-select` (depends on T056, T020, T021)
- [ ] T059 [P] [US4] Create `app/(app)/no-center-access.tsx` — shown when CUSTOMER has zero active memberships; displays `t('staff.noAccess.title')`, `t('staff.noAccess.body')`; "Go to Customer App" button that deep-links to customer app; "Log out" button

**Checkpoint**: Full login flow works for all user types. Backfilled OWNER memberships mean existing center owners see no behaviour change. Verify ST-01 and ST-02 from quickstart.md.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: i18n keys, bilingual labels, business error codes, missing edge-case handling, final smoke test.

- [ ] T060 [P] Add `staff.*` English keys to `lib/i18n/locales/en.json` — full key set from plan.md §i18n Keys
- [ ] T061 [P] Add `staff.*` Arabic keys to `lib/i18n/locales/ar.json` — full key set from plan.md §i18n Keys
- [ ] T062 Add new `BusinessErrorCode` entries to `service-center/src/main/java/com/maintainance/service_center/handler/BusinessErrorCodes.java` — codes 3001–3007 from contracts/staff-api.md; update `GlobalExceptionHandling` to map `AccessDeniedException` from `CenterPermissionService` to a 403 response with the appropriate business code
- [ ] T063 [P] Add app.yml config property `app.staff.max-members=50` and `app.staff.invitation-expiry-days=7` to `service-center/src/main/resources/application-dev.yml`; inject via `@Value` in `InvitationService` and `CenterMembershipService`
- [ ] T064 [P] Add custom URL scheme `maintenancecenter` to `app.json` (Expo `scheme` field) and configure `expo-linking` in `app/(app)/accept-invite.tsx` to handle `maintenancecenter://invite` deep links
- [ ] T065 [P] Verify EC-3 (banned user): since no ban concept exists yet, add a comment in `InvitationService.acceptInvitation()` noting: "TODO: check user ban status when ban feature is implemented (EC-3)"
- [ ] T066 [P] Handle EC-4 in `InvitationService.sendInvitation()`: before creating a new invitation, explicitly `CANCEL` any existing `PENDING` invitation for the same `(target_email, center_id)` — verify this is implemented in T024 (cross-check)
- [ ] T067 Run all 13 smoke test scenarios from `quickstart.md` and mark each `[x]` in the file as smoke-tested

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 complete — **BLOCKS all user stories**
- **Phase 3 (US1 – Invitation Flow)**: Depends on Phase 2 complete
- **Phase 4 (US2 – Permission Enforcement)**: Depends on Phase 2 complete; can run in parallel with Phase 3
- **Phase 5 (US3 – Staff Lifecycle UI)**: Depends on Phase 2 complete; Phase 3's `staffApi.ts` file must exist (T031)
- **Phase 6 (US4 – Multi-Center Selector)**: Depends on Phase 2 complete; Phase 5's `staffApi.ts` must exist (T049)
- **Phase 7 (Polish)**: Depends on Phases 3–6 complete

### User Story Dependencies

- **US1 (Invitation Flow)**: Starts after Phase 2 — no dependency on other user stories
- **US2 (Permission Enforcement)**: Starts after Phase 2 — no dependency on US1; can run in parallel
- **US3 (Staff Lifecycle UI)**: Starts after Phase 2 — `staffApi.ts` file created in US1 (T031) must exist, but only as a shell
- **US4 (Multi-Center Selector)**: Starts after Phase 2 — depends on `staffApi.ts` from US3 (T049) for `getMyMemberships`

### Within Each Phase

- DB migrations (T005–T008) must run in sequence (V011_1 → V011_2 → V011_3 → V011_4)
- `CenterRole.java` (T012) depends on `CenterPermission.java` (T009)
- `CenterPermissionService` (T019) depends on T009, T010, T012, T016, T002
- Frontend `centerSlice` extension (T020) depends on `types/staff.ts` (T004)

---

## Parallel Opportunities

### Phase 2 Parallel Batch (after migrations T005–T008)

```
Batch A — run together:
  T009  CenterPermission.java
  T010  MembershipStatus.java
  T011  InvitationStatus.java

Then:
  T012  CenterRole.java (needs T009)

Batch B — run together after T012:
  T013  CenterMembership.java
  T014  StaffInvitation.java
  T015  BookingStatusHistory.java
  T016  CenterMembershipRepository.java
  T017  StaffInvitationRepository.java
  T018  BookingStatusHistoryRepository.java

Then:
  T019  CenterPermissionService.java (needs T009, T012, T016, T002)

Batch C — run together (no backend dependency):
  T020  store/centerSlice.ts (needs T004)
  T021  store/authSlice.ts
```

### Phase 4 Parallel Batch (US2 — Permission checks are independent per service)

```
T034  BookingService (booking status)
T035  BookingService (work stage)   } run together
T036  ReviewService
T037  ChatService
T038  MaintenanceCenterService
T039  CenterController (pricing)
```

---

## Parallel Example: Phase 3 (US1)

```
Launch together:
  T022  InviteStaffRequest.java
  T023  InvitationDetailsResponse.java
  T025  staff-invitation-ar.html
  T026  staff-invitation-en.html
  T032  components/staff/staffSchema.ts

Then:
  T024  InvitationService.java (needs T022)
  T031  staffApi.ts initial endpoints (needs T003)

Then:
  T027  InvitationController.java (needs T024)
  T028  CenterMembershipController.java initial (needs T024, T019)
  T030  app/(app)/accept-invite.tsx (needs T031)
  T033  app/(app)/(tabs)/staff/invite.tsx (needs T031, T032)
```

---

## Implementation Strategy

### MVP First (US1 Only — Invitation Flow)

1. Complete Phase 1 (Setup) — T001–T004
2. Complete Phase 2 (Foundational) — T005–T021
3. Complete Phase 3 (US1 — Invitation Flow) — T022–T033
4. **STOP and VALIDATE**: smoke tests ST-03 and ST-04
5. Demo: owner can invite a technician; technician receives email and accepts

### Incremental Delivery

1. Phase 1 + Phase 2 → DB and infrastructure ready
2. + Phase 3 (US1) → Invitation flow works end-to-end *(Demo point)*
3. + Phase 4 (US2) → Role-based permissions enforced on all endpoints *(Security milestone)*
4. + Phase 5 (US3) → Full staff management UI *(Operational completeness)*
5. + Phase 6 (US4) → Multi-center selector updated *(Multi-staff user support)*
6. + Phase 7 (Polish) → Bilingual labels, error codes, smoke-tested *(Production ready)*

---

## Notes

- All `[P]` tasks write to different files — no merge conflicts when running in parallel
- `Alert.alert` is a no-op on React Native Web — all confirmation dialogs must use inline state banners (existing project rule)
- Backend path prefix for this plan: `~/IdeaProjects/life-experience-app/service-center/src/main/java/com/maintainance/service_center/`
- The seven known backend bugs MUST be fixed before Phase 3+ (spec §12 dependency)
- Amounts/currency not applicable to this feature — no KD formatting needed
- Arabic role labels (provisional in spec FR-036): مالك / مدير الفرع / موظف استقبال / فني / محاسب — native speaker review recommended before launch
