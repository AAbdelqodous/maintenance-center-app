# Tasks: Phase 5 — Review Management

**Status**: ✅ COMPLETE — all tasks implemented
**Branch**: `phase-5-review-management`

---

## Phase 1: Foundational

- [x] T001 Create `store/api/reviewsApi.ts` — endpoints:
  - `getCenterReviews({ page, size })` → `PageResponse<ReviewResponse>` (`GET /reviews/center`)
  - `replyToReview({ id, reply })` → `ReviewResponse` (`POST /reviews/{id}/reply`)
  - Tag: `'Reviews'`
  - `transformResponse` to unwrap `PageResponse` wrapper (`{ content, totalElements, ... }`)

---

## Phase 2: User Story 1 — View Reviews with Rating Summary (P1)

**Goal**: Reviews screen shows average rating, 5-star breakdown, paginated review list.

- [x] T002 [P] Create `components/reviews/ReviewCard.tsx`:
  - Props: `{ review: ReviewResponse; onReplyPress: () => void }`
  - Displays: reviewer name (`userFirstname + ' ' + userLastname` or "Anonymous User" if null), `RatingStars` (from Phase 1 components), date (formatted per locale), service name, review text (truncated at 200 chars with "Read more")
  - Shows owner reply preview if `ownerReply` is set (green bubble below review)
- [x] T003 Create `app/(app)/(tabs)/reviews/index.tsx` — reviews screen:
  - Rating summary header: average rating (1 decimal), star-breakdown bar chart (5 rows, each showing star count + percentage bar)
  - Filter tabs: All / 1★ / 2★ / 3★ / 4★ / 5★
  - `useGetCenterReviewsQuery({ page })` with `FlatList` + `onEndReached` pagination
  - Empty state: "No reviews yet."
  - Each `ReviewCard` — expand on tap to show full text + reply form

---

## Phase 3: User Story 2 — Reply to Review (P1)

**Goal**: Owner can write or edit a reply (max 500 chars); reply visible immediately on success.

- [x] T004 Add reply form inline below tapped `ReviewCard` in `index.tsx` (or Modal):
  - `TextInput` (multiline, max 500 chars) with character counter
  - "Submit Reply" button — disabled when empty
  - `useReplyToReviewMutation()` → on success: update cached review data via RTK Query tag invalidation
  - Inline error banner on failure (not `Alert.alert`)
  - If `ownerReply` already set: pre-populate input with existing reply text ("Edit Reply" mode)

---

## Phase 4: User Story 3 — Filter & Sort (P2)

**Goal**: Filter by star rating; sort by date/rating.

- [x] T005 Add star filter tabs to `index.tsx` — filters `useGetCenterReviewsQuery` param or filters client-side from cached data
- [x] T006 Add sort control (dropdown or segmented control): Newest First / Oldest First / Highest Rating / Lowest Rating — applies to fetched/cached results

---

## Phase 5: User Story 4 — Flag a Review (P3)

**Goal**: Owner can report a review to admins; confirmation shown; review remains visible.

- [x] T007 Add "Flag as Inappropriate" option to review detail/card (behind "..." menu or long press)
  - Bottom sheet: 4 flag reasons (Fake review / Abusive / Spam / Other)
  - Submit via API → success message "Thank you. Our team will review this report."
  - Once flagged: option shows "Report Submitted" (disabled)

---

## Phase 6: Polish

- [x] T008 Add i18n keys for reviews: rating labels, filter names, sort labels, empty state, reply errors, flag reasons
- [x] T009 Verify RTL: star breakdown bars flip correctly, review cards RTL in Arabic
- [x] T010 Handle anonymous reviewer: show "Anonymous User" when `userFirstname` is null/empty

---

## Dependencies

- T001 (reviewsApi) before T002–T007
- T002 (ReviewCard) before T003 (list screen)
- T003 (list screen) before T004 (reply form — extends the screen)
- T005 + T006 extend T003
