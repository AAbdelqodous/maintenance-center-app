import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export interface Address {
  streetAr?: string;
  streetEn?: string;
  districtAr?: string;
  districtEn?: string;
  cityAr?: string;
  cityEn?: string;
  governorateAr?: string;
  governorateEn?: string;
  postalCode?: string;
  buildingNumber?: string;
  floor?: string;
  landMark?: string;
}

export interface ServiceCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  code?: string;
  icon?: string;
}

export interface CenterSummary {
  id: number;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  logoUrl?: string;
  averageRating: number;
  totalReviews: number;
  address: Address;
}

export interface CenterProfile {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  address: Address;
  phone: string;
  email?: string;
  website?: string;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  isActive: boolean;
  openingTime?: string;
  closingTime?: string;
  latitude?: number;
  longitude?: number;
  categories: ServiceCategory[];
  imageUrls?: string[];
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCenterRequest {
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingTime?: string;
  closingTime?: string;
  isActive?: boolean;
  address?: Partial<Address>;
  categoryIds?: number[];
}

export interface CreateCenterRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  email: string;
  phone: string;
  address: Partial<Address>;
  openingTime?: string;
  closingTime?: string;
  categoryIds: number[];
}

export interface ServiceResponse {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  iconUrl?: string;
  isActive: boolean;
}

export interface CenterServiceResponse {
  id: number;
  category: ServiceCategory;
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

export const centerApi = createApi({
  reducerPath: 'centerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Center', 'ServiceCatalog', 'CenterServices'],
  endpoints: (builder) => ({
    createCenter: builder.mutation<CenterProfile, CreateCenterRequest>({
      query: (body) => ({ url: 'centers', method: 'POST', body }),
      invalidatesTags: ['Center'],
    }),
    getMyCenters: builder.query<CenterSummary[], void>({
      query: () => 'centers/my',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.content) return response.content;
        return [];
      },
      providesTags: ['Center'],
    }),
    getMyCenter: builder.query<CenterProfile, void>({
      query: () => 'centers/my/profile',
      providesTags: ['Center'],
    }),
    updateCenter: builder.mutation<CenterProfile, UpdateCenterRequest>({
      query: (body) => ({ url: 'centers/my', method: 'PUT', body }),
      invalidatesTags: ['Center'],
    }),
    uploadCenterImage: builder.mutation<string, FormData>({
      query: (formData) => ({
        url: 'centers/my/images',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Center'],
    }),
    deleteCenterImage: builder.mutation<void, string>({
      query: (imageUrl) => ({ url: `centers/my/images/${encodeURIComponent(imageUrl)}`, method: 'DELETE' }),
      invalidatesTags: ['Center'],
    }),
    getCategories: builder.query<ServiceCategory[], void>({
      query: () => 'categories',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.content) return response.content;
        return [];
      },
    }),
    getAllServices: builder.query<ServiceResponse[], void>({
      query: () => 'services',
      transformResponse: (response: any): ServiceResponse[] => {
        if (Array.isArray(response)) return response;
        if (response?.content) return response.content;
        return [];
      },
      providesTags: [{ type: 'ServiceCatalog', id: 'ALL' }],
      keepUnusedDataFor: 3600,
    }),
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
              { type: 'CenterServices' as const, id: 'LIST' },
            ]
          : [{ type: 'CenterServices' as const, id: 'LIST' }],
    }),
    addCenterService: builder.mutation<CenterServiceResponse, CreateCenterServiceRequest>({
      query: (body) => ({ url: 'centers/my/services', method: 'POST', body }),
      invalidatesTags: [{ type: 'CenterServices', id: 'LIST' }],
    }),
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
        { type: 'CenterServices' as const, id },
        { type: 'CenterServices' as const, id: 'LIST' },
      ],
    }),
    deleteCenterService: builder.mutation<void, number>({
      query: (id) => ({ url: `centers/my/services/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'CenterServices' as const, id },
        { type: 'CenterServices' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useCreateCenterMutation,
  useGetMyCentersQuery,
  useGetMyCenterQuery,
  useUpdateCenterMutation,
  useUploadCenterImageMutation,
  useDeleteCenterImageMutation,
  useGetCategoriesQuery,
  useGetAllServicesQuery,
  useGetServicesForCategoryQuery,
  useGetMyCenterServicesQuery,
  useAddCenterServiceMutation,
  useUpdateCenterServiceMutation,
  useDeleteCenterServiceMutation,
} = centerApi;
