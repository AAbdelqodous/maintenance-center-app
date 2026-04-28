# Feature Specification: Center Staff & Permissions

**Feature Branch:** `001-center-staff-permissions`
**Status:** Clarified — ready for `/speckit.plan`
**Created:** 2026-04-27
**Phase:** `specify` (next: `clarify` → `plan` → `tasks` → `implement`)

> **Spec Kit reminder:** This document describes **WHAT** the system must do and **WHY**, not **HOW**. Implementation details (tables, endpoints, frameworks, code structure) belong in the `plan.md` produced after `/clarify`. All `[NEEDS CLARIFICATION]` markers must be resolved before progressing.

## Clarifications

### Session 2026-04-27

- Q: Session invalidation strategy when a staff member is removed (NFR-003) → A: 60-second membership-status cache per (user, center) pair. Removal sets status to REMOVED; cache TTL expires within 60s; next center-scoped request is denied. No JWT revocation list required.
- Q: Self-leave by staff (FR-031) → A: Supported in v1 for all active staff members regardless of role. Sets status to REMOVED; notifies Owner and all Branch Managers.
- Q: Receptionist pricing visibility (FR-010) → A: Read-only access to the center's published service price list (CenterServicePricing). No access to booking-specific quotes, invoice amounts, or payment totals. Added as VIEW_PRICE_LIST permission.
- Q: Maximum staff per center → A: Hard cap at 50 active + invited members per center. API rejects invitations that would exceed the limit with a bilingual error. Limit is externally configurable. Added as NFR-007.
- Q: Invitation delivery channels (FR-017) → A: Email always; push notification also sent if invitee has an existing platform account with a registered FCM token. Push failure does not block the invitation flow.

---

## 1. Summary

Today, every maintenance center on the platform is operated by exactly one person — the registered `CENTER_OWNER`. In reality, real centers in Kuwait and the GCC are run by teams: an owner, one or more branch managers, technicians on the floor, a receptionist taking calls, sometimes a part-time accountant.

This feature introduces **center staff**: the ability for a center owner to invite other people to help run their center(s) under specific, restricted roles. Each staff member sees only what their role allows, takes only the actions their role permits, and the owner retains full control of who is on the team.

The feature does **not** introduce a new app or a new login model. Staff use the same `maintenance-center-app` they already would, signed in with their normal account, with the UI and API filtering capabilities by their role at each center.

## 2. Why now

- Multiple early center owners have asked for "a way to give my front desk girl access without giving her my password."
- The platform's value proposition (transparent, traceable service) requires knowing **who** updated a booking, **who** replied to a customer, **who** marked work complete. A single shared owner login destroys that audit trail.
- Without delegated access, owners with multiple branches cannot scale operationally — they become a manual bottleneck for every booking confirmation.
- Future features in the roadmap (Phase 4.0 work-progress tracking, Phase 6.0 fleet B2B) all assume an audit trail of "who did this." Building staff now keeps those features honest.

## 3. Scope

### In scope

- Inviting a person (by email) to join a specific center as staff with a specific role.
- Five starting roles: **Owner, Branch Manager, Receptionist, Technician, Accountant**.
- Each role grants a fixed set of permissions; permissions are checked on every center-scoped action.
- The invited person accepting or declining the invitation.
- The owner viewing, suspending, removing, or changing the role of any staff member.
- A staff member belonging to multiple centers (and seeing a center selector after login).
- Audit trail: every booking, review reply, work-stage update, and chat message is attributed to the specific staff user who performed it.
- Bilingual UX: all role labels, invitation emails, in-app notifications, and error messages must exist in Arabic and English.

### Out of scope (explicitly deferred)

- **Fleet / B2B membership** (already planned in roadmap Phase 6.0 with its own `company_users` model). Will reuse lessons from this feature but is a separate spec.
- **Restaurant / hotel staff** for future verticals — same reasoning, defer until the second vertical actually exists.
- **Time tracking, shift management, attendance, payroll, commission** — not a workforce tool.
- **Workshop bay assignment / queue optimization** — separate operational tooling.
- **Cross-center reporting for staff** — a staff member working at two centers does not see consolidated stats across them.
- **Custom / configurable roles** per center — the five roles are platform-wide and fixed in this iteration. May open up later.
- **Per-permission UI for owners** — owners pick a role, not individual permissions.
- **Customers inviting other customers** (e.g., shared family accounts) — separate concern.

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **User** | A registered platform account, identified by email. |
| **UserType** | The persona chosen at registration. Existing values: `CUSTOMER`, `CENTER_OWNER`. New: `ADMIN` (created internally only). Set once, effectively immutable. |
| **Center** | A `MaintenanceCenter` — a single physical branch. |
| **Owner** | The user whose `id` appears in `MaintenanceCenter.owner_id`. There is exactly one Owner per center. The Owner is also automatically a member with the `OWNER` role. |
| **Membership** | A relationship linking one User to one Center with one Role and a status. A user can have many memberships across many centers. |
| **Role (center role)** | The named template granting a fixed set of permissions: `OWNER`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `ACCOUNTANT`. |
| **Permission** | A single named capability (e.g., `MANAGE_BOOKINGS`). Granted via role. Checked at the action site. |
| **Invitation** | A pending offer sent by an Owner or Branch Manager to an email address, valid for a limited time, redeemable once. |
| **Center selector** | The UI shown after login to a user with memberships in more than one center, letting them pick the active center for the session. |

## 5. User scenarios & testing

Each scenario is written as a Given / When / Then to be directly turnable into acceptance tests in the `tasks` phase.

### 5.1 Owner invites a new technician (happy path)

- **Given** a CENTER_OWNER, Ahmed, signed into the center owner app with an active center selected
- **When** Ahmed opens the Staff screen and submits an invite for `mohammed@example.com` with role `TECHNICIAN`
- **Then** an invitation email is sent in the recipient's preferred language (defaulting to Arabic)
- **And** the staff list shows Mohammed with status `INVITED` and role `TECHNICIAN`
- **And** Mohammed receives an email containing a deep link to accept the invitation

### 5.2 Invitee accepts and is already a customer

- **Given** Mohammed already has a `CUSTOMER` account on the platform
- **When** he opens the invitation link and confirms acceptance while signed in
- **Then** a membership row is created linking his existing user to the center with role `TECHNICIAN` and status `ACTIVE`
- **And** his UserType remains `CUSTOMER` — it is not changed
- **And** the next time he opens the center owner app, his account is recognized as having a center membership and he is allowed in

### 5.3 Invitee accepts but has no account

- **Given** the invited email belongs to no existing user
- **When** the invitee opens the link
- **Then** they are guided to create a regular `CUSTOMER` account using the same email
- **And** the email used for the invitation must match the email used at signup
- **And** upon successful signup + email OTP verification, the membership is auto-activated

### 5.4 Technician sees only assigned bookings

- **Given** Mohammed is `ACTIVE` as a `TECHNICIAN` at center #5
- **And** the center has 12 open bookings, 3 of which are assigned to Mohammed
- **When** Mohammed opens the bookings list
- **Then** he sees only the 3 bookings assigned to him
- **And** the bookings list does not show booking financials (`final_amount`, `quoted_amount`)
- **And** he cannot open the chat thread of bookings he is not assigned to

### 5.5 Receptionist responds to a customer chat

- **Given** Layla is `ACTIVE` as a `RECEPTIONIST` at center #5
- **When** a customer sends a chat message to the center
- **Then** Layla receives a notification and can reply
- **And** the chat message is recorded with `sender_user_id = Layla.id`, not the owner's id
- **And** the customer sees the center name as the sender, not Layla's personal name

### 5.6 Accountant cannot change a booking

- **Given** Yousef is `ACTIVE` as an `ACCOUNTANT` at center #5
- **When** Yousef opens any booking
- **Then** he sees revenue and payment fields
- **And** any action button that would change booking state (Confirm, Reject, Update Stage, Cancel, Reply to Review) is either hidden or returns a permission-denied error if attempted

### 5.7 Owner removes a staff member

- **Given** Ahmed is the OWNER of center #5
- **And** Mohammed is an `ACTIVE` `TECHNICIAN` there with 2 open bookings assigned to him
- **When** Ahmed removes Mohammed from the staff
- **Then** Mohammed's membership status becomes `REMOVED`
- **And** Mohammed loses access to center #5 immediately, even mid-session
- **And** the 2 bookings previously assigned to Mohammed appear in the unassigned queue for the Branch Manager to reassign
- **And** Mohammed's prior actions (chat messages, work updates) remain attributed to him in the audit trail

### 5.8 Branch manager invites without owner involvement

- **Given** Sara is an `ACTIVE` `BRANCH_MANAGER` at center #5
- **When** Sara invites a new `TECHNICIAN`
- **Then** the invitation succeeds — Branch Managers can invite Technicians and Receptionists
- **But** when Sara attempts to invite another `BRANCH_MANAGER`, she is denied
- **And** when Sara attempts to invite an `OWNER`, she is denied
- **(Branch Managers cannot invite peers or superiors.)**

### 5.9 Same person works at two centers

- **Given** Mohammed is `TECHNICIAN` at center #5 and `RECEPTIONIST` at center #9 (a different owner's center)
- **When** Mohammed signs into the center owner app
- **Then** he sees a center selector with both centers listed, each labeled with his role there
- **And** picking center #5 grants him only Technician permissions for that session
- **And** picking center #9 grants him only Receptionist permissions for that session

### 5.10 Existing CENTER_OWNER migration

- **Given** an existing `APPROVED` CENTER_OWNER who currently owns one or more centers
- **When** this feature is deployed
- **Then** for every center they own, an `ACTIVE` membership row is created automatically with role `OWNER`
- **And** the user notices no behavioural change — they see exactly what they saw before
- **And** existing audit data (their past bookings, replies, etc.) remains correctly attributed to them

### 5.11 Invitation expires

- **Given** an invitation was sent to `karim@example.com` 8 days ago
- **And** the invitation expiry is 7 days `[NEEDS CLARIFICATION: confirm 7 days as expiry policy]`
- **When** Karim opens the link today
- **Then** he sees an "invitation expired" screen
- **And** the membership remains in status `INVITATION_EXPIRED`
- **And** the inviting Owner sees the expired status in the staff list and can re-send

### 5.12 Owner cannot remove themselves

- **Given** Ahmed is the sole `OWNER` of center #5
- **When** Ahmed attempts to remove himself or change his own role
- **Then** the action is denied with a clear bilingual error: "Owners cannot remove themselves. Transfer ownership first."
- **(Ownership transfer is a separate flow — see §10 open questions.)**

### 5.13 Owner suspends a staff member temporarily

- **Given** Sara is an `ACTIVE` `BRANCH_MANAGER`
- **When** the Owner suspends her membership
- **Then** her status becomes `SUSPENDED`
- **And** she can still log in to the platform (CUSTOMER capabilities remain) but loses all center-scoped permissions until re-activated
- **And** her assigned bookings are not auto-reassigned (suspension is reversible)

## 6. Functional requirements

Each requirement is testable. IDs are stable and referenced by future task documents.

### Identity & membership

- **FR-001** The system MUST support exactly three values of UserType: `CUSTOMER`, `CENTER_OWNER`, `ADMIN`.
- **FR-002** The system MUST allow a single User to hold zero or more memberships across centers, simultaneously.
- **FR-003** Each membership MUST link exactly one User to exactly one Center with exactly one Role and one Status.
- **FR-004** Membership Status MUST be one of: `INVITED`, `INVITATION_EXPIRED`, `INVITATION_DECLINED`, `ACTIVE`, `SUSPENDED`, `REMOVED`.
- **FR-005** A User MUST NOT have more than one membership row per (User, Center) pair in `ACTIVE` or `SUSPENDED` status. Historical `REMOVED` rows are retained for audit.
- **FR-006** Every Center MUST have exactly one membership with role `OWNER` in status `ACTIVE` at all times.

### Roles & permissions

- **FR-007** The system MUST recognize exactly five center roles: `OWNER`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `ACCOUNTANT`.
- **FR-008** Each role MUST grant a fixed, code-defined set of permissions. The mapping is platform-wide and cannot be customized per center in this iteration.
- **FR-009** The system MUST evaluate permission *per action*, against the user's membership in the center being acted upon. A user's role at center A MUST NOT grant any access to center B.
- **FR-010** The default permission grant per role MUST be at least:
  - `OWNER`: every permission listed below.
  - `BRANCH_MANAGER`: `MANAGE_BOOKINGS`, `ASSIGN_TECHNICIAN`, `MANAGE_CHAT`, `RESPOND_REVIEWS`, `EDIT_CENTER_PROFILE`, `MANAGE_NON_MANAGER_STAFF`, `VIEW_REVENUE`, `VIEW_REPORTS`.
  - `RECEPTIONIST`: `MANAGE_BOOKINGS`, `MANAGE_CHAT`, `VIEW_CALENDAR`, `VIEW_BOOKING_BASIC` (no booking financials — no invoice amounts, quoted totals, or payment data), `VIEW_PRICE_LIST` (read-only access to the center's published service price ranges from Phase 3.5 `CenterServicePricing`; does NOT include booking-specific quotes or invoices).
  - `TECHNICIAN`: `VIEW_ASSIGNED_BOOKINGS`, `UPDATE_WORK_STAGE`, `UPLOAD_PROGRESS_MEDIA`.
  - `ACCOUNTANT`: `VIEW_REVENUE`, `VIEW_BOOKINGS_READONLY`, `GENERATE_REPORTS`.
- **FR-011** `MANAGE_NON_MANAGER_STAFF` MUST allow inviting, suspending, and removing only Technicians and Receptionists. It MUST NOT allow acting on Branch Managers, Accountants, or Owners.
- **FR-012** `MANAGE_BOOKINGS` MUST allow accepting, rejecting, rescheduling, and cancelling bookings, but MUST NOT allow updating the work stage. `UPDATE_WORK_STAGE` is the technician-side counterpart.
- **FR-013** Every controller / service action that touches a center MUST authorize against the caller's membership permission for that center. There MUST NOT be center-scoped actions that rely solely on the JWT role.

### Invitations

- **FR-014** Only users with permission to invite (Owners, Branch Managers within their scope) MAY create an invitation.
- **FR-015** An invitation MUST include: target email, target center, target role, expiry timestamp, single-use redemption token, and inviter user id.
- **FR-016** An invitation MUST default to expiring after a configurable number of days `[NEEDS CLARIFICATION: 7 days proposed]`.
- **FR-017** An invitation MUST be delivered via email (always) in the platform's primary language (Arabic) by default with English fallback; the link MUST deep-link into the appropriate app. In addition, if the invitee's email matches an existing platform user who has a registered FCM token, a push notification MUST also be sent. The push notification is supplementary — failure to deliver it MUST NOT block or fail the invitation flow.
- **FR-018** When the invitee opens the link, the system MUST handle three cases: existing matching account, no account yet, or signed-in account with different email.
- **FR-019** Accepting an invitation MUST atomically: mark the invitation redeemed, create or update the membership row to `ACTIVE`, and notify the inviter.
- **FR-020** Declining an invitation MUST mark the invitation declined and notify the inviter.
- **FR-021** An expired or declined invitation MUST be re-sendable by the inviter, generating a fresh token.

### Audit & attribution

- **FR-022** Every state-changing action against a center (booking status change, work stage update, review reply, chat message sent, profile edit, staff change) MUST record the acting user's id, role at the time of action, and a server timestamp.
- **FR-023** When a customer views a center-side message or reply, the customer MUST see only the center's name and avatar, NOT the staff member's personal identity. Internal audit data is not customer-facing.
- **FR-024** When a staff member is removed, all their historical actions MUST remain attributed to them. No re-attribution to the owner.

### Multi-center experience

- **FR-025** A user with two or more `ACTIVE` memberships MUST see a center selector immediately after login.
- **FR-026** The selected center MUST persist for the session and be the implicit context for all `/my/*` endpoints currently in use.
- **FR-027** A user with exactly one `ACTIVE` membership MUST skip the selector and proceed directly to the dashboard.
- **FR-028** A user with zero `ACTIVE` memberships and `UserType = CUSTOMER` who reaches the center owner app MUST be shown an explanatory screen and a link back to the customer app.

### Lifecycle & transitions

- **FR-029** An Owner MAY suspend any staff member except themselves; a Branch Manager MAY suspend only Technicians and Receptionists.
- **FR-030** An Owner MAY remove any staff member except themselves; a Branch Manager MAY remove only Technicians and Receptionists.
- **FR-031** Any active staff member MAY voluntarily leave a center without owner or manager involvement. Leaving sets their membership status to `REMOVED` and MUST trigger a notification to the Owner and all active Branch Managers of that center. The app MUST expose a "Leave center" action to active staff members.
- **FR-032** Removing or suspending a Technician with open assigned bookings MUST trigger reassignment-needed notifications to all Branch Managers and the Owner. Bookings MUST appear in an unassigned queue.
- **FR-033** When a Center is deactivated or deleted, all memberships for that center MUST be set to `REMOVED` and all pending invitations MUST be cancelled.

### Localization & UX

- **FR-034** Role names, status labels, permission-denied error messages, invitation emails, and notification copy MUST exist in both Arabic and English using the existing i18n key pattern.
- **FR-035** The staff list UI MUST display the staff member's name in their preferred language, role, status, and date joined.
- **FR-036** Role display labels in Arabic MUST be regionally appropriate `[NEEDS CLARIFICATION: confirm Arabic translations for each role with a native speaker — provisional: مالك / مدير الفرع / موظف استقبال / فني / محاسب]`.

## 7. Non-functional requirements

- **NFR-001** Permission checks MUST not add more than 50ms p95 to existing center-scoped endpoint latency. (Implementation must cache per-request, not query DB twice.)
- **NFR-002** Invitation tokens MUST be cryptographically random, single-use, and stored only as a hash server-side.
- **NFR-003** When a staff member is removed, the center-scoped access MUST be denied within 60 seconds of removal. Strategy: membership status is cached per (user, center) pair with a 60-second TTL. On removal the status is set to `REMOVED`; the cache entry expires within 60 seconds and all subsequent center-scoped requests are denied. No JWT revocation list is required.
- **NFR-004** The audit fields on action records MUST be immutable after creation. No service code may overwrite the `acting_user_id` of a past action.
- **NFR-005** Adding a new permission to an existing role MUST be a code change and a deploy, with no DB schema change required.
- **NFR-006** Adding a sixth role in the future MUST be a code change with at most one DB migration (adding the enum value), without changing the membership table shape.
- **NFR-007** A center MUST NOT have more than 50 members in `ACTIVE` or `INVITED` status simultaneously. The API MUST reject new invitation requests that would exceed this limit with a clear bilingual error. The limit MUST be externally configurable (application config / environment variable) so it can be raised without a code change.

## 8. Key entities (conceptual — schema deferred to plan phase)

- **CenterMembership** — Links one User to one Center with one Role and one Status. Records who invited them and when, when they accepted, when they were suspended/removed. The system of record for "who works here."
- **CenterRole** — An enumerated role: OWNER, BRANCH_MANAGER, RECEPTIONIST, TECHNICIAN, ACCOUNTANT. Each role maps statically to a permission set, defined in code.
- **Permission** — An enumerated capability checked at the action site. Granted via role.
- **Invitation** — A pending, time-limited, single-use offer to join a center as a specific role, identified by a hashed token, addressed to a target email.
- **Audit fields** — Not a separate entity; a contract that every center-scoped state change carries `acting_user_id`, `acting_role`, and `acted_at`. Concretely added to existing entities (`Booking`, `Review`, `Message`, `BookingProgress`) via columns or a side table — decided in plan phase.

## 9. Edge cases

- **EC-1** Invitee email matches an existing `CENTER_OWNER` account from a different center.  → allowed; they keep their UserType and gain a new membership.
- **EC-2** Invitee email matches an existing `ADMIN` account.  → forbidden; admins do not become center staff.
- **EC-3** Invitee email matches a `CUSTOMER` who has been banned for fraud or repeated complaints `[NEEDS CLARIFICATION: do we have a ban concept yet? if yes, banned customers cannot accept invitations]`.
- **EC-4** Two simultaneous invitations sent to the same email for the same center.  → second invitation supersedes the first; first is auto-cancelled.
- **EC-5** Invitee changes their email between invitation and acceptance.  → invitation matches on email; if mismatched, acceptance fails with a clear error.
- **EC-6** Owner attempts to invite themselves.  → forbidden; clear error.
- **EC-7** Branch Manager attempts to elevate a Technician to Branch Manager.  → forbidden; only Owner can change role at or above Branch Manager.
- **EC-8** A staff member's User account is locked or disabled at the auth level.  → all their memberships are effectively suspended; they cannot perform any action.
- **EC-9** Center is sold / ownership transferred `[NEEDS CLARIFICATION: ownership transfer is out of scope here? or required for v1?]`.
- **EC-10** A user has memberships in 50+ centers.  → center selector must scale; search/filter expected.
- **EC-11** A row in `_user_roles` (legacy join table) conflicts with the new membership model.  → Resolution and cleanup to be defined in plan phase migration steps.

## 10. Open questions to resolve in `/clarify`

These are the items I'd flag for a clarifying conversation before moving to plan. Each maps to a `[NEEDS CLARIFICATION]` above.

1. **Invitation expiry duration.** Proposal: 7 days. Acceptable?
2. **Self-leave by staff.** Can a Technician leave their center on their own without owner approval, or do all removals go through an Owner / Branch Manager?
3. **Session invalidation strategy on removal.** Hard cutover via revocation list, or rely on existing 2.4-hour JWT expiry plus next-request membership recheck?
4. **Arabic role labels.** Need native confirmation. Provisional values listed.
5. **Banned customer concept.** Is there a status that should block invitation acceptance? If not yet, defer to a separate feature.
6. **Ownership transfer.** In scope here, or a separate later spec? My recommendation: separate spec, since it touches billing and identity in ways staff doesn't.
7. **Maximum staff per center.** Soft cap, hard cap, or no cap? Cost / abuse implications.
8. **Notification channels for invitations.** Email only (current spec), or also push notification if the invitee already has a CUSTOMER account installed?
9. **Technician → customer chat policy.** Spec currently says no. Some real workshops want technicians to message the customer directly ("come pick up your car"). Confirm policy or define a feature flag.
10. **Receptionist visibility into pricing.** Does a receptionist taking the booking need to quote prices? Or is pricing strictly Branch Manager / Owner? Affects `VIEW_BOOKING_BASIC` definition.

## 11. Success criteria

Measurable outcomes by which this feature is judged done and useful:

- **SC-1** A center owner can invite a new staff member and have them performing their first booking action within 10 minutes of the invitation being sent (median).
- **SC-2** 100% of state-changing actions in the audit trail include a non-null `acting_user_id` after rollout.
- **SC-3** Zero permission-bypass incidents found in a security review of all center-scoped endpoints.
- **SC-4** Owner-reported "shared password" usage drops to zero in user-research interviews 30 days post-launch.
- **SC-5** No degradation of p95 latency on existing booking, review, or chat endpoints (NFR-001 verified in load test).
- **SC-6** Existing `CENTER_OWNER` users experience no change in their day-to-day flow on the deploy day (FR scenario 5.10 verified in production with zero support tickets in the first 24 hours).

## 12. Dependencies & assumptions

- Existing JWT auth, OTP-based email verification, MailDev (dev) / production SMTP, Spring Security, and notification infrastructure are reused as-is.
- The seven currently-known backend bugs (`JwtService.parseClaimsJwt` and the uninjected `userDetailsService` chief among them) MUST be fixed before this feature is implemented. Permissions on top of broken JWT validation are meaningless.
- The multi-branch UI work currently planned for the center owner app dovetails with FR-025 through FR-027. The center selector for multi-branch owners and the center selector for multi-membership staff are the **same** UI component, just sourced from different queries.
- The platform's existing audit timestamps (`@CreatedDate`, `@LastModifiedDate`) on entities are sufficient for "when," but most entities currently lack a "by whom" field. Adding `acting_user_id` is in scope for affected entities.

## 13. Review & acceptance checklist

- [ ] No implementation choices (database tables, framework features, code structure) leaked into this spec
- [ ] Every functional requirement is testable — no "the system should be fast" wording
- [ ] Bilingual support is addressed for every user-visible string
- [ ] Edge cases cover both common-failure paths and adversarial cases
- [ ] All `[NEEDS CLARIFICATION]` markers have a corresponding open question in §10
- [ ] Out-of-scope items are explicit, not implied
- [ ] Migration / rollout for existing users is addressed (5.10, 12)
- [ ] Audit / attribution requirements are present and immutable (FR-022 through FR-024, NFR-004)
- [ ] Success criteria are measurable, not aspirational

## 14. Next steps

1. Run `/clarify` against §10's open questions and update the spec.
2. Run `/plan` — output `plan.md` with concrete decisions: schema (likely a new `center_membership` table, an `invitation` table, role and permission enums, audit columns on existing entities), endpoint additions, Spring Security changes (a `CenterSecurityService` bean, custom `@PreAuthorize` SpEL function), and rollout migration script.
3. Run `/tasks` — break the plan into ordered, independently-shippable units. Suggested early tasks: `CenterMembership` entity + migration; auto-create OWNER memberships for existing center owners; permission enum + `CenterSecurityService`; staff list endpoint; invite + accept flow; center selector UI; per-role UI gating; audit attribution backfill.
4. Run `/implement` only after the seven outstanding backend bugs are fixed and tests pass on `main`.
