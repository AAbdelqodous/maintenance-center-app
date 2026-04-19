# Research: Phase 4.0 — Work Progress & Quotes

**Branch**: `003-work-progress-quotes` | **Date**: 2026-04-16

---

## Decision 1: Navigation Architecture for Progress and Quotes

**Decision**: Keep the existing `app/(app)/(tabs)/bookings/[id].tsx` as a single file with an inline tab bar. Add separate screens for data-entry forms (Add Progress Update, Create Quote, Quote Detail) as flat sibling routes within the bookings stack.

**New routes added to the bookings stack:**
```
app/(app)/(tabs)/bookings/
├── _layout.tsx      (existing Stack — ADD new screen declarations)
├── index.tsx        (existing list)
├── [id].tsx         (existing detail — MODIFY: add inline tab bar for Details / Progress / Quotes sections)
├── add-progress.tsx (NEW: Add Progress Update form, receives bookingId param)
├── create-quote.tsx (NEW: Create Quote form, receives bookingId param)
└── quote-detail.tsx (NEW: Read-only quote view + Send action, receives bookingId + quoteId params)
```

**Rationale:**
- Converting `[id].tsx` to a directory (`[id]/index.tsx`) would require moving an existing working file and updating all navigation calls — high risk for a feature addition.
- Inline tabs (Details / Progress / Quotes) in `[id].tsx` via `useState('details' | 'progress' | 'quotes')` give the spec's required "Progress tab" and "Quotes tab" UX without any navigation restructuring.
- Flat sibling routes for forms (`add-progress.tsx`, `create-quote.tsx`) follow the same pattern already used in the bookings stack — no new layout files needed.
- Route params (`bookingId`, `quoteId`) are passed via Expo Router `useLocalSearchParams()`.

---

## Decision 2: Photo Picker Library

**Decision**: `expo-image-picker` (already in Expo SDK 54) for both gallery and camera access.

**Rationale:**
- Already in CLAUDE.md as the project standard: "Uses `expo-image-picker` (gallery) and `expo-camera` (camera)".
- Managed Expo workflow — no `expo prebuild` needed.
- `ImagePicker.launchCameraAsync()` and `ImagePicker.launchImageLibraryAsync()` give both sources.
- Returns `uri` (local file path) — caller builds `FormData` and calls the upload mutation.

**Max photo size enforcement**: Check `result.assets[0].fileSize` before adding to state. If `> 10 * 1024 * 1024` (10 MB), show inline error and reject the photo.

---

## Decision 3: Full-Screen Photo Viewer

**Decision**: Use React Native's built-in `Modal` + `Image` component with `FlatList` for swipe navigation — no new library.

**Rationale:**
- `react-native-image-viewing` is a common choice but adds a dependency.
- Expo SDK 54 includes `expo-image` which gives performance caching; combined with a `Modal + FlatList + horizontal pagingEnabled` this covers all spec requirements (full-screen, close button, swipe between photos in same entry).
- Zero new dependencies — satisfies the project's preference for minimal new packages.

**Implementation pattern:**
```tsx
<Modal visible={viewerVisible} onRequestClose={() => setViewerVisible(false)}>
  <FlatList
    data={photos}
    horizontal
    pagingEnabled
    renderItem={({ item }) => <Image source={{ uri: item.url }} style={{ width, height }} resizeMode="contain" />}
    initialScrollIndex={selectedIndex}
  />
  <TouchableOpacity onPress={() => setViewerVisible(false)}><Text>✕</Text></TouchableOpacity>
</Modal>
```

---

## Decision 4: Work Stage Transition Logic (Client Side)

**Decision**: Use the `WORK_STAGES` constant already defined in CLAUDE.md `types/workProgress.ts`. The `WorkStageSelector` component derives available next stages from `WORK_STAGES.find(s => s.stage === currentStage)?.canTransitionTo`.

**Rationale:**
- The transition map is fully specified in CLAUDE.md and need not be fetched from the server.
- Client-side filtering is for UX only — the server still validates the transition.
- `canTransitionTo: []` for `PICKED_UP` means no "Update Stage" button is shown for terminal-stage bookings.

**Note**: The `WorkStageSelector` only renders stages that are in `canTransitionTo` — it never shows all 10 stages as a flat list.

---

## Decision 5: Photo Upload Strategy (Multipart)

**Decision**: Each photo is uploaded individually as a separate `POST /bookings/{id}/media` call using `FormData`. The progress update entry is created first (`POST /bookings/{id}/work-progress`), then photos are attached.

**Rationale:**
- The spec requires "each photo shows an individual upload progress indicator" and "only the failed photo is affected, not the others" — this requires individual uploads, not a single multipart batch.
- RTK Query does not natively support per-upload progress tracking. Use the standard `XMLHttpRequest` approach wrapped in a custom React hook (`usePhotoUpload`) for progress state, or use the Expo `FileSystem.uploadAsync` API which supports progress callbacks.
- **Chosen approach**: `expo-file-system`'s `FileSystem.uploadAsync()` with `uploadType: FileSystem.FileSystemUploadType.MULTIPART` for per-file progress. This is already available in Expo SDK 54 without new dependencies.

**Upload flow:**
1. `createWorkProgress(bookingId, formData)` → returns `progressEntryId`
2. For each photo in parallel: `FileSystem.uploadAsync(url, fileUri, { headers: { Authorization }, fieldName: 'file', uploadType: MULTIPART })`
3. Track upload % per photo in local state array

---

## Decision 6: RTK Query for Work Progress and Quotes

**Decision**: Create two new RTK API slices using `baseApi.injectEndpoints()`:
- `store/api/workProgressApi.ts` — work stage update + progress CRUD + media upload/list
- `store/api/quotesApi.ts` — quotes CRUD + send action

**Tag types** (already listed in CLAUDE.md):
- `'WorkProgress'` — for progress entries and media
- `'Quotes'` — for quotes

**Rationale**: Follows the exact same pattern as `pricingApi.ts` and all other API slices. `'WorkProgress'` and `'Quotes'` are already declared in `tagTypes` in CLAUDE.md.

---

## Decision 7: Quote Form — Dynamic Line Items

**Decision**: Use `useFieldArray` from React Hook Form for the dynamic line items list in the quote form.

**Rationale:**
- `useFieldArray` is the documented pattern for dynamic arrays in React Hook Form. It handles add/remove/reorder without manual index management.
- Already a project dependency — React Hook Form is the project forms standard.
- Zod schema validates `lineItems: z.array(lineItemSchema).min(1)` with the min-1 constraint.
- Live subtotal computation via `watch('lineItems')` + `watch('discountAmount')` in a `useMemo` or `useEffect`.

**Discount validation**: The `.refine()` on the quote schema checks `discountAmount <= subtotal`. Since subtotal is derived (not a form field), the refinement receives all form values and computes the check inline.

---

## Decision 8: `formatKD` Reuse Across Phases

**Decision**: Import `formatKD` and `formatPriceRange` from `lib/utils/pricing.ts` in the quote builder. Do not duplicate the utility.

**Rationale**: Phase 3.5 creates `lib/utils/pricing.ts` with `formatKD()`. Quote amounts are also KD with 3 decimal places — the same utility applies. No new utility module needed.

---

## Decision 9: Booking Detail Tab Bar (Inline vs. Native Tabs)

**Decision**: Implement the Details / Progress / Quotes tab bar in `[id].tsx` using a simple `useState`-controlled custom tab component (`BookingDetailTab`) — not a navigation-level tab bar.

**Rationale:**
- A navigation-level tab bar (Expo Router) would require converting `[id].tsx` to a directory (`[id]/index.tsx`), moving the existing file, and updating all navigation references — unnecessary churn.
- A custom `BookingDetailTab` component (a `View` with three `TouchableOpacity` buttons and an underline indicator) is idiomatic React Native, costs ~20 lines, and gives full control over RTL layout.
- Tab state lives in `[id].tsx` as `const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'quotes'>('details')`.
- The three tab sections are conditionally rendered below the tab bar using the `activeTab` state.

---

## Resolved Clarifications

- ✅ Navigation: Inline tab bar in `[id].tsx`, flat routes for forms
- ✅ Photo picker: `expo-image-picker` (already project standard)
- ✅ Full-screen viewer: React Native Modal + FlatList (zero new deps)
- ✅ Stage transitions: `WORK_STAGES` constant, `canTransitionTo` filtering
- ✅ Photo upload: Individual uploads via `FileSystem.uploadAsync` for per-photo progress
- ✅ RTK Query: `workProgressApi.ts` + `quotesApi.ts` using injectEndpoints
- ✅ Dynamic line items: `useFieldArray` (React Hook Form)
- ✅ KD format: Reuse `formatKD()` from `lib/utils/pricing.ts`
- ✅ Tab bar: Inline `useState`-controlled custom component
