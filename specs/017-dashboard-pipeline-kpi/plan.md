# Implementation Plan: Dashboard Pipeline & KPI Cards

**Branch**: `017-dashboard-pipeline-kpi` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/017-dashboard-pipeline-kpi/spec.md`

## Summary

Replace the five vanity stat cards on the staff/manager dashboard with two purposeful sections: a live horizontal pipeline strip showing booking counts per active work stage (with bottleneck detection), and a 2×2 grid of four trend-aware KPI cards (Bookings Today, Avg Completion Time, On-Time Rate, Revenue Today). Both sections auto-refresh every 60 seconds while the screen is focused. A shared `DashboardPipelineSection` component also surfaces these sections on the center owner dashboard.

The primary technical approach: add a `getDashboardSnapshot` endpoint to the existing `analyticsApi.ts`, create four new components in `components/dashboard/`, and replace the stat card grid in `staff/dashboard.tsx`. All bottleneck detection and delta computation happens client-side from the data returned by the snapshot endpoint.

## Technical Context

**Language/Version**: TypeScript, React Native 0.81.5 + Expo SDK 54  
**Primary Dependencies**: RTK Query (standalone `createApi` per slice), expo-router, react-i18next, `@react-navigation/native` (`useIsFocused`)  
**Storage**: N/A — read-only analytics data, no local persistence  
**Testing**: Component-level tests per constitution  
**Target Platform**: iOS, Android, Web (React Native Web), minimum 360 px screen width  
**Project Type**: Mobile app (React Native + Expo Router)  
**Performance Goals**: Dashboard snapshot loads in <2 s; proportional chip width computes in a single render pass  
**Constraints**: RTL layout for Arabic locale; 360 px minimum width without overflow; polling pauses when screen is not focused; no client-side historical aggregation (all trend baselines computed server-side)  
**Scale/Scope**: 1 new API endpoint, 4 new components, 1 new custom hook, 2 modified screens, ~20 new i18n keys

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec approved before this plan |
| II. Bilingual First | ✅ Pass | All labels, captions, subtitles via i18n keys; AR + EN required |
| III. Component-Driven UI | ✅ Pass | Pipeline and KPI sections are independent, testable components |
| IV. API Contract Adherence | ✅ Pass | RTK Query endpoint added to analyticsApi; typed response interface |
| V. Owner-Context Awareness | ✅ Pass | Dashboard shows operational center metrics; no customer-side flows |
| VI. Security & Privacy | ✅ Pass | JWT from secure store; no PII logged; auth header via RTK Query prepareHeaders |
| VII. Production Readiness | ✅ Pass | All error + empty + insufficient-history states handled; no placeholders |

**Gate**: All principles pass. Phase 0 research may begin.

## Project Structure

### Documentation (this feature)

```text
specs/017-dashboard-pipeline-kpi/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Phase 1 — TypeScript types
├── quickstart.md        # Phase 1 — developer setup guide
├── contracts/
│   └── dashboard-snapshot-api.md   # Phase 1 — endpoint contract
└── tasks.md             # Phase 2 — /speckit.tasks output (not yet created)
```

### Source Code (repository root)

```text
app/(app)/staff/
└── dashboard.tsx                     # MODIFIED — replace stat cards with pipeline + KPI sections

app/(app)/(tabs)/
└── index.tsx                         # MODIFIED — add DashboardPipelineSection above AttentionPanel

components/dashboard/
├── PipelineStrip.tsx                 # NEW — horizontal stage visualization with bottleneck detection
├── PipelineChip.tsx                  # NEW — single stage chip (proportional width, tap-to-filter)
├── KpiCard.tsx                       # NEW — single KPI metric card with delta badge
├── KpiGrid.tsx                       # NEW — 2×2 wrapper composing four KpiCards
├── AttentionPanel.tsx                # UNCHANGED
├── AttentionItem.tsx                 # UNCHANGED
└── AllClearState.tsx                 # UNCHANGED

hooks/
└── useDashboardSnapshot.ts           # NEW — RTK Query wrapper with focus-aware 60 s polling

store/api/
└── analyticsApi.ts                   # MODIFIED — add getDashboardSnapshot endpoint

types/
└── dashboard.ts                      # NEW — DashboardSnapshot, PipelineStage, KpiMetric types

lib/i18n/locales/
├── en.json                           # MODIFIED — add ~20 new keys under dashboard.*
└── ar.json                           # MODIFIED — Arabic translations for same keys
```

**Structure Decision**: Single app (mobile + web). All new code lives under `components/dashboard/`, `hooks/`, `types/`, and `store/api/`. No new route files; existing screen files are modified in place.

## Complexity Tracking

No constitution violations. No additional entries needed.
