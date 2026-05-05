import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum ServiceType {
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  INSPECTION = 'INSPECTION',
  INSTALLATION = 'INSTALLATION',
  CONSULTATION = 'CONSULTATION',
  EMERGENCY = 'EMERGENCY',
  WARRANTY = 'WARRANTY',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  KNET = 'KNET',
  CREDIT_CARD = 'CREDIT_CARD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export interface Booking {
  id: number;
  customerName: string;
  customerPhone?: string;
  serviceType: ServiceType;
  bookingStatus: BookingStatus;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  workStage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingsResponse {
  content: Booking[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface BookingsQueryParams {
  page?: number;
  size?: number;
  status?: BookingStatus;
  date?: string;
}

export interface CenterBookingsQueryParams {
  page?: number;
  size?: number;
  status?: BookingStatus;
}

export interface BookingCompletionRequest {
  finalCost: number;
  completionNotes?: string;
  costNotes?: string;
  paymentStatus?: 'PAID' | 'PENDING';
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  totalRevenue: number;
}

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Booking'],
  endpoints: (builder) => ({
    getBookings: builder.query<BookingsResponse, BookingsQueryParams>({
      query: (params) => ({ url: 'bookings', params }),
      transformResponse: (raw: any): BookingsResponse => ({
        content: raw.content ?? [],
        totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
        totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
        number: raw.page?.number ?? raw.number ?? 0,
        size: raw.page?.size ?? raw.size ?? 0,
        first: raw.first ?? true,
        last: raw.last ?? true,
      }),
      providesTags: ['Booking'],
    }),
    getCenterBookings: builder.query<BookingsResponse, CenterBookingsQueryParams>({
      query: ({ page, size, status }) => ({
        url: 'bookings',
        params: { page, size, ...(status && { status }) },
      }),
      transformResponse: (raw: any): BookingsResponse => ({
        content: raw.content ?? [],
        totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
        totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
        number: raw.page?.number ?? raw.number ?? 0,
        size: raw.page?.size ?? raw.size ?? 0,
        first: raw.first ?? true,
        last: raw.last ?? true,
      }),
      providesTags: ['Booking'],
    }),
    getBookingById: builder.query<Booking, number>({
      query: (id) => `bookings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
    }),
    getBookingStats: builder.query<BookingStats, void>({
      query: () => 'bookings/stats',
      providesTags: ['Booking'],
    }),
    confirmBooking: builder.mutation<Booking, number>({
      query: (id) => ({ url: `bookings/${id}/confirm`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['Booking', { type: 'Booking', id }],
    }),
    startService: builder.mutation<Booking, number>({
      query: (id) => ({ url: `bookings/${id}/start`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['Booking', { type: 'Booking', id }],
    }),
    completeBooking: builder.mutation<Booking, { id: number; data: BookingCompletionRequest }>({
      query: ({ id, data }) => ({ url: `bookings/${id}/complete`, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { id }) => ['Booking', { type: 'Booking', id }],
    }),
    cancelBooking: builder.mutation<Booking, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `bookings/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: (_result, _error, { id }) => ['Booking', { type: 'Booking', id }],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetCenterBookingsQuery,
  useGetBookingByIdQuery,
  useGetBookingStatsQuery,
  useConfirmBookingMutation,
  useStartServiceMutation,
  useCompleteBookingMutation,
  useCancelBookingMutation,
} = bookingsApi;
