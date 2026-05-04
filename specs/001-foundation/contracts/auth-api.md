# API Contract: Authentication & Session Endpoints

**Feature**: Phase 1 — Foundation
**Base path**: `/api/v1/auth/` and `/api/v1/users/`
**Auth**: No auth required on `/auth/*` endpoints. `Authorization: Bearer <jwt>` required on `/users/*`.

---

## POST /auth/register

Registers a new center owner. Account starts in `PENDING_APPROVAL` state.

### Request Body

```json
{
  "firstname": "Ahmed",
  "lastname": "Al-Rashid",
  "email": "owner@example.com",
  "password": "SecurePass123!",
  "userType": "OWNER"
}
```

### Response `202 Accepted`

No body. Sends an OTP verification email.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (missing fields, invalid email format) |
| `409` | Email already registered |

---

## POST /auth/authenticate

Authenticates a registered, verified center owner.

### Request Body

```json
{ "email": "owner@example.com", "password": "SecurePass123!" }
```

### Response `200 OK`

```json
{
  "token": "<jwt>",
  "approvalStatus": "APPROVED"
}
```

| Field | Notes |
|-------|-------|
| `token` | JWT, expires in 8640000ms (2.4 hours) |
| `approvalStatus` | `APPROVED` \| `PENDING_APPROVAL` \| `REJECTED` |

### Error Responses

| Status | Condition |
|--------|-----------|
| `401` | Invalid credentials |
| `403` | Account locked / not activated |
| `500` | Account `REJECTED` — blocked at login |

---

## GET /auth/activate-account?token=XXXXXX

Activates an account using the 6-digit OTP sent by email.

### Query Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `token` | string | 6-digit numeric OTP |

### Response `200 OK`

No body. Account activated.

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Invalid or expired OTP |

---

## GET /users/me

Returns the current authenticated user's profile and approval status.

### Response `200 OK`

```json
{
  "id": 42,
  "email": "owner@example.com",
  "firstname": "Ahmed",
  "lastname": "Al-Rashid",
  "userType": "OWNER",
  "approvalStatus": "APPROVED"
}
```

Used by `(app)/_layout.tsx` on session restore to re-check `approvalStatus`.

---

## PUT /users/me/push-token

Registers or updates the device FCM/APNs push token.

### Request Body

```json
{ "token": "<expo-push-token-or-fcm-token>" }
```

### Response `200 OK`

No body.

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 401,
  "businessErrorDescription": "Authentication failed",
  "error": "Invalid credentials",
  "validationErrors": []
}
```
