# Research: Admin Panel — Center Owner Approval

**Branch**: `012-admin-panel` | **Date**: 2026-04-30

---

## Decision 1 — ApprovalStatus field placement

**Decision**: Add `approvalStatus` as a field on the `User` entity (not on `MaintenanceCenter`).

**Rationale**: The approval gate applies to the person registering, not to a center they might create later. A CENTER_OWNER is approved as a user before they can set up any center. Keeping it on `User` also allows `AuthenticationService` to read it during login without any joins.

**Alternatives considered**:
- Field on `MaintenanceCenter` — rejected: center may not exist yet at approval time; registration precedes center creation.
- Separate `OwnerApproval` table — rejected: unnecessary for a simple three-state enum; adds a join to every login check.

---

## Decision 2 — REJECTED login blocking mechanism

**Decision**: After Spring Security's `authenticationManager.authenticate()` succeeds, explicitly check `user.getApprovalStatus() == REJECTED` and throw a custom `AccountRejectedException`. Add a dedicated `@ExceptionHandler` in `GlobalExceptionHandling` returning `403 FORBIDDEN` with a bilingual message.

**Rationale**: Spring Security's standard exception hierarchy (`LockedException`, `DisabledException`) carries different semantic meaning and already maps to `ACCOUNT_LOCKED` / `ACCOUNT_DISABLED` codes. Reusing them would produce misleading error codes. A custom exception keeps the mapping explicit and bilingual.

**Alternatives considered**:
- Set `accountLocked = true` on rejection → rejected: pollutes the `accountLocked` field whose meaning is auth-level locking, not business-level rejection. Also resets if admin flips it.
- Throw `LockedException` with a REJECTED message → rejected: `GlobalExceptionHandling` maps `LockedException` to `ACCOUNT_LOCKED` (code 302); the frontend would receive an incorrect business code.

**New error code**: `ACCOUNT_REJECTED = 305, HttpStatus.FORBIDDEN, "Account has been rejected / تم رفض الحساب"`

---

## Decision 3 — ADMIN role naming convention

**Decision**: Name the ADMIN role `"ROLE_ADMIN"` (not `"ADMIN"`).

**Rationale**: Spring Security's `hasRole("ADMIN")` in `SecurityConfig` automatically prepends `"ROLE_"`, so the stored role name must be `"ROLE_ADMIN"` for the expression to match. The existing `"USER"` role does not follow this convention (it should be `"ROLE_USER"`) but renaming it is out of scope and would break existing sessions. New roles will follow the correct convention.

**Alternatives considered**:
- Name role `"ADMIN"` and use `.hasAuthority("ADMIN")` in SecurityConfig → technically correct but inconsistent with how Spring Security is typically used and documented.

---

## Decision 4 — Admin user seeding location

**Decision**: Create a dedicated `@Component DataInitializer implements CommandLineRunner` in the `config/` package. It seeds both the `ROLE_ADMIN` role and the default admin user. `ServiceCenterApplication`'s existing `CommandLineRunner` bean continues to seed `USER` role only.

**Rationale**: Following Single Responsibility Principle — `ServiceCenterApplication` is the bootstrap entry point; domain-level seeding belongs in a dedicated component. The `DataInitializer` can inject `UserRepository`, `RoleRepository`, and `PasswordEncoder` cleanly via `@RequiredArgsConstructor`.

**Alternatives considered**:
- Add admin seeding to the existing `CommandLineRunner` in `ServiceCenterApplication` → rejected: that bean only has `RoleRepository` injected; adding more dependencies to the main application class is messy.
- Liquibase/Flyway migration — rejected: overkill for a single seed row; `ddl-auto: update` is already the strategy.

---

## Decision 5 — SecurityConfig URL authorization vs method-level

**Decision**: Use URL-pattern authorization in `SecurityConfig` (`.requestMatchers("/admin/**").hasRole("ADMIN")`) as the primary guard. Do **not** add `@Secured` at the controller level — single enforcement point is cleaner.

**Rationale**: URL-based authorization in `SecurityConfig` is evaluated by the servlet filter chain before the request reaches the controller. It provides a clear, centralized view of what is protected. Method-level `@Secured` adds a second layer which is redundant when the URL pattern is precise.

**Alternatives considered**:
- `@Secured("ROLE_ADMIN")` on each controller method only → rejected: requires remembering to add it to every new admin endpoint; the SecurityConfig approach protects all `/admin/**` routes by default.

---

## Decision 6 — UserResponse DTO placement

**Decision**: Place `UserResponse` in the `admin/` package. The `UserController` (for `GET /users/me`) imports it from there.

**Rationale**: `UserResponse` is primarily an admin concern — it exposes user account fields that regular endpoints don't expose. Placing it in `admin/` makes the visibility explicit. The `user/` package remains focused on the JPA entity and its supporting classes.

**Alternatives considered**:
- Place in `user/` package → less clear ownership; could encourage misuse by other controllers.

---

## Decision 7 — GET /users/me inclusion

**Decision**: Build `UserController` with `GET /users/me` as part of this feature.

**Rationale**: The frontend already calls this endpoint on session restore to re-check `approvalStatus`. Without it the approval gate breaks on app relaunch. It's a one-method controller using the same `UserResponse` DTO already being built. The spec's FR-004 (approvalStatus in login response) is incomplete without this endpoint for the frontend to re-verify.

---

## Decision 8 — approvalStatus in AuthenticationResponse for non-CENTER_OWNER

**Decision**: Return `approvalStatus = null` for CUSTOMER and ADMIN logins. The field is included in the response object but is `null` for non-CENTER_OWNER accounts.

**Rationale**: The frontend only acts on `approvalStatus` for CENTER_OWNER flows. Returning `null` for other types is simpler than a separate response shape. The frontend already guards this with `if (approvalStatus === 'PENDING_APPROVAL')`.

---

## Decision 9 — Rejection reversal

**Decision**: Allow an admin to approve a previously REJECTED owner (reversal). The `PUT /admin/users/{id}/approve` endpoint sets `approvalStatus = APPROVED` regardless of the prior state.

**Rationale**: Admins make mistakes. Forcing a re-registration for a mis-rejected owner is a bad user experience. Reversal is simple to implement (just set the field) and low risk.

---

## Summary of new files and changes

| Type | File | Change |
|------|------|--------|
| NEW | `user/ApprovalStatus.java` | Enum: PENDING_APPROVAL, APPROVED, REJECTED |
| NEW | `admin/AdminController.java` | 4 endpoints |
| NEW | `admin/AdminService.java` | Business logic |
| NEW | `admin/UserResponse.java` | Response DTO |
| NEW | `admin/AdminRejectRequest.java` | Request DTO |
| NEW | `user/UserController.java` | GET /users/me |
| NEW | `config/DataInitializer.java` | Seeds ROLE_ADMIN + admin user |
| NEW | `auth/AccountRejectedException.java` | Custom exception |
| MODIFY | `user/User.java` | Add approvalStatus field |
| MODIFY | `user/UserRepository.java` | Add 2 query methods |
| MODIFY | `auth/RegistrationRequest.java` | Add optional userType field |
| MODIFY | `auth/AuthenticationResponse.java` | Add approvalStatus field |
| MODIFY | `auth/AuthenticationService.java` | Register + authenticate logic |
| MODIFY | `handler/BusinessErrorCodes.java` | Add ACCOUNT_REJECTED (305) |
| MODIFY | `handler/GlobalExceptionHandling.java` | Handle AccountRejectedException |
| MODIFY | `security/SecurityConfig.java` | Protect /admin/** |
| MODIFY | `application-dev.yml` | Add application.admin.* config |
