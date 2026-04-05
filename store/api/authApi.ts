import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({
    login: builder.mutation<{ token: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/authenticate', method: 'POST', body }),
    }),
    activateAccount: builder.mutation<void, { token: string }>({
      query: ({ token }) => ({ url: '/auth/activate-account', method: 'GET', params: { token } }),
    }),
    resendOtp: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/resend-otp', method: 'POST', body }),
    }),
  }),
});

export const { useLoginMutation, useActivateAccountMutation, useResendOtpMutation } = authApi;
