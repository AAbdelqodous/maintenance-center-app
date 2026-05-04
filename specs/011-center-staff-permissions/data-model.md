# Data Model: Center Staff & Permissions

**Branch**: `011-center-staff-permissions` | **Date**: 2026-04-27

---

## Backend — Database Schema

### New Table: `center_membership`

```sql
CREATE TABLE center_membership (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES _user(id),
    center_id           BIGINT NOT NULL REFERENCES maintenance_centers(id),
    role                VARCHAR(30) NOT NULL,   -- CenterRole enum value
    status              VARCHAR(30) NOT NULL,   -- MembershipStatus enum value
    invited_by_user_id  BIGINT REFERENCES _user(id),
    created_at          TIMESTAMP NOT NULL,
    activated_at        TIMESTAMP,
    suspended_at        TIMESTAMP,
    removed_at          TIMESTAMP,
    last_modified_at    TIMESTAMP NOT NULL
);

-- Only one ACTIVE or SUSPENDED membership per (user, center) pair
CREATE UNIQUE INDEX uq_membership_active_suspended
    ON center_membership(user_id, center_id)
    WHERE status IN ('ACTIVE', 'SUSPENDED');
```

**Constraints:**
- `role` must be one of: `OWNER`, `BRANCH_MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `ACCOUNTANT`
- `status` must be one of: `INVITED`, `INVITATION_EXPIRED`, `INVITATION_DECLINED`, `ACTIVE`, `SUSPENDED`, `REMOVED`
- `invited_by_user_id` is null only for auto-created OWNER memberships (migration backfill)

---

### New Table: `staff_invitation`

```sql
CREATE TABLE staff_invitation (
    id                  BIGSERIAL PRIMARY KEY,
    center_id           BIGINT NOT NULL REFERENCES maintenance_centers(id),
    inviter_user_id     BIGINT NOT NULL REFERENCES _user(id),
    target_email        VARCHAR(255) NOT NULL,
    target_role         VARCHAR(30) NOT NULL,
    token_hash          VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hex of raw token
    status              VARCHAR(30) NOT NULL,          -- PENDING, REDEEMED, DECLINED, EXPIRED, CANCELLED
    expires_at          TIMESTAMP NOT NULL,
    redeemed_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL
);

CREATE INDEX idx_invitation_center ON staff_invitation(center_id);
CREATE INDEX idx_invitation_email  ON staff_invitation(target_email);
```

**Constraints:**
- `expires_at` = `created_at + app.staff.invitation-expiry-days` (default: 7 days)
- Only one `PENDING` invitation per `(target_email, center_id)` pair; new invite auto-cancels the previous
- `token_hash` is never returned in any API response

---

### New Table: `booking_status_history`

```sql
CREATE TABLE booking_status_history (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES booking(id),
    acting_user_id      BIGINT NOT NULL REFERENCES _user(id),
    acting_role         VARCHAR(30) NOT NULL,
    old_status          VARCHAR(30),
    new_status          VARCHAR(30) NOT NULL,
    notes               TEXT,
    acted_at            TIMESTAMP NOT NULL
);

CREATE INDEX idx_bsh_booking ON booking_status_history(booking_id);
```

**Notes:**
- Rows are insert-only — no UPDATE or DELETE ever issued by application code (NFR-004)
- `acting_role` is the role at the time of the action, captured at write time
- Also used for work-stage transitions (new_status = work stage value)

---

## Backend — Java Enums & Entities

### `CenterRole` enum (with permission mapping)

```java
public enum CenterRole {
    OWNER(EnumSet.allOf(CenterPermission.class)),

    BRANCH_MANAGER(EnumSet.of(
        MANAGE_BOOKINGS, ASSIGN_TECHNICIAN, MANAGE_CHAT,
        RESPOND_REVIEWS, EDIT_CENTER_PROFILE,
        MANAGE_NON_MANAGER_STAFF, VIEW_REVENUE, VIEW_REPORTS
    )),

    RECEPTIONIST(EnumSet.of(
        MANAGE_BOOKINGS, MANAGE_CHAT,
        VIEW_CALENDAR, VIEW_BOOKING_BASIC, VIEW_PRICE_LIST
    )),

    TECHNICIAN(EnumSet.of(
        VIEW_ASSIGNED_BOOKINGS, UPDATE_WORK_STAGE, UPLOAD_PROGRESS_MEDIA
    )),

    ACCOUNTANT(EnumSet.of(
        VIEW_REVENUE, VIEW_BOOKINGS_READONLY, GENERATE_REPORTS
    ));

    private final Set<CenterPermission> permissions;

    CenterRole(Set<CenterPermission> permissions) {
        this.permissions = Collections.unmodifiableSet(permissions);
    }

    public boolean hasPermission(CenterPermission p) {
        return permissions.contains(p);
    }
}
```

### `CenterPermission` enum

```java
public enum CenterPermission {
    // Booking management
    MANAGE_BOOKINGS,         // accept, reject, reschedule, cancel
    ASSIGN_TECHNICIAN,       // assign/reassign bookings to technicians
    VIEW_BOOKING_BASIC,      // view bookings without financials
    VIEW_BOOKINGS_READONLY,  // read-only, all fields
    UPDATE_WORK_STAGE,       // advance repair stage
    UPLOAD_PROGRESS_MEDIA,   // attach photos to progress entries

    // Communication
    MANAGE_CHAT,             // send and receive customer messages
    RESPOND_REVIEWS,         // post owner replies to reviews

    // Center management
    EDIT_CENTER_PROFILE,     // update center info, hours, images

    // Staff management
    MANAGE_NON_MANAGER_STAFF, // invite/suspend/remove Technicians & Receptionists
    MANAGE_ALL_STAFF,         // invite/suspend/remove anyone (OWNER only via FULL_ACCESS)

    // Financial visibility
    VIEW_REVENUE,            // see revenue metrics and payment amounts
    VIEW_PRICE_LIST,         // read-only published service price ranges
    VIEW_REPORTS,            // access analytics/reporting
    GENERATE_REPORTS,        // export reports

    // Scheduling
    VIEW_CALENDAR,           // view booking calendar
}
```

### `MembershipStatus` enum

```java
public enum MembershipStatus {
    INVITED,
    INVITATION_EXPIRED,
    INVITATION_DECLINED,
    ACTIVE,
    SUSPENDED,
    REMOVED
}
```

### `InvitationStatus` enum

```java
public enum InvitationStatus {
    PENDING,
    REDEEMED,
    DECLINED,
    EXPIRED,
    CANCELLED
}
```

---

## Backend — DTOs

### `MembershipResponse`
```json
{
  "id": 42,
  "userId": 7,
  "userFirstname": "Mohammed",
  "userLastname": "Al-Rashidi",
  "userEmail": "mohammed@example.com",
  "role": "TECHNICIAN",
  "roleAr": "فني",
  "roleEn": "Technician",
  "status": "ACTIVE",
  "invitedByName": "Ahmed Al-Sayed",
  "activatedAt": "2026-04-20T09:15:00",
  "centerId": 5
}
```

### `InviteStaffRequest`
```json
{
  "targetEmail": "mohammed@example.com",
  "targetRole": "TECHNICIAN"
}
```

### `UpdateMembershipRequest`
```json
{
  "role": "BRANCH_MANAGER"
}
```

### `InvitationDetailsResponse` (public — returned for token lookup)
```json
{
  "id": 12,
  "centerNameAr": "مركز أحمد للصيانة",
  "centerNameEn": "Ahmed Maintenance Center",
  "centerLogoUrl": "https://…/logo.jpg",
  "inviterName": "Ahmed Al-Sayed",
  "targetRole": "TECHNICIAN",
  "roleAr": "فني",
  "roleEn": "Technician",
  "expiresAt": "2026-05-04T10:00:00",
  "status": "PENDING"
}
```

### `MembershipSummaryResponse` (for center selector)
```json
{
  "centerId": 5,
  "centerNameAr": "مركز أحمد للصيانة",
  "centerNameEn": "Ahmed Maintenance Center",
  "centerLogoUrl": "https://…/logo.jpg",
  "role": "TECHNICIAN",
  "roleAr": "فني",
  "roleEn": "Technician",
  "status": "ACTIVE"
}
```

---

## Frontend — TypeScript Types

**File: `types/staff.ts`** (new)

```typescript
export type CenterRole =
  | 'OWNER'
  | 'BRANCH_MANAGER'
  | 'RECEPTIONIST'
  | 'TECHNICIAN'
  | 'ACCOUNTANT';

export type MembershipStatus =
  | 'INVITED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_DECLINED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REMOVED';

export type CenterPermission =
  | 'MANAGE_BOOKINGS'
  | 'ASSIGN_TECHNICIAN'
  | 'VIEW_BOOKING_BASIC'
  | 'VIEW_BOOKINGS_READONLY'
  | 'UPDATE_WORK_STAGE'
  | 'UPLOAD_PROGRESS_MEDIA'
  | 'MANAGE_CHAT'
  | 'RESPOND_REVIEWS'
  | 'EDIT_CENTER_PROFILE'
  | 'MANAGE_NON_MANAGER_STAFF'
  | 'MANAGE_ALL_STAFF'
  | 'VIEW_REVENUE'
  | 'VIEW_PRICE_LIST'
  | 'VIEW_REPORTS'
  | 'GENERATE_REPORTS'
  | 'VIEW_CALENDAR';

export interface CenterMembership {
  id: number;
  userId: number;
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  role: CenterRole;
  roleAr: string;
  roleEn: string;
  status: MembershipStatus;
  invitedByName?: string;
  activatedAt?: string;
  centerId: number;
}

export interface MembershipSummary {
  centerId: number;
  centerNameAr: string;
  centerNameEn: string;
  centerLogoUrl?: string;
  role: CenterRole;
  roleAr: string;
  roleEn: string;
  status: MembershipStatus;
}

export interface InvitationDetails {
  id: number;
  centerNameAr: string;
  centerNameEn: string;
  centerLogoUrl?: string;
  inviterName: string;
  targetRole: CenterRole;
  roleAr: string;
  roleEn: string;
  expiresAt: string;
  status: 'PENDING' | 'REDEEMED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
}

export interface InviteStaffRequest {
  targetEmail: string;
  targetRole: CenterRole;
}

// Role → permissions mapping (mirrors backend CenterRole enum)
export const ROLE_PERMISSIONS: Record<CenterRole, CenterPermission[]> = {
  OWNER: [
    'MANAGE_BOOKINGS', 'ASSIGN_TECHNICIAN', 'VIEW_BOOKING_BASIC',
    'VIEW_BOOKINGS_READONLY', 'UPDATE_WORK_STAGE', 'UPLOAD_PROGRESS_MEDIA',
    'MANAGE_CHAT', 'RESPOND_REVIEWS', 'EDIT_CENTER_PROFILE',
    'MANAGE_NON_MANAGER_STAFF', 'MANAGE_ALL_STAFF',
    'VIEW_REVENUE', 'VIEW_PRICE_LIST', 'VIEW_REPORTS', 'GENERATE_REPORTS', 'VIEW_CALENDAR',
  ],
  BRANCH_MANAGER: [
    'MANAGE_BOOKINGS', 'ASSIGN_TECHNICIAN', 'MANAGE_CHAT', 'RESPOND_REVIEWS',
    'EDIT_CENTER_PROFILE', 'MANAGE_NON_MANAGER_STAFF', 'VIEW_REVENUE', 'VIEW_REPORTS',
  ],
  RECEPTIONIST: [
    'MANAGE_BOOKINGS', 'MANAGE_CHAT', 'VIEW_CALENDAR', 'VIEW_BOOKING_BASIC', 'VIEW_PRICE_LIST',
  ],
  TECHNICIAN: [
    'VIEW_ASSIGNED_BOOKINGS', 'UPDATE_WORK_STAGE', 'UPLOAD_PROGRESS_MEDIA',
  ],
  ACCOUNTANT: [
    'VIEW_REVENUE', 'VIEW_BOOKINGS_READONLY', 'GENERATE_REPORTS',
  ],
};
```

---

## Frontend — Redux State Extensions

### `store/centerSlice.ts` — extended shape

```typescript
interface CenterState {
  activeCenterId: number | null;
  activeUserRole: CenterRole | null;       // NEW
  activePermissions: CenterPermission[];   // NEW
}

// New action: setActiveCenter
setActiveCenter(state, action: PayloadAction<{
  centerId: number;
  role: CenterRole;
  permissions: CenterPermission[];
}>) { ... }
```

### `store/authSlice.ts` — extended shape

```typescript
interface AuthState {
  session: {
    token: string;
    email: string;
    userType: 'CUSTOMER' | 'OWNER' | 'ADMIN' | null;  // NEW
  } | null;
}
```

---

## Frontend — Zod Schemas

**File: `components/staff/staffSchema.ts`** (new)

```typescript
import { z } from 'zod';

export const inviteStaffSchema = z.object({
  targetEmail: z.string().email({ message: 'validation.invalidEmail' }),
  targetRole: z.enum([
    'BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'
  ], { required_error: 'validation.required' }),
  // OWNER is never invitable — it's excluded from the enum
});

export type InviteStaffFormData = z.infer<typeof inviteStaffSchema>;
```

---

## Frontend — RTK Slice Shape

**File: `store/api/staffApi.ts`** (new)

```typescript
export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Staff list for the active center
    getCenterStaff: builder.query<PageResponse<CenterMembership>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) =>
        `centers/my/staff?page=${page}&size=${size}`,
      providesTags: ['Staff'],
    }),

    // Send invitation
    inviteStaff: builder.mutation<{ invitationId: number }, InviteStaffRequest>({
      query: (body) => ({ url: 'centers/my/staff/invite', method: 'POST', body }),
      invalidatesTags: ['Staff'],
    }),

    // Change role
    updateMembershipRole: builder.mutation<CenterMembership, { membershipId: number; role: CenterRole }>({
      query: ({ membershipId, role }) => ({
        url: `centers/my/staff/${membershipId}`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['Staff'],
    }),

    // Remove
    removeMember: builder.mutation<void, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),

    // Suspend
    suspendMember: builder.mutation<CenterMembership, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}/suspend`,
        method: 'PUT',
      }),
      invalidatesTags: ['Staff'],
    }),

    // Reinstate
    reinstateMember: builder.mutation<CenterMembership, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}/reinstate`,
        method: 'PUT',
      }),
      invalidatesTags: ['Staff'],
    }),

    // Self-leave
    leaveCenter: builder.mutation<void, void>({
      query: () => ({ url: 'centers/my/staff/leave', method: 'DELETE' }),
      invalidatesTags: ['Staff'],
    }),

    // Invitation token lookup (public-ish)
    getInvitationDetails: builder.query<InvitationDetails, string>({
      query: (token) => `invitations/${token}`,
    }),

    // Accept invitation
    acceptInvitation: builder.mutation<CenterMembership, string>({
      query: (token) => ({ url: `invitations/${token}/accept`, method: 'POST' }),
      invalidatesTags: ['Staff'],
    }),

    // Decline invitation
    declineInvitation: builder.mutation<void, string>({
      query: (token) => ({ url: `invitations/${token}/decline`, method: 'POST' }),
    }),

    // Resend invitation
    resendInvitation: builder.mutation<{ invitationId: number }, number>({
      query: (invitationId) => ({
        url: `centers/my/staff/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: ['Staff'],
    }),

    // All memberships for the logged-in user (center selector)
    getMyMemberships: builder.query<MembershipSummary[], void>({
      query: () => 'users/me/memberships',
      providesTags: ['Staff'],
    }),
  }),
});
```

---

## State Transition Diagrams

### Membership Status

```
(invited) ──accept──→ ACTIVE ──suspend──→ SUSPENDED ──reinstate──→ ACTIVE
                         │                                              │
                      remove / leave                               remove
                         ↓                                             ↓
                      REMOVED                                       REMOVED

INVITED ──expire──→ INVITATION_EXPIRED
INVITED ──decline──→ INVITATION_DECLINED
INVITATION_EXPIRED ──resend──→ INVITED (new invitation row)
INVITATION_DECLINED ──resend──→ INVITED (new invitation row)
```

### Invitation Status

```
PENDING ──redeem──→ REDEEMED
PENDING ──decline──→ DECLINED
PENDING ──TTL expires──→ EXPIRED (scheduled job or lazy check on lookup)
PENDING ──new invite for same email+center──→ CANCELLED
```
