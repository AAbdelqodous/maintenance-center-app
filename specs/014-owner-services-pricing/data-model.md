# Data Model: My Services Screen — Owner Declares Services & Pricing

**Branch**: `014-owner-services-pricing` | **Date**: 2026-05-10

---

## TypeScript Types (to add to `store/api/centerApi.ts`)

```typescript
// ── Catalog (read-only, admin-curated) ────────────────────────────────────────

export interface ServiceResponse {
  id: number;
  code: string;           // e.g. "REPAIR"
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  iconUrl?: string;
  isActive: boolean;
}

// ── Owner's center service offerings ─────────────────────────────────────────

export interface CenterServiceResponse {
  id: number;
  category: ServiceCategory;   // ServiceCategory already defined in centerApi.ts
  service: ServiceResponse;
  minPrice?: number | null;
  maxPrice?: number | null;
  typicalDurationMinutes?: number | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCenterServiceRequest {
  categoryId: number;
  serviceId: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  typicalDurationMinutes?: number | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}

export interface UpdateCenterServiceRequest {
  minPrice?: number | null;
  maxPrice?: number | null;
  typicalDurationMinutes?: number | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}
```

---

## Entity Relationships

```
ServiceCategory (catalog, read-only)
  id: number (PK)
  nameAr: string
  nameEn: string
  code?: string
  icon?: string
  └── has many Services via category_services (backend join)

ServiceResponse (catalog, read-only)
  id: number (PK)
  code: string  — one of: REPAIR | MAINTENANCE | INSTALLATION | WARRANTY | INSPECTION | BUYING | SELLING
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  iconUrl?: string
  isActive: boolean

CenterServiceResponse (owner's offering, mutable)
  id: number (PK)
  category: ServiceCategory     — read-only identity; immutable after creation
  service: ServiceResponse      — read-only identity; immutable after creation
  minPrice?: number | null      — KD, 3 decimal places; null = "Price on request"
  maxPrice?: number | null      — KD, must be >= minPrice when both present
  typicalDurationMinutes?: number | null  — whole minutes, min 1
  descriptionAr?: string | null — max 500 chars, optional
  descriptionEn?: string | null — max 500 chars, optional
  isActive: boolean             — false = soft-deleted, not shown
  createdAt: string             — ISO 8601
  updatedAt?: string            — ISO 8601

UNIQUE(centerId, categoryId, serviceId) — enforced by backend and by client (disabled UI)
```

---

## Zod Validation Schemas

### Add Service Schema

```typescript
// components/services/servicesSchema.ts

import { z } from 'zod';

export const addCenterServiceSchema = z.object({
  categoryId: z.number({ required_error: 'Select a category' }),
  serviceId: z.number({ required_error: 'Select a service' }),
  minPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .min(0, 'Price must be 0 or more')
    .optional()
    .nullable(),
  maxPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .min(0, 'Price must be 0 or more')
    .optional()
    .nullable(),
  typicalDurationMinutes: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute')
    .optional()
    .nullable(),
  descriptionAr: z.string().max(500, 'Max 500 characters').optional().nullable(),
  descriptionEn: z.string().max(500, 'Max 500 characters').optional().nullable(),
}).refine(
  (data) => {
    if (data.minPrice != null && data.maxPrice != null) {
      return data.maxPrice >= data.minPrice;
    }
    return true;
  },
  { message: 'Max price must be ≥ min price', path: ['maxPrice'] }
);

export type AddCenterServiceForm = z.infer<typeof addCenterServiceSchema>;

export const editCenterServiceSchema = addCenterServiceSchema.omit({
  categoryId: true,
  serviceId: true,
});

export type EditCenterServiceForm = z.infer<typeof editCenterServiceSchema>;
```

---

## State Transitions

```
CenterServiceOffering lifecycle:
  [not exists]
    → POST /centers/my/services → isActive: true   (offering created)
  
  isActive: true
    → PUT /centers/my/services/{id}                 (pricing/description updated; identity immutable)
    → DELETE /centers/my/services/{id} → isActive: false  (soft delete)
  
  isActive: false  (soft-deleted)
    → not shown in GET /centers/my/services response (backend filters by default)
    → owner can re-add by POSTing the same (categoryId, serviceId) pair — creates a new record
```

---

## Derived State: Categories Served

The profile screen derives the center's active categories from the center services list:

```typescript
// Derived from CenterServiceResponse[]
const derivedCategories: ServiceCategory[] = useMemo(() => {
  if (!centerServices) return [];
  const seen = new Set<number>();
  return centerServices
    .filter(s => s.isActive)
    .reduce<ServiceCategory[]>((acc, s) => {
      if (!seen.has(s.category.id)) {
        seen.add(s.category.id);
        acc.push(s.category);
      }
      return acc;
    }, []);
}, [centerServices]);
```

---

## Price Display Helper

```typescript
// lib/utils/formatPrice.ts  (new utility, or add to existing utils)

export function formatPriceRange(
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
): string {
  if (minPrice == null && maxPrice == null) return 'Price on request';
  if (minPrice != null && maxPrice != null) {
    return `KD ${minPrice.toFixed(3)} – ${maxPrice.toFixed(3)}`;
  }
  if (minPrice != null) return `From KD ${minPrice.toFixed(3)}`;
  return `Up to KD ${maxPrice!.toFixed(3)}`;
}
```

The Arabic equivalent localisation key returns e.g. `من ${minPrice.toFixed(3)} د.ك` — handled via i18n.
