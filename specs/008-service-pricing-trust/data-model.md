# Data Model: Phase 3.5 — Service Pricing & Trust Badges

**Branch**: `002-service-pricing-trust` | **Date**: 2026-04-16

---

## TypeScript Types — `types/pricing.ts`

```typescript
// Re-export ServiceType from its existing location so pricing components
// don't import directly from the bookings API slice.
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

// Trust Badges
export type TrustBadgeType =
  | 'VERIFIED_PRICING'
  | 'FAST_RESPONDER'
  | 'HIGH_COMPLETION'
  | 'TOP_RATED';

export interface TrustBadge {
  badgeType: TrustBadgeType;
  isEarned: boolean;
  earnedAt?: string;     // ISO 8601, present when isEarned === true
  criteriaEn: string;    // e.g. "Add at least 1 active pricing entry"
  criteriaAr: string;
}

export interface TrustSummary {
  badges: TrustBadge[];
}
```

---

## Zod Validation Schema — `components/pricing/pricingSchema.ts`

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

---

## RTK Query Slice — `store/api/pricingApi.ts`

Implement **verbatim** from CLAUDE.md Phase 3.5 section:

```typescript
import { baseApi } from './baseApi';  // adjust import path to match project
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

**Note**: Confirm `'Pricing'` exists in the `tagTypes` array in `store/index.ts` (already listed in CLAUDE.md).

---

## Trust Badges RTK Query — `store/api/trustApi.ts`

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

---

## Price Formatting Utility — `lib/utils/pricing.ts`

```typescript
/**
 * Format a KD price with exactly 3 decimal places.
 * e.g. formatKD(15.5) → "KD 15.500"
 */
export function formatKD(amount: number): string {
  return `KD ${Number(amount).toFixed(3)}`;
}

/**
 * Format a price range. When min === max, show single price.
 * e.g. formatPriceRange(10, 20) → "KD 10.000 – KD 20.000"
 * e.g. formatPriceRange(15, 15) → "KD 15.000"
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatKD(min);
  return `${formatKD(min)} – ${formatKD(max)}`;
}
```

---

## i18n Keys — `pricing` namespace

Add to both `lib/i18n/locales/en.json` and `ar.json`:

```json
{
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
}
```

*(Arabic translations for `ar.json` follow the same key structure.)*

---

## Screen & Component Map

| Screen / Component | Path | Type | Story |
|--------------------|------|------|-------|
| Pricing list screen | `app/(app)/(tabs)/profile/pricing/index.tsx` | Screen | US1 |
| Add pricing screen | `app/(app)/(tabs)/profile/pricing/add.tsx` | Screen | US2 |
| Edit pricing screen | `app/(app)/(tabs)/profile/pricing/[id].tsx` | Screen | US3 + US4 |
| Pricing layout (stack) | `app/(app)/(tabs)/profile/pricing/_layout.tsx` | Layout | US1 |
| PricingCard | `components/pricing/PricingCard.tsx` | Component | US1 |
| PricingForm | `components/pricing/PricingForm.tsx` | Component | US2 + US3 |
| Zod schema | `components/pricing/pricingSchema.ts` | Util | US2 |
| Trust badges screen | `app/(app)/(tabs)/profile/trust.tsx` | Screen | US5 |
| TrustBadgeCard | `components/pricing/TrustBadgeCard.tsx` | Component | US5 |
| Price utility | `lib/utils/pricing.ts` | Util | US1 + US2 |
| Pricing types | `types/pricing.ts` | Types | All |
| Pricing RTK slice | `store/api/pricingApi.ts` | Store | All |
| Trust RTK slice | `store/api/trustApi.ts` | Store | US5 |
| i18n en | `lib/i18n/locales/en.json` | i18n | All |
| i18n ar | `lib/i18n/locales/ar.json` | i18n | All |
| Profile index (add row) | `app/(app)/(tabs)/profile/index.tsx` | MODIFY | US1 |
