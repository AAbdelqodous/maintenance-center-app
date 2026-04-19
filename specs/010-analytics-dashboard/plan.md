# Implementation Plan: Phase 5.0 — Analytics Dashboard

**Branch**: `004-analytics-dashboard` | **Date**: 2026-04-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-analytics-dashboard/spec.md`

## Summary

Center owners need a dedicated Analytics screen to understand business performance without manually counting data. The screen shows five independent sections — performance summary, booking trends chart, revenue by category, customer satisfaction with trend comparison, and peak hours — all filterable by period (This Week / This Month / Last 3 Months). Each section loads in parallel via separate RTK Query hooks. Charts are rendered with `react-native-gifted-charts` (pure JS, Expo-compatible). A new set of five analytics API endpoints on the backend aggregates data server-side per center and period.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: RTK Query (data fetching), `react-native-gifted-charts` (charts), NativeWind (styling), react-i18next (i18n)
**New Dependency**: `react-native-gifted-charts` + `react-native-linear-gradient` (peer dep)
**Storage**: N/A — read-only analytics screen; no local persistence
**Testing**: Jest + React Native Testing Library (component tests for each analytics section)
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: Mobile app screen (React Native / Expo managed workflow)
**Performance Goals**: Summary card renders within 3s; period switch completes within 2s (SC-001, SC-002)
**Constraints**: Expo managed workflow — no custom native modules; all packages must work without `expo prebuild`
**Scale/Scope**: Single new screen + 5 new components + 1 new RTK Query slice + 5 backend endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec is approved; planning before implementation |
| II. Bilingual First | ✅ Pass | All strings via `analytics.*` i18n keys; Arabic + English defined in data-model.md |
| III. Component-Driven UI | ✅ Pass | Screen is composed of 5 independent section components + 1 period selector; NativeWind styling |
| IV. API Contract Adherence | ✅ Pass | 5 RTK Query endpoints; JWT auth header; `Analytics` tagType already listed in CLAUDE.md |
| V. Owner-Context Awareness | ✅ Pass | Analytics screen is read-only management insight; no customer flows |
| VI. Security & Privacy | ✅ Pass | HTTPS in production (Phase 2.5); no PII in analytics data; JWT in secure storage |
| VII. Production Readiness | ✅ Pass | Error boundary wraps tab screen; no feature flags; no placeholders |

**Constitution Check Result**: All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-analytics-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0: charting library, API design, period calc decisions
├── data-model.md        # Phase 1: TypeScript interfaces, i18n keys
├── quickstart.md        # Phase 1: developer onboarding guide
├── contracts/
│   └── analytics-api.md # Phase 1: 5 backend endpoint contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
app/(app)/(tabs)/
├── _layout.tsx                      # ADD: analytics tab entry
└── analytics/
    └── index.tsx                    # NEW: Analytics screen (period selector + 5 sections)

components/analytics/
├── PeriodSelector.tsx               # NEW: This Week / This Month / Last 3 Months toggle
├── SummaryCard.tsx                  # NEW: Performance summary metrics card
├── BookingTrendsChart.tsx           # NEW: Stacked bar chart (completed vs cancelled)
├── RevenueByCategoryList.tsx        # NEW: Ranked list of category revenues
├── SatisfactionSection.tsx          # NEW: Avg rating + distribution + trend indicator
└── PeakHoursChart.tsx               # NEW: Bar chart by hour 0–23

store/api/
└── analyticsApi.ts                  # NEW: 5 RTK Query endpoints

types/
└── analytics.ts                     # NEW: PerformanceSummary, BookingTrend, etc.

lib/utils/
└── analytics.ts                     # NEW: periodToDateRange() helper

lib/i18n/locales/
├── en.json                          # ADD: analytics.* namespace keys
└── ar.json                          # ADD: analytics.* namespace keys (Arabic)
```

**Structure Decision**: Mobile-only feature. Single screen composition pattern — the analytics screen is a thin layout component that delegates to 5 independent section components, each owning its own data-fetching hook. This matches the existing pattern used by bookings (BookingCard, StatusBadge) and reviews (ReviewCard).

## Complexity Tracking

> No constitution violations — this section is not applicable.
