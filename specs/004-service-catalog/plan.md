# Implementation Plan: Phase 4 — Service Catalog Management

**Branch**: `phase-4-service-catalog` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Status**: ✅ COMPLETE — retrospective plan

## Summary

Center owners manage the services they offer: a list view grouped by category, an add form (bilingual name, category dropdown from `GET /categories`, price in KD 3dp, duration in minutes, optional descriptions), an edit form pre-populated from existing data, an active/paused toggle, and a delete action with destructive confirmation. React Hook Form + Zod handle form validation. All service names follow the `nameAr`/`nameEn` bilingual pattern.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: React Hook Form + Zod (forms), RTK Query, NativeWind, react-i18next
**New Dependencies**: None beyond Phase 1 baseline
**Storage**: N/A — server-persisted
**Testing**: Manual — add, edit, pause, delete, RTL
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: React Native feature — new screens + RTK slice extension
**Constraints**: KD `X.XXX` 3-decimal price format; bilingual fields required; discard-changes dialog
**Scale/Scope**: 2–3 screens, 1 RTK slice, Zod schema

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec preceded implementation |
| II. Bilingual First | ✅ Pass | `nameAr`/`nameEn`/`descriptionAr`/`descriptionEn` on every service |
| III. Component-Driven UI | ✅ Pass | Service catalog uses reusable card pattern |
| IV. API Contract Adherence | ✅ Pass | RTK Query; service CRUD on center's catalog endpoints |
| V. Owner-Context Awareness | ✅ Pass | Services scoped to authenticated owner's center |
| VI. Security & Privacy | ✅ Pass | JWT on all requests |
| VII. Production Readiness | ✅ Pass | Inline errors, discard-dialog, no placeholders |

## Project Structure

### Documentation

```text
specs/phase-4-service-catalog/
├── plan.md    # This file (retrospective)
├── spec.md    # Original specification
└── tasks.md   # Task list (retrospective)
```

### Source Code

```text
store/api/
└── centerApi.ts                   # Extended with service CRUD endpoints (or separate servicesApi.ts)

app/(app)/(tabs)/profile/
├── index.tsx                      # MODIFIED: adds "Manage Services" navigation row
└── services/
    ├── _layout.tsx                # Stack navigator
    ├── index.tsx                  # Service catalog list (grouped by category, active/paused badges)
    ├── add.tsx                    # Add service form
    └── [id].tsx                   # Edit service form + pause toggle + delete
```

## Complexity Tracking

> No constitution violations — this section is not applicable.
