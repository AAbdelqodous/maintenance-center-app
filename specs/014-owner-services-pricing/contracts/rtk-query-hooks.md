# RTK Query Contracts: My Services Screen

**Branch**: `014-owner-services-pricing` | **Date**: 2026-05-10

All endpoints are added to the existing `centerApi` in `store/api/centerApi.ts`.
Tag types `'ServiceCatalog'` and `'CenterServices'` are added to the existing `tagTypes` array.

---

## New tagTypes

```typescript
// In centerApi's tagTypes array, add:
tagTypes: ['Center', 'ServiceCatalog', 'CenterServices'],
```

---

## Catalog Endpoints (read-only, `ServiceCatalog` tag)

### getAllServices

```typescript
getAllServices: builder.query<ServiceResponse[], void>({
  query: () => 'services',
  transformResponse: (response: any): ServiceResponse[] => {
    if (Array.isArray(response)) return response;
    if (response?.content) return response.content;
    return [];
  },
  providesTags: [{ type: 'ServiceCatalog', id: 'ALL' }],
  keepUnusedDataFor: 3600,   // catalog changes rarely
}),

// Hook: useGetAllServicesQuery()
```

### getServicesForCategory

```typescript
getServicesForCategory: builder.query<ServiceResponse[], number>({
  query: (categoryId) => `categories/${categoryId}/services`,
  transformResponse: (response: any): ServiceResponse[] => {
    if (Array.isArray(response)) return response;
    if (response?.content) return response.content;
    return [];
  },
  providesTags: (_result, _error, categoryId) => [
    { type: 'ServiceCatalog', id: `CAT-${categoryId}` },
  ],
  keepUnusedDataFor: 3600,
}),

// Hook: useGetServicesForCategoryQuery(categoryId, { skip: !categoryId })
```

---

## Owner Offering Endpoints (`CenterServices` tag)

### getMyCenterServices

```typescript
getMyCenterServices: builder.query<CenterServiceResponse[], void>({
  query: () => 'centers/my/services',
  transformResponse: (response: any): CenterServiceResponse[] => {
    if (Array.isArray(response)) return response;
    if (response?.content) return response.content;
    return [];
  },
  providesTags: (result) =>
    result
      ? [
          ...result.map(({ id }) => ({ type: 'CenterServices' as const, id })),
          { type: 'CenterServices', id: 'LIST' },
        ]
      : [{ type: 'CenterServices', id: 'LIST' }],
}),

// Hook: useGetMyCenterServicesQuery()
```

### addCenterService

```typescript
addCenterService: builder.mutation<CenterServiceResponse, CreateCenterServiceRequest>({
  query: (body) => ({
    url: 'centers/my/services',
    method: 'POST',
    body,
  }),
  invalidatesTags: [{ type: 'CenterServices', id: 'LIST' }],
}),

// Hook: const [addCenterService, { isLoading }] = useAddCenterServiceMutation();
```

### updateCenterService

```typescript
updateCenterService: builder.mutation<
  CenterServiceResponse,
  { id: number; data: UpdateCenterServiceRequest }
>({
  query: ({ id, data }) => ({
    url: `centers/my/services/${id}`,
    method: 'PUT',
    body: data,
  }),
  invalidatesTags: (_result, _error, { id }) => [
    { type: 'CenterServices', id },
    { type: 'CenterServices', id: 'LIST' },
  ],
}),

// Hook: const [updateCenterService, { isLoading }] = useUpdateCenterServiceMutation();
```

### deleteCenterService

```typescript
deleteCenterService: builder.mutation<void, number>({
  query: (id) => ({
    url: `centers/my/services/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: (_result, _error, id) => [
    { type: 'CenterServices', id },
    { type: 'CenterServices', id: 'LIST' },
  ],
}),

// Hook: const [deleteCenterService, { isLoading }] = useDeleteCenterServiceMutation();
```

---

## Updated Export List (centerApi.ts)

```typescript
export const {
  // existing
  useCreateCenterMutation,
  useGetMyCentersQuery,
  useGetMyCenterQuery,
  useUpdateCenterMutation,
  useUploadCenterImageMutation,
  useDeleteCenterImageMutation,
  useGetCategoriesQuery,
  // new
  useGetAllServicesQuery,
  useGetServicesForCategoryQuery,
  useGetMyCenterServicesQuery,
  useAddCenterServiceMutation,
  useUpdateCenterServiceMutation,
  useDeleteCenterServiceMutation,
} = centerApi;
```

---

## Backend Endpoint Reference

| Hook | Method | Path |
|------|--------|------|
| `useGetAllServicesQuery` | GET | `/api/v1/services` |
| `useGetServicesForCategoryQuery(id)` | GET | `/api/v1/categories/{id}/services` |
| `useGetMyCenterServicesQuery` | GET | `/api/v1/centers/my/services` |
| `useAddCenterServiceMutation` | POST | `/api/v1/centers/my/services` |
| `useUpdateCenterServiceMutation` | PUT | `/api/v1/centers/my/services/{id}` |
| `useDeleteCenterServiceMutation` | DELETE | `/api/v1/centers/my/services/{id}` |

---

## Profile Screen Contract Change

The `UpdateCenterRequest` type in `centerApi.ts` currently includes `categoryIds?: number[]`.
After this feature: `categoryIds` is removed from the PUT body sent by the profile screen.
The type definition is **not changed** (the field remains optional in the interface so other callers are unaffected); the profile screen simply stops populating it.

Regression check: `PUT /centers/my` without `categoryIds` must return 200. Confirm with backend team that `categoryIds` is no longer required by the endpoint.
