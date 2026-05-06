import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import { RootState } from '../index';

export interface UserAddress {
  cityAr?: string;
  cityEn?: string;
  districtAr?: string;
  districtEn?: string;
  streetAr?: string;
  streetEn?: string;
  governorateAr?: string;
  governorateEn?: string;
}

export interface UserResponse {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  language?: 'ARABIC' | 'ENGLISH';
  userType: string;
  approvalStatus?: string;
  address?: UserAddress;
}

export interface UpdateUserRequest {
  firstname: string;
  lastname: string;
  phone?: string;
  dateOfBirth?: string;
  language?: 'ARABIC' | 'ENGLISH';
  address?: UserAddress;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUserMe: builder.query<UserResponse, void>({
      query: () => 'users/me',
      providesTags: ['User'],
    }),
    updateUserMe: builder.mutation<UserResponse, UpdateUserRequest>({
      query: (body) => ({ url: 'users/me', method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation<void, ChangePasswordRequest>({
      query: (body) => ({ url: 'users/me/password', method: 'PUT', body }),
    }),
  }),
});

export const {
  useGetUserMeQuery,
  useUpdateUserMeMutation,
  useChangePasswordMutation,
} = userApi;
