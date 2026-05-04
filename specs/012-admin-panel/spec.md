# Feature Specification: Admin Panel — Center Owner Approval

**Feature Branch**: `012-admin-panel`
**Created**: 2026-04-30
**Status**: Draft — ready for `/speckit.plan`
**Phase**: 6.0

---

## 1. Summary

Today, a OWNER who registers on the platform has no gatekeeping between sign-up and full access. The platform needs a human approval step so that only verified, legitimate service centers appear to customers.

This feature introduces the **platform admin role**: a special internal account that can view all pending OWNER registrations and approve or reject them. Until approved, a center owner sees a "pending approval" screen and cannot operate their center. Rejected owners are blocked at login with a clear error.

The admin works entirely through the existing Swagger UI — no separate admin frontend is built in this phase.

---

## 2. Why Now

- A OWNER is stuck in `PENDING_APPROVAL` with no way for a platform admin to act through the API.
- The frontend (`pending-approval` screen, approvalStatus checks on login and session restore) is already built and waiting for backend support.
- Allowing unvetted centers to go live damages customer trust and exposes the platform to fraud.

---

## 3. Scope

### In scope

- `ApprovalStatus` enum: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`
- OWNER registrations start as `PENDING_APPROVAL`
- Login response includes `approvalStatus` for OWNER accounts
- REJECTED owners are blocked at login with a clear bilingual error
- PENDING_APPROVAL owners can log in but receive `approvalStatus=PENDING_APPROVAL` (frontend gates them)
- Admin endpoints: list pending owners, approve by ID, reject by ID (with optional reason), list all users
- Admin endpoints protected by ADMIN role — inaccessible to any other user type
- Default admin account bootstrapped from configuration on application startup
- ADMIN role seeded on startup alongside existing USER role

### Out of scope

- Email notifications to owners on approval or rejection
- Admin frontend app (Swagger UI is sufficient for this phase)
- Admin ability to create, edit, or delete centers directly
- Bulk approve/reject operations
- Audit log of admin actions
- Password reset flow for the admin account

---

## 4. Glossary

| Term | Meaning |
|------|---------|
| **Platform Admin** | Internal staff with `ADMIN` UserType and `ROLE_ADMIN` authority. Created only via application startup config — cannot self-register. |
| **OWNER** | A business owner who registered to manage a maintenance center. Requires admin approval before operating. |
| **ApprovalStatus** | The lifecycle state of a OWNER registration: `PENDING_APPROVAL` → `APPROVED` or `REJECTED`. |
| **Approval Gate** | The frontend screen shown to `PENDING_APPROVAL` owners. Enabled by returning `approvalStatus` in the login response. |

---

## User Scenarios & Testing

### User Story 1 — Admin Approves a Pending OWNER (Priority: P1)

A platform admin authenticates via Swagger UI, calls `GET /admin/users/pending` to find a waiting registration, then calls `PUT /admin/users/{id}/approve`. The center owner can now log in and reach their dashboard.

**Why this priority**: This is the core workflow the entire feature exists to deliver. Without it, OWNERs are permanently stuck.

**Independent Test**: Register a OWNER, log in as admin, approve the registration, then confirm the owner's next login succeeds with `approvalStatus=APPROVED`.

**Acceptance Scenarios**:

1. **Given** a OWNER with `approvalStatus=PENDING_APPROVAL`, **When** admin calls `PUT /admin/users/{id}/approve`, **Then** the user's `approvalStatus` becomes `APPROVED` and the full `UserResponse` is returned.
2. **Given** an already-`APPROVED` OWNER, **When** admin calls approve again, **Then** the response is `200 OK` with no change (idempotent).
3. **Given** a CUSTOMER account ID, **When** admin calls approve, **Then** the response is `400 Bad Request` — only OWNER accounts can be approved.

---

### User Story 2 — Admin Lists Pending Registrations (Priority: P1)

Admin needs to know who is waiting. Calling `GET /admin/users/pending` returns a paginated list of OWNERs with `PENDING_APPROVAL` status, ordered by registration date ascending, showing name, email, and registration date.

**Why this priority**: Required to perform approvals — the admin must find the right user ID.

**Independent Test**: Register two OWNERs, confirm both appear in pending list, approve one, confirm only the other remains.

**Acceptance Scenarios**:

1. **Given** two OWNERs with `PENDING_APPROVAL`, **When** admin calls `GET /admin/users/pending`, **Then** both appear in `content` with `approvalStatus=PENDING_APPROVAL`.
2. **Given** one OWNER is approved, **When** admin calls `GET /admin/users/pending`, **Then** only the remaining pending owner appears.
3. **Given** no pending owners, **When** admin calls `GET /admin/users/pending`, **Then** `content` is empty and `totalElements` is `0`.
4. **Given** a non-admin JWT, **When** any user calls `GET /admin/users/pending`, **Then** the response is `403 Forbidden`.

---

### User Story 3 — Admin Rejects a OWNER (Priority: P2)

Admin determines a registration is fraudulent. Calls `PUT /admin/users/{id}/reject` with an optional reason. The owner is blocked at their next login attempt with a clear bilingual error.

**Why this priority**: Approval without rejection leaves no tool to handle bad actors.

**Independent Test**: Register a OWNER, reject them, then attempt login — confirm `403 Forbidden` with the rejection error.

**Acceptance Scenarios**:

1. **Given** a `PENDING_APPROVAL` OWNER, **When** admin calls `PUT /admin/users/{id}/reject` with `{"reason": "Incomplete documents"}`, **Then** the user's `approvalStatus` becomes `REJECTED`.
2. **Given** a `REJECTED` OWNER, **When** they attempt to log in, **Then** the response is `403 Forbidden` with a bilingual error message (Arabic + English).
3. **Given** a `REJECTED` OWNER, **When** admin calls approve on the same ID, **Then** the status becomes `APPROVED` (reversal is allowed — admins can correct mistakes).

---

### User Story 4 — OWNER Login Returns approvalStatus (Priority: P1)

When a OWNER logs in, the response includes their `approvalStatus` so the frontend can route to the pending screen or the dashboard.

**Why this priority**: The frontend approval gate already exists and waits for this field. Without it, the app cannot distinguish pending from approved owners.

**Independent Test**: Register a OWNER, verify email, log in — confirm `approvalStatus=PENDING_APPROVAL` is present in the response.

**Acceptance Scenarios**:

1. **Given** a OWNER with `PENDING_APPROVAL`, **When** they log in, **Then** the response is `{"token": "...", "approvalStatus": "PENDING_APPROVAL"}`.
2. **Given** an `APPROVED` OWNER, **When** they log in, **Then** the response is `{"token": "...", "approvalStatus": "APPROVED"}`.
3. **Given** a CUSTOMER account, **When** they log in, **Then** `approvalStatus` is `null` in the response.

---

### User Story 5 — Default Admin Account Available on First Startup (Priority: P1)

On application startup, if no ADMIN user exists, one is created from configuration. The admin can immediately log in without any manual DB intervention.

**Why this priority**: Without this, the admin feature is unusable in a fresh environment.

**Independent Test**: Start the application against a clean database and confirm admin login works immediately.

**Acceptance Scenarios**:

1. **Given** a fresh database with no users, **When** the application starts, **Then** an ADMIN user exists with the configured email and correctly hashed password.
2. **Given** the admin user already exists, **When** the application restarts, **Then** no duplicate is created (idempotent).
3. **Given** the admin account, **When** the admin logs in, **Then** a valid JWT is returned.

---

### User Story 6 — Admin Lists All Users with Filtering (Priority: P3)

Admin calls `GET /admin/users?type=OWNER` to see all center owners regardless of approval status, or omits the filter for all user types.

**Why this priority**: Useful for operations but not required for the core approval workflow.

**Independent Test**: Create users of different types and confirm type filtering returns only the requested type.

**Acceptance Scenarios**:

1. **Given** users of types CUSTOMER and OWNER, **When** admin calls `GET /admin/users?type=OWNER`, **Then** only OWNER accounts appear.
2. **Given** no `type` filter, **When** admin calls `GET /admin/users`, **Then** all user types are returned paginated.

---

### Edge Cases

- What if a OWNER verifies their email but has not been approved — can they use the customer app? Yes — email verification and approval are independent. The approval gate only applies to the center owner app.
- What if the admin approves an owner whose email is not yet verified? The owner's account is still `enabled=false` — they cannot log in regardless of approval status.
- What if two admins approve/reject the same owner simultaneously? Last write wins; the operation is idempotent so no data corruption occurs.
- What if someone registers with `userType=ADMIN` via the public endpoint? The endpoint silently overrides this to `CUSTOMER` — `ADMIN` accounts cannot be self-registered.
- What if approval is called on a non-existent user ID? Response is `404 Not Found` with a clear error.

---

## Requirements

### Functional Requirements

- **FR-001** The system MUST define `ApprovalStatus` with exactly three values: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`.
- **FR-002** The system MUST store an `approvalStatus` on every user record. For OWNER accounts it defaults to `PENDING_APPROVAL` at registration. For all other user types it is `null`.
- **FR-003** The public registration endpoint MUST accept an optional `userType` field. When `userType=OWNER`, the new account receives `approvalStatus=PENDING_APPROVAL`. Any attempt to register as `ADMIN` or `SUPER_ADMIN` MUST be silently overridden to `CUSTOMER`.
- **FR-004** The login response MUST include `approvalStatus` alongside the JWT token. For non-OWNER accounts the field is `null`.
- **FR-005** The system MUST block `REJECTED` OWNER accounts at login with a `403 Forbidden` response containing a bilingual error message (Arabic + English).
- **FR-006** `PENDING_APPROVAL` OWNER accounts MUST be allowed to log in and receive a valid JWT; the frontend is responsible for routing them to the pending-approval screen.
- **FR-007** The system MUST expose `GET /admin/users/pending` returning a paginated list of OWNER users with `approvalStatus=PENDING_APPROVAL`, ordered by registration date ascending.
- **FR-008** The system MUST expose `PUT /admin/users/{id}/approve` setting the target OWNER's `approvalStatus` to `APPROVED`. The operation MUST be idempotent.
- **FR-009** The system MUST expose `PUT /admin/users/{id}/reject` accepting an optional `reason` string (max 500 characters) and setting `approvalStatus` to `REJECTED`. The operation MUST be idempotent.
- **FR-010** The system MUST expose `GET /admin/users` returning a paginated list of all users, filterable by optional `type` query parameter (maps to `UserType`).
- **FR-011** All `/admin/**` endpoints MUST require `ROLE_ADMIN`. Any request without a valid ADMIN JWT MUST receive `403 Forbidden`.
- **FR-012** On application startup, if no user with `ROLE_ADMIN` exists, the system MUST create one using credentials from application configuration. The seeder MUST be idempotent.
- **FR-013** Admin passwords MUST be stored as BCrypt hashes. Plain-text passwords MUST never be persisted or logged.
- **FR-014** The `UserResponse` DTO returned by admin endpoints MUST include at minimum: `id`, `firstname`, `lastname`, `email`, `userType`, `approvalStatus`, `enabled`, `createdDate`.
- **FR-015** `PUT /admin/users/{id}/approve` and `PUT /admin/users/{id}/reject` MUST return `400 Bad Request` if the target user's `userType` is not `OWNER`.
- **FR-016** `PUT /admin/users/{id}/approve` and `PUT /admin/users/{id}/reject` MUST return `404 Not Found` if no user with the given ID exists.

### Key Entities

- **ApprovalStatus** — Enum lifecycle for OWNER onboarding: `PENDING_APPROVAL` (initial), `APPROVED` (can operate), `REJECTED` (blocked at login). `null` for all other user types.
- **UserResponse (admin DTO)** — Read-only projection of a user account for admin consumption. Contains no password, token, or credential fields.
- **AdminRejectRequest** — Request body for the reject endpoint. One optional field: `reason` (plain text, max 500 chars).

---

## Success Criteria

### Measurable Outcomes

- **SC-001** A platform admin can find and approve a pending OWNER in under 3 API calls via Swagger UI.
- **SC-002** An approved OWNER gains full access on their next login — zero additional manual steps required.
- **SC-003** A rejected OWNER receives a clear, bilingual login error within 1 second of their login attempt.
- **SC-004** Zero CUSTOMER accounts are affected by the approval flow — their login response and access are unchanged.
- **SC-005** The default admin account is available within 10 seconds of first application startup against a clean database — no manual DB intervention required.
- **SC-006** All admin endpoints return `403 Forbidden` to any non-ADMIN JWT — confirmed by a targeted security test against each endpoint.

---

## Assumptions

- Swagger UI is the admin's interface for this phase — no custom admin web app is built.
- Admin credentials (email + plain-text password for config only) are stored in `application-dev.yml` under `application.admin.*` and are never committed in plain text to a public repository in production.
- The `approval_status` column already exists in the `_user` DB table (manually added). Hibernate `ddl-auto: update` will bind to it without recreating it.
- Email notification to the OWNER on approval or rejection is out of scope for this phase.
- A OWNER must verify their email (OTP flow) before they can log in — email verification and approval are two independent gates.
- The existing `@EnableMethodSecurity(securedEnabled = true)` infrastructure is sufficient for `ROLE_ADMIN` enforcement without changes to the JWT filter.
- Approval status reversal (re-approving a rejected owner) is allowed — admins can correct mistakes.

---

## Dependencies

- The frontend pending-approval screen and approval-status routing in `(app)/_layout.tsx` are already implemented and waiting for this backend.
- The existing `BusinessErrorCodes` enum and `GlobalExceptionHandling` will be extended for the new rejection error code.
- `ddl-auto: update` is active — adding `approvalStatus` to the `User` entity will bind to the existing column.

---

## Next Steps

1. Run `/speckit.plan` — output `plan.md` with concrete backend decisions: files changed, new files, security config details, seeder logic, error codes, and response field shapes.
2. Run `/speckit.tasks` — break into ordered implementation units.
3. Run `/speckit.implement` to execute.
