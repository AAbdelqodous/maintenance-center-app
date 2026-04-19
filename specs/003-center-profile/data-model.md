# Data Model: Phase 3 — Center Profile Management

**Branch**: `phase-3-center-profile` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

### Center Profile

```typescript
// store/api/centerApi.ts
export interface Address {
  cityAr: string;
  cityEn: string;
  districtAr: string;
  districtEn: string;
  streetAr: string;
  streetEn: string;
  governorateAr: string;
  governorateEn: string;
}

export interface ServiceCategoryResponse {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface MaintenanceCenterResponse {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  phone: string;
  email?: string;
  address: Address;
  openingTime: string;    // "HH:mm:ss"
  closingTime: string;    // "HH:mm:ss"
  isActive: boolean;      // NOT "isOpen"
  imageUrl?: string;
  categories: ServiceCategoryResponse[];
  averageRating: number;
  totalReviews: number;   // NOT "reviewCount"
  createdAt: string;
}

export interface MaintenanceCenterRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  phone: string;
  email?: string;
  address: Address;
  openingTime: string;    // "HH:mm:ss"
  closingTime: string;    // "HH:mm:ss"
  isActive?: boolean;
  categoryIds: number[];
}
```

---

## RTK Query Slice — `store/api/centerApi.ts`

```typescript
import { baseApi } from './baseApi';

export const centerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<MaintenanceCenterResponse, void>({
      query: () => 'centers/my/profile',
      providesTags: ['CenterProfile'],
    }),

    updateMyProfile: builder.mutation<MaintenanceCenterResponse, MaintenanceCenterRequest>({
      query: (body) => ({ url: 'centers/my', method: 'PUT', body }),
      invalidatesTags: ['CenterProfile'],
    }),

    uploadCenterImage: builder.mutation<MaintenanceCenterResponse, FormData>({
      query: (formData) => ({
        url: 'centers/my/images',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['CenterProfile', 'CenterImages'],
    }),

    getCategories: builder.query<ServiceCategoryResponse[], void>({
      query: () => 'categories',
      transformResponse: (raw: ServiceCategoryResponse[] | { content: ServiceCategoryResponse[] }) =>
        Array.isArray(raw) ? raw : raw.content,
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadCenterImageMutation,
  useGetCategoriesQuery,
} = centerApi;
```

---

## Zod Schema — Profile Form

```typescript
// components/profile/profileSchema.ts
import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;

export const profileSchema = z.object({
  nameAr: z.string().min(2, 'Arabic name is required'),
  nameEn: z.string().min(2, 'English name is required'),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.object({
    cityAr: z.string().min(1),
    cityEn: z.string().min(1),
    districtAr: z.string().min(1),
    districtEn: z.string().min(1),
    streetAr: z.string().min(1),
    streetEn: z.string().min(1),
    governorateAr: z.string().min(1),
    governorateEn: z.string().min(1),
  }),
  openingTime: z.string().regex(timeRegex, 'Use HH:mm format'),
  closingTime: z.string().regex(timeRegex, 'Use HH:mm format'),
  categoryIds: z.array(z.number()).min(1, 'Select at least one category'),
}).refine(
  (data) => data.closingTime > data.openingTime,
  { message: 'Closing time must be after opening time', path: ['closingTime'] }
);

export type ProfileFormData = z.infer<typeof profileSchema>;
```

---

## i18n Key Structure

```json
{
  "profile": {
    "title": "Center Profile",
    "nameAr": "Name (Arabic)",
    "nameEn": "Name (English)",
    "descriptionAr": "Description (Arabic)",
    "descriptionEn": "Description (English)",
    "phone": "Phone",
    "email": "Email",
    "address": "Address",
    "cityAr": "City (Arabic)",
    "cityEn": "City (English)",
    "districtAr": "District (Arabic)",
    "districtEn": "District (English)",
    "streetAr": "Street (Arabic)",
    "streetEn": "Street (English)",
    "governorateAr": "Governorate (Arabic)",
    "governorateEn": "Governorate (English)",
    "openingTime": "Opening Time (HH:mm)",
    "closingTime": "Closing Time (HH:mm)",
    "categories": "Service Categories",
    "image": "Center Image",
    "changeImage": "Change Image",
    "saved": "Profile saved successfully",
    "setupTitle": "Setup Your Center"
  }
}
```
