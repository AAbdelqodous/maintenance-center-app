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

export interface Booking {
  id: number;
  bookingNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  centerId: number;
  centerName: string;
  serviceType: ServiceType;
  bookingStatus: BookingStatus;
  bookingDate: string;
  bookingTime: string;
  serviceDescription?: string;
  problemDescription?: string;
  estimatedCost?: number;
  finalCost?: number;
  notes?: string;
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

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
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
    updateBookingStatus: builder.mutation<Booking, { id: number; status: BookingStatus; reason?: string; notes?: string }>({
      query: ({ id, status, reason, notes }) => ({
        url: `/bookings/${id}/status`,
        method: 'PUT',
        body: { status, ...(reason && { reason }), ...(notes && { notes }) },
      }),
      invalidatesTags: (result, error, { id }) => ['Booking', { type: 'Booking', id }],
    }),
    getBookingStats: builder.query<BookingStats, void>({
      query: () => '/bookings/center/stats',
    }),
  }),
});

export const { useGetBookingsQuery, useGetBookingByIdQuery, useUpdateBookingStatusMutation, useGetBookingStatsQuery } = bookingsApi;
