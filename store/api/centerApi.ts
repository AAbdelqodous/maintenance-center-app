import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export interface Address {
  street: string; city: string; area: string;
  postalCode?: string; buildingNumber?: string;
}

export interface ServiceCategory {
  id: number; nameAr: string; nameEn: string; icon?: string;
}

export interface CenterProfile {
  id: number;
  nameAr: string; nameEn: string;
  descriptionAr?: string; descriptionEn?: string;
  address: Address;
  phone: string; email?: string; website?: string;
  averageRating: number; reviewCount: number;
  isVerified: boolean; isOpen: boolean;
  openingHours?: string;
  latitude?: number; longitude?: number;
  categories: ServiceCategory[];
  imageUrls?: string[];
  createdAt: string; updatedAt: string;
}

export interface UpdateCenterRequest {
  nameAr?: string; nameEn?: string;
  descriptionAr?: string; descriptionEn?: string;
  phone?: string; email?: string; website?: string;
  openingHours?: string; isOpen?: boolean;
  address?: Partial<Address>;
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
  tagTypes: ['Center'],
  endpoints: (builder) => ({
    getMyCenter: builder.query<CenterProfile, void>({
      query: () => '/centers/my',
      providesTags: ['Center'],
    }),
    updateCenter: builder.mutation<CenterProfile, UpdateCenterRequest>({
      query: (body) => ({ url: '/centers/my', method: 'PUT', body }),
      invalidatesTags: ['Center'],
    }),
    uploadCenterImage: builder.mutation<string, FormData>({
      query: (formData) => ({
        url: '/centers/my/images',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Center'],
    }),
    deleteCenterImage: builder.mutation<void, string>({
      query: (imageUrl) => ({ url: `/centers/my/images/${encodeURIComponent(imageUrl)}`, method: 'DELETE' }),
      invalidatesTags: ['Center'],
    }),
    getCategories: builder.query<ServiceCategory[], void>({
      query: () => '/categories',
    }),
  }),
});

export const { useGetMyCenterQuery, useUpdateCenterMutation, useUploadCenterImageMutation, useDeleteCenterImageMutation, useGetCategoriesQuery } = centerApi;
