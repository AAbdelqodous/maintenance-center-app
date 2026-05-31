import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import type { RootState } from '@/store';
import type {
  AdvanceLogisticsRequest,
  CenterFulfillmentCapability,
  LogisticsStatus,
  UpdateCapabilityRequest,
} from '@/types/fulfillment';
import { fulfillmentMockBaseQuery } from './fulfillmentMock';

// Spec 008 — center-side fulfillment: advance a pickup/at-home booking's logistics leg. The
// customer-facing GET /bookings/{id}/logistics checks customer ownership, so the center drives the
// legs through the dedicated POST endpoint (UPDATE_WORK_STAGE) which returns the full LogisticsStatus.
const realBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.session?.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQuery =
  process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? fulfillmentMockBaseQuery : realBaseQuery;

export const fulfillmentApi = createApi({
  reducerPath: 'fulfillmentApi',
  baseQuery,
  tagTypes: ['Logistics', 'Capability'],
  endpoints: (builder) => ({
    advanceLogistics: builder.mutation<
      LogisticsStatus,
      { bookingId: number; body?: AdvanceLogisticsRequest }
    >({
      query: ({ bookingId, body }) => ({
        url: `centers/my/bookings/${bookingId}/logistics/advance`,
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: (_r, _e, { bookingId }) => [{ type: 'Logistics', id: bookingId }],
    }),

    getMyCapability: builder.query<CenterFulfillmentCapability, void>({
      query: () => 'centers/my/fulfillment',
      providesTags: ['Capability'],
    }),

    updateMyCapability: builder.mutation<CenterFulfillmentCapability, UpdateCapabilityRequest>({
      query: (body) => ({ url: 'centers/my/fulfillment', method: 'PUT', body }),
      invalidatesTags: ['Capability'],
    }),
  }),
});

export const {
  useAdvanceLogisticsMutation,
  useGetMyCapabilityQuery,
  useUpdateMyCapabilityMutation,
} = fulfillmentApi;
