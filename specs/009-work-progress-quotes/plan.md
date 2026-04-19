# Implementation Plan: Phase 4.0 — Work Progress & Quotes

**Branch**: `003-work-progress-quotes` | **Date**: 2026-04-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-work-progress-quotes/spec.md`

## Summary

Center owners need to communicate repair progress in real time and provide structured cost quotes. This phase adds a three-tab booking detail view (Details / Progress / Quotes), a work stage transition selector that shows only valid next stages from the `WORK_STAGES` transition map, a progress timeline with photo upload (up to 5 photos per update via `expo-image-picker`, uploaded individually for per-photo progress tracking via `expo-file-system`), a full-screen photo viewer (React Native `Modal + FlatList`), a dynamic quote builder using React Hook Form + `useFieldArray` with live KD subtotal/total, and a quote send-and-approval flow. Two new RTK Query slices (`workProgressApi.ts`, `quotesApi.ts`) are added. All text is bilingual via i18n keys in `progress.*`, `workStage.*`, and `quote.*` namespaces. Confirmation dialogs are platform-aware (no `Alert.alert` on web).

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: React Hook Form + Zod + `useFieldArray` (forms), RTK Query (data), NativeWind (styling), react-i18next (i18n), expo-image-picker (photos), expo-file-system (upload with progress)
**New Dependencies**: None — `expo-image-picker` and `expo-file-system` are already in Expo SDK 54 managed workflow
**Storage**: N/A — all data on backend; photo URIs are server-returned URLs
**Testing**: No automated tests — manual smoke test checklist in `quickstart.md`
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: Mobile app feature — modified screen + new components + new screens + 2 RTK slices
**Performance Goals**: Progress timeline loads within 2s (SC-003); quote form totals update within 100ms (SC-005)
**Constraints**: Expo managed workflow; `Alert.alert` no-op on web → `window.confirm`; `KD X.XXX` format enforced; max 5 photos per update; max 10 MB per photo
**Scale/Scope**: 1 modified screen, 3 new screens, 7 new components, 2 new RTK slices, 2 new type files, 2 Zod schemas, i18n keys in 2 locales

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec approved; planning before implementation |
| II. Bilingual First | ✅ Pass | All stage names, notes, quote fields bilingual; `progress.*`, `workStage.*`, `quote.*` i18n keys; RTL required |
| III. Component-Driven UI | ✅ Pass | `WorkStageSelector`, `StageUpdateForm`, `PhotoUploader`, `ProgressTimeline`, `QuoteBuilder`, `QuoteCard` are independent reusable components |
| IV. API Contract Adherence | ✅ Pass | All data via RTK Query; `workProgressApi.ts` + `quotesApi.ts` follow standard inject pattern; `'WorkProgress'` and `'Quotes'` tags already in tagTypes |
| V. Owner-Context Awareness | ✅ Pass | Work progress and quotes are center management features — scoped to owner's bookings |
| VI. Security & Privacy | ✅ Pass | JWT-authenticated endpoints; HTTPS in production (Phase 2.5); internal notes never exposed to customers |
| VII. Production Readiness | ✅ Pass | ErrorBoundary wraps Profile tab (Phase 2.5); no placeholders; no feature flags |

**Constitution Check Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-work-progress-quotes/
├── plan.md                      # This file
├── research.md                  # Phase 0: navigation, photo picker, image viewer, upload strategy decisions
├── data-model.md                # Phase 1: TypeScript types, Zod schemas, RTK slices, i18n keys, component map
├── quickstart.md                # Phase 1: step-by-step guide + smoke test checklist
├── contracts/
│   └── work-progress-api.md     # Phase 1: API endpoint contracts
├── checklists/
│   └── requirements.md          # Spec quality checklist
└── tasks.md                     # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
types/
├── workProgress.ts              # NEW: WorkStage, WorkStageInfo, WORK_STAGES constant,
│                                #      UpdateWorkStageRequest, BookingWorkProgress,
│                                #      BookingMedia, MediaCategory, helper functions
└── quote.ts                     # NEW: QuoteLineItem, CreateQuoteRequest, QuoteStatus, BookingQuote

components/bookings/
└── WorkStageSelector.tsx        # NEW: filters canTransitionTo, renders only valid next stages

components/progress/
├── progressSchema.ts            # NEW: Zod schemas for stage update and progress update forms
├── StageUpdateForm.tsx          # NEW: wraps WorkStageSelector with mutation + loading/error state
├── PhotoUploader.tsx            # NEW: camera/gallery picker, 5-photo limit, per-photo upload progress
└── ProgressTimeline.tsx         # NEW: chronological entry list, photo thumbnails, full-screen Modal viewer

components/quotes/
├── quoteSchema.ts               # NEW: Zod with useFieldArray + discountAmount <= subtotal refinement
├── QuoteCard.tsx                # NEW: status badge, version, total, tappable
└── QuoteBuilder.tsx             # NEW: dynamic line items, live subtotal/total, formatKD()

store/api/
├── workProgressApi.ts           # NEW: updateWorkStage, getWorkProgress, createWorkProgress,
│                                #      getBookingMedia, uploadMedia
└── quotesApi.ts                 # NEW: getBookingQuotes, createQuote, sendQuote

app/(app)/(tabs)/bookings/
├── _layout.tsx                  # MODIFY: add Stack.Screen for add-progress, create-quote, quote-detail
├── [id].tsx                     # MODIFY: add inline tab bar (Details / Progress / Quotes)
├── add-progress.tsx             # NEW: Add Progress Update form + PhotoUploader
├── create-quote.tsx             # NEW: Create Quote form (QuoteBuilder)
└── quote-detail.tsx             # NEW: Read-only quote + Send button + Revised flow

lib/i18n/locales/
├── en.json                      # ADD: progress.*, workStage.*, quote.* namespace keys
└── ar.json                      # ADD: Arabic translations for progress.*, workStage.*, quote.*
```

**Structure Decision**: Mobile-only feature. The existing booking detail screen (`[id].tsx`) gains an inline tab bar (managed by `useState`) — not converted to a directory — to preserve all existing navigation references. Three new flat sibling screens (`add-progress.tsx`, `create-quote.tsx`, `quote-detail.tsx`) are added to the bookings stack; they receive `bookingId` (and `quoteId`) via `useLocalSearchParams`. Components are split by domain: `components/bookings/` for stage selection, `components/progress/` for timeline and upload, `components/quotes/` for quote building.

## Complexity Tracking

> No constitution violations — this section is not applicable.
