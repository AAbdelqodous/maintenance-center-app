# Research: Staff Management Foundation

**Feature**: 015-staff-management-foundation  
**Date**: 2026-05-20

---

## What Already Exists

### Fully Implemented (no work needed)

| Area | Files | Status |
|------|-------|--------|
| Staff roster management | `app/(app)/(tabs)/profile/staff/` — index, invite, [id] | ✅ Complete |
| Staff API | `store/api/staffApi.ts` — 13 endpoints | ✅ Complete |
| Staff types | `types/staff.ts` — CenterRole, MembershipStatus, CenterPermission, ROLE_PERMISSIONS | ✅ Complete |
| Permission gate component | `components/staff/PermissionGate.tsx` | ✅ Complete |
| Role + status badges | `components/staff/RoleBadge.tsx`, `MembershipStatusBadge.tsx` | ✅ Complete |
| Staff member card | `components/staff/StaffMemberCard.tsx` | ✅ Complete |
| Staff-side screens | `app/(app)/staff/` — dashboard, bookings, reviews, notifications, profile | ✅ Complete |
| Role-based session routing | `app/(app)/_layout.tsx` — STAFF → `/staff/dashboard` | ✅ Complete |
| centerSlice | `store/centerSlice.ts` — activeUserRole, activePermissions | ✅ Complete |
| Invite acceptance flow | `app/(app)/accept-invite.tsx` | ✅ Complete |

---

## Gaps (work required for this feature)

### Gap 1: Booking Assignment to Technician

**Problem**: `bookingsApi.ts` has no mutation for assigning a technician to a booking. The `Booking` interface has no `assignedMembershipId` or `assignedStaffName` fields.

**Decision**: Add `assignTechnician` mutation to `bookingsApi.ts`. Extend the `Booking` interface with two nullable fields. Add a `TechnicianPicker` component that lists active Technician members from the existing `getCenterStaff` endpoint.

**API call**: `PUT /bookings/{id}/assign` → body `{ membershipId: number | null }` → `Booking`

**Rationale**: Using `membershipId` (not raw `userId`) ties the assignment to the specific branch-level membership record, which survives the user being staff at other branches. Null clears the assignment (unassign).

**Alternatives rejected**: Using `userId` would require the backend to resolve which membership at which center — introduces ambiguity in multi-branch scenarios.

---

### Gap 2: Staff Booking List Shows All Bookings for Technicians

**Problem**: `app/(app)/staff/bookings/index.tsx` uses `useGetBookingsQuery` (all branch bookings). TECHNICIAN role has only `VIEW_ASSIGNED_BOOKINGS` permission — they should see only bookings assigned to them.

**Decision**: Add `getMyAssignedBookings` query to `staffApi.ts` targeting `GET /bookings/assigned`. The staff bookings screen reads `activeUserRole` from Redux; if `TECHNICIAN`, use `getMyAssignedBookings`; otherwise use `getBookings` (for BRANCH_MANAGER / RECEPTIONIST).

**Rationale**: A single screen that branches on role is simpler than two separate route files. The role check is already available from `centerSlice.activeUserRole`.

**Alternatives rejected**: Separate route files for each role would duplicate layout/pagination logic unnecessarily.

---

### Gap 3: No "Assign Technician" UI in Booking Detail

**Problem**: The booking detail screen (`app/(app)/(tabs)/bookings/[id].tsx`) has no assignment section. The staff-side booking detail (`app/(app)/staff/bookings/[id].tsx`) also has none.

**Decision**: Wrap an "Assign Technician" section in `PermissionGate permission="ASSIGN_TECHNICIAN"` in both booking detail screens. The section shows the current assignee (or "Unassigned") and a "Change" button that opens `TechnicianPicker`.

**Rationale**: Reuses the existing `PermissionGate` component so TECHNICIAN/RECEPTIONIST users never see the assignment UI — no custom role checks in screen code.

---

### Gap 4: BookingCard Doesn't Show Assigned Technician

**Problem**: `BookingCard` renders customer name, status, date/time, and service type — no assigned technician.

**Decision**: Add optional `showAssignedTo?: boolean` prop (default `false`). When true, renders an assigned-to row using `booking.assignedStaffName` or "Unassigned" if null. Owner and Branch Manager lists pass `showAssignedTo={true}`.

**Rationale**: Opt-in prop avoids regressions in any screen that already renders `BookingCard` without assignment context.

---

### Gap 5: Intra-Staff Role Guards (BRANCH_MANAGER vs TECHNICIAN/RECEPTIONIST)

**Problem**: The `_layout.tsx` redirects all STAFF users to `/staff/dashboard` but doesn't differentiate within the staff routes. A Technician can deep-link to the staff pricing/offers screens (which require `MANAGE_PRICING`/`MANAGE_OFFERS`). The `PermissionGate` in `staff/dashboard.tsx` already hides the quick-action buttons, but the routes themselves are unguarded.

**Decision**: In `app/(app)/staff/_layout.tsx`, read `activePermissions` from Redux and add route-level guards. For routes that require a specific permission (pricing, offers), redirect to `/staff/dashboard` if the permission is absent. This is consistent with how the owner-side `_layout.tsx` uses redirects rather than slot-based lazy resolution.

**Rationale**: Redirects are more defensive than rendering a blank screen — they also update the URL, which helps debug deep-link issues.

---

### Gap 6: Deactivation With Active Bookings — Client Prompt

**Problem**: When suspending/removing a staff member who has active assigned bookings, the spec requires the owner to be prompted to reassign first. Currently the client just calls `suspendMember`/`removeMember` and shows the backend error if any.

**Decision**: Before calling `suspendMember` or `removeMember`, the client fetches `getMyAssignedBookings` for that membership's userId (or relies on the backend returning a specific error code). If the backend returns a 409 with `STAFF_HAS_ACTIVE_ASSIGNMENTS` business error code, the client catches it and shows a targeted bilingual message listing the active bookings with a "Reassign First" CTA that navigates to the bookings list filtered by that technician.

**Rationale**: Backend-enforced rejection is the source of truth. The client catches and surfaces the error contextually rather than pre-checking (which could race with concurrent state changes).

**Alternatives rejected**: Client-side pre-check using a separate query is prone to TOCTOU races and adds an extra API call on every deactivation attempt.

---

### Gap 7: Cross-Branch Assignment Error Display

**Problem**: When an assignment is attempted with a technician from a different branch, the backend rejects it. The current error catch pattern (`err?.data?.businessErrorDescription`) already extracts the message, but the message needs to exist in both Arabic and English.

**Decision**: The backend is responsible for returning bilingual error text. The frontend displays whatever `businessErrorDescription` returns. No frontend i18n key is needed for the error body itself — the backend owns it. The client adds only the `bookings.crossBranchError` i18n key as a fallback if `businessErrorDescription` is empty.

---

## Resolved Clarifications

| Question | Answer |
|----------|--------|
| Should OWNER assigning BRANCH_MANAGER role to themselves be allowed? | Yes — backend allows it; client has no restriction |
| Who can view the staff list within the staff area? | Only BRANCH_MANAGER (has `MANAGE_NON_MANAGER_STAFF`) — Technician/Receptionist are redirected away |
| Assignment target: `membershipId` or `userId`? | `membershipId` — branch-scoped, avoids multi-branch ambiguity |
| Staff booking list: all bookings or assigned-only? | Role-gated: TECHNICIAN sees assigned-only; BRANCH_MANAGER and RECEPTIONIST see all branch bookings |
| Deactivation with active bookings: client pre-check or backend error? | Backend error catch — avoids TOCTOU race |
