# Tasks: Phase 4.0 — Work Progress & Quotes

**Input**: Design documents from `specs/003-work-progress-quotes/`
**Branch**: `003-work-progress-quotes`
**Date**: 2026-04-16

**User Stories**:
- US1 (P1): Advance a Booking Through Repair Stages
- US2 (P1): Add a Progress Update with Photos
- US3 (P1): View the Full Progress Timeline
- US4 (P1): Create a Quote with Line Items
- US5 (P1): Send a Quote to the Customer

**No tests** — manual smoke test checklist in `quickstart.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites before creating new files

- [ ] T001 Confirm `'WorkProgress'` and `'Quotes'` exist in `tagTypes` array in `store/index.ts` — if either is missing, add it to the existing tagTypes array
- [ ] T002 Confirm `expo-image-picker` and `expo-file-system` are available in `package.json` (both ship with Expo SDK 54 — just verify they are listed as dependencies before importing)
- [ ] T003 Read `app/(app)/(tabs)/bookings/_layout.tsx` to understand the existing Stack screen declarations — note the exact file structure before modifying it

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, schemas, RTK slices, and i18n keys that ALL user story screens depend on.

**⚠️ CRITICAL**: No screen or component work can begin until this phase is complete.

- [ ] T004 [P] Create `types/workProgress.ts` with the following exact content from `data-model.md`:
  - `WorkStage` union type (all 10 stage strings)
  - `WorkStageInfo` interface
  - `WORK_STAGES` constant array (all 10 entries with `displayNameAr`, `displayNameEn`, `order`, `canTransitionTo`)
  - `UpdateWorkStageRequest` interface
  - `BookingWorkProgress` interface
  - `MediaCategory` union type
  - `BookingMedia` interface
  - `getAvailableNextStages(currentStage: WorkStage): WorkStageInfo[]` helper
  - `getStageDisplayName(stage: WorkStage, locale: string): string` helper

- [ ] T005 [P] Create `types/quote.ts`:
  - `QuoteLineItem` interface
  - `CreateQuoteRequest` interface
  - `QuoteStatus` type: `'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED'`
  - `BookingQuote` interface

- [ ] T006 [P] Create `components/progress/progressSchema.ts`:
  ```typescript
  import { z } from 'zod';

  export const stageUpdateSchema = z.object({
    stage: z.string().min(1, 'Stage is required'),  // validated against WORK_STAGES at runtime
    notes:    z.string().max(500).optional(),
    notesAr:  z.string().max(500).optional(),
    internalNotes: z.string().optional(),
    estimatedMinutesRemaining: z.number().int().min(1).optional(),
  });

  export const progressUpdateSchema = z.object({
    notes:         z.string().max(500).optional(),
    internalNotes: z.string().optional(),
    estimatedMinutesRemaining: z.number().int().min(1).optional(),
  });

  export type ProgressUpdateFormValues = z.infer<typeof progressUpdateSchema>;
  ```

- [ ] T007 [P] Create `components/quotes/quoteSchema.ts` with the exact content from `data-model.md`:
  ```typescript
  import { z } from 'zod';

  const lineItemSchema = z.object({
    description:   z.string().min(1, 'Description is required'),
    descriptionAr: z.string().optional(),
    partsCost:     z.number({ invalid_type_error: 'Parts cost required' }).min(0),
    laborCost:     z.number({ invalid_type_error: 'Labor cost required' }).min(0),
  });

  export const quoteSchema = z.object({
    lineItems:                z.array(lineItemSchema).min(1, 'At least one line item is required'),
    discountAmount:           z.number().min(0).optional(),
    discountReason:           z.string().optional(),
    estimatedDurationMinutes: z.number().int().min(1).optional(),
    notes:                    z.string().optional(),
    notesAr:                  z.string().optional(),
  }).refine(
    (data) => {
      if (!data.discountAmount || data.discountAmount === 0) return true;
      const subtotal = data.lineItems.reduce(
        (sum, item) => sum + item.partsCost + item.laborCost, 0
      );
      return data.discountAmount <= subtotal;
    },
    { message: 'Discount cannot exceed the subtotal', path: ['discountAmount'] }
  );

  export type QuoteFormValues = z.infer<typeof quoteSchema>;
  ```

- [ ] T008 [P] Create `store/api/workProgressApi.ts` verbatim from `data-model.md`:
  ```typescript
  import { baseApi } from './baseApi';
  import type { BookingWorkProgress, BookingMedia, UpdateWorkStageRequest } from '../../types/workProgress';

  export const workProgressApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
      updateWorkStage: builder.mutation<void, { bookingId: number; data: UpdateWorkStageRequest }>({
        query: ({ bookingId, data }) => ({ url: `bookings/${bookingId}/work-stage`, method: 'PUT', body: data }),
        invalidatesTags: ['WorkProgress', 'Bookings'],
      }),
      getWorkProgress: builder.query<BookingWorkProgress[], number>({
        query: (bookingId) => `bookings/${bookingId}/work-progress`,
        providesTags: ['WorkProgress'],
      }),
      createWorkProgress: builder.mutation<BookingWorkProgress, { bookingId: number; notes?: string; internalNotes?: string; estimatedMinutesRemaining?: number }>({
        query: ({ bookingId, ...body }) => ({ url: `bookings/${bookingId}/work-progress`, method: 'POST', body }),
        invalidatesTags: ['WorkProgress'],
      }),
      getBookingMedia: builder.query<BookingMedia[], number>({
        query: (bookingId) => `bookings/${bookingId}/media`,
        providesTags: ['WorkProgress'],
      }),
      uploadMedia: builder.mutation<BookingMedia, { bookingId: number; formData: FormData }>({
        query: ({ bookingId, formData }) => ({ url: `bookings/${bookingId}/media`, method: 'POST', body: formData }),
        invalidatesTags: ['WorkProgress'],
      }),
    }),
  });

  export const {
    useUpdateWorkStageMutation,
    useGetWorkProgressQuery,
    useCreateWorkProgressMutation,
    useGetBookingMediaQuery,
    useUploadMediaMutation,
  } = workProgressApi;
  ```
  **Note**: Check the existing `baseApi` import path from `store/api/bookingsApi.ts` and use the same relative path.

- [ ] T009 [P] Create `store/api/quotesApi.ts` verbatim from `data-model.md`:
  ```typescript
  import { baseApi } from './baseApi';
  import type { BookingQuote, CreateQuoteRequest } from '../../types/quote';

  export const quotesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
      getBookingQuotes: builder.query<BookingQuote[], number>({
        query: (bookingId) => `bookings/${bookingId}/quotes`,
        providesTags: ['Quotes'],
      }),
      createQuote: builder.mutation<BookingQuote, { bookingId: number; data: CreateQuoteRequest }>({
        query: ({ bookingId, data }) => ({ url: `bookings/${bookingId}/quotes`, method: 'POST', body: data }),
        invalidatesTags: ['Quotes'],
      }),
      sendQuote: builder.mutation<BookingQuote, { bookingId: number; quoteId: number }>({
        query: ({ bookingId, quoteId }) => ({ url: `bookings/${bookingId}/quotes/${quoteId}/send`, method: 'POST' }),
        invalidatesTags: ['Quotes'],
      }),
    }),
  });

  export const {
    useGetBookingQuotesQuery,
    useCreateQuoteMutation,
    useSendQuoteMutation,
  } = quotesApi;
  ```

- [ ] T010 Add `progress`, `workStage`, and `quote` i18n keys to `lib/i18n/locales/en.json`. Read the file first, then add the three objects from `data-model.md` at the root level of the JSON object.

- [ ] T011 Add matching Arabic translations to `lib/i18n/locales/ar.json`. Read the file first, then add the three objects from `data-model.md`.

**Checkpoint**: Foundational phase complete — all types, schemas, RTK slices, and i18n keys exist.

---

## Phase 3: User Story 1 — Advance a Booking Through Repair Stages (Priority: P1) 🎯 MVP Start

**Goal**: A center owner can view the current repair stage on the booking detail and advance it to the next valid stage with an optional customer note. Only valid next stages are shown.

**Independent Test**: Open a booking in "Car Received" stage. "Update Stage" button is visible. Tapping shows only "Diagnosing". Select it, add a note, confirm. Booking shows "Diagnosing" immediately.

- [ ] T012 [P] [US1] Create `components/bookings/WorkStageSelector.tsx`:
  - Props: `{ currentStage: WorkStage; onConfirm: (stage: WorkStage, notes?: string) => void; isLoading: boolean }`
  - Derive available stages: `const nextStages = getAvailableNextStages(currentStage)` from `types/workProgress`
  - If `nextStages.length === 0`: render nothing (caller hides the "Update Stage" button for terminal stages)
  - Render each next stage as a `TouchableOpacity` button with `getStageDisplayName(stage, i18n.language)` label
  - When a stage is tapped: show a `TextInput` for optional customer notes (max 500 chars) and a "Confirm" button
  - "Confirm" calls `onConfirm(selectedStage, notesText || undefined)`, disabled when `isLoading` is true
  - Uses `useTranslation` — labels from `t('progress.selectStage')`, `t('progress.notesForCustomer')`, `t('progress.confirmSend')`

- [ ] T013 [P] [US1] Create `components/progress/StageUpdateForm.tsx`:
  - Props: `{ bookingId: number; currentStage: WorkStage; onSuccess: () => void }`
  - Uses `useUpdateWorkStageMutation` from `store/api/workProgressApi`
  - Renders `WorkStageSelector` with `isLoading={isLoading}`
  - On `onConfirm`: call `updateWorkStage({ bookingId, data: { stage, notes } }).unwrap()`
  - On success: show inline green success banner with `t('progress.stageUpdated')`, call `onSuccess()`
  - On error: show inline red error banner with `t('progress.errorStageUpdate')` — do NOT use `Alert.alert`
  - If `getAvailableNextStages(currentStage).length === 0`: render nothing (no update possible for terminal stages)

- [ ] T014 [US1] Add tab bar to `app/(app)/(tabs)/bookings/[id].tsx` — read the full file first to understand current structure, then:
  1. Add state: `const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'quotes'>('details')`
  2. Create an inline `TabBar` component just above the `ScrollView` that renders three `TouchableOpacity` buttons:
     - Labels: `t('progress.tabDetails')`, `t('progress.tabProgress')`, `t('progress.tabQuotes')`
     - Active tab: underline indicator (border-bottom or bottom-border on a `View`)
     - RTL: use `flexDirection: isRTL ? 'row-reverse' : 'row'`
  3. Wrap the existing `ScrollView` content in `{activeTab === 'details' && <ExistingContent />}` — the existing content renders unchanged when Details tab is active
  4. Add `{activeTab === 'progress' && <ProgressTabContent bookingId={Number(id)} booking={booking} />}` — where `ProgressTabContent` is an inline sub-component in the same file (not a separate file)
  5. Add `{activeTab === 'quotes' && <QuotesTabContent bookingId={Number(id)} />}` — inline sub-component
  6. `ProgressTabContent`: renders `StageUpdateForm` (if booking is not cancelled) + "Add Update" button that navigates to `./add-progress?bookingId=${id}` + `ProgressTimeline` (placeholder `<Text>Loading...</Text>` for now — filled in Phase 5)
  7. `QuotesTabContent`: renders "Create Quote" button navigating to `./create-quote?bookingId=${id}` + `FlatList` of `QuoteCard` components (placeholder until Phase 7)

**Checkpoint**: US1 complete. Booking detail has three tabs. Stage selector shows only valid transitions. Updating a stage reflects immediately.

---

## Phase 4: User Story 2 — Add a Progress Update with Photos (Priority: P1)

**Goal**: A center owner can create a progress update with customer notes, internal notes, and up to 5 photos. Photos are uploaded individually with per-photo progress indicators.

**Independent Test**: Navigate to Progress tab → "Add Update" → attach 2 photos → save → timeline shows new entry with both photo thumbnails.

- [ ] T015 [P] [US2] Create `components/progress/PhotoUploader.tsx`:
  - Props: `{ onPhotosChange: (photos: { uri: string; name: string }[]) => void; maxPhotos?: number }`
  - Default `maxPhotos = 5`
  - State:
    ```typescript
    type PhotoItem = { uri: string; name: string; uploadState: 'pending' | 'uploading' | 'done' | 'error'; progress: number; error?: string };
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    ```
  - "Add Photo" button — shows `ActionSheet`-style options (Camera / Gallery) using React Native `Modal` or `Alert` approach:
    - On native: `Alert.alert(t('progress.uploadPhotos'), '', [{ text: t('progress.camera'), onPress: handleCamera }, { text: t('progress.gallery'), onPress: handleGallery }, { text: t('common.cancel'), style: 'cancel' }])`
    - On web: `handleGallery()` directly (no camera on web)
  - Camera: `await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })`
  - Gallery: `await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })`
  - Size check: if `result.assets[0].fileSize && result.assets[0].fileSize > 10 * 1024 * 1024` → show inline error `t('progress.photoTooLarge')`, do NOT add photo
  - Disabled "Add Photo" when `photos.length >= maxPhotos` with label `t('progress.maxPhotos')`
  - Photo thumbnails: render a `FlatList` (horizontal) of `Image` components with individual progress overlay
  - `onPhotosChange` called whenever `photos` state changes — passes the uri + name for upload
  - **Note**: Upload itself happens in the parent screen — this component only manages local photo state and calls `onPhotosChange`

- [ ] T016 [US2] Create `app/(app)/(tabs)/bookings/add-progress.tsx`:
  - Route params: `const { bookingId } = useLocalSearchParams<{ bookingId: string }>()`
  - Uses `useCreateWorkProgressMutation` and `useGetWorkProgressQuery`
  - State: `const [photos, setPhotos] = useState<{ uri: string; name: string }[]>([])`
  - State: `const [uploadStates, setUploadStates] = useState<Record<number, { progress: number; error?: string }>>({})`
  - Form fields (plain `TextInput` state — no React Hook Form needed for this simple form):
    - Customer notes: multiline `TextInput`, max 500 chars, label `t('progress.notes')`
    - Internal notes: multiline `TextInput`, label `t('progress.internalNotes')`
    - Estimated minutes: numeric `TextInput`, optional, label `t('progress.estimatedTime')`
  - `PhotoUploader` component with `onPhotosChange={setPhotos}`
  - **Save handler**:
    1. Call `createWorkProgress({ bookingId: Number(bookingId), notes, internalNotes, estimatedMinutesRemaining }).unwrap()` — gets back the new `progressEntry`
    2. For each photo in `photos`, upload individually using `FileSystem.uploadAsync`:
       ```typescript
       import * as FileSystem from 'expo-file-system';
       import { getAuthToken } from '../../lib/storage'; // or from Redux store
       
       const token = /* get JWT from Redux store via useSelector */;
       const uploadUrl = `${API_BASE_URL}bookings/${bookingId}/media`;
       
       FileSystem.uploadAsync(uploadUrl, photo.uri, {
         headers: { Authorization: `Bearer ${token}` },
         httpMethod: 'POST',
         uploadType: FileSystem.FileSystemUploadType.MULTIPART,
         fieldName: 'file',
       });
       ```
       Update `uploadStates` with progress via the `uploadProgressCallback` option if available, or treat as binary done/error
    3. On all uploads complete: navigate back with `router.back()`
    4. On any upload error: mark that photo as `error` state — show retry button for that photo only
  - Error banner (inline, not `Alert.alert`) for `createWorkProgress` failure

---

## Phase 5: User Story 3 — View the Full Progress Timeline (Priority: P1)

**Goal**: A center owner sees all progress updates in chronological order with stage badges, notes, photo thumbnails, internal notes labeled "Internal only", and full-screen photo viewer on tap.

**Independent Test**: Open Progress tab of a booking with 3 entries → all entries in order → tap a thumbnail → full-screen viewer opens → swipe to navigate between photos in same entry.

- [ ] T017 [P] [US3] Create `components/progress/ProgressTimeline.tsx`:
  - Props: `{ bookingId: number }`
  - Uses `useGetWorkProgressQuery(bookingId)` and `useGetBookingMediaQuery(bookingId)`
  - **Loading**: `ActivityIndicator`
  - **Error**: inline error banner with `t('progress.errorLoad')` + retry button
  - **Empty**: centered text `t('progress.noEntries')`
  - **Entries**: `FlatList` of timeline cards (oldest first — `[...entries].sort((a,b) => a.id - b.id)`)
  - Each entry card:
    - Stage badge: `getStageDisplayName(entry.stage, i18n.language)` in a colored pill
    - Customer notes: `entry.notes` if present
    - Internal notes: if `entry.internalNotes`, render in an outlined box labeled `t('progress.internalOnly')` in grey italic
    - Photo thumbnails: filter `media` array (all media) and show thumbnails — associate media with entries by `createdAt` proximity (show all media for simplicity if no `progressEntryId` link)
    - Timestamp: formatted date/time
    - Author: `entry.createdByName`
  - **Full-screen viewer**: state `const [viewerVisible, setViewerVisible] = useState(false)` + `const [viewerPhotos, setViewerPhotos] = useState<string[]>([])` + `const [viewerIndex, setViewerIndex] = useState(0)`
  - Viewer renders as `Modal`:
    ```tsx
    <Modal visible={viewerVisible} onRequestClose={() => setViewerVisible(false)}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={viewerPhotos}
          horizontal
          pagingEnabled
          initialScrollIndex={viewerIndex}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }} resizeMode="contain" />
          )}
        />
        <TouchableOpacity onPress={() => setViewerVisible(false)} style={{ position: 'absolute', top: 48, right: 16 }}>
          <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
    ```

- [ ] T018 [US3] Replace the placeholder `ProgressTimeline` in `app/(app)/(tabs)/bookings/[id].tsx`:
  - In `ProgressTabContent`, replace the `<Text>Loading...</Text>` placeholder with `<ProgressTimeline bookingId={Number(id)} />`
  - Import `ProgressTimeline` from `components/progress/ProgressTimeline`

**Checkpoint**: US1 + US2 + US3 complete. Full progress flow works end-to-end: stage updates, add updates with photos, view full timeline with photo viewer.

---

## Phase 6: User Story 4 — Create a Quote with Line Items (Priority: P1)

**Goal**: A center owner can build a structured quote with dynamic line items, live subtotal/total, optional discount, and save it as a Draft.

**Independent Test**: Create a quote with 2 line items and a discount. Subtotal updates live as values are typed. Save as Draft. Quote appears in Quotes tab with "Draft" badge and correct KD totals.

- [ ] T019 [P] [US4] Create `components/quotes/QuoteCard.tsx`:
  - Props: `{ quote: BookingQuote; onPress?: () => void }`
  - Status badge colors (NativeWind):
    - `DRAFT`: `bg-gray-100 text-gray-600`
    - `SENT`: `bg-blue-100 text-blue-700`
    - `APPROVED`: `bg-green-100 text-green-700`
    - `REJECTED`: `bg-red-100 text-red-700`
    - `REVISED`: `bg-yellow-100 text-yellow-700`
  - Show: status badge, `t('quote.version') + ' ' + quote.version`, `formatKD(quote.totalAmount)`, formatted `createdAt` date
  - Tappable if `onPress` is provided

- [ ] T020 [US4] Create `components/quotes/QuoteBuilder.tsx` — the dynamic quote form:
  - `useForm<QuoteFormValues>` with `zodResolver(quoteSchema)` from `components/quotes/quoteSchema`
  - `useFieldArray({ control, name: 'lineItems' })` for dynamic line items
  - Props: `{ onSubmit: (values: QuoteFormValues) => Promise<void>; isLoading: boolean; defaultValues?: Partial<QuoteFormValues> }`
  - **Line items section**:
    - `fields.map((field, index) => ...)` renders each line item row:
      - Description `TextInput` with `Controller`, label `t('quote.description')`
      - Arabic description `TextInput` (optional), label `t('quote.descriptionAr')`
      - Parts cost `TextInput` (`keyboardType="decimal-pad"`), label `t('quote.partsCost')` — parse to number
      - Labor cost `TextInput` (`keyboardType="decimal-pad"`), label `t('quote.laborCost')` — parse to number
      - "Remove" button: visible only when `fields.length > 1`; calls `remove(index)`
    - "Add Line Item" button calls `append({ description: '', partsCost: 0, laborCost: 0 })`
  - **Live subtotal/total**: use `const watchedItems = watch('lineItems')` and `const watchedDiscount = watch('discountAmount') ?? 0`
    ```typescript
    const subtotal = useMemo(() =>
      (watchedItems ?? []).reduce((sum, item) => sum + (item.partsCost || 0) + (item.laborCost || 0), 0),
      [watchedItems]
    );
    const total = Math.max(0, subtotal - watchedDiscount);
    ```
  - Display subtotal: `formatKD(subtotal)`, total: `formatKD(total)` — import `formatKD` from `lib/utils/pricing`
  - **Optional fields**: discount amount, discount reason, estimated duration, customer notes (EN + AR)
  - Inline error for `discountAmount` validation from the `.refine()` check
  - Submit button label `t('quote.saveAsDraft')`, disabled when `isLoading`

- [ ] T021 [US4] Create `app/(app)/(tabs)/bookings/create-quote.tsx`:
  - Route params: `const { bookingId } = useLocalSearchParams<{ bookingId: string }>()`
  - Uses `useCreateQuoteMutation` from `store/api/quotesApi`
  - Renders `QuoteBuilder` with empty defaults
  - `onSubmit`: calls `createQuote({ bookingId: Number(bookingId), data: values }).unwrap()`
  - On success: navigate back with `router.back()`
  - On error: show inline red banner — NOT `Alert.alert`
  - Pass `isLoading={isLoading}` to `QuoteBuilder`

- [ ] T022 [US4] Replace the placeholder in `QuotesTabContent` inside `[id].tsx`:
  - Import `useGetBookingQuotesQuery` and `QuoteCard`
  - `QuotesTabContent` now calls `useGetBookingQuotesQuery(bookingId)`
  - Render `FlatList` of `QuoteCard` components
  - Each `QuoteCard` `onPress` navigates to `./quote-detail?bookingId=${bookingId}&quoteId=${quote.id}`
  - Empty state: `t('quote.noQuotes')` with "Create Quote" button
  - Error state: inline error banner

**Checkpoint**: US4 complete. Can create a quote with dynamic line items, see live totals, save as Draft, and view it in the Quotes tab.

---

## Phase 7: User Story 5 — Send a Quote to the Customer (Priority: P1)

**Goal**: A center owner can view a Draft quote's details and send it to the customer with a platform-aware confirmation. Sent/Approved/Rejected quotes are read-only with a "Create Revised Quote" option on rejection.

**Independent Test**: Open a Draft quote → "Send to Customer" → confirmation shows total → confirm → status changes to "Sent". API failure → inline error → stays Draft.

- [ ] T023 [US5] Create `app/(app)/(tabs)/bookings/quote-detail.tsx`:
  - Route params: `const { bookingId, quoteId } = useLocalSearchParams<{ bookingId: string; quoteId: string }>()`
  - Uses `useGetBookingQuotesQuery(Number(bookingId))` — finds quote by `quote.id === Number(quoteId)`
  - Uses `useSendQuoteMutation` from `store/api/quotesApi`
  - **Loading**: `ActivityIndicator`; **Not found**: "Quote not found" text
  - **Read-only view** — renders all quote details (line items, subtotal, discount, tax, total) using `formatKD()`; all amounts with 3 decimal places
  - **"Send to Customer" button** — shown only when `quote.status === 'DRAFT'`:
    - Platform-aware confirmation:
      ```typescript
      const handleSend = async () => {
        const confirmed = Platform.OS === 'web'
          ? window.confirm(t('quote.confirmSendWeb'))
          : await new Promise<boolean>((resolve) => {
              Alert.alert(
                t('quote.confirmSendTitle'),
                `${t('quote.confirmSendMessage')} ${t('quote.total')}: ${formatKD(quote.totalAmount)}`,
                [
                  { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                  { text: t('progress.confirmSend') || 'Send', onPress: () => resolve(true) },
                ]
              );
            });
        if (!confirmed) return;
        try {
          await sendQuote({ bookingId: Number(bookingId), quoteId: Number(quoteId) }).unwrap();
        } catch {
          setSendError(t('quote.errorSend'));
        }
      };
      ```
    - On success: RTK Query invalidates `'Quotes'` tag → `useGetBookingQuotesQuery` refetches → component re-renders with `status: 'SENT'` → "Send" button automatically hides
    - On error: show inline red error banner — NOT `Alert.alert`
  - **Status-specific UI**:
    - `SENT`: show "Sent" badge + `sentAt` timestamp
    - `APPROVED`: show "Approved" badge + `respondedAt` timestamp
    - `REJECTED`: show "Rejected" badge + `responseNotes` (if any) + "Create Revised Quote" button that navigates to `./create-quote?bookingId=${bookingId}` (creates a new draft)
    - `REVISED`: show "Revised" badge
  - `sendError` state (`string | null`) — render as inline banner if set

- [ ] T024 [US5] Update `app/(app)/(tabs)/bookings/_layout.tsx` — add new screen declarations:
  - Read the file first to understand existing `Stack.Screen` declarations
  - Add three new screens:
    ```tsx
    <Stack.Screen name="add-progress"  options={{ title: t('progress.addUpdate') }} />
    <Stack.Screen name="create-quote"  options={{ title: t('quote.createQuote') }} />
    <Stack.Screen name="quote-detail"  options={{ title: t('quote.title') }} />
    ```
  - Import `useTranslation` if not already imported in this file

**Checkpoint**: US5 complete. Full quote lifecycle: Draft → Send → Sent (read-only). Rejection shows "Create Revised Quote". All confirmation dialogs are platform-aware.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T025 Verify RTL layout across all new screens and components:
  - Progress tab bar: tabs flip order in Arabic
  - Stage selector buttons: text right-aligned in Arabic
  - Timeline entries: content flows RTL
  - Quote line items: label/input order correct in Arabic
  - Fix any issues using `isRTL = i18n.dir() === 'rtl'` and `flexDirection: isRTL ? 'row-reverse' : 'row'`

- [ ] T026 [P] Verify all KD amounts in new screens use `formatKD()` from `lib/utils/pricing.ts` — search for `.toFixed(3)` or hardcoded `KD` strings in the new files and replace with `formatKD()`

- [ ] T027 [P] Run the full smoke test checklist from `specs/003-work-progress-quotes/quickstart.md` manually:
  - [ ] US1: Stage selector shows only valid transitions, stage updates immediately
  - [ ] US1: "Picked Up" booking has no "Update Stage" button
  - [ ] US2: Photo attachment works (Camera + Gallery), 10 MB limit enforced, 5-photo cap enforced
  - [ ] US2: Progress entry appears in timeline after save
  - [ ] US3: Timeline in chronological order, internal notes labeled "Internal only"
  - [ ] US3: Full-screen photo viewer opens on thumbnail tap, swipe navigation works
  - [ ] US4: Dynamic line items add/remove correctly, last item cannot be removed
  - [ ] US4: Subtotal and total update within 100ms of each keystroke
  - [ ] US4: Discount > subtotal → validation error, cannot save
  - [ ] US5: Send confirmation shows total, status changes to "Sent" after confirm
  - [ ] US5: Rejected quote shows "Create Revised Quote" button
  - [ ] All text in Arabic locale → RTL, Arabic labels

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user story phases**
- **User Stories (Phases 3–7)**: All depend on Foundational completion
  - US1 (Phase 3): Start first — tab bar modification is the integration point
  - US2 (Phase 4): Can start parallel to US1 — `PhotoUploader` and `add-progress.tsx` are independent files
  - US3 (Phase 5): Depends on US2 being complete (timeline shows uploaded photos)
  - US4 (Phase 6): Fully independent from US1-US3 — `QuoteBuilder` and quotes API are separate
  - US5 (Phase 7): Depends on US4 (quote-detail needs the quotes API from US4)
- **Polish (Phase 8)**: After all desired user stories are complete

### Parallel Opportunities

```
Phase 2 parallel group (different files):
  T004 types/workProgress.ts
  T005 types/quote.ts
  T006 components/progress/progressSchema.ts
  T007 components/quotes/quoteSchema.ts
  T008 store/api/workProgressApi.ts
  T009 store/api/quotesApi.ts

Phase 2 sequential:
  T010 en.json → T011 ar.json

Phase 3 parallel:
  T012 WorkStageSelector.tsx
  T013 StageUpdateForm.tsx
  (T014 depends on T012 + T013)

Phase 4 parallel:
  T015 PhotoUploader.tsx (independent)
  (T016 depends on T015)

Phase 6 parallel:
  T019 QuoteCard.tsx (independent)
  T020 QuoteBuilder.tsx (independent)
  (T021 depends on T020, T022 depends on T019)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — Progress tracking complete)

1. Complete **Phase 1**: Setup checks (T001–T003)
2. Complete **Phase 2**: Foundational artifacts (T004–T011)
3. Complete **Phase 3**: Stage transitions + tab bar (T012–T014) — **stage visibility works**
4. Complete **Phase 4**: Add progress update + photos (T015–T016) — **owners can post updates**
5. Complete **Phase 5**: Progress timeline (T017–T018) — **full timeline visible**
6. **STOP and VALIDATE**: Run US1–US3 smoke tests
7. Demo / handoff progress tracking

### Full Delivery (add quote flow)

8. Complete **Phase 6**: Quote creation (T019–T022) — Draft quotes
9. Complete **Phase 7**: Send quote (T023–T024) — Full approval flow
10. Complete **Phase 8**: Polish (T025–T027)

---

## Notes

- `[P]` tasks = different files, no blocking dependencies — run in parallel
- `[USx]` label maps each task to its user story
- **`PhotoUploader` is the most complex component** — it manages local photo state and size validation but does NOT call the upload API; the parent screen (`add-progress.tsx`) owns the upload loop
- **Photo upload uses `expo-file-system`** — import as `import * as FileSystem from 'expo-file-system'`; the JWT token must come from the Redux store via `useSelector` (not from `storage.ts` directly)
- **`useFieldArray` requires `register` and `control` from `useForm`** — do NOT destructure `register` and call it on array field inputs directly; use `Controller` for each `fields[index].partsCost` etc.
- **Live totals in `QuoteBuilder`** — use `watch('lineItems')` (not `getValues()`) so the computation re-runs on every keystroke
- **`Alert.alert` with multiple buttons is a no-op on web** — always guard with `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)` for all confirmation dialogs
- **`invalidatesTags: ['Bookings']` on `updateWorkStage`** — this ensures the booking detail re-fetches and reflects the new stage immediately after the stage update succeeds
- Each user story should be independently completable and testable before moving to the next
