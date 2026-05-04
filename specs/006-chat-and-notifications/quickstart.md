# Quickstart: Phase 7 — Chat & Notifications

**Branch**: `phase-7-chat-and-notifications` | **Status**: ✅ Implemented

---

## Prerequisites

- Phase 1–5 working (login, bookings, profile, catalog, reviews)
- Docker Compose running: `docker-compose up -d`
- Spring Boot backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- At least one conversation exists (created when customer contacts center)
- MailDev UI: `http://localhost:1080` (for notification emails if configured)

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web        # web (WebSocket works on web)
npx expo start              # native (requires emulator)
```

---

## Testing Chat (requires two sessions)

Open two browser tabs:
1. Log in as OWNER in tab 1
2. Log in as CUSTOMER in tab 2 (or use a separate customer app session)
3. Customer sends a message → verify it appears in center's chat in real time

---

## Smoke Test Checklist

### Conversation List

- [ ] Tap the Chat tab → conversation list loads
- [ ] Each conversation card shows customer name, last message preview, and unread count badge
- [ ] Pull to refresh → conversation list reloads
- [ ] Scroll to bottom → older conversations load (pagination)

### Chat Thread (Real-Time)

- [ ] Tap a conversation → message history loads via REST
- [ ] Customer messages appear in left-aligned bubbles
- [ ] Center messages appear in right-aligned bubbles
- [ ] Type a message and tap Send → message appears immediately (WebSocket publishes)
- [ ] Open conversation in another session as customer → center's message arrives in real time

### WebSocket Connection

- [ ] Open a chat thread → WebSocket connects (no error in console)
- [ ] Navigate away from the chat screen → WebSocket disconnects cleanly
- [ ] Return to the chat thread → WebSocket reconnects

### Notifications List

- [ ] Tap the Notifications tab → notification list loads
- [ ] Unread notifications have visual indicator (bold text, badge, highlight)
- [ ] Read notifications have no indicator
- [ ] Tap a notification → marked as read (`PUT /notifications/{id}/read`)
- [ ] "Mark All Read" button → all notifications marked read at once
- [ ] Pull to refresh → list reloads

### Push Token Registration

- [ ] After login, check backend logs → `PUT /users/me/push-token` called successfully
- [ ] On native device (if configured with FCM): receive a push notification when a customer sends a message

### Empty States

- [ ] Center with no conversations shows empty state ("No conversations yet")
- [ ] Center with no notifications shows empty state ("No notifications")

### RTL (Arabic)

- [ ] Switch to Arabic → chat and notification labels appear in Arabic
- [ ] Message bubbles maintain correct alignment in RTL layout
