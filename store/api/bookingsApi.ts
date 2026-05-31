import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type { RerouteRequest, RerouteResponse, RerouteAudit } from '@/types/reroute';

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
  assignedMembershipId: number | null;
  assignedStaffName: string | null;
  departmentId?: number;
  departmentNameAr?: string;
  departmentNameEn?: string;
  // Spec 022 — true when the booking was originally routed to the diagnostic department
  // (created with no categoryId). Drives the auto-injected diagnostic-fee line item.
  passedThroughDiagnostic: boolean;
  // Snapshot of the diagnostic fee at claim time; null until a tech claims a diagnostic
  // booking, then frozen even if the owner later changes the dept's fee.
  diagnosticFeeRateAtClaim: number | null;
  // Spec 008 — fulfillment: how the service is delivered + the current center-driven logistics leg.
  // Null/DROP_OFF means no logistics (the booking is handled at the center).
  fulfillmentMode?: 'DROP_OFF' | 'PICKUP_DELIVERY' | 'AT_HOME' | null;
  fulfillmentFee?: number | null;
  logisticsState?: string | null;
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
  noDepartmentMembership?: boolean;
}

export interface BookingsQueryParams {
  page?: number;
  size?: number;
  status?: BookingStatus;
  date?: string;
}

export interface CenterBookingsQueryParams {
  centerId: number;
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

export type ClaimBookingErrorCode =
  | 'BOOKING_ALREADY_CLAIMED'
  | 'BOOKING_NOT_CLAIMABLE'
  | 'STAFF_INACTIVE'
  | 'WRONG_DEPARTMENT';

export type AssignBookingErrorCode =
  | 'STAFF_NOT_AT_CENTER'
  | 'CROSS_DEPARTMENT_NOT_ALLOWED'
  | 'BOOKING_NOT_ASSIGNABLE'
  | 'STAFF_INACTIVE';

export interface AssignBookingRequest {
  staffId: number;
  reason?: string;
  crossDepartmentOverride?: boolean;
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
  tagTypes: ['Booking', 'RerouteHistory', 'StaffPerformance'],
  endpoints: (builder) => ({
    getBookingQueue: builder.query<BookingsResponse, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) => ({
        url: 'bookings/queue',
        params: { page, size },
      }),
      transformResponse: (raw: any): BookingsResponse => ({
        content: raw.content ?? [],
        totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
        totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
        number: raw.page?.number ?? raw.number ?? 0,
        size: raw.page?.size ?? raw.size ?? 0,
        first: raw.first ?? true,
        last: raw.last ?? true,
        noDepartmentMembership: raw.noDepartmentMembership ?? false,
      }),
      providesTags: ['Booking'],
    }),
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
      query: ({ centerId, page, size, status }) => ({
        url: `bookings/center/${centerId}`,
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
    getCenterBookingStats: builder.query<BookingStats, void>({
      query: () => 'bookings/center/stats',
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
    claimBooking: builder.mutation<Booking, number>({
      query: (id) => ({ url: `bookings/${id}/claim`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'Booking',
        { type: 'Booking', id },
        'StaffPerformance',
      ],
    }),
    assignBookingManually: builder.mutation<Booking, { bookingId: number; body: AssignBookingRequest }>({
      query: ({ bookingId, body }) => ({
        url: `bookings/${bookingId}/assign`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { bookingId }) => [
        'Booking',
        { type: 'Booking', id: bookingId },
        'StaffPerformance',
      ],
    }),
    // Spec 022 — re-route. Invalidates booking detail + this booking's reroute-history.
    // (Queue invalidation is implicit via the 'Booking' tag for now.)
    rerouteBooking: builder.mutation<RerouteResponse, { id: number; body: RerouteRequest }>({
      query: ({ id, body }) => ({
        url: `bookings/${id}/reroute`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Booking',
        { type: 'Booking', id },
        { type: 'RerouteHistory', id },
      ],
    }),
    getBookingRerouteHistory: builder.query<RerouteAudit[], number>({
      query: (id) => `bookings/${id}/reroute-history`,
      providesTags: (_result, _error, id) => [{ type: 'RerouteHistory', id }],
    }),
  }),
});

export const {
  useGetBookingQueueQuery,
  useGetBookingsQuery,
  useGetCenterBookingsQuery,
  useGetBookingByIdQuery,
  useGetBookingStatsQuery,
  useGetCenterBookingStatsQuery,
  useConfirmBookingMutation,
  useStartServiceMutation,
  useCompleteBookingMutation,
  useCancelBookingMutation,
  useClaimBookingMutation,
  useAssignBookingManuallyMutation,
  useRerouteBookingMutation,
  useGetBookingRerouteHistoryQuery,
} = bookingsApi;
