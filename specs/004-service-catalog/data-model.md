# Data Model: Phase 4 — Service Catalog

**Branch**: `phase-4-service-catalog` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

```typescript
// store/api/centerApi.ts (shared with Phase 3)
export interface ServiceCategoryResponse {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}
```

No new types introduced in Phase 4. The feature reuses `ServiceCategoryResponse` and the `categoryIds: number[]` field on `MaintenanceCenterRequest` from Phase 3.

---

## RTK Query — Categories Endpoint (shared from centerApi.ts)

```typescript
getCategories: builder.query<ServiceCategoryResponse[], void>({
  query: () => 'categories',
  transformResponse: (raw: ServiceCategoryResponse[] | { content: ServiceCategoryResponse[] }) =>
    Array.isArray(raw) ? raw : raw.content,
}),
```

---

## Backend Seed Data (reference)

The backend seeds these categories on startup:

| ID | nameEn | nameAr |
|----|--------|--------|
| 1 | Cars | سيارات |
| 2 | Electronics | إلكترونيات |
| 3 | Home Appliances | أجهزة منزلية |
| 4 | Restaurant | مطاعم |
| 5 | Hotel | فنادق |
| 6 | Other | أخرى |

---

## Component Pattern

```typescript
// In profile or service catalog screen
const { data: categories = [] } = useGetCategoriesQuery();
const { watch, setValue } = useForm<ProfileFormData>();
const selectedIds = watch('categoryIds');

const toggleCategory = (id: number) => {
  const updated = selectedIds.includes(id)
    ? selectedIds.filter((c) => c !== id)
    : [...selectedIds, id];
  setValue('categoryIds', updated, { shouldValidate: true });
};
```

---

## i18n Key Structure

```json
{
  "catalog": {
    "title": "Service Catalog",
    "categories": "Categories We Serve",
    "selectAtLeastOne": "Select at least one category",
    "cars": "Cars",
    "electronics": "Electronics",
    "homeAppliances": "Home Appliances",
    "restaurant": "Restaurant",
    "hotel": "Hotel",
    "other": "Other"
  }
}
```
