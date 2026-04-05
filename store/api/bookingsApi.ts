import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceType {
  CAR = 'CAR',
  ELECTRONICS = 'ELECTRONICS',
  HOME_APPLIANCE = 'HOME_APPLIANCE',
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
  customerId: number;
  customerName: string;
  customerPhone: string;
  centerId: number;
  serviceType: ServiceType;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingsResponse {
  content: Booking[];
  totalElements: number; totalPages: number;
  size: number; number: number;
  first: boolean; last: boolean;
}

export interface BookingsQueryParams {
  page?: number; size?: number;
  status?: BookingStatus;
  date?: string;
}

export interface BookingStats {
  today: number; pending: number; confirmed: number;
  inProgress: number; completed: number; totalThisMonth: number;
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
      query: (params) => ({ url: '/bookings/center', params }),
      providesTags: ['Booking'],
    }),
    getBookingById: builder.query<Booking, number>({
      query: (id) => `/bookings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),
    updateBookingStatus: builder.mutation<Booking, { id: number; status: BookingStatus; reason?: string }>({
      query: ({ id, status, reason }) => ({ url: `/bookings/${id}/status`, method: 'PUT', body: { status, reason } }),
      invalidatesTags: (result, error, { id }) => ['Booking', { type: 'Booking', id }],
    }),
    getBookingStats: builder.query<BookingStats, void>({
      query: () => '/bookings/center/stats',
    }),
  }),
});

export const { useGetBookingsQuery, useGetBookingByIdQuery, useUpdateBookingStatusMutation, useGetBookingStatsQuery } = bookingsApi;
