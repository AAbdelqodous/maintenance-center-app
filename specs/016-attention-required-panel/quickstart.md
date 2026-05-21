# Quickstart: Attention Required Panel Development

**Branch**: `016-attention-required-panel` | **Date**: 2026-05-21

---

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli` or `npx expo`)
- Running backend (`GET /bookings`, `/reviews/center`, `/conversations/center` endpoints functional)
- Logged-in session as a CENTER_OWNER or BRANCH_MANAGER user

---

## Starting the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app

# Web (fastest for UI development)
npx expo start --web

# Android emulator
npx expo start --android

# iOS simulator (Mac only)
npx expo start --ios
```

Navigate to the Dashboard tab after login. The Attention Required panel appears below the stat cards.

---

## Key Files for This Feature

```
# New files (create during implementation)
hooks/useAttentionItems.ts                          # Core derivation logic
components/dashboard/AttentionPanel.tsx             # Panel container
components/dashboard/AttentionItem.tsx              # Single row component
components/dashboard/AllClearState.tsx              # Zero-items state

# Modified files
app/(app)/(tabs)/index.tsx                          # Add <AttentionPanel />
lib/i18n/locales/en.json                            # Add attention.* keys
lib/i18n/locales/ar.json                            # Add attention.* keys (Arabic)
```

---

## Testing Attention Items Manually

### Overdue Booking
1. Create a booking (via API or customer app) with `bookingDate` = yesterday, status = `CONFIRMED` or `IN_PROGRESS`.
2. Open the dashboard. The booking should appear in "Overdue" within 60 seconds.
3. Mark the booking `COMPLETED`. It should disappear on the next poll.

### Stalled Booking
1. Create an `IN_PROGRESS` booking.
2. Manually set `updatedAt` to 3 hours ago in the database (`UPDATE booking SET updated_at = NOW() - INTERVAL '3 hours' WHERE id = X`).
3. Ensure the current time is within the center's business hours (`openingTime`–`closingTime`).
4. Open the dashboard. The booking appears in "Stalled."

### Unassigned Booking
1. Create a `CONFIRMED` booking with `assignedMembershipId = null`, scheduled for 45 minutes from now.
2. Open the dashboard. It appears in "Unassigned" at Medium severity.
3. Change the scheduled time to 15 minutes from now. It should switch to High severity on the next poll.

### Low-Rated Review
1. Post a review with rating 2 or 3 (via customer app or directly via API) with no `centerResponse`.
2. Open the dashboard. It appears in "Low-Rated Reviews" (High severity for ≤ 2 stars).
3. Reply to the review via the Reviews tab. It disappears on the next poll.

### Unanswered Chat
1. Send a customer message in a conversation.
2. Wait 31 minutes without replying (or set `updated_at` on the last message to 31 minutes ago in the DB).
3. Open the dashboard. The conversation appears in "Unanswered Chats."

### All Clear State
1. Resolve all items above.
2. Wait for the next 60-second poll (or pull-to-refresh).
3. The panel collapses to the "All clear" card with the last-checked timestamp.

---

## Polling Behavior Verification

1. Open the dashboard — polling starts (every 60 seconds).
2. Switch to the Bookings tab — polling pauses.
3. Switch back to Dashboard — polling resumes.
4. Confirm by watching network requests in Metro bundler or Expo dev tools.

---

## RTL Testing

1. Change language to Arabic in app settings (or via `i18n.changeLanguage('ar')`).
2. Open the dashboard.
3. Verify: panel title is right-aligned, item text flows RTL, severity badge appears on the correct side, "See all" link is at the correct end.

---

## Backend Reference

```
GET /bookings?page=0&size=50                       → attention booking data
GET /reviews/center?page=0&size=20                 → attention review data
GET /conversations/center?page=0&size=20           → attention chat data
GET /centers/my/profile                             → business hours
```

All endpoints require `Authorization: Bearer <jwt>` header.

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Panel shows error banner on startup | Check that the backend is running and `/bookings` returns 200 |
| Stalled items don't appear | Verify current time is within `openingTime`–`closingTime` in center profile |
| Poll doesn't pause on tab switch | Confirm `useIsFocused()` is wired to `pollingInterval` (0 when unfocused) |
| Arabic text appears LTR | Check that `I18nManager.isRTL` is true when language is 'ar' |
