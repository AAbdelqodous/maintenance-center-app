# Spec 011 Amendment: Permissions, Department Integration & Design Principles

**Amends:** `specs/011-center-staff-permissions/spec.md`
**Amendment date:** 2026-05-24
**Status:** Approved — supersedes original spec 011 on all listed points
**Requires:** `specs/020-center-departments` (for the Department entity and departmentIds field)

> This document lists every change to spec 011 by section. Unchanged sections of the original
> spec remain authoritative. Where this amendment conflicts with the original, this amendment
> wins. Future planning and implementation sessions MUST read both documents together.

---

## A. Design Principles (new — insert after §1 Summary)

The following two principles resolve all future ambiguous permission questions at the product
level before they reach implementation:

1. **Receptionists handle the customer-facing operational surface. They do not configure the
   center's commercial terms.** A receptionist answers customer calls, manages the booking
   calendar, and relays information. Pricing, offers, and other commercial configurations
   belong to the center's management tier (Owner, Branch Manager).

2. **Technicians own the execution of work, including taking responsibility for it.** A
   technician can claim a booking (self-assignment), update its work stage, and upload
   progress media. They are accountable for the work they accept. Actions that change the
   commercial or organizational state of the center (assigning to another technician, managing
   staff, editing the center profile) are outside their scope.

These principles are not preferences — they are product-level invariants that MUST be
respected when adding permissions to any existing or future role.

---

## B. FR-010 Amendment — Role permission matrix

The following replaces the FR-010 permission table in the original spec 011 in its entirety.
All permissions not listed for a role are denied for that role.

### OWNER

All permissions listed below plus `MANAGE_ALL_STAFF` (see §C).

Permissions: `MANAGE_BOOKINGS`, `ASSIGN_TECHNICIAN_MANUAL`, `VIEW_BOOKING_BASIC`,
`VIEW_BOOKINGS_READONLY`, `UPDATE_WORK_STAGE`, `UPLOAD_PROGRESS_MEDIA`, `MANAGE_CHAT`,
`RESPOND_REVIEWS`, `EDIT_CENTER_PROFILE`, `MANAGE_NON_MANAGER_STAFF`, `MANAGE_ALL_STAFF`,
`VIEW_REVENUE`, `VIEW_PRICE_LIST`, `MANAGE_PRICING`, `MANAGE_OFFERS`, `VIEW_REPORTS`,
`GENERATE_REPORTS`, `VIEW_CALENDAR`.

### BRANCH_MANAGER

Permissions: `MANAGE_BOOKINGS`, `ASSIGN_TECHNICIAN_MANUAL`, `MANAGE_CHAT`, `RESPOND_REVIEWS`,
`EDIT_CENTER_PROFILE`, `MANAGE_NON_MANAGER_STAFF`, `VIEW_REVENUE`, `VIEW_REPORTS`,
`MANAGE_PRICING`, `MANAGE_OFFERS`.

> Rationale for `MANAGE_PRICING` and `MANAGE_OFFERS` on BRANCH_MANAGER: Branch Managers
> are accountable for the commercial performance of the branch. Configuring pricing and offers
> is within their operational remit.

### RECEPTIONIST

Permissions: `MANAGE_BOOKINGS`, `MANAGE_CHAT`, `VIEW_CALENDAR`, `VIEW_BOOKING_BASIC`,
`VIEW_PRICE_LIST`.

> **Changed from original spec 011:**
> - `MANAGE_PRICING` REMOVED (design principle 1: receptionists do not configure commercial
>   terms). Replaced with `VIEW_PRICE_LIST` so a receptionist can read the published price
>   list to answer customer inquiries.
> - `MANAGE_OFFERS` REMOVED entirely. No view-only replacement. Offers are a commercial
>   configuration; receptionist has no role in creating or viewing draft offers.

### TECHNICIAN

Permissions: `CLAIM_BOOKING`, `VIEW_ASSIGNED_BOOKINGS`, `UPDATE_WORK_STAGE`,
`UPLOAD_PROGRESS_MEDIA`.

> **Changed from original spec 011:**
> - `CLAIM_BOOKING` ADDED (design principle 2: technicians own the execution of work,
>   including taking responsibility for it). Self-claim semantics are fully specified in
>   `specs/021-self-claim-booking`.

### ACCOUNTANT

Permissions: `VIEW_REVENUE`, `VIEW_BOOKINGS_READONLY`, `GENERATE_REPORTS`.

No changes from original spec 011.

---

## C. FR-010 Addendum — New permission definitions

The following permissions are referenced in §B but were not defined in the original spec 011:

| Permission | Grants | Denied to |
|---|---|---|
| `CLAIM_BOOKING` | Technician can claim an unassigned booking from their department queue, making it their assignment without manager intervention. Constrained to bookings in the technician's department(s) and in a claimable status. See `specs/021-self-claim-booking`. | All roles except TECHNICIAN |
| `ASSIGN_TECHNICIAN_MANUAL` | Owner or Branch Manager can explicitly assign (or reassign) any booking to any technician, including cross-department with an override flag. | All roles except OWNER, BRANCH_MANAGER |
| `MANAGE_ALL_STAFF` | Owner can invite, suspend, remove, or change the role of any staff member at the center, including Branch Managers and Accountants. | All roles except OWNER |
| `VIEW_PRICE_LIST` | Read-only access to the center's published service price ranges (CenterServicePricing). Does not include booking-specific quotes, invoice amounts, or payment totals. | (All roles have this or MANAGE_PRICING, which is a superset) |
| `REROUTE_BOOKING_ASSIGNED` | Technician may re-route a booking they are currently assigned to, from its current department to another active, non-diagnostic department at the same center (spec 022 FR-DR-030). Constrained to bookings whose `assignedMembershipId` matches the caller's membership. | All roles except TECHNICIAN |
| `REROUTE_BOOKING_ANY` | Owner or Branch Manager may re-route any non-terminal booking at their center to another active, non-diagnostic department (spec 022 FR-DR-031). Used by the manager override path; mirrors the OWNER/BRANCH_MANAGER side of `ASSIGN_TECHNICIAN_MANUAL`. | All roles except OWNER, BRANCH_MANAGER |

> **Rename from original spec 011:** `ASSIGN_TECHNICIAN` is renamed to
> `ASSIGN_TECHNICIAN_MANUAL` across the entire spec, all contracts, and all frontend code.
> Rationale: the suffix `_MANUAL` distinguishes manager-initiated assignment from technician
> self-claim (`CLAIM_BOOKING`). The rename is a non-breaking amendment — no behavior changes,
> only the identifier.

---

## D. FR-011 Amendment — MANAGE_NON_MANAGER_STAFF scope clarification

The original FR-011 reads: "`MANAGE_NON_MANAGER_STAFF` MUST allow inviting, suspending, and
removing only Technicians and Receptionists."

Append: "MANAGE_NON_MANAGER_STAFF does NOT include Accountants. Accountants are managed only
by OWNER (via `MANAGE_ALL_STAFF`)."

> Rationale: Accountants have access to revenue data. Allowing Branch Managers to add or
> remove Accountants creates an unacceptable access-control gap.

---

## E. §8 Conceptual data model amendment — CenterMembership

The following field is added to the CenterMembership conceptual entity defined in §8 of
the original spec 011:

**`departmentIds: number[]`** — A list of Department identifiers (references to the Department
entity defined in `specs/020-center-departments`) to which this membership is assigned. Only
meaningful for TECHNICIAN memberships; other roles carry an empty list. A TECHNICIAN with an
empty list is valid but will see an empty booking queue (see `specs/020-center-departments`
FR-D-015 and scenario 6.9).

Semantics:
- Set at the time the technician is invited or added. Defaults to the center's default
  (General) department if the inviter does not specify.
- Editable by OWNER or BRANCH_MANAGER at any time. Changes take effect immediately.
- Scoped to the center this membership belongs to; a technician with memberships at two
  centers has independent `departmentIds` lists for each center.

---

## F. §12 Dependencies amendment

Append to the original §12:

"This spec has a new dependency: `specs/020-center-departments`. The Department entity
introduced there is referenced by the CenterMembership `departmentIds` field (§E above),
by the self-claim queue filter (`specs/021-self-claim-booking`), and by the booking-routing
logic that assigns incoming bookings to departments."

---

## G. Scenarios amended by this change (for test update)

The following scenarios in the original spec 011 reference permissions that have changed
and must be updated when writing acceptance tests:

| Original scenario | Change |
|---|---|
| 5.4 Technician sees only assigned bookings | Also covers: technician can CLAIM bookings from the department queue. Update with a CLAIM_BOOKING step. |
| Any scenario referencing `ASSIGN_TECHNICIAN` | Update to use `ASSIGN_TECHNICIAN_MANUAL`. |
| Any scenario testing receptionist access to pricing or offers | Receptionist MUST NOT see pricing edit controls or any offers management surface. |
