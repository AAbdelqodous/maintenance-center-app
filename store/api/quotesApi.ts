import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type { BookingQuote, CreateQuoteRequest } from '../../types/quote';

export const quotesApi = createApi({
  reducerPath: 'quotesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Quotes'],
  endpoints: (builder) => ({
    getBookingQuotes: builder.query<BookingQuote[], number>({
      query: (bookingId) => `bookings/${bookingId}/quotes`,
      providesTags: ['Quotes'],
    }),
    createQuote: builder.mutation<BookingQuote, { bookingId: number; data: CreateQuoteRequest }>({
      query: ({ bookingId, data }) => ({
        url: `bookings/${bookingId}/quotes`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Quotes'],
    }),
    sendQuote: builder.mutation<BookingQuote, { bookingId: number; quoteId: number }>({
      query: ({ bookingId, quoteId }) => ({
        url: `bookings/${bookingId}/quotes/${quoteId}/send`,
        method: 'POST',
      }),
      invalidatesTags: ['Quotes'],
    }),
  }),
});

export const {
  useGetBookingQuotesQuery,
  useCreateQuoteMutation,
  useSendQuoteMutation,
} = quotesApi;
