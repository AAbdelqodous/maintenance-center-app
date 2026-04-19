# Research: Phase 5 — Review Management

**Branch**: `phase-5-review-management` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Reviews Are Read-Only for Center Owners (Except Replies)

**Decision**: Center owners can view customer reviews and post a single reply per review. They cannot delete or edit reviews.

**Rationale**:
- Reviews are submitted by customers — center owners cannot modify them to protect trust.
- One reply per review enforces accountability; no edit/delete of the reply once submitted.
- `POST /reviews/{id}/reply` with `{ reply }` is the only write operation.

---

## Decision 2: Pagination — Same RTK Query Pattern as Bookings

**Decision**: `GET /reviews/center?page=&size=` with `transformResponse` to unwrap `PageResponse<ReviewResponse>`.

**Rationale**:
- Centers may accumulate many reviews over time — full load is wasteful.
- `FlatList.onEndReached` triggers next page load, same pattern as booking list.
- Pull-to-refresh resets to page 0.

---

## Decision 3: Reply Input — Inline Text Area, Not a Modal

**Decision**: Reply input rendered as an inline `TextInput` in the review card or below it, not in a separate screen or modal.

**Rationale**:
- Reply is a short text — a full screen is unnecessary.
- Inline keeps the review visible while composing the reply.
- On submit, `ownerReply` replaces the input with the reply text (read-only).

---

## Decision 4: Star Rating Display — Custom Component

**Decision**: `RatingStars.tsx` shared component renders filled/unfilled stars based on a numeric rating (1–5).

**Rationale**:
- No external star-rating library needed — simple icon rendering.
- Used in review cards and the dashboard stats.
- Accepts `rating: number` and optional `size` prop.

---

## Decision 5: Review Field Names — Do Not Rename

**Decision**: Use `userFirstname` + `userLastname` (not `customerName`), `ownerReply` (not `centerReply` or `reply`), `totalReviews` (not `reviewCount`).

**Rationale**:
- These are the exact field names returned by the backend `ReviewResponse`.
- Renaming in the frontend type would require mapping on every usage.
- CLAUDE.md lists these explicitly as "Key Response Field Names — do not rename".

---

## Resolved Clarifications

- ✅ Owner write access: reply only (no delete/edit of reviews)
- ✅ Pagination: RTK Query with `transformResponse`, `FlatList.onEndReached`
- ✅ Reply UI: inline text input in review card
- ✅ Rating display: custom `RatingStars.tsx` component
- ✅ Field names: exact backend names (`userFirstname`, `ownerReply`, `totalReviews`)
