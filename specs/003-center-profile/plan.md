# Implementation Plan: Phase 3 — Center Profile Management

**Branch**: `phase-3-center-profile` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Status**: ✅ COMPLETE — retrospective plan

## Summary

Center owners manage their public-facing profile: bilingual name/description (Arabic + English), phone number, bilingual address fields, operating hours per day of week, service category selection, and center photos. All text fields follow the `nameAr`/`nameEn` pattern. Hours use `HH:mm:ss` format. Photos upload as multipart/form-data. A `setup-center.tsx` screen covers first-time profile creation.

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: React Hook Form + Zod (profile edit form), RTK Query, expo-image-picker (photo upload), NativeWind
**New Dependencies**: None beyond Phase 1 baseline
**Storage**: N/A — server-persisted
**Testing**: Manual — edit and save profile, upload photo, set hours, verify RTL
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: React Native feature — 1 modified screen + form + RTK slice
**Constraints**: Bilingual address fields (`cityAr`/`cityEn`, etc. — never single `city`); hours in `HH:mm:ss`; phone format `+965 XXXX XXXX`
**Scale/Scope**: 1 primary screen, 1 RTK slice, multipart photo upload

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec preceded implementation |
| II. Bilingual First | ✅ Pass | `nameAr`/`nameEn`, `descriptionAr`/`descriptionEn`, `cityAr`/`cityEn` etc. |
| III. Component-Driven UI | ✅ Pass | Profile form composed from reusable inputs |
| IV. API Contract Adherence | ✅ Pass | RTK Query; `centerApi.ts` follows `/centers/my/*` contract |
| V. Owner-Context Awareness | ✅ Pass | Profile scoped to authenticated owner's center |
| VI. Security & Privacy | ✅ Pass | JWT on all requests |
| VII. Production Readiness | ✅ Pass | No placeholder fields |

## Project Structure

### Documentation

```text
specs/phase-3-center-profile/
├── plan.md    # This file (retrospective)
├── spec.md    # Original specification
└── tasks.md   # Task list (retrospective)
```

### Source Code

```text
store/api/
└── centerApi.ts                   # GET /centers/my/profile, PUT /centers/my,
                                   # POST /centers/my/images, GET /categories
                                   # Tags: 'CenterProfile', 'CenterImages'

app/(app)/(tabs)/profile/
└── index.tsx                      # View + edit center profile (bilingual name/desc,
                                   # bilingual address, phone, categories, hours, photos)

app/(app)/
└── setup-center.tsx               # First-time profile setup (same form, no existing data)
```

## Complexity Tracking

> No constitution violations — this section is not applicable.
