# Quickstart: Staff Management Foundation

**Feature**: 015-staff-management-foundation  
**Date**: 2026-05-20

---

## What's Already Working

The staff roster management (invite, view, change role, suspend, reinstate, remove) is fully built and connects to live backend endpoints. The staff-side screens (dashboard, bookings, reviews, notifications, profile) are also built. To test existing flows:

1. Start the app: `npx expo start --web`
2. Log in as a CENTER_OWNER
3. Navigate to **Profile → Staff** to see the staff list
4. Tap **+** FAB to invite a staff member by email
5. Log in as the invited staff user (after accepting the invitation link)
6. Confirm routing lands at `/staff/dashboard`

---

## What Needs to Be Built (this feature)

### 1. Extend `Booking` type and add `assignTechnician` mutation

**File**: `store/api/bookingsApi.ts`

Add `assignedMembershipId: number | null` and `assignedStaffName: string | null` to the `Booking` interface.

Add `assignTechnician` mutation — see `contracts/booking-assignment.md` for the exact shape.

### 2. Add `getMyAssignedBookings` to staffApi

**File**: `store/api/staffApi.ts`

Add `getMyAssignedBookings` query targeting `GET /bookings/assigned` — see `contracts/booking-assignment.md`.

### 3. Build `TechnicianPicker` component

**File**: `components/bookings/TechnicianPicker.tsx` (new)

A Modal-based picker that:
- Calls `useGetCenterStaffQuery({ status: 'ACTIVE' })` 
- Filters result to `role === 'TECHNICIAN'`
- Renders a selectable list with name, `RoleBadge`
- First item is always "Unassign" (calls `onSelect(null)`)
- Calls `onSelect(membershipId)` on tap and closes
- Accepts `currentMembershipId` to mark current assignee

### 4. Add "Assign Technician" section to booking detail screens

**Files**:
- `app/(app)/(tabs)/bookings/[id].tsx` (owner view)
- `app/(app)/staff/bookings/[id].tsx` (staff view)

Wrap in `<PermissionGate permission="ASSIGN_TECHNICIAN">`. Show:
- Current assignee name (or `t('bookings.unassigned')` with muted style)
- "Assign" / "Reassign" button that opens `TechnicianPicker`
- On `onSelect` callback: call `assignTechnician` mutation; show success/error feedback

### 5. Add `showAssignedTo` prop to `BookingCard`

**File**: `components/bookings/BookingCard.tsx`

When `showAssignedTo={true}` (default false), render an extra row below the date/time row:
```
[person icon]  Ahmed Ali   (or "Unassigned" if null)
```

Pass `showAssignedTo={true}` from:
- Owner booking list (`app/(app)/(tabs)/bookings/index.tsx`)
- Branch manager's booking list in staff view (when `activeUserRole === 'BRANCH_MANAGER'`)

### 6. Role-gate staff booking list

**File**: `app/(app)/staff/bookings/index.tsx`

Read `activeUserRole` from Redux. If `'TECHNICIAN'`, use `useGetMyAssignedBookingsQuery` (from staffApi). Otherwise (`'BRANCH_MANAGER'`, `'RECEPTIONIST'`), keep using `useGetBookingsQuery`.

### 7. Intra-staff route guards

**File**: `app/(app)/staff/_layout.tsx`

Read `activePermissions` from `centerSlice`. For protected routes:
- `staff/pricing/*`: requires `MANAGE_PRICING` — redirect to `/staff/dashboard` if absent
- `staff/offers/*`: requires `MANAGE_OFFERS` — redirect to `/staff/dashboard` if absent

This prevents a Technician from deep-linking into pricing/offers screens.

### 8. Deactivation with active bookings error handling

**File**: `app/(app)/(tabs)/profile/staff/[id].tsx`

In `handleSuspend` and `handleRemove` catch blocks, check for `err?.data?.error === 'STAFF_HAS_ACTIVE_ASSIGNMENTS'`. If matched, show a targeted bilingual message with a "View Bookings" CTA that navigates to the bookings list.

### 9. i18n keys

**Files**: `lib/i18n/locales/en.json`, `lib/i18n/locales/ar.json`

Add keys from `data-model.md` i18n section.

---

## Testing the Complete Flow

### Owner assigns a technician

1. Log in as CENTER_OWNER
2. Open any CONFIRMED booking from the bookings tab
3. "Details" tab → "Assign Technician" section should appear
4. Tap "Assign" → `TechnicianPicker` opens
5. Select a Technician → booking detail updates to show their name
6. Open the bookings list → their name appears in the card

### Staff (Technician) sees only assigned bookings

1. Log in as STAFF user with `role === 'TECHNICIAN'`
2. Navigate to `/staff/bookings`
3. Only bookings assigned to them appear
4. A Technician should NOT see unrelated branch bookings

### Deactivation with active assignments

1. Log in as CENTER_OWNER
2. Go to Profile → Staff → pick an active Technician with assigned bookings
3. Try to Suspend them
4. Should see a specific error prompting to reassign bookings first

### Deep-link guard

1. Log in as STAFF user with `role === 'TECHNICIAN'`
2. Attempt to navigate to `/staff/pricing` directly (deep link)
3. Should redirect to `/staff/dashboard`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `store/api/bookingsApi.ts` | Add `assignTechnician` mutation, extend `Booking` type |
| `store/api/staffApi.ts` | Add `getMyAssignedBookings` query |
| `components/bookings/TechnicianPicker.tsx` | New assignment picker component |
| `components/bookings/BookingCard.tsx` | Add `showAssignedTo` prop |
| `app/(app)/(tabs)/bookings/[id].tsx` | Add assignment section (PermissionGate: ASSIGN_TECHNICIAN) |
| `app/(app)/staff/bookings/index.tsx` | Role-conditional query |
| `app/(app)/staff/bookings/[id].tsx` | Add assignment section (PermissionGate: ASSIGN_TECHNICIAN) |
| `app/(app)/staff/_layout.tsx` | Intra-staff route guards |
| `app/(app)/(tabs)/profile/staff/[id].tsx` | Deactivation error handling for active assignments |
| `lib/i18n/locales/en.json` | New i18n keys |
| `lib/i18n/locales/ar.json` | Arabic equivalents |
