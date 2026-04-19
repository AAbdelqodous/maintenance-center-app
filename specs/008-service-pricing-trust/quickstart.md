# Quickstart: Phase 3.5 — Service Pricing & Trust Badges

**Branch**: `002-service-pricing-trust` | **Date**: 2026-04-16

---

## Prerequisites

- Backend is running with pricing endpoints deployed (`GET/POST/PUT/DELETE /centers/my/pricing`)
- Logged in as a center owner with an approved account
- You are on branch `002-service-pricing-trust`

---

## Step 1: Add i18n Keys

Add the `pricing` and `trustBadge` namespaces to both locale files using the key structure in `data-model.md`. Do English (`en.json`) first, then Arabic (`ar.json`).

---

## Step 2: Create Types and Utilities

1. Create `types/pricing.ts` — re-exports `ServiceType`, defines `CenterServicePricing`, `CreatePricingRequest`, `UpdatePricingRequest`, `TrustBadge`, `TrustSummary`.
2. Create `lib/utils/pricing.ts` — `formatKD()` and `formatPriceRange()` utilities.
3. Create `components/pricing/pricingSchema.ts` — Zod schema with `maxPrice ≥ minPrice` refinement.

---

## Step 3: Create RTK Query Slices

1. Create `store/api/pricingApi.ts` — 4 endpoints per `data-model.md` shape.
2. Create `store/api/trustApi.ts` — 1 endpoint, graceful error handling.
3. Confirm `'Pricing'` exists in `tagTypes` in the base API store.

---

## Step 4: Create the Pricing Stack Layout

Create `app/(app)/(tabs)/profile/pricing/_layout.tsx`:

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

---

## Step 5: Create PricingCard Component

Create `components/pricing/PricingCard.tsx`. It receives a `CenterServicePricing` prop and renders:
- `serviceNameAr` or `serviceNameEn` based on `i18n.language`
- `formatPriceRange(minPrice, maxPrice)` from `lib/utils/pricing.ts`
- `typicalDurationMinutes` if present
- Active/Paused badge (NativeWind: green bg for active, grey for paused)
- The card is tappable (`onPress` prop for navigation to edit screen)

---

## Step 6: Build the Pricing List Screen

Create `app/(app)/(tabs)/profile/pricing/index.tsx`:
- Calls `useGetMyPricingQuery()`
- Shows skeleton while loading, inline error banner with retry when error
- Empty state with `t('pricing.noEntries')` + `t('pricing.noEntriesSubtitle')` + Add button
- FlatList of `PricingCard` components when data exists
- FAB or header button navigating to `pricing/add`
- Each card navigates to `pricing/[id]` on press

---

## Step 7: Build the PricingForm Component

Create `components/pricing/PricingForm.tsx` — shared by Add and Edit screens:
- `useForm<PricingFormValues>` with `zodResolver(pricingSchema)`
- `defaultValues` prop for pre-population (edit mode)
- Fields: service type picker, name inputs (ar/en), price inputs (min/max), duration, descriptions
- Inline per-field error messages below each field
- Submit handler prop (`onSubmit: (values) => Promise<void>`)
- Loading state disables form during submission

---

## Step 8: Add Pricing Screen

Create `app/(app)/(tabs)/profile/pricing/add.tsx`:
- Renders `PricingForm` with empty defaults
- `onSubmit` calls `createPricing` mutation
- On success: shows success toast/banner + navigates back to list
- On error: shows inline error banner (not Alert.alert)

---

## Step 9: Edit Pricing Screen

Create `app/(app)/(tabs)/profile/pricing/[id].tsx`:
- Reads `id` from route params via `useLocalSearchParams()`
- Finds entry from `useGetMyPricingQuery()` data by ID (or re-fetches if not cached)
- Renders `PricingForm` pre-populated with existing values
- Active/Paused toggle (separate from form, calls update immediately)
- Delete button: platform-aware confirmation (`window.confirm` on web, `Alert.alert` on native)
- `usePreventRemove` hook to intercept back navigation when form is dirty

---

## Step 10: Add "Manage Pricing" Row to Profile Screen

Modify `app/(app)/(tabs)/profile/index.tsx`:
- Add a tappable row with label `t('pricing.managePricing')` and a chevron
- Navigate to `./pricing` (relative route)

---

## Step 11: Trust Badges Screen

Create `app/(app)/(tabs)/profile/trust.tsx` and `components/pricing/TrustBadgeCard.tsx`:
- Calls `useGetMyTrustQuery()` — handles error with "Coming Soon" fallback
- Renders earned badges (highlighted) and locked badges (greyed) using `TrustBadgeCard`
- Add a "Trust Badges" row to `profile/index.tsx` navigating to `./trust`

---

## Smoke Test Checklist

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
