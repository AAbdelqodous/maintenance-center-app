import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import type { RootState } from '../index';
import type { LookupCategory } from '../../types/lookup';

export const lookupsApi = createApi({
  reducerPath: 'lookupsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Lookup'],
  // Lookups change rarely — keep data for 24 hours to eliminate per-screen network calls
  keepUnusedDataFor: 86400,
  endpoints: (builder) => ({
    getLookup: builder.query<LookupCategory, string>({
      query: (parameter) => `lookups/${parameter}`,
      providesTags: (_result, _error, parameter) => [{ type: 'Lookup', id: parameter }],
    }),
    getBulkLookups: builder.query<LookupCategory[], string[]>({
      query: (parameters) => ({
        url: 'lookups',
        params: { categories: parameters.join(',') },
      }),
      providesTags: (_result, _error, parameters) =>
        parameters.map((p) => ({ type: 'Lookup' as const, id: p })),
    }),
  }),
});

export const { useGetLookupQuery, useGetBulkLookupsQuery } = lookupsApi;
