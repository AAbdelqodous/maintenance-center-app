import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import type { RootState } from '@/store';
import type {
  CenterBalances,
  DepositConfig,
  Payout,
  PayoutAccount,
  RefundRequest,
  RefundResult,
  RequestPayoutRequest,
  Settlement,
  UpdateDepositConfigRequest,
  UpsertPayoutAccountRequest,
} from '@/types/payments';
import { centerPaymentsMockBaseQuery } from './centerPaymentsMock';

// Spec 023 — Payments, Earnings & Payouts (owner side). Reuses the backend `payment` domain shared
// with customer spec 007. Endpoints were HTTP-contract-validated (PaymentHttpContractTest). The
// escrow "mark complete" step is folded into booking completion — there is no mark-complete call.
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
  process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? centerPaymentsMockBaseQuery : realBaseQuery;

export const centerPaymentsApi = createApi({
  reducerPath: 'centerPaymentsApi',
  baseQuery,
  tagTypes: ['Earnings', 'Settlement', 'DepositConfig', 'PayoutAccount', 'Payouts'],
  endpoints: (builder) => ({
    getEarnings: builder.query<CenterBalances, void>({
      query: () => 'centers/my/earnings',
      providesTags: ['Earnings'],
    }),

    getSettlement: builder.query<Settlement, number>({
      query: (bookingId) => `bookings/${bookingId}/settlement`,
      providesTags: (_r, _e, bookingId) => [{ type: 'Settlement', id: bookingId }],
    }),

    refundBooking: builder.mutation<RefundResult, { bookingId: number; body: RefundRequest }>({
      query: ({ bookingId, body }) => ({ url: `bookings/${bookingId}/refund`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { bookingId }) => [{ type: 'Settlement', id: bookingId }, 'Earnings'],
    }),

    getDepositConfig: builder.query<DepositConfig, void>({
      query: () => 'centers/my/deposit-config',
      providesTags: ['DepositConfig'],
    }),

    updateDepositConfig: builder.mutation<DepositConfig, UpdateDepositConfigRequest>({
      query: (body) => ({ url: 'centers/my/deposit-config', method: 'PUT', body }),
      invalidatesTags: ['DepositConfig'],
    }),

    getPayoutAccount: builder.query<PayoutAccount, void>({
      query: () => 'centers/my/payout-account',
      providesTags: ['PayoutAccount'],
    }),

    upsertPayoutAccount: builder.mutation<PayoutAccount, UpsertPayoutAccountRequest>({
      query: (body) => ({ url: 'centers/my/payout-account', method: 'POST', body }),
      invalidatesTags: ['PayoutAccount'],
    }),

    getPayouts: builder.query<Payout[], void>({
      query: () => 'centers/my/payouts',
      providesTags: ['Payouts'],
    }),

    requestPayout: builder.mutation<Payout, RequestPayoutRequest>({
      query: (body) => ({ url: 'centers/my/payouts', method: 'POST', body }),
      invalidatesTags: ['Payouts', 'Earnings'],
    }),
  }),
});

export const {
  useGetEarningsQuery,
  useGetSettlementQuery,
  useRefundBookingMutation,
  useGetDepositConfigQuery,
  useUpdateDepositConfigMutation,
  useGetPayoutAccountQuery,
  useUpsertPayoutAccountMutation,
  useGetPayoutsQuery,
  useRequestPayoutMutation,
} = centerPaymentsApi;
