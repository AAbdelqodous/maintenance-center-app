import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type { CenterOffer, CreateOfferRequest, OfferStatus, UpdateOfferRequest } from '../../types/offers';

export const offersApi = createApi({
  reducerPath: 'offersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Offers'],
  endpoints: (builder) => ({
    getMyOffers: builder.query<CenterOffer[], { status?: OfferStatus } | void>({
      query: (params) => ({
        url: 'centers/my/offers',
        params: params?.status ? { status: params.status } : undefined,
      }),
      providesTags: ['Offers'],
    }),
    getOffer: builder.query<CenterOffer, number>({
      query: (id) => `centers/my/offers/${id}`,
      providesTags: ['Offers'],
    }),
    createOffer: builder.mutation<CenterOffer, CreateOfferRequest>({
      query: (body) => ({ url: 'centers/my/offers', method: 'POST', body }),
      invalidatesTags: ['Offers'],
    }),
    updateOffer: builder.mutation<CenterOffer, { id: number; data: UpdateOfferRequest }>({
      query: ({ id, data }) => ({ url: `centers/my/offers/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Offers'],
    }),
    cancelOffer: builder.mutation<CenterOffer, number>({
      query: (id) => ({ url: `centers/my/offers/${id}/cancel`, method: 'PUT' }),
      invalidatesTags: ['Offers'],
    }),
  }),
});

export const {
  useGetMyOffersQuery,
  useGetOfferQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useCancelOfferMutation,
} = offersApi;
