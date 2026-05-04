# Data Model: Admin Panel — Center Owner Approval

**Branch**: `012-admin-panel` | **Date**: 2026-04-30

---

## 1. ApprovalStatus Enum

**Package**: `com.maintainance.service_center.user`
**File**: `user/ApprovalStatus.java`

```
PENDING_APPROVAL   Initial state for every OWNER registration
APPROVED           Admin has approved; owner can operate their center
REJECTED           Admin has rejected; owner is blocked at login
```

Null for CUSTOMER and ADMIN accounts — approval does not apply to them.

---

## 2. User Entity — Added Fields

**File**: `user/User.java` — add after the `userType` field

| Column | DB Type | Java Type | Default | Notes |
|--------|---------|-----------|---------|-------|
| `approval_status` | `VARCHAR(255)` | `ApprovalStatus` (enum) | `null` | Already exists in `_user` table. `@Enumerated(EnumType.STRING)`. Only set for OWNER accounts. |
| `rejection_reason` | `VARCHAR(500)` | `String` | `null` | **New column** — Hibernate will add it via `ddl-auto: update`. Populated only when admin rejects; null otherwise. |

Hibernate `ddl-auto: update` will bind to `approval_status` (existing) and add `rejection_reason` (new) without touching other columns.

---

## 3. UserResponse DTO

**Package**: `com.maintainance.service_center.admin`
**File**: `admin/UserResponse.java`
**Lombok**: `@Builder @Getter`

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | `Integer` | `User.id` | |
| `firstname` | `String` | `User.firstname` | |
| `lastname` | `String` | `User.lastname` | |
| `email` | `String` | `User.email` | |
| `userType` | `UserType` | `User.userType` | |
| `approvalStatus` | `ApprovalStatus` | `User.approvalStatus` | null for non-OWNER |
| `rejectionReason` | `String` | `User.rejectionReason` | null unless rejected |
| `enabled` | `boolean` | `User.enabled` | email verified |
| `createdDate` | `LocalDateTime` | `User.createdDate` | |

No password, token, or credential fields exposed.

---

## 4. AdminRejectRequest DTO

**Package**: `com.maintainance.service_center.admin`
**File**: `admin/AdminRejectRequest.java`
**Lombok**: `@Getter @NoArgsConstructor`

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `reason` | `String` | `@Size(max = 500)`, optional | Persisted to `User.rejectionReason`; not yet shown to the owner in any UI |

---

## 5. AuthenticationResponse — Updated Fields

**File**: `auth/AuthenticationResponse.java`

| Field | Type | Notes |
|-------|------|-------|
| `token` | `String` | Existing |
| `approvalStatus` | `ApprovalStatus` | **New**. Null for non-OWNER accounts. |

---

## 6. RegistrationRequest — Updated Fields

**File**: `auth/RegistrationRequest.java`

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `firstname` | `String` | existing | |
| `lastname` | `String` | existing | |
| `email` | `String` | existing | |
| `password` | `String` | existing | |
| `userType` | `UserType` | **New**, optional, no `@NotNull` | Defaults to `CUSTOMER` server-side. ADMIN and SUPER_ADMIN are silently overridden to CUSTOMER. |

---

## 7. UserRepository — New Query Methods

**File**: `user/UserRepository.java`

```java
// Used by GET /admin/users/pending
Page<User> findByUserTypeAndApprovalStatus(
    UserType userType,
    ApprovalStatus approvalStatus,
    Pageable pageable
);

// Used by GET /admin/users?type=OWNER
Page<User> findByUserType(UserType userType, Pageable pageable);
```

The general `GET /admin/users` (no type filter) uses the inherited `findAll(Pageable pageable)`.

---

## 8. AccountRejectedException

**Package**: `com.maintainance.service_center.auth`
**File**: `auth/AccountRejectedException.java`

Extends `RuntimeException`. Thrown in `AuthenticationService.authenticate()` when `user.getApprovalStatus() == ApprovalStatus.REJECTED`.

Caught by the new `@ExceptionHandler` in `GlobalExceptionHandling` → returns `403 FORBIDDEN` with `businessErrorCode = 305`.

---

## 9. BusinessErrorCodes — New Entry

**File**: `handler/BusinessErrorCodes.java`

```
ACCOUNT_REJECTED(305, HttpStatus.FORBIDDEN,
    "Account has been rejected by the platform administrator / تم رفض الحساب من قبل إدارة المنصة")
```

---

## 10. DataInitializer Seeding Logic

**File**: `config/DataInitializer.java`

**On startup, in order:**

1. If `role` table has no row with `name = "ROLE_ADMIN"` → insert it.
2. If `_user` table has no user with `ROLE_ADMIN` role → create admin user:
   - `email` from `${application.admin.email}`
   - `password` = `BCrypt(${application.admin.password})`
   - `userType = ADMIN`
   - `enabled = true`
   - `accountLocked = false`
   - `roles = [ROLE_ADMIN]`
   - `approvalStatus = null`

**application-dev.yml additions:**

```yaml
application:
  admin:
    email: admin@experience.com
    password: Admin@12345
```

---

## 11. DB State — No New Tables

This feature touches only the `_user` table (one new column already present) and the `role` table (one new row). No new tables, no foreign key additions, no join tables.
