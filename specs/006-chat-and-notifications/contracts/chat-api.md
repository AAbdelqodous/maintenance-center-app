# API Contract: Chat Endpoints

**Feature**: Phase 7 — Chat & Notifications
**Base path**: `/api/v1/conversations/`
**Auth**: `Authorization: Bearer <jwt>` required on all endpoints.
**WebSocket**: `ws://localhost:8080/ws` (STOMP over WebSocket)

---

## GET /conversations/center

Returns a paginated list of conversations for the authenticated center.

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
      "id": 10,
      "customerName": "Noor Al-Hassan",
      "lastMessage": "Is my car ready?",
      "lastMessageAt": "2026-04-02T11:30:00Z",
      "unreadCount": 2,
      "createdAt": "2026-03-28T09:00:00Z"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

## GET /conversations/{id}/messages

Returns paginated messages for a specific conversation.

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Conversation ID |

### Query Parameters

| Parameter | Type | Notes |
|-----------|------|-------|
| `page` | integer | 0-indexed |
| `size` | integer | Default `50` |

### Response `200 OK`

```json
{
  "content": [
    {
      "id": 101,
      "conversationId": 10,
      "content": "Is my car ready?",
      "messageType": "TEXT",
      "senderType": "CUSTOMER",
      "sentAt": "2026-04-02T11:30:00Z"
    },
    {
      "id": 102,
      "conversationId": 10,
      "content": "Yes, it's ready for pickup!",
      "messageType": "TEXT",
      "senderType": "CENTER",
      "sentAt": "2026-04-02T11:35:00Z"
    }
  ],
  "totalElements": 12,
  "totalPages": 1,
  "number": 0,
  "size": 50
}
```

**Field notes:**
- `senderType`: `"CENTER"` | `"CUSTOMER"` — determines bubble alignment
- `messageType`: `"TEXT"` | `"IMAGE"`

---

## POST /conversations/{id}/messages

Sends a new message in a conversation via REST (alternative to WebSocket).

### Path Parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `id` | integer | Conversation ID |

### Request Body

```json
{ "content": "Yes, it's ready for pickup!", "messageType": "TEXT" }
```

### Response `200 OK`

Returns the created `MessageResponse`.

---

## WebSocket — STOMP Protocol

**Connection URL**: `ws://localhost:8080/ws`

**Subscribe** (incoming messages):
```
/topic/conversation/{conversationId}
```

Message body: `MessageResponse` JSON

**Publish** (send message):
```
/app/chat/{conversationId}/send
```

Body: `{ "content": "...", "messageType": "TEXT" }`

**Auth**: Send JWT in STOMP CONNECT headers:
```javascript
client.connectHeaders = { Authorization: `Bearer ${token}` };
```
