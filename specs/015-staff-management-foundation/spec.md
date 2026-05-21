# Feature Specification: Staff Management Foundation

**Feature Branch**: `015-staff-management-foundation`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "Build the staff management foundation for the maintenance center owner mobile app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Views Branch Staff List (Priority: P1)

A center owner navigates to a staff management section within their branch and sees a complete list of all staff members — both active and inactive — showing each person's name, assigned role, and status. This is the foundation all other staff stories depend on.

**Why this priority**: Without a staff list, the owner has no surface from which to add, edit, or deactivate staff. This story delivers the minimum viable anchor for the entire feature.

**Independent Test**: Can be fully tested by logging in as an owner, navigating to staff management, and confirming the list loads with correct role labels and status indicators — even before any staff have been added (empty state).

**Acceptance Scenarios**:

1. **Given** a branch with no staff members added, **When** the owner opens the staff list, **Then** an empty state message is displayed inviting the owner to add their first staff member.
2. **Given** a branch with active and inactive staff, **When** the owner opens the staff list, **Then** both active and inactive staff are listed with their names, roles, and status clearly labeled in both Arabic and English.
3. **Given** the owner is viewing the staff list, **When** they switch the app language from Arabic to English (or vice versa), **Then** all role labels and status indicators update without reloading.

---

### User Story 2 - Owner Adds a Staff Member (Priority: P2)

A center owner selects an existing platform user and assigns them one of three roles (Branch Manager, Technician, or Receptionist) to make them a staff member of the branch. Once added, the staff member's role determines which app screens they can access.

**Why this priority**: The staff list is empty without this. Adding staff is the first meaningful action an owner takes and unlocks all downstream accountability features.

**Independent Test**: Add a user, confirm they appear in the staff list with the correct role, then log in as that user and verify they are routed to staff-appropriate screens.

**Acceptance Scenarios**:

1. **Given** an owner is on the add-staff screen, **When** they search for a platform user by name or email and select a role, **Then** the staff member appears in the active staff list immediately.
2. **Given** a platform user already belongs to the branch, **When** the owner attempts to add the same user again, **Then** the system rejects the addition with a clear bilingual error message.
3. **Given** a newly added Branch Manager logs out and back in, **When** they authenticate, **Then** they are routed to Branch Manager screens that were inaccessible before the role was assigned.
4. **Given** an owner is adding staff, **When** they select the Branch Manager role for themselves, **Then** the system accepts the assignment and the owner's next login reflects Branch Manager navigation alongside their owner access.

---

### User Story 3 - Owner Changes Role or Deactivates Staff (Priority: P3)

A center owner can update a staff member's role at any time, or deactivate them when they leave the branch. Deactivation is a soft-delete — all historical booking attributions are preserved, and the person's name remains visible in past records with an "inactive user" indicator.

**Why this priority**: Staff turnover is routine. Owners need lifecycle management to keep the branch roster accurate without losing history that matters for reporting.

**Independent Test**: Change a Technician's role to Receptionist, confirm the role change is reflected; then deactivate a staff member and confirm past booking records still show their name with an "inactive" label.

**Acceptance Scenarios**:

1. **Given** an active Technician on the staff list, **When** the owner changes their role to Branch Manager, **Then** the staff list reflects the new role and the staff member's navigation access updates on their next login.
2. **Given** an active staff member with no currently assigned bookings, **When** the owner deactivates them, **Then** the member moves to the inactive section of the staff list and can no longer access staff features.
3. **Given** an active staff member who has bookings currently assigned to them, **When** the owner initiates deactivation, **Then** the system displays a prompt requiring the owner to reassign those bookings before confirming deactivation.
4. **Given** a deactivated staff member, **When** the owner views a historical booking that was assigned to them, **Then** the booking record displays the person's cached name with a visible "inactive user" indicator.

---

### User Story 4 - Owner or Branch Manager Assigns a Booking to a Technician (Priority: P4)

From the booking detail view, an owner or Branch Manager selects an active Technician at the branch and assigns them to a confirmed booking. Only one Technician can be assigned at a time. When a new Technician is chosen, the previous assignee is automatically removed.

**Why this priority**: Per-person accountability for bookings is the central goal of this feature. Without assignment, no downstream phase (work progress, performance tracking) has a foundation to build on.

**Independent Test**: Assign booking #X to Technician A, verify it appears in Technician A's queue; reassign to Technician B, verify it leaves A's queue and appears in B's queue within one refresh cycle.

**Acceptance Scenarios**:

1. **Given** a confirmed booking with no current assignee, **When** an owner selects an active Technician from the branch, **Then** the booking shows the Technician as assignee and appears in the Technician's personal queue.
2. **Given** a booking currently assigned to Technician A, **When** an owner reassigns it to Technician B, **Then** Technician A no longer sees the booking in their queue, and Technician B sees it within one refresh cycle.
3. **Given** an owner attempts to assign a booking to a Technician from a different branch, **When** the assignment is submitted, **Then** the system rejects it with a bilingual error message explaining the cross-branch restriction.
4. **Given** a branch has no staff added yet, **When** the owner views a booking, **Then** the booking shows an "unassigned" state and the owner can still manage it without being forced to assign.
5. **Given** the owner opens the assignee picker, **When** the picker loads, **Then** only active Technicians from the same branch are selectable — Branch Managers and Receptionists do not appear.

---

### User Story 5 - Role-Based Navigation Enforcement (Priority: P5)

When a staff member logs in, the app routes them to screens appropriate for their role. Screens accessible to Branch Managers are inaccessible to Technicians and Receptionists. This enforcement applies to both normal navigation and direct deep links.

**Why this priority**: Without enforcement, a Technician could navigate to manager-only screens. Role-based access is a correctness requirement for the entire staff feature set.

**Independent Test**: Log in as a Technician, attempt to navigate (via deep link) to a Branch Manager-only screen, and confirm the navigation is blocked with an appropriate fallback.

**Acceptance Scenarios**:

1. **Given** a Technician is logged in, **When** they attempt to navigate to a Branch Manager screen via any means (menu, deep link), **Then** they are redirected to their permitted default screen with no restricted content exposed.
2. **Given** a Branch Manager is logged in, **When** they navigate to a screen accessible only to Branch Managers, **Then** the screen loads successfully.
3. **Given** a Receptionist is logged in, **When** they access the app, **Then** they see only the screens defined for their role and cannot reach Technician or Branch Manager screens.

---

### Edge Cases

- What happens when a staff member's platform user account is deleted entirely? Their staff record is automatically deactivated. All historical bookings they were assigned to continue to display their cached name alongside an "inactive user" indicator — no booking records are lost or anonymized.
- What happens when deactivation is attempted on a staff member with active bookings? The system blocks the deactivation and prompts the owner with the list of affected bookings that need to be reassigned first.
- What happens if a booking is created before any staff have been registered at the branch? The booking appears in an "unassigned" state visible to the owner and Branch Manager; no errors are thrown and normal booking management continues.
- What happens when two Branch Managers attempt to reassign the same booking at the same time? Last-write-wins applies. Both clients receive a refresh signal so the current state is pulled; neither client is left with stale assignment data.
- What happens when an owner assigns the Branch Manager role to themselves? The system accepts the assignment. On the owner's next login session, they see Branch Manager navigation surfaces in addition to their owner-level access.
- What happens when a user is already a Technician at Branch A and an owner of Branch B tries to add them to Branch B? The system creates an independent staff record for Branch B, consistent with the multi-branch architecture that allows one user to hold roles at multiple branches.

## Requirements *(mandatory)*

### Functional Requirements

**Staff Roster**

- **FR-001**: System MUST allow a center owner to view all staff members (active and inactive) associated with their branch, including each person's display name, role, and active status.
- **FR-002**: System MUST support exactly three staff roles: Branch Manager, Technician, and Receptionist.
- **FR-003**: System MUST display all role labels and status values in both Arabic and English, using the user's current language setting.

**Adding Staff**

- **FR-004**: System MUST allow a center owner to add an existing platform user as a staff member of the branch by searching for the user and selecting a role.
- **FR-005**: System MUST prevent a user from being added to the same branch more than once — if the user is already a staff member (active or inactive) at that branch, the addition MUST be rejected with a bilingual error message.
- **FR-006**: System MUST allow an owner to assign the Branch Manager role to themselves.

**Role Changes and Deactivation**

- **FR-007**: System MUST allow a center owner to change a staff member's assigned role at any time without re-adding the staff record.
- **FR-008**: System MUST allow a center owner to deactivate a staff member via soft-delete — the staff record is preserved for historical reporting and the member's display name remains visible in past records.
- **FR-009**: When deactivation is initiated for a staff member who has active bookings assigned to them, the system MUST block the deactivation and prompt the owner to reassign those bookings before proceeding.
- **FR-010**: After deactivation, all historical booking records attributed to that staff member MUST display their cached display name alongside a visible "inactive user" indicator.
- **FR-011**: If a staff member's underlying platform user account is deleted, the system MUST automatically deactivate their staff record and apply the "inactive user" indicator to all historical attributions.

**Booking Assignment**

- **FR-012**: A booking MUST have at most one assigned staff member at any given time.
- **FR-013**: Only active Technicians belonging to the same branch as the booking MUST be eligible for assignment — Branch Managers and Receptionists MUST NOT appear as selectable assignees in the picker.
- **FR-014**: Attempting to assign a booking to a Technician from a different branch MUST be rejected with a bilingual error message before the assignment is persisted.
- **FR-015**: When a booking is reassigned, the previous assignee's personal queue MUST reflect the removal and the new assignee's queue MUST include the booking, both within one refresh cycle.
- **FR-016**: Bookings with no assigned Technician MUST display an "unassigned" status visible to the owner and Branch Manager.
- **FR-017**: In the event of two concurrent reassignment actions on the same booking, the system MUST apply last-write-wins and deliver a refresh signal to both initiating clients.

**Role-Based Access Control**

- **FR-018**: The app MUST enforce role-based navigation — each staff role (Branch Manager, Technician, Receptionist) MUST have a defined set of accessible screens, and screens outside that set MUST be inaccessible regardless of how navigation is triggered.
- **FR-019**: Role-based access enforcement MUST apply to both in-app navigation and direct deep links — a restricted route reached by any means MUST redirect the user to their permitted default screen.
- **FR-020**: A Branch Manager MUST be able to view the staff list in read-only mode and reassign bookings, but MUST NOT be able to add, remove, or change the role of other staff members.
- **FR-021**: Role-based navigation changes MUST take effect on the staff member's next login session — the current active session is not required to re-route dynamically.

**Multi-Branch Compatibility**

- **FR-022**: A single platform user MUST be able to hold staff roles at multiple branches simultaneously, with each branch maintaining an independent staff record for that user.

### Key Entities

- **Staff Member**: A platform user associated with a branch in a specific role. Key attributes: reference to the platform user (with cached display name), branch identifier, role (Branch Manager / Technician / Receptionist), active status, date added. A user can hold at most one role per branch at a time but can have records at multiple branches.
- **Staff Role**: An enumeration with exactly three values — Branch Manager, Technician, Receptionist — each granting a distinct set of navigation access rights and governing booking assignment eligibility.
- **Booking Assignment**: The link between a specific booking and a Technician. At most one active assignment per booking exists at any time. Carries the assignee's identity so historical records remain attributable even after the staff member is deactivated.
- **Role-Based Navigation Map**: A lookup that defines, per role, which app screens are permitted. Enforced at the navigation layer and at deep-link resolution, independent of how the user attempts to reach a screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can complete the full staff lifecycle (add a staff member, change their role, then deactivate them) in under 3 minutes per staff member on a standard mobile connection.
- **SC-002**: Booking reassignment is reflected in both the previous and new assignee's views within one refresh cycle — no manual action is required by the affected staff members to see the updated state.
- **SC-003**: 100% of cross-branch assignment attempts are rejected before the assignment is persisted, with a bilingual error message displayed to the initiating user.
- **SC-004**: 100% of attempted navigations to role-restricted screens — via any method including direct deep links — are blocked for unauthorized roles, with no restricted content exposed.
- **SC-005**: Zero historical booking attributions are lost after staff deactivation — all records retain the staff member's display name and display an "inactive user" indicator.
- **SC-006**: Zero duplicate active staff records exist for the same user at the same branch — the uniqueness constraint is enforced on every add attempt with a clear rejection message.
- **SC-007**: All role labels, error messages, and status indicators are available in both Arabic and English, with no untranslated strings visible to any user regardless of language setting.

## Assumptions

- Platform users must already exist on the platform before an owner can add them as staff — this feature does not include creating new platform accounts or sending platform-level invitations.
- A Branch Manager can view the staff list in read-only mode (they need this to know which Technicians are available for booking assignment), but their write access to the roster is fully restricted.
- Only bookings in an active state (not yet completed or cancelled) are eligible for Technician assignment; completed and cancelled bookings retain their last assigned Technician as historical attribution only.
- The "unassigned" booking state is display-only — it does not block the owner from managing the booking in other ways (updating status, viewing details, etc.).
- Role changes take effect on the staff member's next login session — the current session does not dynamically re-render navigation mid-session.
- The existing multi-branch architecture in the app already supports tracking which branch is active for a given session; this feature builds on that without modifying it.
- Branch Manager, Technician, and Receptionist roles all use the same staff login entry point — not the center owner's login flow.
- Bilingual support uses the app's existing Arabic RTL and English infrastructure — no new translation mechanism is introduced by this feature.
- Staff-facing dashboards (the screens staff members actually land on after login) are explicitly out of scope for this phase and will be delivered in a subsequent phase.
