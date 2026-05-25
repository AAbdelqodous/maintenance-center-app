# Feature Specification: Center Departments

**Feature Branch:** `020-center-departments`
**Status:** Approved — ready for `/speckit.plan`
**Created:** 2026-05-24
**Phase:** specify (next: plan → tasks → implement)

> **Spec Kit reminder:** This document describes WHAT the system must do and WHY, not HOW.
> Implementation details (tables, endpoints, framework choices) belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Requires** `specs/011-center-staff-permissions` — the CenterMembership model, role
  definitions, and OWNER / BRANCH_MANAGER permissions that gate department management.
- **Requires** `specs/015-staff-management-foundation` — the concrete CenterMembership
  entity that Department Membership extends.
- **Required by** `specs/011-center-staff-permissions/spec-amendment.md` — the amendment
  adds `departmentIds` to the CenterMembership conceptual model, which references Department.
- **Required by** `specs/021-self-claim-booking` — Department defines the queue-filter
  boundary and the WRONG_DEPARTMENT precondition error.

---

## 1. Summary

A Department is a center-scoped organizational unit that groups technicians by the type of
work they perform and routes incoming bookings to the right team. It is defined and named by
the center owner — it is not the same as a ServiceCategory.

ServiceCategory is a platform-wide, admin-curated taxonomy that customers use to find
centers ("I need a CAR repair center"). Department is internal: a Kuwaiti car workshop might
create departments named "Engine Repair," "Body Shop," and "Electrical." All three map to the
CAR service category from the customer's perspective, but they represent distinct teams with
distinct workloads.

A small electronics repair shop might have a single department ("General Repair") and never
think about this feature again. Department granularity is a choice the owner makes; the
platform imposes no minimum or maximum beyond the constraints in §7.

---

## 2. Why Now

Self-claim — a technician taking an unassigned booking from a queue scoped to their team —
cannot function without a routing layer that defines "their team." Without departments:

- The technician queue is the entire center's unassigned bookings; a body-work booking
  appears in an electrician's queue.
- Cross-department claim has no definition; the system cannot distinguish a legitimate claim
  from an inappropriate one.
- Booking accountability ("who claimed this and under what authority") cannot be established.

Departments also give the owner-side Attention Required panel an unambiguous signal: a booking
in a department with no active technicians is genuinely unattended, not merely unassigned by
oversight.

---

## 3. Relationship to ServiceCategory

> **Design choice: Model X — Department HAS many ServiceCategories.**
>
> Rationale: A department is a team of people who handle a class of jobs. One department may
> handle oil changes, diagnostic scans, and timing belts — all within the CAR category, or
> spanning multiple sub-categories. Model Y (each category belongs to exactly one department)
> is too restrictive for multi-type work and breaks centers where one team handles everything.
> Model Z (departments and categories are orthogonal routing axes) is overengineered for v1
> and forces owners to configure two separate routing systems.

A department optionally declares which ServiceCategories it is responsible for. When a booking
arrives, the system matches the booking's ServiceCategory to department category lists to
determine routing. This is the only automated routing mechanism; no ML or historical inference
is used.

---

## 4. Scope

### In scope

- OWNER or BRANCH_MANAGER can create, rename, and deactivate departments within their center.
- Each department has bilingual names (Arabic and English), both required.
- A department optionally covers one or more ServiceCategories; this drives auto-routing of
  incoming bookings.
- A technician membership can belong to one or more departments (many-to-many). Assigned at
  invite time; editable by OWNER or BRANCH_MANAGER at any time.
- A booking belongs to exactly one department, assigned at booking creation based on its
  ServiceCategory. Only OWNER or BRANCH_MANAGER can manually reassign a booking's department.
- Validation blocks deactivation when the department has unresolved bookings or active members.
- A default department ("General" / "عام") is seeded at center creation and on first deploy
  to existing centers. All existing memberships and unresolved bookings are placed in it.
- Bilingual name uniqueness enforced per center.

### Out of scope (explicitly deferred)

- **Customer-facing department visibility** — customers never see department names.
- **Department-level analytics and reporting** — deferred to Phase 5.0.
- **Nested departments or hierarchies** — not supported in v1.
- **Platform-wide department templates** — departments are center-private.
- **Automatic workload balancing across departments** — not in scope.
- **Department-based pricing differentiation** — not in scope.
- **Department-level chat routing** — customer chat continues to route to center, not department.

---

## 5. Glossary

| Term | Meaning in this spec |
|---|---|
| **Department** | A center-scoped organizational unit grouping technicians by work type, named by the center owner. |
| **Default Department** | The "General / عام" department auto-seeded at center setup; receives bookings that no configured department covers. |
| **Department Categories** | The ServiceCategories a department declares responsibility for. Used for auto-routing only. |
| **Department Member** | A technician CenterMembership assigned to this department. A technician can belong to multiple departments simultaneously. |
| **Active Department** | A department with `isActive = true`. Only active departments appear in routing, technician assignment, and queue-filter flows. |
| **Unroutable Booking** | A booking whose ServiceCategory is not covered by any active department (other than General). Routed to General automatically. |

---

## 6. User Scenarios

### 6.1 Owner creates a department (happy path)

- **Given** Ahmed (OWNER, center #5) is on the Department Management screen
- **When** he taps "Add Department," enters "Body Shop" (English) and "ورشة الهيكل" (Arabic),
  and selects the CAR ServiceCategory
- **Then** the department is created and appears in the department list
- **And** the next CAR-category booking that arrives is routed to "Body Shop"
- **And** Ahmed can immediately assign technicians to the new department

### 6.2 Branch Manager edits a department's category coverage

- **Given** Sara (BRANCH_MANAGER, center #5) is on the Department Management screen
- **When** she opens "Electrical" department and adds the ELECTRONICS ServiceCategory to it
- **Then** future ELECTRONICS bookings route to "Electrical"
- **And** bookings already routed to other departments are not re-routed

### 6.3 Technician assigned to two departments sees combined queue

- **Given** Mohammed (TECHNICIAN, center #5) belongs to "Engine Repair" and "Electrical"
- **When** he opens his booking queue
- **Then** he sees unassigned CONFIRMED and RESCHEDULED bookings from both departments in a
  single list, sorted by booking time (earliest first)
- **And** each booking row shows a department label so Mohammed can distinguish them visually

### 6.4 Owner deactivates a department with open bookings — blocked

- **Given** "AC Repair" has 3 open (non-terminal) bookings assigned to it
- **When** the owner attempts to deactivate "AC Repair"
- **Then** the action is blocked with a bilingual error: "This department has open bookings.
  Reassign or complete them before deactivating."
- **And** the department remains active

### 6.5 Owner deactivates a department with no blockers

- **Given** "AC Repair" has no open bookings and no active technician memberships
- **When** the owner deactivates it
- **Then** the department is deactivated and no longer appears in routing or queue-filter flows
- **And** historical records that reference "AC Repair" retain the label, shown as "(deactivated)"

### 6.6 Default department seeded on deploy to existing center

- **Given** center #7 was created before departments existed and has 5 technician memberships
  and 12 unresolved bookings
- **When** this feature is deployed
- **Then** a "General / عام" department is auto-created for center #7
- **And** all 5 technician memberships are assigned to it
- **And** all 12 unresolved bookings are assigned to it
- **And** the owner sees no interruption in their workflow

### 6.7 Duplicate department name rejected

- **Given** center #5 already has a department named "Engine Repair" (English)
- **When** the owner tries to create another department also named "Engine Repair"
- **Then** the action is rejected with a bilingual error: "A department with this name already
  exists at this center."
- **And** uniqueness is checked independently for Arabic and English names

### 6.8 Booking with unroutable category

- **Given** center #5 serves ELECTRONICS but has no department configured to cover it
- **When** an ELECTRONICS booking arrives
- **Then** it is placed in the "General" department automatically
- **And** the owner sees a notice in the Attention Required panel that the booking could not
  be routed to a specific department

### 6.9 Technician with zero department assignments

- **Given** Mohammed is an active TECHNICIAN at center #5 but has been assigned to no departments
- **When** Mohammed opens his booking queue
- **Then** the queue is empty with a clear message: "You are not assigned to any department.
  Contact your branch manager to be added to a department."
- **And** no error occurs — this is a valid but unproductive state

---

## 7. Functional Requirements

### Department lifecycle

- **FR-D-001** An OWNER or BRANCH_MANAGER MUST be able to create a department with a bilingual
  name (Arabic and English, both required) and an optional list of ServiceCategories it covers.
- **FR-D-002** An OWNER or BRANCH_MANAGER MUST be able to rename a department at any time. Name
  changes apply to all future routing and displays immediately; historical records retain the
  name that was active at the time of routing.
- **FR-D-003** An OWNER or BRANCH_MANAGER MUST be able to deactivate a department. Deactivation
  MUST be blocked if the department has any non-terminal bookings. Terminal booking statuses are:
  COMPLETED, CANCELLED, NO_SHOW. Deactivation MUST also be blocked if the department has any
  active technician memberships assigned to it.
- **FR-D-004** Deactivated departments MUST be retained for audit. They MUST NOT appear in
  routing logic, technician assignment flows, or booking-queue filters.
- **FR-D-005** Department names MUST be unique per center per language. A center MUST NOT have
  two active departments with the same English name OR the same Arabic name. Each language is
  checked independently.
- **FR-D-006** Every center MUST have at least one active department at all times. An attempt to
  deactivate the last active department MUST be rejected with a bilingual error.

### Booking routing

- **FR-D-007** When a booking is created, the system MUST assign it to a department by matching
  the booking's ServiceCategory to the ServiceCategories declared by each active department at
  that center.
- **FR-D-008** If no active department at the center covers the booking's ServiceCategory, the
  booking MUST be routed to the center's default (General) department.
- **FR-D-009** If multiple active departments cover the same ServiceCategory (a valid but unusual
  configuration), the booking is routed to the one with the lowest display order. This is a
  tie-breaking rule; no error is raised at routing time. A visual warning MAY be shown in the
  department editor when overlapping categories are detected.
- **FR-D-010** A booking's department assignment MUST NOT change automatically after creation.
  Only an OWNER or BRANCH_MANAGER MAY manually reassign a booking to a different department.
- **FR-D-011** When a technician is removed or deactivated from the center, bookings assigned
  to that technician MUST remain in their current department. They revert to unassigned status
  within the department (assignedMembershipId becomes null).

### Default department seeding

- **FR-D-012** When a new center is created, a default department named "General" (English) /
  "عام" (Arabic) MUST be automatically created for it.
- **FR-D-013** When this feature is deployed to a center that has no departments, the seeding
  procedure from FR-D-012 MUST run automatically for that center. All existing active technician
  memberships and all non-terminal bookings at the center MUST be assigned to the seeded
  department.
- **FR-D-014** The default "General" department is a starting point, not a permanent fixture.
  An OWNER MAY rename or deactivate it provided the conditions in FR-D-003 and FR-D-006 are met.

### Technician-department assignment

- **FR-D-015** A technician membership MUST be assignable to zero or more departments within
  the same center. Zero assignments is permitted; the technician will see an empty queue until
  assigned (see scenario 6.9).
- **FR-D-016** An OWNER or BRANCH_MANAGER MUST be able to add or remove a technician from any
  department at any time. Changes MUST take effect immediately on the technician's next queue
  refresh — no cache delay beyond the standard RTK Query polling interval.
- **FR-D-017** A technician's department assignments are scoped to one center per session. A
  multi-center technician selects a center at login and sees only the departments of that center.

### Bilingual requirements

- **FR-D-018** Department names MUST be stored and displayed in both Arabic and English. Both
  names are required at creation time. Display uses the active app locale.
- **FR-D-019** All system-generated messages relating to departments (errors, confirmation
  prompts, empty states, seeding notices) MUST have both Arabic and English variants.

---

## 8. Non-Functional Requirements

- **NFR-D-001** Department-based routing at booking creation MUST add no more than 20ms p95
  to the existing booking-creation endpoint latency.
- **NFR-D-002** The department list for a center MUST load in under 200ms p95. Expected count:
  1–20 departments per center.
- **NFR-D-003** Changes to a technician's department assignment MUST be reflected in that
  technician's booking queue within one polling interval — no additional cache invalidation
  delay beyond what RTK Query already applies.

---

## 9. Key Entities (conceptual — schema deferred to plan phase)

- **Department** — Owned by a center. Has a bilingual name, display order, active flag, and
  a list of ServiceCategories it covers. A center has one or more Departments.
- **DepartmentMembership** — A many-to-many relationship between a CenterMembership (specifically
  a TECHNICIAN membership) and Departments. Managed by OWNER or BRANCH_MANAGER.
- **Booking.department** — A reference to the Department this booking was routed to at creation.
  Set once at creation; manually overrideable by OWNER or BRANCH_MANAGER only.

---

## 10. Edge Cases

- **EC-D-1** A department's category list is edited between a booking being submitted and
  being processed. → Routing uses the category list as it exists at booking-creation time.
  No retroactive re-routing occurs.
- **EC-D-2** A department is deactivated while a technician's queue refresh is in flight.
  → Bookings from the deactivated department disappear from the queue on the next refresh.
  No in-flight error.
- **EC-D-3** Two technicians attempt to claim the same unassigned booking simultaneously.
  → Concurrency handling is defined in `specs/021-self-claim-booking`. The booking's department
  assignment does not change on a failed claim.
- **EC-D-4** All departments at a center are deactivated (FR-D-006 normally prevents this,
  but admin operations or migration scripts could produce this state). → Incoming bookings
  cannot be routed. A center-level alert surfaces in the owner's dashboard. Requires manual
  resolution by admin.
- **EC-D-5** A booking is manually reassigned by a manager to a different department, and a
  technician in the original department is mid-claim on it. → The claim attempt fails with
  BOOKING_NOT_CLAIMABLE. See `specs/021-self-claim-booking` for precondition enforcement.

---

## 11. Open Questions (to resolve in `/clarify` if needed)

- **OQ-D-1** Should BRANCH_MANAGER be able to create and deactivate departments, or only
  OWNER? The current spec permits both; revisit if centers report managers making structural
  changes the owner did not authorize.
- **OQ-D-2** Display order of departments: automatic (alphabetical) or owner-configurable
  (drag to reorder)? Affects which department wins when multiple cover the same category
  (FR-D-009 tie-breaking rule). Defer to plan phase.

---

## 12. Success Criteria

- **SC-D-1** 100% of bookings created after deploy are assigned to a department (no null
  department reference on any non-legacy booking record).
- **SC-D-2** A technician's queue returns only bookings from their assigned departments; no
  bookings from other departments appear.
- **SC-D-3** Zero unrouted bookings (department = null) more than 24 hours after the
  seeding migration runs on any existing center.
- **SC-D-4** An owner can create a department, add a ServiceCategory, and assign a technician
  to it within 90 seconds of first opening the Department Management screen.
