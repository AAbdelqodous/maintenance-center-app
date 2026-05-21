# Implementation Plan: Staff Performance Board

**Branch**: `018-staff-performance-board` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

## Summary

Add a staff performance board to the branch manager dashboard that shows each active technician's workload and monthly performance in a sortable card list, surfaces overloaded staff, provides a one-tap rebalance action, and links to per-staff historical drill-down. An ethics guardrail enforced server-side ensures technicians never see sensitive peer metrics (tier, overload status, trend direction).

**Technical approach**: Two new endpoints added to `analyticsApi.ts` (`getStaffPerformanceBoard`, `getStaffMonthlyHistory`). New type file `types/staffPerformance.ts`. New hook `useStaffPerformanceBoard` (same focus-aware polling pattern as `useDashboardSnapshot`). Seven new dashboard/staff components. Optimistic update + rollback for the rebalance action reuses the existing `assignTechnician` mutation. The ethics guardrail is a server-only concern — the client renders whatever the server returns, making the UI role-correct by construction.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.81.5, Expo SDK 54  
**Primary Dependencies**: RTK Query (Redux Toolkit), Expo Router, react-i18next, NativeWind (Tailwind CSS)  
**Storage**: N/A (no new local storage — JWT already in SecureStore)  
**Testing**: Manual smoke test + explicit ethics guardrail test (login as TECHNICIAN, verify API response withholds sensitive fields)  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Project Type**: Mobile app (React Native + Expo)  
**Performance Goals**: Board renders within 200 ms of data arrival; optimistic update visible within 200 ms of confirm tap  
**Constraints**: RTL-correct on 375 px width minimum; polling stops when screen loses focus  
**Scale/Scope**: Branch with up to ~20 active technicians; 2 new API queries, 7 new components, 1 new hook, 1 new type file

---

## Constitution Check

### I. Spec-Driven Development ✅
Spec 018 approved before this plan. Order: Spec → Plan (this doc) → Tasks → Implement.

### II. Bilingual First ✅
All `StaffStatus`, `PerformanceTier`, metric labels, and error messages have i18n keys in both `en.json` and `ar.json`. Card layout tested for RTL. No hardcoded display strings.

### III. Component-Driven UI ✅
Seven new components (`StaffPerformanceBoard`, `StaffPerformanceCard`, `StaffStatusBadge`, `PerformanceTierBadge`, `TrendArrow`, `RebalanceModal`, drill-down screen). Each independently testable. Styled with existing `StyleSheet.create` pattern (matching KpiCard and other dashboard components — no raw NativeWind classes for now).

### IV. API Contract Adherence ✅
All data fetching via RTK Query. Two new typed endpoints in `analyticsApi.ts`. `assignTechnician` mutation reused from `bookingsApi.ts`. Auth headers via `prepareHeaders`.

### V. Owner-Context Awareness ✅
Board is shown only on the owner/manager dashboard at `app/(app)/(tabs)/index.tsx`. No customer-facing elements. All data is scoped to the active center via backend JWT context.

### VI. Security & Privacy ✅
JWTs remain in SecureStore. Ethics guardrail is server-enforced (FR-023). Drill-down screen gated by `MANAGE_NON_MANAGER_STAFF` permission via `<PermissionGate>`. No PII logged.

### VII. Production Readiness ✅
No feature flags, no placeholder UI, no pseudocode. All edge cases handled (single-staff branch, new staff, offline state). Error states rendered for all async operations.

**Constitution Check Result**: PASS. No violations. No Complexity Tracking table required.

---

## Project Structure

### Documentation (this feature)

```text
specs/018-staff-performance-board/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api-contract.md  ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (from /speckit.tasks)
```

### Source Code

```text
maintenance-center-app/
├── types/
│   ├── staffPerformance.ts          ← NEW: StaffStatus, PerformanceTier, TrendDirection,
│   │                                        StaffPerformanceCard, StaffPerformanceBoardResponse,
│   │                                        PerformanceTierConfig, StaffMonthlyMetrics,
│   │                                        StaffHistoryResponse, ActiveBookingSummary,
│   │                                        RebalanceSuggestion
│   └── (staff.ts, dashboard.ts …)   unchanged
│
├── store/api/
│   ├── analyticsApi.ts              ← MODIFIED: add 'StaffPerformance' tagType,
│   │                                             getStaffPerformanceBoard query,
│   │                                             getStaffMonthlyHistory query
│   └── bookingsApi.ts               ← MODIFIED: add 'StaffPerformance' to
│                                                 assignTechnician invalidation
│
├── hooks/
│   ├── useStaffPerformanceBoard.ts  ← NEW: focus-aware 60 s polling hook
│   └── (useDashboardSnapshot.ts …)  unchanged
│
├── components/dashboard/
│   ├── StaffPerformanceBoard.tsx    ← NEW: sorted list, empty/loading/error states,
│   │                                        Rebalance button trigger
│   ├── StaffPerformanceCard.tsx     ← NEW: avatar, name, status badge, tier badge,
│   │                                        metrics row, trend arrow, tap → drill-down
│   ├── StaffStatusBadge.tsx         ← NEW: AVAILABLE / ON_TASK / OVERLOADED / OFFLINE pill
│   ├── PerformanceTierBadge.tsx     ← NEW: TOP_PERFORMER / STRONG / ON_TRACK /
│   │                                        NEEDS_ATTENTION / NEW pill
│   ├── TrendArrow.tsx               ← NEW: ↑ / ↓ colored arrow, hidden when STABLE
│   ├── RebalanceModal.tsx           ← NEW: bottom sheet with overloaded list, booking
│   │                                        picker, recipient picker, confirm, optimistic update
│   └── (KpiCard, KpiGrid, AttentionPanel … unchanged)
│
├── app/(app)/(tabs)/
│   ├── index.tsx                    ← MODIFIED: add <StaffPerformanceBoard> below <KpiGrid>
│   └── staff/
│       └── performance/
│           └── [membershipId].tsx   ← NEW: drill-down screen (monthly history, bookings, reviews)
│
└── lib/i18n/locales/
    ├── en.json                      ← MODIFIED: add staff.performanceBoard.* keys
    └── ar.json                      ← MODIFIED: add Arabic equivalents
```

**Structure Decision**: Single app repository, mobile-first. New files follow the established per-domain pattern: types in `types/`, hooks in `hooks/`, dashboard components in `components/dashboard/`, screen in `app/(app)/(tabs)/staff/performance/`.

---

## Phase 0: Research Findings

See [research.md](research.md) for full rationale. Decisions summary:

| Decision | Choice |
|----------|--------|
| API slice | Add to `analyticsApi.ts` (not new slice, not staffApi) |
| Ethics guardrail | Server-side field omission; client renders what arrives |
| Optimistic update | `updateQueryData` + `undo()` in mutation's `onQueryStarted` |
| Overload/tier computation | Server-computed and returned as fields |
| Polling | 60 s focus-aware, same pattern as `useDashboardSnapshot` |
| Composite score | Weighted avg (0.4 rating + 0.35 on-time + 0.25 volume), server-computed |
| Business hours | Center's `openingTime`/`closingTime` profile fields |
| Mid-month pro-rating | Server uses `activatedAt` from `CenterMembership` |
| Attribution | `booking_assignment_history` table needed on backend |
| Starting thresholds | Defined in `data-model.md`; configurable via `performance_tier_config` table |

---

## Phase 1: Design Artifacts

- [data-model.md](data-model.md) — All TypeScript types + backend entity specs
- [contracts/api-contract.md](contracts/api-contract.md) — New endpoint shapes + RTK Query integration
- [quickstart.md](quickstart.md) — File map, implementation notes, i18n keys, acceptance checklist

### Post-Design Constitution Re-check ✅

All design decisions remain constitution-compliant. The `PerformanceTierConfig` returned in the API response satisfies "no hardcoded thresholds." All UI strings in i18n. No new external services introduced.

---

## Implementation Sequence (for /speckit.tasks)

Tasks should be generated in this dependency order:

1. **Types** — `types/staffPerformance.ts` (no dependencies)
2. **API endpoints** — Backend: `GET /analytics/center/staff-performance` + `GET /analytics/center/staff/{membershipId}/history` + `booking_assignment_history` table
3. **RTK Query** — `analyticsApi.ts` additions + `bookingsApi.ts` tag update
4. **Hook** — `useStaffPerformanceBoard.ts`
5. **Leaf components** (no inter-component dependencies):
   - `StaffStatusBadge.tsx`
   - `PerformanceTierBadge.tsx`
   - `TrendArrow.tsx`
6. **Composite components** (depend on leaf components):
   - `StaffPerformanceCard.tsx` (uses the three badge components)
7. **Board + modal** (depends on card):
   - `StaffPerformanceBoard.tsx`
   - `RebalanceModal.tsx`
8. **Drill-down screen** — `app/(app)/(tabs)/staff/performance/[membershipId].tsx`
9. **Dashboard integration** — Modify `app/(app)/(tabs)/index.tsx`
10. **i18n** — `en.json` + `ar.json` additions (can be parallelized with step 5)
11. **Ethics test** — Automated test: TECHNICIAN session → verify API withholds sensitive fields
