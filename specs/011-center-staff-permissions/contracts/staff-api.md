# API Contract: Center Staff & Permissions

**Branch**: `011-center-staff-permissions` | **Date**: 2026-04-27  
**Base URL**: `/api/v1/`  
**Auth**: All endpoints require `Authorization: Bearer <jwt>` unless marked `[PUBLIC-TOKEN]`.

---

## Staff Management (center-scoped, `/centers/my/staff/`)

All `/centers/my/staff/*` endpoints resolve the caller's active center via existing `/my/` convention. Callers must have an `ACTIVE` membership with the required permission.

---

### `GET /centers/my/staff`

Lists all membership rows for the active center.

**Required permission**: `MANAGE_NON_MANAGER_STAFF` or `MANAGE_ALL_STAFF`  
**Query params**: `page` (default 0), `size` (default 20), `status` (optional filter)

**Response `200 OK`**:
```json
{
  "content": [
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
  ],
  "totalElements": 8,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

### `POST /centers/my/staff/invite`

Sends an invitation to a new staff member.

**Required permission**: `MANAGE_NON_MANAGER_STAFF` (for TECHNICIAN/RECEPTIONIST) or `MANAGE_ALL_STAFF` (for BRANCH_MANAGER/ACCOUNTANT)  
**Request body**:
```json
{
  "targetEmail": "mohammed@example.com",
  "targetRole": "TECHNICIAN"
}
```

**Validation errors**:
- `targetEmail` is the caller's own email → `400 BAD_REQUEST` "Cannot invite yourself"
- `targetEmail` belongs to an `ADMIN` → `400 BAD_REQUEST` "Admins cannot be invited as staff"
- Active + invited member count ≥ 50 → `400 BAD_REQUEST` "Staff limit reached"
- Caller lacks permission for the target role → `403 FORBIDDEN`

**Response `201 Created`**:
```json
{ "invitationId": 12 }
```

**Side effects**:
- Cancels any previous `PENDING` invitation for the same `(targetEmail, centerId)`
- Sends invitation email (always)
- Sends push notification if target email matches a user with registered FCM token (non-blocking)

---

### `PUT /centers/my/staff/{membershipId}`

Changes the role of an existing member.

**Required permission**: `MANAGE_ALL_STAFF` (only OWNER can change to/from BRANCH_MANAGER+)  
**Request body**:
```json
{ "role": "BRANCH_MANAGER" }
```

**Validation errors**:
- `membershipId` belongs to an OWNER → `400 BAD_REQUEST` "Cannot change Owner role"
- Caller does not have sufficient rank → `403 FORBIDDEN`

**Response `200 OK`**: `MembershipResponse`

**Side effects**: Evicts membership cache entry for the affected user+center.

---

### `DELETE /centers/my/staff/{membershipId}`

Removes a staff member.

**Required permission**: `MANAGE_NON_MANAGER_STAFF` (TECHNICIAN/RECEPTIONIST only) or `MANAGE_ALL_STAFF`

**Validation errors**:
- `membershipId` is the caller's own membership → `400 BAD_REQUEST` "Owners cannot remove themselves"
- `membershipId` is an OWNER membership → `400 BAD_REQUEST` "Cannot remove center Owner"

**Response `204 No Content`**

**Side effects**:
- Sets membership status to `REMOVED`, records `removed_at`
- Evicts membership cache (effective within 60 seconds)
- If removed member had open assigned bookings: notifies all BRANCH_MANAGERs and OWNER, marks those bookings as unassigned
- Notifies removed member

---

### `PUT /centers/my/staff/{membershipId}/suspend`

Temporarily suspends a staff member.

**Required permission**: `MANAGE_NON_MANAGER_STAFF` (TECHNICIAN/RECEPTIONIST) or `MANAGE_ALL_STAFF`

**Response `200 OK`**: `MembershipResponse` with `status: "SUSPENDED"`

**Side effects**: Evicts membership cache. Open bookings are NOT auto-reassigned (suspension is reversible).

---

### `PUT /centers/my/staff/{membershipId}/reinstate`

Reinstates a suspended member to `ACTIVE`.

**Required permission**: same as suspend  
**Response `200 OK`**: `MembershipResponse` with `status: "ACTIVE"`  
**Side effects**: Re-populates membership cache on next request.

---

### `DELETE /centers/my/staff/leave`

Authenticated user voluntarily leaves the active center.

**Required permission**: Any `ACTIVE` membership (no specific permission required — it is self-service)

**Validation errors**:
- Caller is the OWNER of the center → `400 BAD_REQUEST` "Owners cannot leave. Transfer ownership first."

**Response `204 No Content`**

**Side effects**: Same as remove — status → REMOVED, cache evicted, notifications sent to Owner + Branch Managers.

---

### `POST /centers/my/staff/invitations/{invitationId}/resend`

Re-sends an expired or declined invitation, generating a fresh token.

**Required permission**: `MANAGE_NON_MANAGER_STAFF` or `MANAGE_ALL_STAFF`

**Response `200 OK`**: `{ "invitationId": 13 }` (new invitation id)

---

## Invitation Redemption (token-authenticated)

These endpoints use the raw invitation token as path parameter. The token is single-use and time-limited.

---

### `GET /invitations/{token}` `[PUBLIC-TOKEN]`

Returns invitation details for display to the invitee before acceptance.

**Auth**: Bearer token optional. If authenticated, includes a `userEmailMatch: boolean` field.

**Response `200 OK`**: `InvitationDetailsResponse`

**Error responses**:
- Token not found → `404 NOT FOUND`
- Token expired → `410 GONE` `{ "status": "INVITATION_EXPIRED" }`
- Token already redeemed → `410 GONE` `{ "status": "REDEEMED" }`
- Token declined → `410 GONE` `{ "status": "DECLINED" }`

---

### `POST /invitations/{token}/accept`

Accepts the invitation. Creates or activates the membership.

**Auth**: `Authorization: Bearer <jwt>` required. The authenticated user's email must match `staff_invitation.target_email`.

**Validation errors**:
- Authenticated user email ≠ invitation target email → `403 FORBIDDEN` "This invitation was sent to a different email address"
- Invitation not in `PENDING` status → `410 GONE`

**Response `201 Created`**: `MembershipResponse`

**Side effects** (atomic):
1. Sets invitation status → `REDEEMED`, sets `redeemed_at`
2. Creates/updates `center_membership` row to `ACTIVE`, sets `activated_at`
3. Notifies inviter that the invitation was accepted

---

### `POST /invitations/{token}/decline`

Declines the invitation.

**Auth**: Bearer token optional (anyone with the link can decline).

**Response `204 No Content`**

**Side effects**:
1. Sets invitation status → `DECLINED`
2. Sets membership status → `INVITATION_DECLINED`
3. Notifies inviter

---

## Membership Discovery

### `GET /users/me/memberships`

Returns all `ACTIVE` memberships for the authenticated user. Used by the center selector screen.

**Auth**: Bearer token required.

**Response `200 OK`**:
```json
[
  {
    "centerId": 5,
    "centerNameAr": "مركز أحمد للصيانة",
    "centerNameEn": "Ahmed Maintenance Center",
    "centerLogoUrl": "https://…/logo.jpg",
    "role": "OWNER",
    "roleAr": "مالك",
    "roleEn": "Owner",
    "status": "ACTIVE"
  },
  {
    "centerId": 9,
    "centerNameAr": "مركز النخبة",
    "centerNameEn": "Elite Center",
    "centerLogoUrl": null,
    "role": "RECEPTIONIST",
    "roleAr": "موظف استقبال",
    "roleEn": "Receptionist",
    "status": "ACTIVE"
  }
]
```

**Notes**:
- Returns an array (not paginated) — callers with 50+ centers will see a large list; client shows a search field when count > 10 (EC-10)
- Covers both owned centers (via OWNER membership) and staff memberships

---

## Error Response Format

All permission errors follow the existing `BusinessErrorCode` pattern:

```json
{
  "businessErrorCode": 403,
  "businessErrorDescription": "Insufficient center permissions",
  "error": "FORBIDDEN",
  "validationErrors": []
}
```

New business error codes to add:

| Code | Description |
|------|-------------|
| 3001 | `STAFF_LIMIT_REACHED` — center has 50 active+invited members |
| 3002 | `CANNOT_INVITE_SELF` — inviter email matches target email |
| 3003 | `CANNOT_INVITE_ADMIN` — target is a platform admin |
| 3004 | `INVITATION_NOT_PENDING` — token already used/expired |
| 3005 | `INVITATION_EMAIL_MISMATCH` — authenticated user email ≠ invitation target |
| 3006 | `CANNOT_REMOVE_OWNER` — attempt to remove the sole owner |
| 3007 | `INSUFFICIENT_ROLE_SCOPE` — branch manager trying to act on peer/superior |
