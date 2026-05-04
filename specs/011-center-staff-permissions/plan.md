# Implementation Plan: Center Staff & Permissions

**Branch**: `011-center-staff-permissions` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/011-center-staff-permissions/spec.md`

## Summary

Center owners need to delegate access to their maintenance center to named staff members (Branch Managers, Receptionists, Technicians, Accountants) without sharing passwords or compromising the audit trail. This plan introduces a `center_membership` table and a `staff_invitation` table on the backend, a `CenterPermissionService` with a 60-second Caffeine cache for per-request authorization, Flyway migrations that backfill OWNER memberships for all existing OWNER users, a new `GET /users/me/memberships` endpoint powering the updated center selector, and a React Native staff management UI (Staff tab, Invite form, Accept-invite deep-link screen, PermissionGate component) backed by a new `staffApi` RTK slice.

---

## Technical Context

**Language/Version**: Java 17 + Spring Boot 3.5.6 (backend) · TypeScript 5.x + React Native 0.81.5 + Expo SDK 54 (frontend)  
**Primary Dependencies**:
- Backend: Spring Data JPA, Spring Security, Spring Cache + Caffeine, JavaMailSender + Thymeleaf, existing FCM push infrastructure, Flyway (migrations)
- Frontend: RTK Query, Redux Toolkit, Expo Router, react-i18next, react-hook-form + Zod, expo-linking
- New backend dependency: `spring-boot-starter-cache` + `com.github.ben-manes.caffeine:caffeine` (add to pom.xml)

**Storage**: PostgreSQL 15 — 2 new tables (`center_membership`, `staff_invitation`) + 1 new side-table (`booking_status_history`)  
**Testing**: No automated tests — manual smoke test checklist in `quickstart.md`  
**Target Platform**: Spring Boot API + iOS 15+ / Android API 31+ / React Native Web  
**Project Type**: Full-stack feature — backend new package + Spring Security extension + DB migrations + frontend new screens + RTK slice  
**Performance Goals**: Permission check adds ≤50ms p95 (NFR-001) — achieved via Caffeine in-process cache  
**Constraints**: 60s membership cache TTL (NFR-003); hard cap 50 ACTIVE+INVITED members per center (NFR-007, configurable); 7-day invitation expiry (FR-016, configurable); invitation tokens stored as SHA-256 hash only (NFR-002); `Alert.alert` no-op on web — use inline banners  
**Scale/Scope**: 3 new DB tables, 4 Flyway migration scripts, ~12 new API endpoints, 1 new Spring Security bean, 2 new backend packages, 1 new RTK slice, 5 new screens, 7 new components, 2 locale file updates

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec clarified and approved; plan precedes implementation |
| II. Bilingual First | ✅ Pass | Role labels (`roleAr`/`roleEn`), status labels, error messages, invitation emails all bilingual; `staff.*` i18n namespace defined |
| III. Component-Driven UI | ✅ Pass | `StaffMemberCard`, `RoleBadge`, `MembershipStatusBadge`, `InviteForm`, `PermissionGate` are independently testable |
| IV. API Contract Adherence | ✅ Pass | All data via RTK Query; `staffApi.ts` follows inject pattern; `'Staff'` tag type added to `baseApi` |
| V. Owner-Context Awareness | ✅ Pass | Staff management is an owner-side operational feature; no customer flows |
| VI. Security & Privacy | ✅ Pass | Invitation tokens stored as SHA-256 hash (NFR-002); 60s cache eviction on removal (NFR-003); per-action permission checks on every center-scoped endpoint (FR-013); JWT in SecureStore |
| VII. Production Readiness | ✅ Pass | No placeholders; no feature flags; Flyway migrations backfill existing owners; 7 backend bugs must be fixed before implementation (tracked in §12 of spec) |

**Constitution Check Result**: All gates pass. No violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-center-staff-permissions/
├── plan.md          # This file
├── research.md      # Cache strategy, token design, deep link, migration order decisions
├── data-model.md    # DB schema, Java enums/DTOs, TypeScript types, Zod schemas, RTK slice
├── quickstart.md    # Step-by-step smoke test checklist (13 scenarios)
├── contracts/
│   └── staff-api.md # All new API endpoints with request/response shapes and error codes
└── tasks.md         # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code — Backend (`~/IdeaProjects/life-experience-app/service-center/`)

```text
src/main/java/com/maintainance/service_center/
├── membership/
│   ├── CenterRole.java                  # NEW enum with embedded permission Set
│   ├── CenterPermission.java            # NEW enum (16 permissions)
│   ├── MembershipStatus.java            # NEW enum
│   ├── CenterMembership.java            # NEW @Entity
│   ├── CenterMembershipRepository.java  # NEW JPA repository
│   ├── CenterMembershipService.java     # NEW business logic
│   ├── CenterMembershipController.java  # NEW REST controller (/centers/my/staff/*)
│   ├── MembershipResponse.java          # NEW DTO
│   ├── MembershipSummaryResponse.java   # NEW DTO (for center selector)
│   ├── InviteStaffRequest.java          # NEW DTO
│   └── UpdateMembershipRequest.java     # NEW DTO
├── invitation/
│   ├── InvitationStatus.java            # NEW enum
│   ├── StaffInvitation.java             # NEW @Entity
│   ├── StaffInvitationRepository.java   # NEW JPA repository
│   ├── InvitationService.java           # NEW: token gen, email+push send, accept/decline
│   ├── InvitationController.java        # NEW REST controller (/invitations/*)
│   └── InvitationDetailsResponse.java   # NEW DTO
├── security/
│   └── CenterPermissionService.java     # NEW: Cacheable membership lookup + hasPermission()
├── config/
│   └── CacheConfig.java                 # NEW: @EnableCaching + CaffeineCacheManager bean
├── booking/
│   └── BookingStatusHistory.java        # NEW @Entity (audit side-table)
│   └── BookingStatusHistoryRepository.java # NEW JPA repository
│   # BookingService.java — MODIFY: inject CenterPermissionService, record audit row
│   # BookingController.java — MODIFY: pass centerId to permission check
├── review/
│   # ReviewService.java — MODIFY: inject CenterPermissionService for RESPOND_REVIEWS
├── chat/
│   # ChatService.java — MODIFY: inject CenterPermissionService for MANAGE_CHAT
├── center/
│   # MaintenanceCenterService.java — MODIFY: inject permission check for EDIT_CENTER_PROFILE
├── user/
│   # UserController.java — ADD: GET /users/me/memberships endpoint
└── resources/
    ├── db/migration/
    │   ├── V011_1__create_center_membership.sql
    │   ├── V011_2__create_staff_invitation.sql
    │   ├── V011_3__backfill_owner_memberships.sql
    │   └── V011_4__add_booking_status_history.sql
    └── templates/
        ├── staff-invitation-ar.html     # NEW Thymeleaf email template (Arabic)
        └── staff-invitation-en.html     # NEW Thymeleaf email template (English)
```

### Source Code — Frontend (`maintenance-center-app/`)

```text
types/
└── staff.ts                              # NEW: CenterRole, MembershipStatus, CenterPermission,
                                          #      CenterMembership, MembershipSummary,
                                          #      InvitationDetails, InviteStaffRequest,
                                          #      ROLE_PERMISSIONS constant

store/
├── centerSlice.ts                        # MODIFY: add activeUserRole + activePermissions fields
├── authSlice.ts                          # MODIFY: add userType to session shape
└── api/
    └── staffApi.ts                       # NEW: 12 RTK Query endpoints (see data-model.md)

components/staff/
├── staffSchema.ts                        # NEW: Zod schema for invite form
├── StaffMemberCard.tsx                   # NEW: name, role badge, status badge, action menu
├── RoleBadge.tsx                         # NEW: colored label for CenterRole
├── MembershipStatusBadge.tsx             # NEW: colored label for MembershipStatus
├── InviteForm.tsx                        # NEW: email + role picker, validation, submit
└── PermissionGate.tsx                    # NEW: renders children only if permission granted

app/(app)/
├── accept-invite.tsx                     # NEW: deep-link screen — reads token from URL,
                                          #      shows InvitationDetailsResponse, accept/decline
└── no-center-access.tsx                  # NEW: shown when CUSTOMER has no active memberships

app/(app)/(tabs)/
├── _layout.tsx                           # MODIFY: add Staff tab (visible only to OWNER + BRANCH_MANAGER)
└── staff/
    ├── _layout.tsx                       # NEW: Stack navigator for staff screens
    ├── index.tsx                         # NEW: Staff list with invite button
    ├── invite.tsx                        # NEW: Invite form screen
    └── [membershipId].tsx                # NEW: Member detail — role change, suspend, remove

app/(app)/_layout.tsx                     # MODIFY: use GET /users/me/memberships for selector;
                                          #         dispatch setActiveCenter({centerId, role, permissions})
app/(app)/branch-select.tsx               # MODIFY: use useGetMyMembershipsQuery(); show role label per center

lib/i18n/locales/
├── en.json                               # ADD: staff.* namespace keys
└── ar.json                               # ADD: Arabic translations for staff.* namespace
```

**Structure Decision**: Full-stack feature with dedicated backend `membership/` and `invitation/` packages following existing package-per-domain convention. Frontend adds a `staff/` route group under tabs, a `components/staff/` directory, and a `types/staff.ts` file. The `PermissionGate` component is the single point of UI-level permission enforcement; the `CenterPermissionService` bean is the single point of server-side enforcement.

---

## Key Design Decisions

### 1. Migration-First Deployment

Run all four Flyway scripts before deploying the new code. The backfill script creates OWNER memberships for all existing `APPROVED` OWNER users atomically. When the new code starts, every center already has an OWNER membership — no fallback shim needed.

### 2. `CenterPermissionService` as the Authorization Source of Truth

Every center-scoped service method calls `centerPermissionService.requirePermission(userId, centerId, permission)`. This method:
1. Calls `@Cacheable getActiveMembership(userId, centerId)` → hits Caffeine cache (60s TTL)
2. If no ACTIVE membership → throws `AccessDeniedException` (→ 403)
3. If membership found → checks `membership.getRole().hasPermission(permission)`
4. If permission absent → throws `AccessDeniedException` (→ 403)

The `userId` comes from `SecurityContextHolder` (JWT principal). The `centerId` is the center being acted upon — extracted from the path variable or the center resolved by the `/my/` convention.

### 3. Permission Enforcement on Existing Endpoints

All existing center-scoped endpoints gain a permission check:

| Endpoint group | Permission required |
|---|---|
| `PUT /bookings/{id}/status` | `MANAGE_BOOKINGS` |
| `PUT /bookings/{id}/work-stage` | `UPDATE_WORK_STAGE` |
| `POST /bookings/{id}/work-progress` | `UPDATE_WORK_STAGE` |
| `POST /bookings/{id}/media` | `UPLOAD_PROGRESS_MEDIA` |
| `POST /bookings/{id}/quotes` | `MANAGE_BOOKINGS` |
| `POST /conversations/{id}/messages` | `MANAGE_CHAT` |
| `POST /reviews/{id}/reply` | `RESPOND_REVIEWS` |
| `PUT /centers/my` | `EDIT_CENTER_PROFILE` |
| `POST /centers/my/images` | `EDIT_CENTER_PROFILE` |
| `GET /centers/my/pricing` | `VIEW_PRICE_LIST` (Receptionist) or `VIEW_REVENUE` |
| `GET /bookings` | `VIEW_ASSIGNED_BOOKINGS` (Technician sees filtered), `VIEW_BOOKING_BASIC`, or `VIEW_BOOKINGS_READONLY` |

### 4. Technician Booking Filter

When a TECHNICIAN calls `GET /bookings`, `BookingService` detects the `VIEW_ASSIGNED_BOOKINGS` permission and adds a `WHERE assigned_technician_id = :userId` clause. Technicians with `MANAGE_BOOKINGS` (Receptionist, Branch Manager) see all bookings for the center.

### 5. Center Selector — Unified Memberships Endpoint

The `branch-select.tsx` screen is updated to call `GET /users/me/memberships` instead of (or in addition to) `GET /centers/my`. On selection, `setActiveCenter({ centerId, role, permissions })` is dispatched to Redux, storing the flat permissions array derived from `ROLE_PERMISSIONS[role]`. All subsequent permission checks in the UI read from `store.center.activePermissions`.

### 6. Deep Link Handling

The invitation email includes a link in the format:
- Native: `maintenancecenter://invite?token=<token>`
- Web: routes to `accept-invite.tsx` via Expo Router

The `accept-invite.tsx` screen:
1. Reads `token` from `useLocalSearchParams()`
2. Calls `useGetInvitationDetailsQuery(token)` to show center name, role, inviter
3. If user is authenticated: shows Accept / Decline buttons
4. If user is not authenticated: shows "Create account to accept" with a link to registration
5. On Accept: calls `useAcceptInvitationMutation(token)`, then refreshes memberships and navigates to center selector

### 7. `PermissionGate` Component

```tsx
// Renders children only if the active user has the given permission
<PermissionGate permission="MANAGE_CHAT">
  <ChatTab />
</PermissionGate>
```

Reads `activePermissions` from Redux. If permission is absent, renders `null` (element is fully hidden, not just disabled). For actions that should show a disabled state instead of hiding, use the `fallback` prop:

```tsx
<PermissionGate permission="RESPOND_REVIEWS" fallback={<DisabledReplyButton />}>
  <ReplyButton />
</PermissionGate>
```

---

## i18n Keys — `staff.*` Namespace

### English (`en.json` additions)
```json
{
  "staff": {
    "title": "Staff",
    "inviteButton": "Invite Staff",
    "memberCount": "{{count}} members",
    "roles": {
      "OWNER": "Owner",
      "BRANCH_MANAGER": "Branch Manager",
      "RECEPTIONIST": "Receptionist",
      "TECHNICIAN": "Technician",
      "ACCOUNTANT": "Accountant"
    },
    "statuses": {
      "ACTIVE": "Active",
      "INVITED": "Invited",
      "SUSPENDED": "Suspended",
      "REMOVED": "Removed",
      "INVITATION_EXPIRED": "Invitation Expired",
      "INVITATION_DECLINED": "Declined"
    },
    "invite": {
      "title": "Invite Staff",
      "email": "Email Address",
      "role": "Role",
      "send": "Send Invitation",
      "sent": "Invitation sent successfully",
      "resend": "Re-send Invitation"
    },
    "member": {
      "since": "Member since {{date}}",
      "invitedBy": "Invited by {{name}}",
      "changeRole": "Change Role",
      "suspend": "Suspend",
      "reinstate": "Reinstate",
      "remove": "Remove",
      "leave": "Leave Center"
    },
    "invite_accept": {
      "title": "You've been invited",
      "body": "{{inviter}} has invited you to join {{center}} as {{role}}.",
      "accept": "Accept Invitation",
      "decline": "Decline",
      "expired": "This invitation has expired.",
      "alreadyUsed": "This invitation has already been used."
    },
    "noAccess": {
      "title": "No Center Access",
      "body": "You don't have access to any maintenance center. Ask a center owner to invite you.",
      "goToCustomerApp": "Go to Customer App"
    },
    "errors": {
      "capReached": "Maximum staff limit reached ({{limit}}). Remove a member before inviting.",
      "selfInvite": "You cannot invite yourself.",
      "cannotInviteAdmin": "Admin accounts cannot be invited as staff.",
      "insufficientRole": "You don't have permission to invite this role.",
      "permissionDenied": "You don't have permission to perform this action.",
      "cannotRemoveOwner": "Owners cannot remove themselves. Transfer ownership first.",
      "emailMismatch": "This invitation was sent to a different email address."
    }
  }
}
```

### Arabic (`ar.json` additions)
```json
{
  "staff": {
    "title": "الموظفون",
    "inviteButton": "دعوة موظف",
    "memberCount": "{{count}} أعضاء",
    "roles": {
      "OWNER": "مالك",
      "BRANCH_MANAGER": "مدير الفرع",
      "RECEPTIONIST": "موظف استقبال",
      "TECHNICIAN": "فني",
      "ACCOUNTANT": "محاسب"
    },
    "statuses": {
      "ACTIVE": "نشط",
      "INVITED": "مدعو",
      "SUSPENDED": "موقوف",
      "REMOVED": "محذوف",
      "INVITATION_EXPIRED": "انتهت صلاحية الدعوة",
      "INVITATION_DECLINED": "رُفضت الدعوة"
    },
    "invite": {
      "title": "دعوة موظف",
      "email": "البريد الإلكتروني",
      "role": "الدور",
      "send": "إرسال الدعوة",
      "sent": "تم إرسال الدعوة بنجاح",
      "resend": "إعادة إرسال الدعوة"
    },
    "member": {
      "since": "عضو منذ {{date}}",
      "invitedBy": "دُعي بواسطة {{name}}",
      "changeRole": "تغيير الدور",
      "suspend": "إيقاف مؤقت",
      "reinstate": "إعادة تفعيل",
      "remove": "إزالة",
      "leave": "مغادرة المركز"
    },
    "invite_accept": {
      "title": "تلقيت دعوة",
      "body": "دعاك {{inviter}} للانضمام إلى {{center}} بصفة {{role}}.",
      "accept": "قبول الدعوة",
      "decline": "رفض",
      "expired": "انتهت صلاحية هذه الدعوة.",
      "alreadyUsed": "تم استخدام هذه الدعوة مسبقاً."
    },
    "noAccess": {
      "title": "لا يوجد صلاحية وصول",
      "body": "ليس لديك صلاحية الوصول إلى أي مركز صيانة. اطلب من مالك المركز دعوتك.",
      "goToCustomerApp": "الذهاب إلى تطبيق العميل"
    },
    "errors": {
      "capReached": "تم الوصول إلى الحد الأقصى للموظفين ({{limit}}). احذف عضواً قبل الدعوة.",
      "selfInvite": "لا يمكنك دعوة نفسك.",
      "cannotInviteAdmin": "لا يمكن دعوة حسابات المشرفين كموظفين.",
      "insufficientRole": "لا تملك صلاحية دعوة هذا الدور.",
      "permissionDenied": "لا تملك صلاحية لتنفيذ هذا الإجراء.",
      "cannotRemoveOwner": "لا يمكن للمالك إزالة نفسه. يرجى نقل الملكية أولاً.",
      "emailMismatch": "هذه الدعوة موجهة إلى بريد إلكتروني مختلف."
    }
  }
}
```

---

## Complexity Tracking

> No constitution violations — this section is not applicable.
