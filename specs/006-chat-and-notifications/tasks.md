# Tasks: Phase 7 — Chat & Notifications

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-7-chat-and-notifications`

---

## Phase 1: Foundational

- [x] T001 Create `store/api/notificationsApi.ts` — endpoints:
  - `getNotifications({ page, size })` → `PageResponse<NotificationResponse>` (`GET /notifications`)
  - `markNotificationRead(id)` → void (`PUT /notifications/{id}/read`), invalidates `'Notifications'`
  - `markAllRead()` → void (`PUT /notifications/read-all`), invalidates `'Notifications'`
  - Tag: `'Notifications'`
- [x] T002 Create `store/api/chatApi.ts` — endpoints:
  - `getConversations({ page, size })` → `PageResponse<ConversationResponse>` (`GET /conversations/center`)
  - `getMessages({ id, page, size })` → `PageResponse<MessageResponse>` (`GET /conversations/{id}/messages`)
  - `sendMessage({ id, content, messageType })` → `MessageResponse` (`POST /conversations/{id}/messages`), invalidates `'Conversations'`
  - Tag: `'Conversations'`
- [x] T003 Add `WS_URL` to `lib/constants/config.ts` — derived from `API_BASE_URL.replace('http', 'ws').replace('/api/v1/', '/ws')`

---

## Phase 2: User Story 1 — Notifications List (P1)

**Goal**: Owner sees all notifications with unread indicators; tap navigates to relevant screen; "Mark all read" works.

- [x] T004 Create `app/(app)/(tabs)/notifications/index.tsx` — notifications screen:
  - `useGetNotificationsQuery({ page })` with `FlatList` + pagination
  - Each item: type icon (Ionicons mapped per `notificationType`), title, short description, relative timestamp ("2 min ago")
  - Unread items: blue left-border or bold text or blue dot indicator
  - On tap: `markNotificationRead(id)` + navigate to relevant screen based on `notificationType`
  - "Mark all as read" header button: `markAllRead()`
  - Empty state: "No notifications yet."
  - Pull-to-refresh via `refetch()`

---

## Phase 3: User Story 2 — Push Notifications (P1)

**Goal**: Owner receives push alerts when app is closed; tap deep-links to correct screen.

- [x] T005 Install and configure `expo-notifications` — request permission on first launch (`Notifications.requestPermissionsAsync()`)
- [x] T006 Register FCM/APNs token after permission granted:
  - `Notifications.getExpoPushTokenAsync()` → call `PUT /users/me/push-token { token }` via authApi
  - Re-register on each app launch (token may rotate)
- [x] T007 Add notification tap handler in `app/(app)/_layout.tsx` or root layout:
  - `Notifications.addNotificationResponseReceivedListener(response => { /* parse data.url or type and router.push(...) */ })`
  - Deep link mapping: `BOOKING` type → `/bookings/${id}`, `MESSAGE` → `/chat/${conversationId}`, `REVIEW` → `/reviews`
- [x] T008 Add in-app notification banner for foreground notifications (does not replace current screen):
  - `Notifications.addNotificationReceivedListener` → show a dismissible top banner (`Animated.View`)

---

## Phase 4: User Story 3 — Chat List & Thread (P1)

**Goal**: Conversations list with unread badge; chat thread with send + real-time WebSocket.

- [x] T009 [P] Create `components/chat/MessageBubble.tsx`:
  - Props: `{ message: MessageResponse; isOwner: boolean }`
  - Owner messages: right-aligned blue bubble
  - Customer messages: left-aligned grey bubble
  - Timestamp below bubble
  - Mixed RTL/LTR: `writingDirection` or `textAlign` per message content locale
- [x] T010 Create `app/(app)/(tabs)/chat/_layout.tsx` — Stack navigator for chat
- [x] T011 Create `app/(app)/(tabs)/chat/index.tsx` — conversation list:
  - `useGetConversationsQuery({ page })` with `FlatList`
  - Each row: customer name, last message preview (max 50 chars), timestamp, unread count badge
  - Tap → navigate to `./[id]`
  - Pull-to-refresh
- [x] T012 Create `app/(app)/(tabs)/chat/[id].tsx` — chat thread screen:
  - `useGetMessagesQuery({ id })` → `FlatList` (inverted for bottom-up display)
  - Pagination (load older messages on scroll to top)
  - `useSendMessageMutation()` on send button → clears input, appends message to list optimistically
  - Message send failure: error state on failed message + retry button
  - **WebSocket/STOMP real-time**:
    ```typescript
    import { Client } from '@stomp/stompjs';
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => client.subscribe(`/topic/conversation/${id}`, (frame) => {
        const message = JSON.parse(frame.body);
        // append to messages list via RTK Query cache update or local state
      }),
    });
    client.activate();
    // cleanup: client.deactivate() on unmount
    ```
  - Mark conversation as read on open: `markNotificationRead` or dedicated endpoint

---

## Phase 5: Polish

- [x] T013 Add i18n keys for chat: input placeholder, send button, empty conversation state; for notifications: type labels, mark all read button
- [x] T014 Verify RTL: conversation list right-to-left in Arabic; message bubbles layout correct; mixed-direction text within bubbles
- [x] T015 Verify WebSocket reconnect: simulate network drop → STOMP client auto-reconnects on restore (configure `reconnectDelay` in Client options)

---

## Dependencies

- T001 (notificationsApi) before T004 (notifications screen)
- T002 (chatApi) before T011 (conversation list) and T012 (chat thread)
- T003 (WS_URL) before T012 (WebSocket in chat thread)
- T005 (push permission) before T006 (token registration) — must be sequential
- T009 (MessageBubble) before T012 (chat thread uses it)
- T010 (chat layout) before T011 + T012
