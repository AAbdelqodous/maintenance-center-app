# Research: Staff Performance Board (Spec 018)

## 1. API Design: Where Do the New Endpoints Live?

**Decision**: Add `getStaffPerformanceBoard` and `getStaffMonthlyHistory` to `analyticsApi.ts`, not `staffApi.ts`.

**Rationale**: The staff performance board is aggregated analytics data (completions, ratings, on-time rates, trend deltas) computed server-side from booking and review history. `analyticsApi.ts` already owns all server-aggregated metrics for the dashboard (`getDashboardSnapshot`, `getAnalyticsSummary`, etc.). `staffApi.ts` owns membership management (invite, suspend, role update) — a different concern.

**Tag coordination**: The new endpoints use tag `'StaffPerformance'` (new), not `'Staff'` or `'Analytics'`. After a `bookingsApi` mutation (e.g., `assignTechnician`), `'StaffPerformance'` must be invalidated so the board reflects the updated active count. This requires cross-slice tag invalidation via `onQueryStarted` or by adding `'StaffPerformance'` to `bookingsApi`'s tag invalidation list.

**Alternatives considered**:
- Adding to `staffApi.ts`: Rejected — mixes membership management with performance analytics. Causes unrelated invalidations (inviting a staff member would bust performance cache).
- Creating a new `staffPerformanceApi.ts` slice: Rejected — the codebase pattern is one slice per domain (analytics, bookings, staff). A new slice for a single board is premature.

---

## 2. Ethics Guardrail: Server-Side Enforcement Pattern

**Decision**: The backend enforces the guardrail via role inspection at the controller level. The frontend does NOT implement any role-based filtering of the API response — it renders whatever the server returns.

**Rationale**: FR-023 is explicit that the restriction is a server responsibility. If the client filtered, a determined technician could bypass it by inspecting raw API responses. The server must strip `tier`, `trendDirection`, `isOverloaded`, and related fields (or return 403) for technician-role sessions.

**Frontend implication**: The `StaffPerformanceCard` TypeScript type marks sensitive fields as optional (`tier?: PerformanceTier`, `trendDirection?: TrendDirection`). UI components render those fields only when present — not via role checks in JSX. This means the UI is naturally correct as long as the server withholds the fields.

**Test requirement**: The spec mandates an explicit automated test (SC-004). This is a backend integration test: login as TECHNICIAN → call `GET /analytics/center/staff-performance` → assert that response contains no `tier = 'NEEDS_ATTENTION'` or `trendDirection = 'DOWN'` or `isOverloaded = true` for peers.

---

## 3. Optimistic Update Pattern for Rebalance

**Decision**: Use RTK Query's `onQueryStarted` with `updateQueryData` for the optimistic update, with automatic rollback via `undo()` on server error.

**Rationale**: `bookingsApi.assignTechnician` is a mutation. RTK Query's built-in optimistic update pattern (`updateQueryData` in `onQueryStarted`) is already established in the codebase for similar patterns. The board's active count for two staff members needs to be updated atomically before the server confirms.

**Pattern** (pseudocode):
```ts
onQueryStarted: async ({ bookingId, fromMembershipId, toMembershipId }, { dispatch, queryFulfilled }) => {
  const patch = dispatch(analyticsApi.util.updateQueryData('getStaffPerformanceBoard', undefined, draft => {
    const from = draft.staff.find(s => s.membershipId === fromMembershipId);
    const to = draft.staff.find(s => s.membershipId === toMembershipId);
    if (from) from.activeBookingsCount -= 1;
    if (to) to.activeBookingsCount += 1;
    // Re-sort and re-compute overload status
  }));
  try { await queryFulfilled; }
  catch { patch.undo(); }
}
```

**Alternatives considered**: Refetching after mutation (simpler, no optimistic UI). Rejected because SC-003 requires the update to be visible within 200 ms of confirmation — a round-trip refetch on a slow network can exceed that.

---

## 4. Overload Detection: Client vs Server

**Decision**: The backend computes `isOverloaded`, `status`, and `tier` server-side and returns them as fields on each `StaffPerformanceCard`. The client does NOT recalculate them.

**Rationale**: Thresholds are configurable (FR-011) and the server owns `PerformanceTierConfig`. Computing these client-side would require fetching config separately and duplicating threshold logic. Server-computed fields are simpler, testable, and consistent with the ethics guardrail (the server also controls what a technician sees).

**Exception for optimistic update**: After an optimistic reassignment, the client only updates `activeBookingsCount` on the two affected cards. It does NOT attempt to recompute `isOverloaded` client-side. The next poll/refresh will correct the overload status if the count change crossed the threshold.

---

## 5. Polling Strategy

**Decision**: Use the same focus-aware 60-second polling pattern established by `useDashboardSnapshot.ts`. The staff performance board hook (`useStaffPerformanceBoard`) will follow the same pattern.

**Rationale**: The spec states "a slight delay (minutes) is acceptable." Polling at 60 s when focused matches the rest of the dashboard. Stopping when unfocused preserves battery/data.

**Implementation**: Mirror `hooks/useDashboardSnapshot.ts` exactly — `useIsFocused`, `pollingInterval: isFocused ? 60_000 : 0`, `refetchOnFocus: true`.

---

## 6. Composite Score Formula

**Decision**: The composite score is a weighted average stored and computed server-side:

```
compositeScore = (0.4 × normalizedRating) + (0.35 × onTimeRate) + (0.25 × normalizedVolume)
```

Where:
- `normalizedRating` = `avgRating / 5.0` (0–1)
- `onTimeRate` = fraction of bookings completed on time (0–1)
- `normalizedVolume` = `min(completedCount / branchAvgCompleted, 1.0)` (capped at 1 to not penalize if branch is slow)

**Weights stored in config** so they can be tuned. The frontend receives the computed `compositeScore` (0–100 scale) and the `previousMonthScore` — delta and tier are computed and returned by the server.

**Trend threshold**: Score change > 10 points (absolute) is "meaningful." Stored in `PerformanceTierConfig.trendThreshold`.

---

## 7. Default Tier Thresholds (Starting Values)

These are initial values in `PerformanceTierConfig` — all tunable without code change:

| Threshold | Default Value | Description |
|-----------|--------------|-------------|
| `topPerformerMinRating` | 4.5 | Min avg rating for Top Performer |
| `topPerformerMinOnTime` | 0.85 | Min on-time rate (85%) for Top Performer |
| `topPerformerMinVolume` | 5 | Min completed bookings this month for Top Performer |
| `strongMinRating` | 4.0 | Min avg rating for Strong |
| `strongMinOnTime` | 0.70 | Min on-time rate (70%) for Strong |
| `needsAttentionMaxRating` | 3.5 | Max avg rating before Needs Attention |
| `needsAttentionMinDecline` | 0.5 | Min rating drop vs last month for Needs Attention |
| `needsAttentionMaxOnTime` | 0.60 | Max on-time rate (60%) for Needs Attention |
| `trendThreshold` | 10.0 | Min composite score delta (0–100 scale) to show trend arrow |
| `overloadMultiplier` | 2.0 | Active bookings must exceed (branchAvg × this) for Overloaded |

---

## 8. "Business Hours" for Offline Detection

**Decision**: Use the center's existing `openingTime` / `closingTime` profile fields (already stored in the backend). Offline detection only fires during business hours.

**Rationale**: These fields already exist on `MaintenanceCenter`. No new configuration required.

**Edge case**: If a center has no opening/closing time set, offline detection defaults to 08:00–20:00 Kuwait time (UTC+3).

---

## 9. Pro-Rated Baseline for Mid-Month Joiners

**Decision**: The server calculates the pro-rated baseline as: `baseline × (daysInMonth − joiningDay) / daysInMonth`.

Example: Joined day 15 of a 30-day month → `topPerformerMinVolume × (30 - 15) / 30 = 5 × 0.5 = 2.5` rounded up to 3.

**Implementation**: Computed server-side using the `activatedAt` field on `CenterMembership`.

---

## 10. Attribution for Reassigned Bookings

**Decision**: Completion credit (rating + time-to-completion) goes to the technician recorded as assignee at the moment the booking status transitions to `COMPLETED`. This is already the semantics of the `assignedMembershipId` field on `Booking`.

**Time-to-completion**: Measured from the timestamp of the most recent `ASSIGN_TECHNICIAN` event in the booking's audit log, to the `COMPLETED` transition timestamp.

**Implication**: The backend needs to persist an audit trail of assignment events with timestamps. This may be a new table (`booking_assignment_history`) if not already tracked — captured as a backend task.
