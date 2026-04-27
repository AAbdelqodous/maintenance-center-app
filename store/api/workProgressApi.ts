import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';
import type {
  BookingWorkProgress,
  BookingMedia,
  UpdateWorkStageRequest,
} from '../../types/workProgress';

export const workProgressApi = createApi({
  reducerPath: 'workProgressApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['WorkProgress', 'Bookings'],
  endpoints: (builder) => ({
    updateWorkStage: builder.mutation<void, { bookingId: number; data: UpdateWorkStageRequest }>({
      query: ({ bookingId, data }) => ({
        url: `bookings/${bookingId}/work-stage`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkProgress', 'Bookings'],
    }),
    getWorkProgress: builder.query<BookingWorkProgress[], number>({
      query: (bookingId) => `bookings/${bookingId}/work-progress`,
      providesTags: ['WorkProgress'],
    }),
    createWorkProgress: builder.mutation<BookingWorkProgress, { bookingId: number; notes?: string; notesAr?: string; internalNotes?: string; estimatedMinutesRemaining?: number }>({
      query: ({ bookingId, notes, notesAr, internalNotes, estimatedMinutesRemaining }) => {
        const formData = new FormData();
        if (notes) formData.append('notes', notes);
        if (notesAr) formData.append('notesAr', notesAr);
        if (internalNotes) formData.append('internalNotes', internalNotes);
        if (estimatedMinutesRemaining != null) formData.append('estimatedMinutesRemaining', String(estimatedMinutesRemaining));
        return {
          url: `bookings/${bookingId}/work-progress`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['WorkProgress'],
    }),
    getBookingMedia: builder.query<BookingMedia[], number>({
      query: (bookingId) => `bookings/${bookingId}/media`,
      providesTags: ['WorkProgress'],
    }),
    uploadMedia: builder.mutation<BookingMedia, { bookingId: number; formData: FormData }>({
      query: ({ bookingId, formData }) => ({
        url: `bookings/${bookingId}/media`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['WorkProgress'],
    }),
  }),
});

export const {
  useUpdateWorkStageMutation,
  useGetWorkProgressQuery,
  useCreateWorkProgressMutation,
  useGetBookingMediaQuery,
  useUploadMediaMutation,
} = workProgressApi;
