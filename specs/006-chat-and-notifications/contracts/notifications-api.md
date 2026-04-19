# API Contract: Notification Endpoints

**Feature**: Phase 7 — Chat & Notifications
**Base path**: `/api/v1/notifications/`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**Scope**: Returns only notifications for the authenticated center owner.

---

## GET /notifications

Returns a paginated list of notifications.

### Query Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `page` | integer | No | 0-indexed, default `0` |
| `size` | integer | No | Default `20` |

### Response `200 OK`

```json
{
  "content": [
    {
      "id": 55,
      "notificationType": "BOOKING_REQUEST",
      "notificationPriority": "HIGH",
      "title": "New Booking Request",
      "body": "Ali Al-Fahad has requested a booking for April 10.",
      "isRead": false,
      "relatedEntityId": 88,
      "createdAt": "2026-04-02T09:00:00Z"
    },
    {
      "id": 54,
      "notificationType": "NEW_REVIEW",
      "notificationPriority": "MEDIUM",
      "title": "New Review",
      "body": "Sara Al-Mutairi left a 5-star review.",
      "isRead": true,
      "relatedEntityId": 5,
      "createdAt": "2026-04-01T16:00:00Z"
    }
  ],
  "totalElements": 12,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Field notes:**
- `notificationType` — NOT `type`
- `isRead` — NOT `read`
- `relatedEntityId` — ID of the related booking, review, or message

---

## PUT /notifications/{id}/read

Marks a single notification as read.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Notification ID |

### Response `200 OK`

No body.

### Error Responses

| Status | Condition |
|--------|-----------|
| `404` | Notification not found or does not belong to this owner |

---

## PUT /notifications/read-all

Marks all unread notifications for the authenticated center owner as read.

### Response `200 OK`

No body.

---

## Push Token Registration

Push token registration is handled by the auth module:

```
PUT /users/me/push-token
Body: { "token": "<expo-push-token-or-fcm-token>" }
Response: 200 OK (no body)
```

Called once after login from `(app)/_layout.tsx` via `authApi.updatePushToken`.

---

## Error Response Shape (all endpoints)

```json
{
  "businessErrorCode": 404,
  "businessErrorDescription": "Notification not found",
  "error": "Resource not found",
  "validationErrors": []
}
```
