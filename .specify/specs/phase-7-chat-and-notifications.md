# Feature Specification: Phase 7 — Chat & Notifications

**Feature Branch**: `phase-7-chat-and-notifications`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 7 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Notifications List (Priority: P1)

A center owner opens the Notifications tab. They see a chronological list of all notifications for their center: new booking requests, booking status changes, new reviews, new customer messages, and system alerts. Unread notifications are visually marked. Tapping a notification navigates to the relevant context (e.g., tapping "New Booking" navigates to that booking's detail).

**Why this priority**: Notifications are the proactive awareness layer — without them, owners must manually poll the app to discover new bookings or messages. Real-time awareness is operationally critical.

**Independent Test**: Trigger a new booking from the customer app → the notification appears in the Notifications tab within 30 seconds; tapping it navigates to that booking.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Notifications tab, **Then** all notifications are listed in reverse chronological order.
2. **Given** a notification list item, **Then** it MUST display: notification type icon, title, short description, and timestamp (relative: "2 min ago", "Yesterday", etc.).
3. **Given** unread notifications, **When** displayed, **Then** they have a visual unread indicator (e.g., blue dot or bold text).
4. **Given** a notification, **When** tapped, **Then** the app navigates to the relevant screen (booking detail, review detail, chat, etc.) AND the notification is marked as read.
5. **Given** a "Mark all as read" button, **When** tapped, **Then** all notifications are marked as read and unread indicators disappear.
6. **Given** no notifications, **When** the screen loads, **Then** an empty state is shown: "No notifications yet. You'll be notified of new bookings and messages here."
7. **Given** the notifications list in Arabic, **When** rendered, **Then** all text is in Arabic, timestamps use Arabic-Indic format if appropriate, and layout is RTL.

---

### User Story 2 — Push Notifications (Priority: P1)

When the app is in the background or closed, the center owner receives push notifications for: new booking requests, booking cancellations by the customer, new reviews, and new chat messages. Tapping a push notification opens the app and navigates directly to the relevant screen (deep link).

**Why this priority**: New booking requests are time-sensitive — a delayed response reduces acceptance rate and customer satisfaction. Push notifications eliminate the need for the owner to keep the app open.

**Independent Test**: Close the app → create a new booking from the customer app → push notification arrives on the device within 30 seconds → tapping it opens the app at the correct booking detail screen.

**Acceptance Scenarios**:

1. **Given** the app is closed and a new booking request arrives, **When** the push notification is received, **Then** the notification displays the customer name, service type, and scheduled time.
2. **Given** a push notification for a new booking, **When** the owner taps it, **Then** the app opens and navigates directly to the booking detail screen.
3. **Given** the app is in the foreground and a new booking request arrives, **When** it is received, **Then** an in-app banner notification appears at the top of the screen (does not replace the current screen).
4. **Given** a push notification for a new message, **When** tapped, **Then** the app opens directly to the relevant chat conversation.
5. **Given** the owner has not granted push notification permission, **When** the app first opens, **Then** a permission request dialog is shown explaining why notifications are important ("Stay on top of new bookings and messages").
6. **Given** a denied notification permission, **When** the owner later changes their mind, **Then** a prompt in the Notifications screen guides them to device settings to re-enable.

---

### User Story 3 — Chat with Customers (Priority: P1)

A center owner can view and respond to messages from customers. The chat list shows all conversations, ordered by most recent message. Each conversation is with one customer and relates to a specific booking or inquiry. The owner can open a conversation, read the full message history, and send a reply.

**Why this priority**: Direct communication between owners and customers reduces cancellations, clarifies service requirements, and improves the overall service experience.

**Independent Test**: Receive a message from a customer → it appears in the chat list; open the conversation → send a reply → the reply is visible in the conversation on both the owner and customer app.

**Acceptance Scenarios**:

1. **Given** the chat section, **When** opened, **Then** all conversations for the center are listed ordered by most recent message.
2. **Given** a conversation list item, **Then** it MUST display: customer name, last message preview (max 50 chars), timestamp, and unread message count badge.
3. **Given** a conversation with unread messages, **When** displayed, **Then** it is visually marked as unread.
4. **Given** a conversation, **When** tapped, **Then** the full message history is shown in a chat bubble interface (customer messages on the left, owner messages on the right).
5. **Given** the chat view, **When** the owner types a message and taps "Send", **Then** the message is sent via the API and appears immediately in the conversation.
6. **Given** a sent message, **When** delivered successfully, **Then** a delivery status indicator (sent ✓ / delivered ✓✓) is shown.
7. **Given** a message send failure (network error), **When** the send fails, **Then** the message shows an error state with a retry button — it is NOT silently dropped.
8. **Given** the conversation was opened, **When** unread messages are visible, **Then** they are marked as read automatically.
9. **Given** the chat in Arabic locale, **When** rendered, **Then** message bubbles support mixed-direction text (Arabic messages are RTL-aligned, English messages are LTR-aligned within the same conversation).

---

### User Story 4 — Chat with Media Attachments (Priority: P3)

A center owner can send a photo in a chat conversation — for example, to share a photo of the issue they found or the completed repair. Photos are sent from the device's camera or library.

**Why this priority**: A picture of a repair issue or completion saves lengthy text explanations and builds customer trust.

**Independent Test**: Open a conversation → tap the attachment icon → select a photo → photo is sent and displayed as an image bubble in the conversation.

**Acceptance Scenarios**:

1. **Given** the chat input bar, **When** the owner taps the attachment icon, **Then** a bottom sheet appears with: Camera, Photo Library.
2. **Given** a selected photo, **When** confirmed, **Then** a preview of the image is shown above the send button.
3. **Given** the send button is tapped with a photo attached, **When** tapped, **Then** the photo is uploaded and displayed as an image bubble in the conversation.
4. **Given** an image in the conversation, **When** tapped, **Then** it opens in a full-screen viewer.
5. **Given** an image exceeding 10 MB, **When** selected, **Then** an error message is shown: "Image is too large. Maximum size is 10 MB."

---

### Edge Cases

- What if a notification's target (booking, review) has been deleted? → Tapping the notification shows a message: "This item is no longer available." — the app does not crash.
- What if the customer sends a message in a very long string with no spaces? → The chat bubble wraps the text correctly — no UI overflow.
- What if the center receives 1000+ unread notifications? → Show a badge count of "99+" — do not display the raw number.
- What if the push notification token expires? → The app silently refreshes the FCM token on launch and sends the new token to the backend.
- What if the owner is typing and loses connectivity mid-message? → The typed text is preserved (not lost) when connectivity is restored. A reconnecting banner is shown.
- What if the backend WebSocket connection drops? → The app attempts reconnection every 5 seconds with exponential backoff. The UI shows a "Reconnecting..." indicator during the gap.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a Notifications tab displaying all notifications in reverse chronological order.
- **FR-002**: Each notification item MUST display: type icon, title, description, and relative timestamp.
- **FR-003**: Unread notifications MUST be visually distinct from read notifications.
- **FR-004**: Tapping a notification MUST mark it as read and navigate to the relevant screen.
- **FR-005**: The app MUST provide a "Mark all as read" action on the notifications screen.
- **FR-006**: The app MUST request push notification permission on first launch with a contextual explanation.
- **FR-007**: Push notifications MUST be delivered for: new booking requests, customer cancellations, new reviews, new chat messages.
- **FR-008**: Tapping a push notification MUST deep-link to the relevant in-app screen.
- **FR-009**: In-app notification banners MUST be shown when the app is in the foreground and a new notification arrives.
- **FR-010**: The app MUST provide a chat list showing all conversations ordered by most recent message.
- **FR-011**: Each conversation list item MUST display: customer name, last message preview, timestamp, and unread count badge.
- **FR-012**: The app MUST display a full chat conversation with bubble UI (customer left, owner right).
- **FR-013**: The app MUST support sending text messages in a conversation.
- **FR-014**: Sent messages MUST show delivery status indicators (sent / delivered).
- **FR-015**: Failed messages MUST show an error state with a retry button.
- **FR-016**: Opening a conversation MUST automatically mark its unread messages as read.
- **FR-017**: The app MUST support sending photo attachments in conversations (from camera or library).
- **FR-018**: Photos in conversations MUST open in a full-screen viewer when tapped.
- **FR-019**: The WebSocket connection MUST reconnect automatically after drops, with a reconnecting UI indicator.
- **FR-020**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **Notification**: ID, type (`NotificationType` enum — NEW_BOOKING, BOOKING_CANCELLED, NEW_REVIEW, NEW_MESSAGE, SYSTEM), title, description, isRead, createdAt, targetId, targetType.
- **Conversation**: ID, customerName, lastMessage, lastMessageAt, unreadCount, centerId.
- **Message**: ID, conversationId, text, mediaUrl (nullable), senderType (`SenderType` enum — CUSTOMER / CENTER), sentAt, deliveryStatus.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Push notifications arrive within 30 seconds of a triggering event (new booking, message) on a standard 4G connection.
- **SC-002**: The notifications list loads within 2 seconds.
- **SC-003**: A message is sent and appears in the conversation within 1 second of tapping "Send" on a standard 4G connection.
- **SC-004**: WebSocket reconnects within 10 seconds after a connection drop.
- **SC-005**: All Chat and Notifications screens render correctly in both Arabic (RTL) and English (LTR), including mixed-direction chat bubbles.
- **SC-006**: 100% of user-facing strings in this phase use i18n keys.
- **SC-007**: The app correctly deep-links to the booking detail, review detail, or chat conversation from a push notification tap in all tested scenarios.

---

## Assumptions

- Firebase Cloud Messaging (FCM) is the push notification provider — Expo FCM integration via `expo-notifications`.
- The backend uses WebSockets (STOMP over SockJS, already partially in the backend chat domain) for real-time chat delivery.
- Push notification tokens are registered on the backend per user/device on login and updated on token refresh.
- The backend's `Conversation`, `Message`, `Notification` entities (already defined) will have corresponding REST and WebSocket endpoints built alongside this phase.
- Chat is between one customer and the center — no group chats, no center-to-center messaging.
- Message history is stored server-side — the app fetches it on conversation open, with pagination for long conversations.
- Typing indicators ("Customer is typing...") are out of scope for this phase.
- Message read receipts visible to the customer (i.e., showing the customer their message was read by the owner) are out of scope for this phase.
- Video attachments are out of scope — photos only.
