# API Consumption Contract: Attention Required Panel

**Branch**: `016-attention-required-panel` | **Date**: 2026-05-21

This document describes how the Attention Required panel consumes the existing backend API. No new backend endpoints are introduced by this feature.

---

## Endpoints Consumed

### 1. Active Bookings for Attention Panel

**Endpoint**: `GET /bookings?page=0&size=50`  
**Existing endpoint**: Yes — `useGetCenterBookingsQuery` in `store/api/bookingsApi.ts`  
**Usage**: Fetches up to 50 of the most recent bookings. Client-side filtering derives overdue, stalled, and unassigned items.

**Required fields on BookingResponse**:
| Field | Type | Used For |
|-------|------|----------|
| `id` | number | Item title, navigation target |
| `bookingDate` | string (YYYY-MM-DD) | Scheduled time calculation |
| `bookingTime` | string (HH:mm:ss) | Scheduled time calculation |
| `bookingStatus` | BookingStatus enum | Category eligibility |
| `updatedAt` | string (ISO 8601) | Stalled detection |
| `assignedMembershipId` | number \| null | Unassigned detection |
| `assignedStaffName` | string \| null | Subtitle display |

**RTK Query hook addition needed**: A second invocation with `size: 50` is required alongside the existing `size: 5` dashboard query. The attention hook uses a separate `useGetCenterBookingsQuery` call with its own polling interval, so both queries coexist without conflict.

**Polling interval**: 60 seconds (when screen is focused).

---

### 2. Recent Reviews

**Endpoint**: `GET /reviews/center?page=0&size=20`  
**Existing endpoint**: Yes — `useGetReviewsQuery` in `store/api/reviewsApi.ts`  
**Usage**: Fetches up to 20 recent reviews. Client filters for `rating <= 3 && !ownerReply`.

**Required fields on ReviewResponse**:
| Field | Type | Used For |
|-------|------|----------|
| `id` | number | Source ID |
| `rating` | number | Category and severity |
| `ownerReply` | string \| null | Has-replied check |
| `userFirstname` | string | Item title |
| `userLastname` | string | Item title |
| `createdAt` | string (ISO 8601) | occurredAt, relative time subtitle |

**Polling interval**: 60 seconds (when screen is focused).

---

### 3. Conversations (Unanswered Chats)

**Endpoint**: `GET /conversations/center?page=0&size=20`  
**Existing endpoint**: Yes — `useGetConversationsQuery` in `store/api/chatApi.ts`  
**Usage**: Fetches up to 20 recent conversations. Client filters for `unreadCount > 0 && lastMessageAt > 30min ago`.

**Required fields on ConversationResponse**:
| Field | Type | Used For |
|-------|------|----------|
| `id` | number | Navigation target |
| `customerName` | string | Item title |
| `unreadCount` | number | Has-unread check |
| `lastMessageAt` | string \| null | Time-threshold check, subtitle |

**Polling interval**: 60 seconds (when screen is focused).

---

### 4. Center Profile (Business Hours)

**Endpoint**: `GET /centers/my/profile`  
**Existing endpoint**: Yes — `useGetMyCenterQuery` in `store/api/centerApi.ts`  
**Usage**: Reads `openingTime` and `closingTime` to gate stalled-booking detection outside business hours.

**Required fields on CenterProfile**:
| Field | Type | Used For |
|-------|------|----------|
| `openingTime` | string (HH:mm:ss) | Business hours gate |
| `closingTime` | string (HH:mm:ss) | Business hours gate |

**Polling interval**: Not polled separately — uses cached result from the existing dashboard query.

---

## Deferred API (Phase 4.0)

**Pending Quotes**: `GET /bookings/{id}/quotes` — not yet implemented on the backend. The `PENDING_QUOTE` attention category emits zero items until Phase 4.0 ships the quotes API. No client-side stub or mock is introduced now.

---

## RTK Query Tag Invalidation

The attention panel queries are read-only. They do not invalidate any tags. Tag invalidation continues to happen through the existing booking status update, review reply, and chat mutations — those mutations already invalidate `Bookings`, `Reviews`, and `Conversations` tags, which will trigger re-fetches of the attention panel queries on the next poll or manual refresh.

---

## Error Handling Contract

| Scenario | Panel Behavior |
|----------|---------------|
| One or more queries fail | Inline error banner replaces panel content. Retry triggers re-fetch of all three queries. Rest of dashboard unaffected. |
| Partial data (some queries succeed, some fail) | Show items from successful queries. Mark failed categories with a small "Could not load" inline note. |
| Empty response from all queries | All-clear state is shown. |
| 401 Unauthorized | Handled by the existing 401 middleware in the store (auto-logout). Not specific to this feature. |

---

## No New Backend Work Required

This feature is fully implementable with the existing backend. The one noted gap (`estimatedCompletionTime` on BookingResponse) is addressed by using `bookingDate + bookingTime` as a proxy (see research.md Decision 2). A follow-up backend task to add `estimatedCompletionTime` can be raised separately as a Phase 4+ enhancement.
