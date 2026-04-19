# Data Model: Phase 7 — Chat & Notifications

**Branch**: `phase-7-chat-and-notifications` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

### Chat

```typescript
// store/api/chatApi.ts
export enum MessageType {
  TEXT  = 'TEXT',
  IMAGE = 'IMAGE',
}

export enum SenderType {
  CENTER   = 'CENTER',
  CUSTOMER = 'CUSTOMER',
}

export interface ConversationResponse {
  id: number;
  customerName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  content: string;
  messageType: MessageType;
  senderType: SenderType;
  sentAt: string;
}

export interface SendMessageRequest {
  content: string;
  messageType: MessageType;
}
```

### Notifications

```typescript
// store/api/notificationsApi.ts
export enum NotificationType {
  BOOKING_REQUEST   = 'BOOKING_REQUEST',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  NEW_REVIEW        = 'NEW_REVIEW',
  NEW_MESSAGE       = 'NEW_MESSAGE',
  SYSTEM            = 'SYSTEM',
}

export enum NotificationPriority {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

export interface NotificationResponse {
  id: number;
  notificationType: NotificationType;    // NOT "type"
  notificationPriority: NotificationPriority;
  title: string;
  body: string;
  isRead: boolean;                        // NOT "read"
  relatedEntityId?: number;
  createdAt: string;
}
```

---

## RTK Query Slice — `store/api/chatApi.ts`

```typescript
import { baseApi } from './baseApi';

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<
      { conversations: ConversationResponse[]; totalElements: number },
      { page: number; size: number }
    >({
      query: ({ page, size }) => ({ url: 'conversations/center', params: { page, size } }),
      transformResponse: (raw: { content: ConversationResponse[]; totalElements: number }) => ({
        conversations: raw.content,
        totalElements: raw.totalElements,
      }),
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<
      { messages: MessageResponse[]; totalElements: number },
      { conversationId: number; page: number; size: number }
    >({
      query: ({ conversationId, page, size }) => ({
        url: `conversations/${conversationId}/messages`,
        params: { page, size },
      }),
      transformResponse: (raw: { content: MessageResponse[]; totalElements: number }) => ({
        messages: raw.content,
        totalElements: raw.totalElements,
      }),
      providesTags: (_r, _e, { conversationId }) => [{ type: 'Conversations', id: conversationId }],
    }),

    sendMessage: builder.mutation<MessageResponse, { conversationId: number; data: SendMessageRequest }>({
      query: ({ conversationId, data }) => ({
        url: `conversations/${conversationId}/messages`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Conversations'],
    }),
  }),
});
```

---

## RTK Query Slice — `store/api/notificationsApi.ts`

```typescript
import { baseApi } from './baseApi';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      { notifications: NotificationResponse[]; totalElements: number },
      { page: number; size: number }
    >({
      query: ({ page, size }) => ({ url: 'notifications', params: { page, size } }),
      transformResponse: (raw: { content: NotificationResponse[]; totalElements: number }) => ({
        notifications: raw.content,
        totalElements: raw.totalElements,
      }),
      providesTags: ['Notifications'],
    }),

    markNotificationRead: builder.mutation<void, number>({
      query: (id) => ({ url: `notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notifications'],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/read-all', method: 'PUT' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});
```

---

## WebSocket/STOMP Pattern (`chat/[id].tsx`)

```typescript
import { Client } from '@stomp/stompjs';

const stompClient = useRef<Client | null>(null);

useEffect(() => {
  const client = new Client({
    webSocketFactory: () => new WebSocket(WS_URL),
    onConnect: () => {
      client.subscribe(`/topic/conversation/${conversationId}`, (message) => {
        const newMsg: MessageResponse = JSON.parse(message.body);
        setMessages((prev) => [...prev, newMsg]);
      });
    },
  });
  client.activate();
  stompClient.current = client;
  return () => { client.deactivate(); };
}, [conversationId]);

const sendMessage = (content: string) => {
  stompClient.current?.publish({
    destination: `/app/chat/${conversationId}/send`,
    body: JSON.stringify({ content, messageType: MessageType.TEXT }),
  });
};
```

---

## i18n Key Structure

```json
{
  "chat": {
    "title": "Chat",
    "noConversations": "No conversations yet",
    "messagePlaceholder": "Type a message...",
    "send": "Send"
  },
  "notifications": {
    "title": "Notifications",
    "noNotifications": "No notifications",
    "markAllRead": "Mark All Read",
    "BOOKING_REQUEST": "New Booking Request",
    "BOOKING_CANCELLED": "Booking Cancelled",
    "NEW_REVIEW": "New Review",
    "NEW_MESSAGE": "New Message",
    "SYSTEM": "System Notification"
  }
}
```
