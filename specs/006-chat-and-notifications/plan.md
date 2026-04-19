# Implementation Plan: Phase 7 — Chat & Notifications

**Branch**: `phase-7-chat-and-notifications` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Status**: ✅ COMPLETE — retrospective plan

## Summary

Real-time communication and awareness for center owners. The Notifications tab lists all events (new bookings, cancellations, messages, reviews) with unread indicators, deep-link navigation on tap, and "Mark all as read". The Chat tab lists all conversations ordered by most recent message; opening one shows a full message history with WebSocket/STOMP real-time delivery. Push notifications (Expo Notifications + FCM token registration) fire when the app is backgrounded or closed. Center owners receive push alerts for new booking requests, messages, and reviews.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: RTK Query (notifications + chat REST), `@stomp/stompjs` + WebSocket (real-time chat), expo-notifications (push), NativeWind, react-i18next
**New Dependencies**: `@stomp/stompjs`, `expo-notifications` (both added in this phase)
**Storage**: FCM/APNs token stored via `PUT /users/me/push-token`
**Testing**: Manual — receive notification, open chat, send message, push notification deep link
**Target Platform**: iOS 15+, Android API 31+, React Native Web (WebSocket supported)
**Project Type**: React Native feature — 4 screens + 2 components + 2 RTK slices + WebSocket client
**Performance Goals**: New notification visible within 30s; message delivery real-time
**Constraints**: WebSocket reconnect on disconnect; `Alert.alert` web guard; FCM requires EAS/native build for real push
**Scale/Scope**: 4 screens, `MessageBubble` component, `chatApi.ts` + `notificationsApi.ts`, WebSocket integration

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec preceded implementation |
| II. Bilingual First | ✅ Pass | All UI strings via i18n; mixed-direction chat bubbles supported |
| III. Component-Driven UI | ✅ Pass | `MessageBubble` + notification item components |
| IV. API Contract Adherence | ✅ Pass | REST via RTK Query; WebSocket via STOMP; FCM token via PUT endpoint |
| V. Owner-Context Awareness | ✅ Pass | Conversations and notifications scoped to owner's center |
| VI. Security & Privacy | ✅ Pass | JWT on REST + STOMP connection headers; no PII logged |
| VII. Production Readiness | ✅ Pass | Reconnect logic; offline graceful degradation |

## Project Structure

### Documentation

```text
specs/phase-7-chat-and-notifications/
├── plan.md    # This file (retrospective)
├── spec.md    # Original specification
└── tasks.md   # Task list (retrospective)
```

### Source Code

```text
store/api/
├── chatApi.ts                     # GET /conversations/center, GET /conversations/{id}/messages,
│                                  # POST /conversations/{id}/messages; Tags: 'Conversations'
└── notificationsApi.ts            # GET /notifications, PUT /notifications/{id}/read,
                                   # PUT /notifications/read-all; Tags: 'Notifications'

components/chat/
└── MessageBubble.tsx              # Chat bubble (customer=left, owner=right), mixed RTL/LTR text

app/(app)/(tabs)/
├── chat/
│   ├── _layout.tsx                # Stack navigator
│   ├── index.tsx                  # Conversation list: unread count badge, last message preview
│   └── [id].tsx                   # Chat thread + WebSocket/STOMP real-time + message input
└── notifications/
    └── index.tsx                  # Notifications list: unread indicator, deep-link on tap,
                                   # "Mark all as read" button

lib/constants/config.ts            # MODIFIED: WS_URL derived from API_BASE_URL
```

## Complexity Tracking

> No constitution violations — this section is not applicable.
