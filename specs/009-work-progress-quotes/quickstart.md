# Quickstart: Phase 4.0 — Work Progress & Quotes

**Branch**: `003-work-progress-quotes` | **Date**: 2026-04-16

---

## Prerequisites

- Backend is running with work progress and quotes endpoints deployed
- Logged in as a center owner with an approved account that has active bookings
- Branch `003-work-progress-quotes` is checked out
- Phase 3.5 (service pricing) is merged or the types it adds are available

---

## Step 1: Add i18n Keys

Add the `progress`, `workStage`, and `quote` namespace keys to both locale files.

1. Read `lib/i18n/locales/en.json` — add `progress`, `workStage`, and `quote` objects from `data-model.md`
2. Read `lib/i18n/locales/ar.json` — add matching Arabic translations from `data-model.md`

---

## Step 2: Create Types

1. Create `types/workProgress.ts` — `WorkStage`, `WorkStageInfo`, `WORK_STAGES` constant, `UpdateWorkStageRequest`, `BookingWorkProgress`, `BookingMedia`, `MediaCategory`, plus helper functions `getAvailableNextStages()` and `getStageDisplayName()` from `data-model.md`
2. Create `types/quote.ts` — `QuoteLineItem`, `CreateQuoteRequest`, `QuoteStatus`, `BookingQuote` from `data-model.md`

---

## Step 3: Create Zod Schemas

1. Create `components/progress/progressSchema.ts` — `stageUpdateSchema` and `progressUpdateSchema` from `data-model.md`
2. Create `components/quotes/quoteSchema.ts` — `quoteSchema` with `lineItems` array and `discountAmount <= subtotal` refinement from `data-model.md`

---

## Step 4: Create RTK Query Slices

1. Create `store/api/workProgressApi.ts` — 5 endpoints: `updateWorkStage`, `getWorkProgress`, `createWorkProgress`, `getBookingMedia`, `uploadMedia`
2. Create `store/api/quotesApi.ts` — 3 endpoints: `getBookingQuotes`, `createQuote`, `sendQuote`
3. Confirm `'WorkProgress'` and `'Quotes'` exist in `tagTypes` in `store/index.ts`

---

## Step 5: Create Components

Create these components (in parallel — all in separate files):

### `components/bookings/WorkStageSelector.tsx`
- Receives `currentStage: WorkStage` and `onSelectStage: (stage: WorkStage, notes?: string) => void`
- Derives next stages via `getAvailableNextStages(currentStage)` from `types/workProgress`
- Renders each available next stage as a tappable button (no "Update Stage" buttons if `canTransitionTo` is empty)
- After tapping a stage: shows an optional notes `TextInput` (max 500 chars) and a "Confirm" button
- Labels use `getStageDisplayName(stage, i18n.language)` for bilingual display

### `components/progress/StageUpdateForm.tsx`
- Wrapper that combines `WorkStageSelector` with a submission handler
- Shows loading state while `updateWorkStage` mutation is pending
- Shows success banner and calls `onSuccess()` callback on success

### `components/progress/PhotoUploader.tsx`
- Renders an "Add Photo" button that opens an `ActionSheet`-style menu: "Camera" | "Gallery"
- Camera: calls `ImagePicker.launchCameraAsync({ mediaTypes: 'Images', quality: 0.8 })`
- Gallery: calls `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.8, allowsMultipleSelection: false })`
- Before adding: validates `result.assets[0].fileSize < 10 * 1024 * 1024` — shows inline error if too large
- Maintains local state of `photos: { uri: string; uploadState: 'pending' | 'uploading' | 'done' | 'error'; progress: number }[]`
- Shows "Maximum 5 photos reached" when `photos.length >= 5`
- Renders photo thumbnails with individual upload progress bars

### `components/progress/ProgressTimeline.tsx`
- Receives `entries: BookingWorkProgress[]` and `media: BookingMedia[]`
- Renders entries in chronological order (already sorted by server)
- For each entry: stage badge, customer notes, internal notes (with "Internal only" label), photo thumbnails (filtered from `media` by timestamp proximity or attached by grouping), timestamp, author name
- Photo thumbnails: tapping opens a `Modal` with `FlatList` (horizontal, pagingEnabled) for swipe navigation
- Empty state: "No progress updates yet..."

---

## Step 6: Create Quote Components

### `components/quotes/QuoteCard.tsx`
- Receives `quote: BookingQuote` and `onPress?: () => void`
- Shows: status badge (color-coded: grey=Draft, blue=Sent, green=Approved, red=Rejected), version number, total amount, creation date
- Tappable if `onPress` is provided

### `components/quotes/QuoteBuilder.tsx`
- React Hook Form + `useFieldArray` for dynamic line items
- `onSubmit: (values: QuoteFormValues) => Promise<void>` prop
- Live subtotal/total computation via `useMemo` from `watch('lineItems')` and `watch('discountAmount')`
- All amounts via `formatKD()` from `lib/utils/pricing.ts`
- "Add Line Item" appends new empty row
- "Remove" shown only when `fields.length > 1`

---

## Step 7: Modify Booking Detail Screen

Modify `app/(app)/(tabs)/bookings/[id].tsx`:

1. Add tab bar state: `const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'quotes'>('details')`
2. Add a `BookingDetailTabs` component inline (3 tabs: Details | Progress | Quotes) at the top of the ScrollView
3. The existing booking detail content renders when `activeTab === 'details'`
4. When `activeTab === 'progress'`: render `ProgressTimeline` + "Add Update" button (navigates to `./add-progress?bookingId=X`) + `StageUpdateForm` (inline or as a collapsible)
5. When `activeTab === 'quotes'`: render `FlatList` of `QuoteCard` + "Create Quote" button (navigates to `./create-quote?bookingId=X`)

---

## Step 8: Create Form Screens

1. Create `app/(app)/(tabs)/bookings/add-progress.tsx`:
   - Reads `bookingId` from `useLocalSearchParams()`
   - Renders `PhotoUploader` + notes inputs
   - On save: calls `createWorkProgress` then uploads photos via `FileSystem.uploadAsync`

2. Create `app/(app)/(tabs)/bookings/create-quote.tsx`:
   - Reads `bookingId` from `useLocalSearchParams()`
   - Renders `QuoteBuilder`
   - On save: calls `createQuote` mutation → navigates back

3. Create `app/(app)/(tabs)/bookings/quote-detail.tsx`:
   - Reads `bookingId` + `quoteId` from `useLocalSearchParams()`
   - Shows read-only quote view for sent/approved/rejected quotes
   - Shows "Send to Customer" button for Draft quotes
   - Shows "Create Revised Quote" button for Rejected quotes

---

## Step 9: Update Bookings Stack Layout

Modify `app/(app)/(tabs)/bookings/_layout.tsx` — add `Stack.Screen` declarations for:
- `add-progress` with title `t('progress.addUpdate')`
- `create-quote` with title `t('quote.createQuote')`
- `quote-detail` with title `t('quote.title')`

---

## Smoke Test Checklist

### US1 — Stage Transitions
- [ ] Open a booking in "Car Received" stage → "Update Stage" button is visible
- [ ] Only "Diagnosing" is offered as the next stage
- [ ] Select stage, add a note, confirm → booking detail shows "Diagnosing"
- [ ] Open a booking in "Picked Up" stage → "Update Stage" button is NOT shown
- [ ] Stage names appear in Arabic when locale is Arabic

### US2 — Add Progress Update
- [ ] Navigate to Progress tab → "Add Update" button is visible
- [ ] Open Add Update form → can type customer notes and internal notes
- [ ] Attach 2 photos (one from Camera, one from Gallery) → thumbnails appear in form
- [ ] Try to attach a 6th photo → "Maximum 5 photos reached" message appears
- [ ] Try to attach a photo > 10 MB → inline error message, photo not added
- [ ] Save → progress entry appears in timeline with thumbnails

### US3 — Progress Timeline
- [ ] Progress tab shows entries in chronological order (oldest first)
- [ ] Each entry shows: stage, notes, photo thumbnails, timestamp, author name
- [ ] Internal notes are labeled "Internal only"
- [ ] Tap a photo thumbnail → full-screen viewer opens
- [ ] Swipe in full-screen viewer → navigates between photos in same entry

### US4 — Create Quote
- [ ] "Create Quote" button visible in Quotes tab
- [ ] Create Quote screen opens with one empty line item row
- [ ] "Add Line Item" appends a new row
- [ ] "Remove" not shown when only 1 row remains
- [ ] Subtotal and Total update in real time as values are typed
- [ ] Set discount > subtotal → inline validation error, cannot save
- [ ] Save as Draft → quote appears in Quotes tab with "Draft" badge

### US5 — Send Quote
- [ ] Draft quote shows "Send to Customer" button
- [ ] Tapping "Send" shows confirmation step with total amount
- [ ] Confirming → quote status changes to "Sent", send button hidden
- [ ] API failure → inline error banner, quote stays in Draft

### Cross-cutting
- [ ] All text in Arabic locale → RTL layout, Arabic labels
- [ ] All KD amounts display with exactly 3 decimal places
- [ ] Zero hardcoded display strings in any new file
