# API Contract: Admin Panel

**Branch**: `012-admin-panel` | **Date**: 2026-04-30
**Base path**: `/api/v1/`
**Auth**: All endpoints require `Authorization: Bearer <jwt>` unless noted.

---

## Modified Endpoints

### POST /auth/register

Updated to accept optional `userType`.

**Request**
```json
{
  "firstname": "Fahd",
  "lastname": "Almutairi",
  "email": "fahd@example.com",
  "password": "P@ssw0rd1",
  "userType": "CENTER_OWNER"
}
```

`userType` is optional. Accepted values: `CUSTOMER`, `CENTER_OWNER`. Values `ADMIN` and `SUPER_ADMIN` are silently overridden to `CUSTOMER`. Omitting the field defaults to `CUSTOMER`.

**Response**: `202 Accepted` (unchanged)

---

### POST /auth/authenticate

Updated response to include `approvalStatus`.

**Request** (unchanged)
```json
{
  "email": "fahd@example.com",
  "password": "P@ssw0rd1"
}
```

**Response `200 OK`**
```json
{
  "token": "<jwt>",
  "approvalStatus": "PENDING_APPROVAL"
}
```

`approvalStatus` values:
- `"PENDING_APPROVAL"` — CENTER_OWNER awaiting admin review
- `"APPROVED"` — CENTER_OWNER approved
- `"REJECTED"` — never returned (login blocked, see below)
- `null` — CUSTOMER or ADMIN accounts

**Response `403 Forbidden`** — REJECTED CENTER_OWNER attempts login
```json
{
  "businessErrorCode": 305,
  "businessErrorDescription": "Account has been rejected by the platform administrator / تم رفض الحساب من قبل إدارة المنصة",
  "error": "Account rejected"
}
```

---

## New Endpoints

### GET /users/me

Returns the authenticated user's profile including `approvalStatus`.
Used by the frontend on session restore to re-check approval state.

**Auth**: Any authenticated user.

**Response `200 OK`**
```json
{
  "id": 10,
  "firstname": "Fahd",
  "lastname": "Almutairi",
  "email": "fahd@example.com",
  "userType": "CENTER_OWNER",
  "approvalStatus": "PENDING_APPROVAL",
  "enabled": true,
  "createdDate": "2026-04-30T10:09:29"
}
```

---

### GET /admin/users/pending

Returns paginated CENTER_OWNER accounts with `approvalStatus = PENDING_APPROVAL`, ordered by `createdDate` ascending.

**Auth**: `ROLE_ADMIN` required.

**Query parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int | `0` | Zero-based page index |
| `size` | int | `20` | Page size |

**Response `200 OK`**
```json
{
  "content": [
    {
      "id": 10,
      "firstname": "Fahd",
      "lastname": "Almutairi",
      "email": "fahd@example.com",
      "userType": "CENTER_OWNER",
      "approvalStatus": "PENDING_APPROVAL",
      "enabled": true,
      "createdDate": "2026-04-30T10:09:29"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Response `403 Forbidden`** — non-ADMIN token

---

### PUT /admin/users/{id}/approve

Sets `approvalStatus = APPROVED` for the given CENTER_OWNER.

**Auth**: `ROLE_ADMIN` required.

**Path parameter**: `id` — user ID (integer)

**Request body**: none

**Response `200 OK`**
```json
{
  "id": 10,
  "firstname": "Fahd",
  "lastname": "Almutairi",
  "email": "fahd@example.com",
  "userType": "CENTER_OWNER",
  "approvalStatus": "APPROVED",
  "enabled": true,
  "createdDate": "2026-04-30T10:09:29"
}
```

**Response `400 Bad Request`** — target user is not CENTER_OWNER
```json
{
  "businessErrorDescription": "Only CENTER_OWNER accounts can be approved",
  "error": "Invalid user type"
}
```

**Response `404 Not Found`** — user ID does not exist

---

### PUT /admin/users/{id}/reject

Sets `approvalStatus = REJECTED` for the given CENTER_OWNER.

**Auth**: `ROLE_ADMIN` required.

**Path parameter**: `id` — user ID (integer)

**Request body** (optional)
```json
{
  "reason": "Incomplete documents submitted"
}
```

**Response `200 OK`**
```json
{
  "id": 10,
  "firstname": "Fahd",
  "lastname": "Almutairi",
  "email": "fahd@example.com",
  "userType": "CENTER_OWNER",
  "approvalStatus": "REJECTED",
  "rejectionReason": "Incomplete documents submitted",
  "enabled": true,
  "createdDate": "2026-04-30T10:09:29"
}
```

**Response `400 Bad Request`** — target user is not CENTER_OWNER

**Response `404 Not Found`** — user ID does not exist

---

### GET /admin/users

Returns all users, optionally filtered by `userType`.

**Auth**: `ROLE_ADMIN` required.

**Query parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | `UserType` | (none) | Optional. Values: `CUSTOMER`, `CENTER_OWNER`, `ADMIN`, etc. |
| `page` | int | `0` | |
| `size` | int | `20` | |

**Response `200 OK`** — same `Page<UserResponse>` shape as `/admin/users/pending`

---

## Error Code Reference

| Code | HTTP | Description |
|------|------|-------------|
| 302 | 403 | ACCOUNT_LOCKED |
| 303 | 403 | ACCOUNT_DISABLED |
| 304 | 403 | BAD_CREDENTIALS |
| 305 | 403 | ACCOUNT_REJECTED (new) |
