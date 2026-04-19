# Research: Phase 7 — Chat & Notifications

**Branch**: `phase-7-chat-and-notifications` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Real-Time Chat — WebSocket/STOMP via @stomp/stompjs

**Decision**: `@stomp/stompjs` Client for WebSocket connection; `SockJS` as the transport fallback.

**Rationale**:
- Spring Boot backend uses Spring WebSocket with STOMP messaging protocol.
- `@stomp/stompjs` is the standard JS/TS STOMP client; works in React Native and web.
- Connection established in `chat/[id].tsx` on screen mount; disconnected on unmount.
- Subscribes to `/topic/conversation/{id}` for incoming messages.
- Publishes to `/app/chat/{id}/send` to send messages.

---

## Decision 2: REST API for Message History + WebSocket for Real-Time

**Decision**: `GET /conversations/{id}/messages` (paginated REST) loads history; WebSocket subscription receives new messages in real time.

**Rationale**:
- Avoids fetching all messages over WebSocket on connection — REST is more efficient for history.
- New messages arrive via STOMP subscription and are prepended/appended to local state.
- Pull-to-refresh on message list reloads from REST (page 0).

---

## Decision 3: Conversation List — REST Only, No WebSocket

**Decision**: `GET /conversations/center` (paginated REST) with `FlatList.onEndReached`.

**Rationale**:
- Conversation list updates are less time-sensitive than chat messages.
- Avoids complexity of a global WebSocket subscription for conversation-level events.
- `invalidatesTags: ['Conversations']` when a message is sent keeps the list fresh.

---

## Decision 4: Notification Read State — Two Endpoints

**Decision**: `PUT /notifications/{id}/read` for individual read, `PUT /notifications/read-all` for bulk mark-all-read.

**Rationale**:
- Center owners need both: mark a single notification read on tap, and clear the entire badge at once.
- `isRead` field (NOT `read`) drives the unread badge display.
- `invalidatesTags: ['Notifications']` on both mutations refreshes the list.

---

## Decision 5: Push Notifications — Expo Notifications + FCM Token Registration

**Decision**: `expo-notifications` for push notification permission and token; token registered via `PUT /users/me/push-token`.

**Rationale**:
- Expo handles the platform differences (APNs/FCM) transparently.
- Token registered immediately after login in `(app)/_layout.tsx`.
- `notificationType` (NOT `type`) and `isRead` (NOT `read`) match backend field names exactly.

---

## Decision 6: MessageType and SenderType Enums

**Decision**: `MessageType` and `SenderType` exported from `chatApi.ts` alongside the response types.

**Rationale**:
- Consistent with the booking enum pattern (exported from the relevant API slice).
- `SenderType: 'CENTER' | 'CUSTOMER'` determines message bubble alignment.
- `MessageType: 'TEXT' | 'IMAGE'` determines rendering mode.

---

## Resolved Clarifications

- ✅ Real-time: WebSocket/STOMP via `@stomp/stompjs`
- ✅ History: paginated REST; real-time: STOMP subscription
- ✅ Conversation list: REST only
- ✅ Notifications: individual + bulk mark-read endpoints
- ✅ Push: expo-notifications + FCM token via `PUT /users/me/push-token`
- ✅ Enums: exported from `chatApi.ts`
