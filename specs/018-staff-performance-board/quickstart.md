# Quickstart: Staff Performance Board (Spec 018)

## Prerequisites

Before implementing this spec, verify:

1. **Spec 015 (Staff Management Foundation)** — `staffApi.ts` with `getCenterStaff`, `inviteStaff`, `assignTechnician`, role/permission types in `types/staff.ts`. Check: the `ASSIGN_TECHNICIAN` permission is in `ROLE_PERMISSIONS.BRANCH_MANAGER`.

2. **Spec 016 (Attention Required Panel)** — `components/dashboard/AttentionPanel.tsx` and `hooks/useAttentionItems.ts` exist. Check: dashboard screen at `app/(app)/(tabs)/index.tsx` renders `<AttentionPanel>`.

3. **Spec 017 (Live Pipeline & KPIs)** — `components/dashboard/KpiGrid.tsx`, `components/dashboard/PipelineStrip.tsx`, and `hooks/useDashboardSnapshot.ts` exist. Check: dashboard screen renders `<PipelineStrip>` and `<KpiGrid>`.

4. **Backend endpoint** — `GET /analytics/center/staff-performance` is implemented and accessible. Verify with: `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/analytics/center/staff-performance`.

---

## File Map: What to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `types/staffPerformance.ts` | All new types: `StaffStatus`, `PerformanceTier`, `TrendDirection`, `StaffPerformanceCard`, `StaffPerformanceBoardResponse`, `PerformanceTierConfig`, `StaffMonthlyMetrics`, `StaffHistoryResponse`, `ActiveBookingSummary`, `RebalanceSuggestion` |
| `hooks/useStaffPerformanceBoard.ts` | Focus-aware polling hook (mirrors `useDashboardSnapshot`) |
| `components/dashboard/StaffPerformanceBoard.tsx` | Board container: sorts cards, shows "Rebalance" button, handles empty/loading/error |
| `components/dashboard/StaffPerformanceCard.tsx` | Individual staff card: avatar, name, status badge, tier badge, metrics row, trend arrow |
| `components/dashboard/StaffStatusBadge.tsx` | Pill badge for AVAILABLE / ON_TASK / OVERLOADED / OFFLINE |
| `components/dashboard/PerformanceTierBadge.tsx` | Pill badge for TOP_PERFORMER / STRONG / ON_TRACK / NEEDS_ATTENTION |
| `components/dashboard/TrendArrow.tsx` | Small ↑/↓ arrow with color, hidden when direction is STABLE |
| `components/dashboard/RebalanceModal.tsx` | Bottom sheet: overloaded staff list → pick booking → pick recipient → confirm |
| `app/(app)/(tabs)/staff/performance/[membershipId].tsx` | Per-staff drill-down screen: history chart, recent bookings, reviews |

### Modified files

| File | Change |
|------|--------|
| `store/api/analyticsApi.ts` | Add `getStaffPerformanceBoard` and `getStaffMonthlyHistory` endpoints; add `'StaffPerformance'` tag type |
| `store/api/bookingsApi.ts` | Add `'StaffPerformance'` to `assignTechnician` invalidation tags |
| `app/(app)/(tabs)/index.tsx` | Render `<StaffPerformanceBoard>` below `<KpiGrid>` |
| `lib/i18n/locales/en.json` | Add `staff.performanceBoard.*` keys |
| `lib/i18n/locales/ar.json` | Add Arabic equivalents for all new keys |

---

## Key Implementation Notes

### 1. Hook pattern — copy `useDashboardSnapshot`

```ts
// hooks/useStaffPerformanceBoard.ts
export function useStaffPerformanceBoard() {
  const isFocused = useIsFocused();
  const result = useGetStaffPerformanceBoardQuery(undefined, {
    pollingInterval: isFocused ? 60_000 : 0,
    refetchOnFocus: true,
  });
  return {
    data: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: result.refetch,
  };
}
```

### 2. Sorting — always deterministic

Sort order: Overloaded → Needs Attention → rest by `activeBookingsCount` desc. Tie-break alphabetically by `lastName` to prevent card jumping between polls.

### 3. Status badge colors

| Status | Background | Text |
|--------|-----------|------|
| AVAILABLE | `#D1FAE5` | `#065F46` |
| ON_TASK | `#DBEAFE` | `#1E40AF` |
| OVERLOADED | `#FEE2E2` | `#991B1B` |
| OFFLINE | `#F3F4F6` | `#6B7280` |

### 4. Tier badge colors

| Tier | Background | Text |
|------|-----------|------|
| TOP_PERFORMER | `#FEF3C7` | `#92400E` |
| STRONG | `#D1FAE5` | `#065F46` |
| ON_TRACK | `#DBEAFE` | `#1E40AF` |
| NEEDS_ATTENTION | `#FEE2E2` | `#991B1B` |
| (isNew) | `#EDE9FE` | `#5B21B6` |

### 5. Ethics guardrail — render only when present

```tsx
// Correct: render tier badge only if field is present
{card.tier && <PerformanceTierBadge tier={card.tier} isNew={card.isNew} />}

// Correct: render trend arrow only if direction is present and not STABLE
{card.trendDirection && card.trendDirection !== 'STABLE' && (
  <TrendArrow direction={card.trendDirection} />
)}
```

Never check `userRole` client-side to decide whether to show these — trust server to omit them.

### 6. Optimistic update in Rebalance modal

```ts
const [assign] = useAssignTechnicianMutation();
const dispatch = useDispatch();

async function handleConfirm(bookingId: number, fromId: number, toId: number) {
  const patch = dispatch(
    analyticsApi.util.updateQueryData('getStaffPerformanceBoard', undefined, draft => {
      const from = draft.staff.find(s => s.membershipId === fromId);
      const to = draft.staff.find(s => s.membershipId === toId);
      if (from) from.activeBookingsCount = Math.max(0, from.activeBookingsCount - 1);
      if (to) to.activeBookingsCount += 1;
    })
  );
  try {
    await assign({ bookingId, membershipId: toId }).unwrap();
  } catch (e) {
    patch.undo();
    // show error toast
  }
}
```

### 7. Drill-down screen route

```
app/(app)/(tabs)/staff/performance/[membershipId].tsx
```

Receives `membershipId` as a route param. Calls `useGetStaffMonthlyHistoryQuery({ membershipId: Number(params.membershipId) })`. Protected by `<PermissionGate permissions={['MANAGE_NON_MANAGER_STAFF']}>` so only OWNER/BRANCH_MANAGER can navigate to it.

### 8. Empty state

When `data.staff.length === 0`: show a centered message with the i18n key `staff.performanceBoard.noStaff`.

When all staff are new (zero lifetime completions): show the board normally with "—" metrics and "New" badges.

---

## i18n Keys to Add

```json
// en.json additions under "staff"
"performanceBoard": {
  "title": "Team Performance",
  "noStaff": "No active staff members",
  "rebalanceBtn": "Rebalance",
  "rebalance": {
    "title": "Rebalance Workload",
    "overloadedSection": "Overloaded Staff",
    "moveBooking": "Move Booking",
    "selectRecipient": "Select Technician",
    "confirm": "Confirm Reassignment",
    "cancel": "Cancel",
    "success": "Booking reassigned",
    "error": "Reassignment failed"
  },
  "status": {
    "AVAILABLE": "Available",
    "ON_TASK": "On Task",
    "OVERLOADED": "Overloaded",
    "OFFLINE": "Offline"
  },
  "tier": {
    "TOP_PERFORMER": "Top Performer",
    "STRONG": "Strong",
    "ON_TRACK": "On Track",
    "NEEDS_ATTENTION": "Needs Attention",
    "NEW": "New"
  },
  "metrics": {
    "activeBookings": "Active",
    "avgRating": "Rating",
    "completionTime": "Avg Time",
    "onTimeRate": "On-Time"
  },
  "drilldown": {
    "title": "{{name}}'s Performance",
    "monthlyHistory": "Monthly History",
    "recentBookings": "Recent Bookings",
    "customerReviews": "Customer Reviews",
    "noHistory": "No history yet"
  }
}
```

Arabic equivalents required in `ar.json` for all keys above.

---

## Acceptance Test Checklist

- [ ] Board renders all active staff sorted: Overloaded → Needs Attention → rest
- [ ] Single-technician branch: no Overloaded badge, no Rebalance button
- [ ] New staff (zero lifetime bookings): "New" indicator, metrics show "—"
- [ ] Rebalance: optimistic update on confirm, rollback on server error
- [ ] Ethics: log in as TECHNICIAN → API response contains no `tier`, `isOverloaded`, or `trendDirection` for peers
- [ ] Pull-to-refresh updates board data
- [ ] Arabic RTL layout: cards, badges, and metric labels all flip correctly
- [ ] Drill-down screen: navigate to any staff card, see ≥3 months of history
- [ ] Drill-down protected: TECHNICIAN navigating to `/staff/performance/[id]` sees 403 error state, not data
