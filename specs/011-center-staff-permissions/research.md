# Research: Center Staff & Permissions

**Branch**: `011-center-staff-permissions` | **Date**: 2026-04-27

---

## 1. Membership Cache Strategy (NFR-001, NFR-003)

**Decision**: Caffeine in-process cache, 60-second `expireAfterWrite` TTL, keyed by `userId:centerId`.

**Rationale**: The 60-second TTL directly satisfies NFR-003 (access denied within 60s of removal). Caffeine is the default Spring Boot Cache provider for in-process caching, requiring only `spring-boot-starter-cache` + `com.github.ben-manes.caffeine:caffeine` on the classpath — no Redis, no extra infrastructure. A `CacheEvict` call on removal/suspension provides immediate-ish eviction for the acting request; the natural TTL is the backstop for other sessions. The `maximumSize=10000` cap prevents unbounded memory growth (10k active staff sessions is far above any realistic load in the Kuwait market).

**Alternatives considered**:
- Redis cache: overkill for 60s TTL, adds infra dependency. Rejected.
- JWT revocation list (DB table): adds a DB read to every authenticated request. Rejected.
- No cache (DB read every request): satisfies correctness but violates NFR-001 (≤50ms p95 budget). Rejected.

---

## 2. Invitation Token Generation & Storage (NFR-002)

**Decision**: Generate 32 bytes from `SecureRandom`, Base64URL-encode → the raw token sent to the user. Store only the SHA-256 hex digest (64 chars) in `staff_invitation.token_hash`. Lookup is `SELECT … WHERE token_hash = SHA256(submittedToken)`.

**Rationale**: This is the standard pattern used in the existing `Token` entity (OTP email verification). Consistent with existing infrastructure. Single-use enforcement: once `redeemed_at` is set, any further attempt returns 410 Gone. Tokens are opaque to the server — even a DB read of `token_hash` cannot reconstruct the raw token.

**Alternatives considered**:
- UUID v4: not cryptographically sufficient — only 122 bits of entropy vs. 256 bits here. Rejected.
- Store raw token encrypted: more complex, same security outcome. Rejected.

---

## 3. Invitation Deep Link Format

**Decision**: Universal/App link using Expo's `expo-linking` module. Format: `maintenancecenter://invite?token=<base64url-token>`. For web fallback: `https://[api-domain]/invite?token=<token>` redirects to the app store or handles in-browser.

**Rationale**: The existing app already uses Expo Router. `expo-linking` with a custom scheme is the standard approach for invitation deep links in Expo managed workflow. The token is passed as a query param and handled by a new `app/(app)/accept-invite.tsx` screen that reads it via `useLocalSearchParams`.

**Alternatives considered**:
- QR code only: not suitable for email delivery. Rejected.
- App store redirect links: still need to pass the token through — custom scheme is necessary regardless. Accepted as the primary mechanism.

---

## 4. Center Selector API — Unified Membership Endpoint

**Decision**: Add `GET /users/me/memberships` returning all `ACTIVE` memberships for the authenticated user, each containing `centerId`, `centerNameAr`, `centerNameEn`, `centerLogoUrl`, `role`, `status`. This replaces the existing `GET /centers/my` as the data source for the center selector in `branch-select.tsx`.

**Rationale**: Research confirmed `branch-select.tsx` currently uses `useGetMyCentersQuery()` which hits `GET /centers/my` — an ownership-based query that won't return centers where the user is a staff member (not owner). The new endpoint covers all cases: OWNER (via their OWNER membership), CUSTOMER with staff memberships, and both simultaneously. The existing `GET /centers/my` is preserved for the profile editor (which is owner-scoped).

**Alternatives considered**:
- Augmenting `GET /centers/my` to also return staff memberships: breaks the endpoint's ownership semantics and complicates the response type. Rejected.
- Two separate calls merged client-side: adds waterfall, complicates the selector. Rejected.

---

## 5. CenterSlice Extension Strategy

**Decision**: Extend `store/centerSlice.ts` to store `{ activeCenterId, activeUserRole, activePermissions[] }`. On center selection, dispatch `setActiveCenter({ centerId, role, permissions })`. The `PermissionGate` component reads `activePermissions` from Redux to show/hide UI elements.

**Rationale**: Research confirmed `centerSlice.ts` currently stores only `activeCenterId`. Storing the role and flat permissions array in Redux avoids prop-drilling through all screens. The `PermissionGate` component pattern (wraps children, renders null if permission missing) is idiomatic React and keeps permission checks declarative.

**Alternatives considered**:
- Re-fetch permissions on every screen from the API: adds latency, server load, and complexity. Rejected.
- Store only the role and derive permissions in selectors: clean but requires the role→permissions mapping on the frontend. Acceptable as an alternative but storing the flat array is simpler and avoids duplicating the server-side mapping.

---

## 6. Audit Column Strategy (FR-022, NFR-004)

**Decision**: Add `acting_user_id BIGINT` and `acting_role VARCHAR(30)` directly to the `booking` table (for status/stage change history) and ensure `messages.sender_user_id` already satisfies attribution for chat. A lightweight `booking_status_history` side-table is added to store the full audit trail per booking (each status/stage change = one row with user, role, timestamp, old_status, new_status, notes).

**Rationale**: Adding columns directly to `booking` for "current acting user" is insufficient for full audit history (a booking changes status multiple times). A side table `booking_status_history` gives an immutable log (NFR-004: rows are insert-only, never updated). Chat messages already have `sender_user_id`. Reviews already link to the center user via the existing join. Work progress entries already record the creator.

**Alternatives considered**:
- Single `audit_log` table for all entities: flexible but harder to query for booking-specific history. Rejected in favor of domain-specific history table.
- JPA `@EntityListeners` + Spring Data Auditing: handles `createdBy` via Spring Security context but only stores the most recent actor, not history. Insufficient. Rejected.

---

## 7. Flyway Migration Order (Scenario 5.10 — Existing Owner Migration)

**Decision**: Run migrations in this order before code deployment:
1. `V011_1__create_center_membership.sql` — create table + unique partial index
2. `V011_2__create_staff_invitation.sql` — create table + token_hash index
3. `V011_3__backfill_owner_memberships.sql` — INSERT OWNER memberships for all `APPROVED` OWNER users
4. `V011_4__add_booking_status_history.sql` — create audit side-table
5. Code deployment (new Spring Boot version)

**Rationale**: Migrations-first deployment ensures that when the new code starts checking `center_membership`, all existing owners already have OWNER rows. The backfill query is idempotent (uses `INSERT … WHERE NOT EXISTS`). No downtime window required — migrations run automatically on startup before the application context starts serving traffic.

**Alternatives considered**:
- Code-first with fallback shim: if no membership found but user owns the center, treat as OWNER. More complex, leaves a gap. Rejected.
- Manual backfill script: error-prone, can't be rolled back cleanly. Rejected.
