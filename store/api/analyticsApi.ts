import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type {
  PerformanceSummary,
  BookingTrendsResponse,
  BookingTrendsQueryArgs,
  RevenueByCategoryResponse,
  SatisfactionSummary,
  AnalyticsQueryArgs,
  PeakHoursResponse,
} from '../../types/analytics';

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Analytics'],
  endpoints: (builder) => ({
    getAnalyticsSummary: builder.query<PerformanceSummary, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) => ({
        url: 'analytics/center/summary',
        params: { startDate, endDate },
      }),
      providesTags: ['Analytics'],
    }),
    getBookingTrends: builder.query<BookingTrendsResponse, BookingTrendsQueryArgs>({
      query: ({ startDate, endDate, granularity }) => ({
        url: 'analytics/center/booking-trends',
        params: { startDate, endDate, granularity },
      }),
      providesTags: ['Analytics'],
    }),
    getRevenueByCategory: builder.query<RevenueByCategoryResponse, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) => ({
        url: 'analytics/center/revenue-by-category',
        params: { startDate, endDate },
      }),
      providesTags: ['Analytics'],
    }),
    getSatisfactionSummary: builder.query<SatisfactionSummary, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) => ({
        url: 'analytics/center/satisfaction',
        params: { startDate, endDate },
      }),
      providesTags: ['Analytics'],
    }),
    getPeakHours: builder.query<PeakHoursResponse, AnalyticsQueryArgs>({
      query: ({ startDate, endDate }) => ({
        url: 'analytics/center/peak-hours',
        params: { startDate, endDate },
      }),
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetAnalyticsSummaryQuery,
  useGetBookingTrendsQuery,
  useGetRevenueByCategoryQuery,
  useGetSatisfactionSummaryQuery,
  useGetPeakHoursQuery,
} = analyticsApi;
