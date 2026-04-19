# Tasks: Phase 3.5 — Service Pricing & Trust Badges

**Input**: Design documents from `specs/002-service-pricing-trust/`
**Branch**: `002-service-pricing-trust`
**Date**: 2026-04-16

**User Stories**:
- US1 (P1): Browse and Manage Service Pricing List
- US2 (P1): Add a New Pricing Entry
- US3 (P1): Edit or Pause an Existing Pricing Entry
- US4 (P2): Delete a Pricing Entry
- US5 (P2): View Trust Score and Earned Badges

**No tests** — manual smoke test checklist in `quickstart.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm project structure prerequisites are in place before creating new files

- [ ] T001 Confirm `'Pricing'` exists in `tagTypes` array in `store/index.ts` — if missing, add it to the array alongside 'Bookings', 'Reviews', etc.
- [ ] T002 Confirm `ServiceType` enum is exported from `store/api/bookingsApi.ts` — grep for `export.*ServiceType` to find its exact export name; note the path for T005

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, utilities, schema, RTK slices, and i18n keys that ALL user story screens depend on.

**⚠️ CRITICAL**: No screen or component work can begin until this phase is complete.

- [ ] T003 [P] Create `types/pricing.ts` with the following exact content:
  ```typescript
  // Re-export ServiceType so pricing components don't import directly from bookingsApi
  export { ServiceType } from '../store/api/bookingsApi';

  export interface CenterServicePricing {
    id: number;
    serviceType: ServiceType;
    serviceNameAr: string;
    serviceNameEn: string;
    minPrice: number;              // KD, 3 decimal places
    maxPrice: number;              // KD, 3 decimal places
    typicalDurationMinutes?: number;
    descriptionAr?: string;
    descriptionEn?: string;
    isActive: boolean;
    createdAt: string;             // ISO 8601
    updatedAt?: string;            // ISO 8601
  }

  export interface CreatePricingRequest {
    serviceType: ServiceType;
    serviceNameAr: string;
    serviceNameEn: string;
    minPrice: number;
    maxPrice: number;
    typicalDurationMinutes?: number;
    descriptionAr?: string;
    descriptionEn?: string;
  }

  export interface UpdatePricingRequest extends CreatePricingRequest {
    isActive?: boolean;
  }

  export type TrustBadgeType =
    | 'VERIFIED_PRICING'
    | 'FAST_RESPONDER'
    | 'HIGH_COMPLETION'
    | 'TOP_RATED';

  export interface TrustBadge {
    badgeType: TrustBadgeType;
    isEarned: boolean;
    earnedAt?: string;     // ISO 8601, present when isEarned === true
    criteriaEn: string;
    criteriaAr: string;
  }

  export interface TrustSummary {
    badges: TrustBadge[];
  }
  ```

- [ ] T004 [P] Create `lib/utils/pricing.ts` with the following exact content:
  ```typescript
  /**
   * Format a KD price with exactly 3 decimal places.
   * formatKD(15.5) → "KD 15.500"
   */
  export function formatKD(amount: number): string {
    return `KD ${Number(amount).toFixed(3)}`;
  }

  /**
   * Format a price range. When min === max, show single price.
   * formatPriceRange(10, 20) → "KD 10.000 – KD 20.000"
   * formatPriceRange(15, 15) → "KD 15.000"
   */
  export function formatPriceRange(min: number, max: number): string {
    if (min === max) return formatKD(min);
    return `${formatKD(min)} – ${formatKD(max)}`;
  }
  ```

- [ ] T005 [P] Create `components/pricing/pricingSchema.ts` with the following exact content:
  ```typescript
  import { z } from 'zod';
  import { ServiceType } from '../../types/pricing';

  export const pricingSchema = z.object({
    serviceType:            z.nativeEnum(ServiceType),
    serviceNameAr:          z.string().min(1, 'Arabic name is required'),
    serviceNameEn:          z.string().min(1, 'English name is required'),
    minPrice:               z.number({ invalid_type_error: 'Min price is required' }).min(0),
    maxPrice:               z.number({ invalid_type_error: 'Max price is required' }).min(0),
    typicalDurationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').optional(),
    descriptionAr:          z.string().optional(),
    descriptionEn:          z.string().optional(),
  }).refine(
    (data) => data.maxPrice >= data.minPrice,
    { message: 'Maximum price must be greater than or equal to minimum price', path: ['maxPrice'] }
  );

  export type PricingFormValues = z.infer<typeof pricingSchema>;
  ```

- [ ] T006 [P] Create `store/api/pricingApi.ts` — implement verbatim from CLAUDE.md Phase 3.5 section:
  ```typescript
  import { baseApi } from './baseApi';
  import type {
    CenterServicePricing,
    CreatePricingRequest,
    UpdatePricingRequest,
  } from '../../types/pricing';

  export const pricingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
      getMyPricing: builder.query<CenterServicePricing[], void>({
        query: () => 'centers/my/pricing',
        providesTags: ['Pricing'],
      }),
      createPricing: builder.mutation<CenterServicePricing, CreatePricingRequest>({
        query: (body) => ({ url: 'centers/my/pricing', method: 'POST', body }),
        invalidatesTags: ['Pricing'],
      }),
      updatePricing: builder.mutation<CenterServicePricing, { id: number; data: UpdatePricingRequest }>({
        query: ({ id, data }) => ({ url: `centers/my/pricing/${id}`, method: 'PUT', body: data }),
        invalidatesTags: ['Pricing'],
      }),
      deletePricing: builder.mutation<void, number>({
        query: (id) => ({ url: `centers/my/pricing/${id}`, method: 'DELETE' }),
        invalidatesTags: ['Pricing'],
      }),
    }),
  });

  export const {
    useGetMyPricingQuery,
    useCreatePricingMutation,
    useUpdatePricingMutation,
    useDeletePricingMutation,
  } = pricingApi;
  ```
  **Note**: Check the existing base API import path by reading `store/api/bookingsApi.ts` to find the correct relative path to `baseApi`.

- [ ] T007 [P] Create `store/api/trustApi.ts`:
  ```typescript
  import { baseApi } from './baseApi';
  import type { TrustSummary } from '../../types/pricing';

  export const trustApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
      getMyTrust: builder.query<TrustSummary, void>({
        query: () => 'centers/my/trust',
        providesTags: ['Pricing'],  // invalidated when pricing changes
      }),
    }),
  });

  export const { useGetMyTrustQuery } = trustApi;
  ```

- [ ] T008 Add `pricing` and `trustBadge` namespace keys to `lib/i18n/locales/en.json`. Read the file first to find the correct insertion point (top-level object). Add these exact keys under the root object:
  ```json
  "pricing": {
    "title": "Service Pricing",
    "addService": "Add Service",
    "editPricing": "Edit Pricing",
    "noEntries": "No pricing added yet",
    "noEntriesSubtitle": "Add your first service price to build customer trust.",
    "serviceType": "Service Type",
    "serviceNameAr": "Arabic Service Name",
    "serviceNameEn": "English Service Name",
    "minPrice": "Min Price (KD)",
    "maxPrice": "Max Price (KD)",
    "duration": "Typical Duration (minutes)",
    "descriptionAr": "Arabic Description (optional)",
    "descriptionEn": "English Description (optional)",
    "activeStatus": "Active",
    "paused": "Paused",
    "active": "Active",
    "save": "Save",
    "delete": "Delete",
    "deleteConfirmTitle": "Delete Pricing Entry",
    "deleteConfirmMessage": "Delete this pricing entry? This cannot be undone.",
    "deleteConfirmWeb": "Delete this pricing entry? This cannot be undone.",
    "discardTitle": "Discard Changes",
    "discardMessage": "You have unsaved changes. Discard them?",
    "discardConfirmWeb": "You have unsaved changes. Discard them?",
    "saved": "Pricing saved successfully",
    "deleted": "Pricing entry deleted",
    "errorSave": "Failed to save. Please try again.",
    "errorDelete": "Failed to delete. Please try again.",
    "errorLoad": "Could not load pricing. Tap to retry.",
    "maxPriceError": "Max price must be ≥ min price",
    "durationError": "Duration must be at least 1 minute",
    "managePricing": "Manage Pricing"
  },
  "trustBadge": {
    "title": "Trust Badges",
    "earned": "Earned",
    "locked": "Locked",
    "comingSoon": "Trust badges coming soon",
    "errorLoad": "Could not load trust data",
    "VERIFIED_PRICING": "Verified Pricing",
    "FAST_RESPONDER": "Fast Responder",
    "HIGH_COMPLETION": "High Completion Rate",
    "TOP_RATED": "Top Rated",
    "criteria_VERIFIED_PRICING": "Add at least 1 active pricing entry",
    "criteria_FAST_RESPONDER": "Respond to bookings within 2 hours on average",
    "criteria_HIGH_COMPLETION": "Complete 90% or more of accepted bookings",
    "criteria_TOP_RATED": "Maintain an average rating of 4.5 or above"
  }
  ```

- [ ] T009 Add matching Arabic translations to `lib/i18n/locales/ar.json`. Read the file first to find insertion point. Add these exact keys:
  ```json
  "pricing": {
    "title": "أسعار الخدمات",
    "addService": "إضافة خدمة",
    "editPricing": "تعديل السعر",
    "noEntries": "لم تُضف أي أسعار بعد",
    "noEntriesSubtitle": "أضف سعر خدمتك الأولى لبناء ثقة العملاء.",
    "serviceType": "نوع الخدمة",
    "serviceNameAr": "اسم الخدمة بالعربية",
    "serviceNameEn": "اسم الخدمة بالإنجليزية",
    "minPrice": "الحد الأدنى للسعر (د.ك)",
    "maxPrice": "الحد الأقصى للسعر (د.ك)",
    "duration": "المدة المعتادة (بالدقائق)",
    "descriptionAr": "الوصف بالعربية (اختياري)",
    "descriptionEn": "الوصف بالإنجليزية (اختياري)",
    "activeStatus": "نشط",
    "paused": "موقوف",
    "active": "نشط",
    "save": "حفظ",
    "delete": "حذف",
    "deleteConfirmTitle": "حذف إدخال السعر",
    "deleteConfirmMessage": "هل تريد حذف هذا الإدخال؟ لا يمكن التراجع عن هذا الإجراء.",
    "deleteConfirmWeb": "هل تريد حذف هذا الإدخال؟ لا يمكن التراجع عن هذا الإجراء.",
    "discardTitle": "تجاهل التغييرات",
    "discardMessage": "لديك تغييرات غير محفوظة. هل تريد تجاهلها؟",
    "discardConfirmWeb": "لديك تغييرات غير محفوظة. هل تريد تجاهلها؟",
    "saved": "تم حفظ السعر بنجاح",
    "deleted": "تم حذف إدخال السعر",
    "errorSave": "فشل الحفظ. يرجى المحاولة مرة أخرى.",
    "errorDelete": "فشل الحذف. يرجى المحاولة مرة أخرى.",
    "errorLoad": "تعذّر تحميل الأسعار. اضغط للمحاولة مرة أخرى.",
    "maxPriceError": "الحد الأقصى يجب أن يكون ≥ الحد الأدنى",
    "durationError": "المدة يجب أن تكون دقيقة واحدة على الأقل",
    "managePricing": "إدارة الأسعار"
  },
  "trustBadge": {
    "title": "شارات الثقة",
    "earned": "مكتسبة",
    "locked": "مقفلة",
    "comingSoon": "شارات الثقة قادمة قريباً",
    "errorLoad": "تعذّر تحميل بيانات الثقة",
    "VERIFIED_PRICING": "أسعار موثقة",
    "FAST_RESPONDER": "سريع الاستجابة",
    "HIGH_COMPLETION": "معدل إنجاز عالٍ",
    "TOP_RATED": "الأعلى تقييماً",
    "criteria_VERIFIED_PRICING": "أضف سعراً نشطاً واحداً على الأقل",
    "criteria_FAST_RESPONDER": "الرد على الحجوزات خلال ساعتين في المتوسط",
    "criteria_HIGH_COMPLETION": "إتمام 90% أو أكثر من الحجوزات المقبولة",
    "criteria_TOP_RATED": "الحفاظ على تقييم متوسط 4.5 أو أعلى"
  }
  ```

**Checkpoint**: Foundational phase complete — all types, utilities, schemas, RTK slices, and i18n keys exist. User story implementation can begin.

---

## Phase 3: User Story 1 — Browse and Manage Service Pricing List (Priority: P1) 🎯 MVP

**Goal**: A center owner can view all their pricing entries from the Profile tab, see each entry with correct bilingual names, KD price range, duration, and active/paused status, and navigate to add or edit entries.

**Independent Test**: Navigate to Profile → "Manage Pricing" row → Pricing list screen loads, shows entries with `KD X.XXX` prices. Pull to refresh works. "Add Service" button navigates to add screen.

- [ ] T010 [P] [US1] Create `components/pricing/PricingCard.tsx`. This component receives a `CenterServicePricing` prop and renders:
  - Import `useTranslation` from 'react-i18next' and `formatPriceRange` from `lib/utils/pricing`
  - Display name: `i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn`
  - Price: `formatPriceRange(item.minPrice, item.maxPrice)` — uses 3-decimal KD format
  - Duration: render `{item.typicalDurationMinutes} min` only if `typicalDurationMinutes` is defined
  - Status badge: NativeWind green bg (`bg-green-100 text-green-800`) for active, grey (`bg-gray-100 text-gray-500`) for paused, using `t('pricing.active')` or `t('pricing.paused')`
  - The entire card is wrapped in `TouchableOpacity` with `onPress` prop for navigation
  - Paused entries: apply reduced opacity (`opacity-50`) to the card container to visually distinguish them
  - Props interface: `{ item: CenterServicePricing; onPress: () => void }`

- [ ] T011 [P] [US1] Create `app/(app)/(tabs)/profile/pricing/_layout.tsx` — the Stack navigator for the pricing sub-screens:
  ```tsx
  import { Stack } from 'expo-router';
  import { useTranslation } from 'react-i18next';

  export default function PricingLayout() {
    const { t } = useTranslation();
    return (
      <Stack>
        <Stack.Screen name="index" options={{ title: t('pricing.title') }} />
        <Stack.Screen name="add"   options={{ title: t('pricing.addService') }} />
        <Stack.Screen name="[id]"  options={{ title: t('pricing.editPricing') }} />
      </Stack>
    );
  }
  ```

- [ ] T012 [US1] Create `app/(app)/(tabs)/profile/pricing/index.tsx` — the Pricing list screen:
  - Call `useGetMyPricingQuery()` from `store/api/pricingApi`
  - **Loading state**: Show an `ActivityIndicator` centered on the screen while `isLoading` is true
  - **Error state**: Show an inline error banner with the text `t('pricing.errorLoad')` and a "Retry" button that calls `refetch()`; do NOT use `Alert.alert` (no-op on web)
  - **Empty state** (data is `[]`): Show centered text `t('pricing.noEntries')`, subtitle `t('pricing.noEntriesSubtitle')`, and a `TouchableOpacity` button with label `t('pricing.addService')` that navigates to `./add`
  - **List state**: Render a `FlatList` of `PricingCard` components; each card's `onPress` navigates to `./pricing/${item.id}` using `router.push`
  - **FAB or header button**: Add a "+" button in the header options (`navigation.setOptions({ headerRight: ... })`) or as a floating button that navigates to `./add`
  - Import `useRouter` from 'expo-router' for navigation

- [ ] T013 [US1] Modify `app/(app)/(tabs)/profile/index.tsx` — add "Manage Pricing" navigation row:
  - Read the file first to understand the existing row pattern
  - Add a tappable row with:
    - Label: `t('pricing.managePricing')` (import key from `useTranslation`)
    - A right-pointing chevron icon (use the same chevron pattern already used for other rows in this file)
    - `onPress`: `router.push('./pricing')` (relative route)
  - Place the row in the same section as other center management options (not in the account/logout section)
  - Add `import { useTranslation } from 'react-i18next'` if not already imported

**Checkpoint**: US1 complete. Profile shows "Manage Pricing" row → list screen loads → entries display with correct format → empty state shows "Add Service" button → pull to refresh works.

---

## Phase 4: User Story 2 — Add a New Pricing Entry (Priority: P1)

**Goal**: A center owner can fill in a form to create a new pricing entry; inline validation catches `maxPrice < minPrice` before any API call; on success the entry appears in the list.

**Independent Test**: Navigate to Pricing → tap "+". Fill all required fields. Tap Save. Confirm new entry appears in list with correct `KD X.XXX` format. Try setting maxPrice < minPrice — inline error appears, no API call made.

- [ ] T014 [US2] Create `components/pricing/PricingForm.tsx` — the shared form component used by both Add and Edit screens:
  - Use `useForm<PricingFormValues>` with `zodResolver(pricingSchema)` from `components/pricing/pricingSchema.ts`
  - Accept `defaultValues?: Partial<PricingFormValues>` prop for pre-population in edit mode
  - Accept `onSubmit: (values: PricingFormValues) => Promise<void>` prop
  - Accept `isLoading: boolean` prop — disables all inputs and the submit button while true
  - **Fields** (in this order):
    1. Service Type: a `Picker` or `TouchableOpacity`-based selector using `Object.values(ServiceType)` — shows `t('pricing.serviceType')` label
    2. Arabic Service Name: `TextInput` with label `t('pricing.serviceNameAr')`, `Controller` from react-hook-form
    3. English Service Name: `TextInput` with label `t('pricing.serviceNameEn')`
    4. Min Price: `TextInput` with `keyboardType="decimal-pad"`, label `t('pricing.minPrice')` — value must be parsed to `number` via `parseFloat`; if empty string, pass `NaN` so Zod fires `invalid_type_error`
    5. Max Price: `TextInput` with `keyboardType="decimal-pad"`, label `t('pricing.maxPrice')` — same parsing as minPrice
    6. Duration: `TextInput` with `keyboardType="number-pad"`, label `t('pricing.duration')` — optional; parse to `number` if non-empty, pass `undefined` if empty string
    7. Arabic Description: `TextInput` multiline, label `t('pricing.descriptionAr')` — optional
    8. English Description: `TextInput` multiline, label `t('pricing.descriptionEn')` — optional
  - **Inline errors**: Below each field, render `{errors.fieldName && <Text className="text-red-500 text-sm">{errors.fieldName.message}</Text>}`
  - **Submit button**: Label `t('pricing.save')`, disabled when `isLoading` is true; calls `handleSubmit(onSubmit)`
  - **Important**: The cross-field `maxPrice >= minPrice` refinement error appears at `errors.maxPrice` — render it below the Max Price field

- [ ] T015 [US2] Create `app/(app)/(tabs)/profile/pricing/add.tsx` — the Add Pricing screen:
  - Use `useCreatePricingMutation` from `store/api/pricingApi`
  - Render `PricingForm` with empty `defaultValues` (no prop needed — schema defaults to undefined)
  - `onSubmit` handler:
    1. Call `createPricing(values).unwrap()` inside a `try/catch`
    2. On success: set a local `successMessage` state and navigate back with `router.back()`
    3. On error: set a local `errorMessage` state string; render it as an inline red banner (`<Text className="text-red-600 bg-red-50 p-3 rounded">`) above the form — NOT `Alert.alert`
  - Pass `isLoading={isLoading}` (from the mutation) to `PricingForm`
  - Import `useRouter` from 'expo-router'

**Checkpoint**: US2 complete. Can add a new pricing entry, see inline validation, and see it appear in the list on success.

---

## Phase 5: User Story 3 — Edit or Pause an Existing Pricing Entry (Priority: P1)

**Goal**: A center owner can tap an existing entry to open it pre-populated, change fields, toggle active/paused, save changes, and is warned before losing unsaved edits.

**Independent Test**: Open an existing entry — all fields pre-populated. Change minPrice. Save. List shows updated value. Toggle active off. List shows "Paused". Start editing, press back without saving — discard dialog appears.

- [ ] T016 [US3] Create `app/(app)/(tabs)/profile/pricing/[id].tsx` — the Edit Pricing screen:
  - **Route param**: `const { id } = useLocalSearchParams<{ id: string }>()`; parse to number with `Number(id)`
  - **Data source**: Call `useGetMyPricingQuery()` and find the entry: `const entry = data?.find(p => p.id === Number(id))`
  - **Loading/not found**: Show `ActivityIndicator` while `isLoading`; show "Not found" text if `!entry` after load
  - **Form pre-population**: Pass `defaultValues` to `PricingForm`:
    ```typescript
    const defaultValues: PricingFormValues = {
      serviceType: entry.serviceType,
      serviceNameAr: entry.serviceNameAr,
      serviceNameEn: entry.serviceNameEn,
      minPrice: entry.minPrice,
      maxPrice: entry.maxPrice,
      typicalDurationMinutes: entry.typicalDurationMinutes,
      descriptionAr: entry.descriptionAr ?? '',
      descriptionEn: entry.descriptionEn ?? '',
    };
    ```
  - **Active/Paused toggle**: A `Switch` component (React Native built-in) rendered ABOVE the form, separate from the `PricingForm` component:
    - Label: `t('pricing.activeStatus')`
    - Controlled by a local `isActive` state initialized from `entry.isActive`
    - When toggled: immediately call `updatePricing({ id: Number(id), data: { ...entry, isActive: newValue } }).unwrap()` — do NOT require form save for this toggle
  - **Save handler (`onSubmit`)**:
    1. Call `updatePricing({ id: Number(id), data: { ...values, isActive } }).unwrap()`
    2. On success: navigate back with `router.back()`
    3. On error: show inline red error banner (not `Alert.alert`)
  - **Discard-changes dialog** (`usePreventRemove`):
    - Import `useNavigation` from `@react-navigation/native` and `usePreventRemove` hook
    - Only activate prevention when `formState.isDirty` is true
    - In the `usePreventRemove` callback:
      - On `Platform.OS === 'web'`: `if (window.confirm(t('pricing.discardConfirmWeb'))) { dispatch(data.action); }`
      - On native: `Alert.alert(t('pricing.discardTitle'), t('pricing.discardMessage'), [{ text: t('common.cancel') || 'Cancel', style: 'cancel' }, { text: t('pricing.discardTitle') || 'Discard', style: 'destructive', onPress: () => dispatch(data.action) }])`
    - **Note**: `usePreventRemove` callback receives `{ data: { action } }` — call `dispatch(data.action)` to allow navigation after confirmation
  - Pass `isLoading={isUpdating}` to `PricingForm` (where `isUpdating` comes from `updatePricing` mutation state)

**Checkpoint**: US3 complete. Edit form opens pre-populated, saves correctly, active toggle works immediately, discard dialog fires on dirty back-navigation.

---

## Phase 6: User Story 4 — Delete a Pricing Entry (Priority: P2)

**Goal**: A center owner can permanently delete a pricing entry from the edit screen, with a platform-aware destructive confirmation before the API call.

**Independent Test**: Open edit screen for any entry → tap Delete → confirmation dialog appears → confirm → entry disappears from pricing list.

- [ ] T017 [US4] Extend `app/(app)/(tabs)/profile/pricing/[id].tsx` — add delete functionality:
  - Import `useDeletePricingMutation` from `store/api/pricingApi`
  - Add a "Delete" button BELOW the `PricingForm` (visually separated, styled as destructive — red text, no fill or red-outlined button)
  - **Delete handler** — platform-aware confirmation pattern:
    ```typescript
    const handleDelete = async () => {
      const confirmed = Platform.OS === 'web'
        ? window.confirm(t('pricing.deleteConfirmWeb'))
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              t('pricing.deleteConfirmTitle'),
              t('pricing.deleteConfirmMessage'),
              [
                { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: t('pricing.delete'), style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
      if (!confirmed) return;
      try {
        await deletePricing(Number(id)).unwrap();
        router.back();
      } catch {
        setDeleteError(t('pricing.errorDelete'));
      }
    };
    ```
  - Add `deleteError` state (`string | null`) — render as inline red banner if non-null
  - Add `isDeleting` from `deletePricing` mutation state — disable both Save and Delete buttons while deleting

**Checkpoint**: US4 complete. Delete confirms, fires API call, removes entry from list.

---

## Phase 7: User Story 5 — View Trust Score and Earned Badges (Priority: P2)

**Goal**: A center owner can view their earned and locked trust badges from the Profile tab. If the trust endpoint is unavailable, the screen shows a "Coming Soon" placeholder without affecting the pricing section.

**Independent Test**: Navigate to Profile → "Trust Badges" row → screen loads → earned badges show highlighted, locked badges show greyed with criteria text. If backend returns 404/500, "Coming Soon" placeholder appears — pricing section above still works.

- [ ] T018 [P] [US5] Create `components/pricing/TrustBadgeCard.tsx`:
  - Props: `{ badge: TrustBadge; locale: string }` (pass `i18n.language` as `locale`)
  - Display:
    - **Badge name**: `locale === 'ar' ? t('trustBadge.' + badge.badgeType) : t('trustBadge.' + badge.badgeType)` — same key works for both locales since keys are the badge type; translations differ in each locale file
    - **Earned badge**: Highlighted container (`bg-yellow-50 border-2 border-yellow-400`), gold star icon (★) or checkmark, badge name in bold, `t('trustBadge.earned')` label in green
    - **Locked badge**: Grey container (`bg-gray-50 border border-gray-200 opacity-60`), lock icon (🔒), badge name, criteria text: `locale === 'ar' ? badge.criteriaAr : badge.criteriaEn`
  - Use `badge.isEarned` to switch between earned and locked display

- [ ] T019 [US5] Create `app/(app)/(tabs)/profile/trust.tsx` — the Trust Badges screen:
  - Call `useGetMyTrustQuery()` from `store/api/trustApi`
  - **Loading**: `ActivityIndicator` centered
  - **Error or no data** (`isError` OR `!data`): Show a "Coming Soon" placeholder — render centered text `t('trustBadge.comingSoon')` with a subtle grey style; do NOT block navigation or show a destructive error
  - **Success**: Render a `ScrollView` with:
    1. Section header: `t('trustBadge.earned')` — list earned badges (`badge.isEarned === true`)
    2. Section header: `t('trustBadge.locked')` — list locked badges (`badge.isEarned === false`)
    3. Each badge rendered as `TrustBadgeCard`
  - Pass `i18n.language` to each `TrustBadgeCard` as `locale` prop
  - Use `useTranslation` hook: `const { t, i18n } = useTranslation()`

- [ ] T020 [US5] Modify `app/(app)/(tabs)/profile/index.tsx` — add "Trust Badges" navigation row:
  - Read the file to find the current "Manage Pricing" row added in T013
  - Add a second tappable row immediately after the "Manage Pricing" row:
    - Label: `t('trustBadge.title')`
    - Same chevron pattern as the Manage Pricing row
    - `onPress`: `router.push('./trust')` (relative route)

**Checkpoint**: US5 complete. Trust badges screen accessible from Profile. Earned badges are visually distinct. If trust endpoint fails, shows Coming Soon without breaking anything else.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: RTL layout, loading UX consistency, and smoke test validation

- [ ] T021 Verify RTL layout: run the app in Arabic locale (`i18n.changeLanguage('ar')` in dev or change device language) and confirm:
  - Pricing list cards flip correctly (text right-aligned, content flows RTL)
  - PricingForm labels appear on the right in Arabic
  - Trust Badges screen renders RTL
  - Fix any `flexDirection: 'row'` issues by using `I18nManager.isRTL` or NativeWind's `rtl:` prefix if needed

- [ ] T022 [P] Verify that `KD X.XXX` format is consistent across all screens — search for any price rendering that doesn't use `formatKD()` or `formatPriceRange()` and replace it

- [ ] T023 [P] Run the smoke test checklist from `specs/002-service-pricing-trust/quickstart.md` manually (or document which steps were verified):
  - [ ] Navigate to Profile → "Manage Pricing" row is visible
  - [ ] Open Pricing → empty state with "Add Service" button when no entries
  - [ ] Add a pricing entry with all required fields → appears in list with correct KD format
  - [ ] Add entry with maxPrice < minPrice → inline validation error appears, no API call
  - [ ] Tap an entry → edit form opens pre-populated
  - [ ] Change minPrice and save → list reflects new value
  - [ ] Toggle Active to Off → entry shows as Paused in list
  - [ ] Start editing, tap back without saving → discard-changes dialog appears
  - [ ] Delete an entry → confirmation dialog, entry disappears after confirm
  - [ ] All text in Arabic locale → RTL layout, Arabic labels
  - [ ] Navigate to Trust Badges → earned badges highlighted, locked badges show criteria
  - [ ] If trust endpoint unavailable → "Coming Soon" placeholder, pricing still works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user story phases**
- **User Stories (Phases 3–7)**: All depend on Foundational completion
  - US1 (Phase 3): No dependency on other stories — start immediately after Phase 2
  - US2 (Phase 4): Needs `PricingCard` from US1's T010 only if reused; `PricingForm` (T014) is the primary new artifact
  - US3 (Phase 5): Depends on `PricingForm` component (T014) from Phase 4
  - US4 (Phase 6): Extends `[id].tsx` from Phase 5 (T016) — must complete US3 first
  - US5 (Phase 7): Fully independent from US1-US4 — can start in parallel after Phase 2
- **Polish (Phase 8)**: After all desired user stories are complete

### Within Each Phase

- T003–T009 in Phase 2 are mostly parallelizable (different files), except T008 and T009 both touch `en.json`/`ar.json` — do sequentially
- T010 and T011 in Phase 3 are parallel (different files)
- T018 (TrustBadgeCard) and T019 (trust screen) — T019 depends on T018

### Parallel Opportunities

```
Phase 2 parallel group A (different files):
  T003 types/pricing.ts
  T004 lib/utils/pricing.ts
  T005 components/pricing/pricingSchema.ts
  T006 store/api/pricingApi.ts
  T007 store/api/trustApi.ts

Phase 2 sequential:
  T008 en.json → T009 ar.json

Phase 3 parallel:
  T010 PricingCard.tsx
  T011 pricing/_layout.tsx

Phase 7 parallel:
  T018 TrustBadgeCard.tsx (then T019 trust.tsx uses it)
  T020 profile/index.tsx trust row (independent of T018/T019)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — the P1 stories)

1. Complete **Phase 1**: Setup checks (T001–T002)
2. Complete **Phase 2**: All foundational artifacts (T003–T009)
3. Complete **Phase 3**: Pricing list screen (T010–T013) — **pricing is visible**
4. Complete **Phase 4**: Add screen (T014–T015) — **pricing can be created**
5. Complete **Phase 5**: Edit screen (T016) — **pricing can be updated and paused**
6. **STOP and VALIDATE**: Run smoke test items 1–8 from T023
7. Demo / ship P1 scope

### Full Delivery (add P2 stories)

8. Complete **Phase 6**: Delete (T017) — extends edit screen
9. Complete **Phase 7**: Trust badges (T018–T020)
10. Complete **Phase 8**: Polish and full smoke test (T021–T023)

---

## Notes

- `[P]` tasks = different files, no blocking dependencies — run in parallel
- `[USx]` label maps each task to its user story for traceability
- The `PricingForm` component (T014) is the most complex task — it's shared between Add (T015) and Edit (T016) screens; build and verify it against the Add screen before implementing Edit
- **Never use `Alert.alert` with multiple buttons on web** — it is a no-op. Use `window.confirm()` for all confirmation dialogs on `Platform.OS === 'web'` (project-wide feedback memory)
- **All prices must use `formatKD()` or `formatPriceRange()`** — never use `.toFixed(3)` directly in a component; go through the utility functions from `lib/utils/pricing.ts`
- **`usePreventRemove` is a React Navigation hook** — import from `@react-navigation/native`, not `expo-router`; it requires `useNavigation` to be in scope
- **Trust endpoint may not exist yet** — `trustApi.ts` must handle `isError` gracefully; the trust screen must show "Coming Soon" on any error, not crash
- Each user story should be independently completable and testable before moving to the next
