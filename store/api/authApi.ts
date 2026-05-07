import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface LoginResponse {
  token: string;
  approvalStatus: ApprovalStatus;
}

export interface RegisterOwnerRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: 'auth/authenticate', method: 'POST', body }),
    }),
    registerOwner: builder.mutation<void, RegisterOwnerRequest>({
      query: (body) => ({
        url: 'auth/register',
        method: 'POST',
        body: { ...body, userType: 'OWNER' },
      }),
    }),
    registerStaff: builder.mutation<void, RegisterOwnerRequest>({
      query: (body) => ({
        url: 'auth/register',
        method: 'POST',
        body: { ...body, userType: 'STAFF' },
      }),
    }),
    activateAccount: builder.mutation<void, { token: string }>({
      query: ({ token }) => ({ url: 'auth/activate-account', method: 'GET', params: { token } }),
    }),
    resendOtp: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: 'auth/resend-otp', method: 'POST', body }),
    }),
    forgotPassword: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: 'auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<void, { token: string; newPassword: string }>({
      query: (body) => ({ url: 'auth/reset-password', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterOwnerMutation,
  useRegisterStaffMutation,
  useActivateAccountMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
