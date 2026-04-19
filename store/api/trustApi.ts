import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type { TrustSummary } from '../../types/pricing';

export const trustApi = createApi({
  reducerPath: 'trustApi',
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
    getMyTrust: builder.query<TrustSummary, void>({
      query: () => 'centers/my/trust',
      providesTags: ['Pricing'],
    }),
  }),
});

export const { useGetMyTrustQuery } = trustApi;
