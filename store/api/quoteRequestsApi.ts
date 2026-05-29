import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import type { RootState } from '@/store';
import type {
  InboxItem,
  LeadMetrics,
  LeadPreferences,
  QuoteRequestDetail,
  QuoteResponse,
  SubmitQuoteRequest,
} from '@/types/quoteRequests';
import { quoteRequestsMockBaseQuery } from './quoteRequestsMock';

// Spec 024 — Quote Requests Inbox (owner side). Shares the backend `quoterequest` domain
// with customer spec 009. Responses are sealed (this center sees only its own quote).
const realBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.session?.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Dependency-free dev mock (no backend / no MSW) when EXPO_PUBLIC_USE_MOCKS=true.
const baseQuery =
  process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? quoteRequestsMockBaseQuery : realBaseQuery;

export interface WithdrawResponse {
  id: number;
  status: 'WITHDRAWN';
}

export const quoteRequestsApi = createApi({
  reducerPath: 'quoteRequestsApi',
  baseQuery,
  tagTypes: ['Lead', 'LeadList', 'LeadPreferences', 'LeadMetrics'],
  endpoints: (builder) => ({
    getInbox: builder.query<InboxItem[], void>({
      query: () => 'centers/my/quote-requests',
      providesTags: ['LeadList'],
    }),

    getLead: builder.query<QuoteRequestDetail, number>({
      query: (id) => `quote-requests/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lead' as const, id }],
    }),

    submitQuote: builder.mutation<QuoteResponse, { requestId: number; data: SubmitQuoteRequest }>({
      query: ({ requestId, data }) => ({
        url: `quote-requests/${requestId}/quote`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_r, _e, { requestId }) => [{ type: 'Lead' as const, id: requestId }, 'LeadList'],
    }),

    withdrawQuote: builder.mutation<WithdrawResponse, number>({
      query: (requestId) => ({
        url: `quote-requests/${requestId}/quote`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, requestId) => [{ type: 'Lead' as const, id: requestId }, 'LeadList'],
    }),

    startRequestChat: builder.mutation<{ conversationId: number }, { requestId: number }>({
      query: ({ requestId }) => ({
        url: `quote-requests/${requestId}/chat`,
        method: 'POST',
      }),
    }),

    getLeadPreferences: builder.query<LeadPreferences, void>({
      query: () => 'centers/my/lead-preferences',
      providesTags: ['LeadPreferences'],
    }),

    updateLeadPreferences: builder.mutation<LeadPreferences, LeadPreferences>({
      query: (body) => ({ url: 'centers/my/lead-preferences', method: 'PUT', body }),
      invalidatesTags: ['LeadPreferences'],
    }),

    getLeadMetrics: builder.query<LeadMetrics, void>({
      query: () => 'centers/my/lead-metrics',
      providesTags: ['LeadMetrics'],
    }),
  }),
});

export const {
  useGetInboxQuery,
  useGetLeadQuery,
  useSubmitQuoteMutation,
  useWithdrawQuoteMutation,
  useStartRequestChatMutation,
  useGetLeadPreferencesQuery,
  useUpdateLeadPreferencesMutation,
  useGetLeadMetricsQuery,
} = quoteRequestsApi;
