# Data Model: Staff Management Foundation

**Feature**: 015-staff-management-foundation  
**Date**: 2026-05-20

---

## Existing Entities (reference, no changes)

### `CenterMembership` (in `types/staff.ts`)

```
id              number        — membership record ID (used for booking assignment)
userId          number        — platform user ID
userFirstname   string        — cached at invite time; survives user account deletion
userLastname    string        — cached at invite time; survives user account deletion
userEmail       string
role            CenterRole    — OWNER | BRANCH_MANAGER | RECEPTIONIST | TECHNICIAN | ACCOUNTANT
roleAr          string        — bilingual label from backend
roleEn          string        — bilingual label from backend
status          MembershipStatus — INVITED | INVITATION_EXPIRED | INVITATION_DECLINED | ACTIVE | SUSPENDED | REMOVED
invitedByName   string?
activatedAt     string?
centerId        number
```

The `userFirstname` + `userLastname` pair cached in the membership record satisfies the "historical attribution after user account deletion" requirement — the name is stored on the membership, not fetched live from the user record.

### `MembershipStatus` (in `types/staff.ts`)

```
INVITED              — invitation sent, not yet accepted
INVITATION_EXPIRED   — invitation link expired
INVITATION_DECLINED  — invitee declined
ACTIVE               — member has accepted and is active
SUSPENDED            — temporarily deactivated by owner (bookings preserved)
REMOVED              — permanently removed (bookings preserved)
```

**Spec mapping**:
- "deactivate" in spec → `SUSPENDED` (reversible) — preferred for the "staff member leaves" flow
- "remove" → `REMOVED` (irreversible) — available but not the primary deactivation path
- "inactive user indicator" → displayed when `status === 'SUSPENDED' || status === 'REMOVED'`

### `CenterRole` (in `types/staff.ts`)

```
OWNER           — full permissions
BRANCH_MANAGER  — manage bookings, assign technicians, manage non-manager staff, edit profile
RECEPTIONIST    — manage bookings, manage chat, view calendar and price list
TECHNICIAN      — view assigned bookings, update work stage, upload media
ACCOUNTANT      — view revenue, read-only bookings, generate reports
```

### `ROLE_PERMISSIONS` (in `types/staff.ts`)

```
ASSIGN_TECHNICIAN      → OWNER, BRANCH_MANAGER
VIEW_ASSIGNED_BOOKINGS → TECHNICIAN (and implicitly all others via MANAGE_BOOKINGS)
MANAGE_NON_MANAGER_STAFF → OWNER, BRANCH_MANAGER
MANAGE_ALL_STAFF       → OWNER only
```

---

## Modified Entity

### `Booking` (in `store/api/bookingsApi.ts`) — EXTEND

Add two new nullable fields:

```
assignedMembershipId    number | null   — membership record of the assigned technician
assignedStaffName       string | null   — cached display name "Firstname Lastname"
```

**Validation rules**:
- `assignedMembershipId` must reference a `CenterMembership` with `status === 'ACTIVE'` and `role === 'TECHNICIAN'` at the same branch as the booking (enforced by backend)
- `assignedMembershipId === null` means unassigned — valid at any booking stage
- When `assignedMembershipId` is set, `assignedStaffName` is always populated (never null) — backend caches the name at assignment time

---

## New Frontend Artifacts

### `TechnicianPicker` component (NEW)

A reusable bottom sheet / modal that:
- Fetches active technicians using `useGetCenterStaffQuery({ status: 'ACTIVE' })` and filters to `role === 'TECHNICIAN'`
- Renders each technician as a selectable row with name and `RoleBadge`
- Has an "Unassign" option at the top (clears the assignment)
- Calls the provided `onSelect(membershipId: number | null)` callback on selection
- Shows a loading indicator while the assign mutation is in-flight
- Is wrapped by `PermissionGate permission="ASSIGN_TECHNICIAN"` at the call site (the picker itself has no permission logic)

**Props**:
```typescript
interface TechnicianPickerProps {
  visible: boolean;
  currentMembershipId: number | null;
  onSelect: (membershipId: number | null) => void;
  onClose: () => void;
}
```

---

## State Transitions

### Booking assignment state

```
Booking (unassigned)
  │
  ├─[owner/manager assigns technician]→ Booking (assignedMembershipId = X)
  │
  ├─[reassign to different technician]→ Booking (assignedMembershipId = Y)
  │
  └─[unassign]→ Booking (assignedMembershipId = null)
```

### Staff membership lifecycle

```
User (not staff)
  │
  ├─[owner invites]→ INVITED
  │    │
  │    ├─[invitee accepts]→ ACTIVE
  │    ├─[invitee declines]→ INVITATION_DECLINED
  │    └─[expires]→ INVITATION_EXPIRED
  │
  ├─[from ACTIVE: owner suspends]→ SUSPENDED
  │    └─[owner reinstates]→ ACTIVE
  │
  └─[from ACTIVE/SUSPENDED: owner removes]→ REMOVED
```

**Spec requirement alignment**:
- "deactivate": implemented as SUSPEND (preserves re-activation option)
- "historical attribution": `userFirstname`/`userLastname` stay on the membership record regardless of status
- "inactive user indicator": UI shows `MembershipStatusBadge` on historical booking records — SUSPENDED and REMOVED statuses use a distinct visual style

---

## i18n Keys Required

### New keys for `en.json` / `ar.json`

```json
{
  "bookings": {
    "assignTechnician": "Assign Technician",
    "assignedTo": "Assigned To",
    "unassigned": "Unassigned",
    "reassign": "Reassign",
    "unassignConfirm": "Remove technician assignment?",
    "assignSuccess": "Technician assigned successfully",
    "crossBranchError": "This technician does not belong to this branch"
  }
}
```

Arabic equivalents:
```json
{
  "bookings": {
    "assignTechnician": "تعيين فني",
    "assignedTo": "معين إلى",
    "unassigned": "غير معين",
    "reassign": "إعادة التعيين",
    "unassignConfirm": "إزالة تعيين الفني؟",
    "assignSuccess": "تم تعيين الفني بنجاح",
    "crossBranchError": "هذا الفني لا ينتمي إلى هذا الفرع"
  }
}
```
