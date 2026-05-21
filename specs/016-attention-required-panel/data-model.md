# Data Model: Attention Required Panel

**Branch**: `016-attention-required-panel` | **Date**: 2026-05-21

---

## Overview

The Attention Required panel does not introduce new persisted entities. All data is derived client-side from three existing API response types: `Booking`, `Review`, and `Conversation`. The derived types below are TypeScript interfaces defined in the frontend only.

---

## Derived Types (Frontend Only)

### `AttentionCategory`

```typescript
export type AttentionCategory =
  | 'OVERDUE_BOOKING'
  | 'STALLED_BOOKING'
  | 'UNASSIGNED_BOOKING'
  | 'PENDING_QUOTE'       // deferred — Phase 4.0
  | 'LOW_RATED_REVIEW'
  | 'UNANSWERED_CHAT';
```

### `AttentionSeverity`

```typescript
export type AttentionSeverity = 'HIGH' | 'MEDIUM';
```

### `AttentionItem`

```typescript
export interface AttentionItem {
  id: string;                        // composite key: `${category}-${sourceId}`
  category: AttentionCategory;
  severity: AttentionSeverity;
  titleKey: string;                  // i18n key for the title (e.g. "attention.bookingTitle")
  titleParams?: Record<string, string | number>; // interpolation params (e.g. { id: 2418 })
  subtitle: string;                  // pre-formatted, locale-aware subtitle string
  occurredAt: Date;                  // when the condition started (scheduled time, review date, etc.)
  sourceId: number;                  // ID of the underlying entity (booking ID, review ID, etc.)
  navigateTo: string;                // Expo Router href (e.g., "/bookings/2418")
}
```

### `AttentionPanelState`

```typescript
export interface AttentionPanelState {
  items: AttentionItem[];
  isLoading: boolean;
  isError: boolean;
  lastCheckedAt: Date | null;
}
```

---

## Derivation Rules

### Category: `OVERDUE_BOOKING`

**Source**: `BookingResponse[]` from `GET /bookings?page=0&size=50`

**Condition**:
```
bookingStatus NOT IN ['COMPLETED', 'CANCELLED', 'NO_SHOW']
AND parseDateTime(bookingDate + bookingTime) < now()
```

**Severity**:
```
HIGH   if (now() - scheduledTime) > 2 hours
MEDIUM otherwise
```

**Title**: `"Booking #{{id}}"`  
**Subtitle**: `"{{duration}} overdue · {{assignedStaffName ?? t('attention.unassigned')}}"`  
**occurredAt**: `parseDateTime(bookingDate + bookingTime)`  
**navigateTo**: `/bookings/{{id}}`

---

### Category: `STALLED_BOOKING`

**Source**: Same booking list as above.

**Pre-condition**: Stalled detection runs only if current local time (Asia/Kuwait) is within `[openingTime, closingTime]` from `CenterProfile`. Outside business hours, this category emits zero items.

**Condition** (applied after overdue check — overdue takes priority):
```
bookingStatus IN ['CONFIRMED', 'IN_PROGRESS']
AND NOT already flagged as OVERDUE_BOOKING
AND (now() - parseISO(updatedAt)) > 2 hours
AND isWithinBusinessHours(now(), openingTime, closingTime)
```

**Severity**: Always `MEDIUM` (stalled is less urgent than overdue).

**Title**: `"Booking #{{id}}"`  
**Subtitle**: `"Stalled {{duration}} · {{assignedStaffName ?? t('attention.unassigned')}}"`  
**occurredAt**: `parseISO(updatedAt)`  
**navigateTo**: `/bookings/{{id}}`

---

### Category: `UNASSIGNED_BOOKING`

**Source**: Same booking list.

**Condition**:
```
bookingStatus === 'CONFIRMED'
AND assignedMembershipId === null
AND parseDateTime(bookingDate + bookingTime) > now()                    // future start
AND parseDateTime(bookingDate + bookingTime) < now() + 2 hours          // within window
```

**Severity**:
```
HIGH   if scheduledStart < now() + 30 minutes
MEDIUM otherwise
```

**Title**: `"Booking #{{id}}"`  
**Subtitle**: `"Starts in {{timeUntilStart}} · No technician assigned"`  
**occurredAt**: `parseDateTime(bookingDate + bookingTime)`  
**navigateTo**: `/bookings/{{id}}`

---

### Category: `PENDING_QUOTE`

**Status**: DEFERRED — Phase 4.0. Emits zero items until the Quotes API is implemented.

---

### Category: `LOW_RATED_REVIEW`

**Source**: `ReviewResponse[]` from `GET /reviews/center?page=0&size=20`

**Condition**:
```
rating <= 3
AND (ownerReply === null OR ownerReply === '')
```

**Severity**:
```
HIGH   if rating <= 2
MEDIUM if rating === 3
```

**Title**: `"{{userFirstname}} {{userLastname}}"`  
**Subtitle**: `"{{rating}}★ · {{relativeTime(createdAt)}}"`  
**occurredAt**: `parseISO(createdAt)`  
**navigateTo**: `/reviews` (no deep link to individual review yet — navigates to reviews list)

---

### Category: `UNANSWERED_CHAT`

**Source**: `ConversationResponse[]` from `GET /conversations/center?page=0&size=20`

**Condition**:
```
unreadCount > 0
AND lastMessageAt !== null
AND (now() - parseISO(lastMessageAt)) > 30 minutes
```

**Severity**: Always `MEDIUM`.

**Title**: `"{{customerName}}"`  
**Subtitle**: `"{{relativeTime(lastMessageAt)}} · {{t('attention.unreadCount', { count: unreadCount })}}"`  
**occurredAt**: `parseISO(lastMessageAt)`  
**navigateTo**: `/chat/{{id}}`

---

## Sorting & Display Rules

### Within each category
Items sorted by: severity DESC (HIGH before MEDIUM), then occurredAt ASC (oldest first).

### Across the panel
Categories rendered in this fixed order:
1. OVERDUE_BOOKING
2. STALLED_BOOKING
3. UNASSIGNED_BOOKING
4. LOW_RATED_REVIEW
5. UNANSWERED_CHAT
6. PENDING_QUOTE (deferred slot — hidden when empty)

### Cap
Maximum 5 items displayed per category. If `items.length > 5`, show the first 5 and a "See all ({{total}})" link.

### All-Clear state
Panel renders the "All clear" card when `items.length === 0` across all categories and `isLoading === false` and `isError === false`.

---

## State Transitions

```
[Loading] ──success──► [Populated]  (items > 0)
                   └──► [All Clear] (items = 0)
         ──error───► [Error Banner] (retry available)

[Populated] ──next poll──► [Populated | All Clear]
[All Clear] ──next poll──► [Populated | All Clear]
[Error Banner] ──retry──► [Loading]
```

---

## Business Hours Helper

```typescript
// Pure function — no external dependencies
function isWithinBusinessHours(
  now: Date,
  openingTime: string,   // "HH:mm:ss" from CenterProfile
  closingTime: string,   // "HH:mm:ss" from CenterProfile
): boolean {
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  // Use Asia/Kuwait local time (UTC+3)
  const kuwaitNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const nowMinutes = kuwaitNow.getUTCHours() * 60 + kuwaitNow.getUTCMinutes();
  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}
```
