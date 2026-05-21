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
import type { TrendsResponse, TrendsQueryArgs } from '../../types/trends';
import type { DashboardSnapshot } from '../../types/dashboard';
import type {
  StaffPerformanceBoardResponse,
  StaffHistoryResponse,
} from '../../types/staffPerformance';

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
  tagTypes: ['Analytics', 'StaffPerformance'],
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
    getDashboardSnapshot: builder.query<DashboardSnapshot, void>({
      query: () => 'analytics/center/dashboard-snapshot',
      providesTags: ['Analytics'],
    }),
    getStaffPerformanceBoard: builder.query<StaffPerformanceBoardResponse, void>({
      query: () => 'analytics/center/staff-performance',
      providesTags: ['StaffPerformance'],
    }),
    getStaffMonthlyHistory: builder.query<StaffHistoryResponse, { membershipId: number; months?: number }>({
      query: ({ membershipId, months = 6 }) => ({
        url: `analytics/center/staff/${membershipId}/history`,
        params: { months },
      }),
      providesTags: (_result, _error, { membershipId }) => [
        { type: 'StaffPerformance' as const, id: membershipId },
      ],
    }),
    getTrends: builder.query<TrendsResponse, TrendsQueryArgs>({
      query: ({ startDate, endDate }) => ({
        url: 'analytics/center/trends',
        params: { startDate, endDate },
      }),
      keepUnusedDataFor: 3600,
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
  useGetDashboardSnapshotQuery,
  useGetStaffPerformanceBoardQuery,
  useGetStaffMonthlyHistoryQuery,
  useGetTrendsQuery,
} = analyticsApi;
