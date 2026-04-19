import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type {
  CenterServicePricing,
  CreatePricingRequest,
  UpdatePricingRequest,
} from '../../types/pricing';

export const pricingApi = createApi({
  reducerPath: 'pricingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Pricing'],
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
