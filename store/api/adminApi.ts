import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import { RootState } from '../index';

export interface AdminUserResponse {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  userType: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
  rejectionReason?: string;
  enabled: boolean;
  createdDate: string;
}

export interface AdminStats {
  pendingApprovals: number;
  totalCenterOwners: number;
  totalCustomers: number;
  approvedCenters: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['PendingUsers', 'AllUsers', 'AdminStats'],
  endpoints: (builder) => ({
    getPendingUsers: builder.query<PageResponse<AdminUserResponse>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) =>
        `admin/users/pending?page=${page}&size=${size}`,
      providesTags: ['PendingUsers'],
    }),
    getAllUsers: builder.query<PageResponse<AdminUserResponse>, { page?: number; size?: number; type?: string }>({
      query: ({ page = 0, size = 20, type } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (type) params.append('type', type);
        return `admin/users?${params}`;
      },
      providesTags: ['AllUsers'],
    }),
    getAdminStats: builder.query<AdminStats, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const [pending, owners, customers] = await Promise.all([
          baseQuery('admin/users/pending?page=0&size=1'),
          baseQuery('admin/users?page=0&size=1&type=OWNER'),
          baseQuery('admin/users?page=0&size=1&type=CUSTOMER'),
        ]);
        if (pending.error) return { error: pending.error };
        const p = pending.data as PageResponse<AdminUserResponse>;
        const o = owners.data as PageResponse<AdminUserResponse>;
        const c = customers.data as PageResponse<AdminUserResponse>;
        const approvedCenters = (o?.totalElements ?? 0) - (p?.totalElements ?? 0);
        return {
          data: {
            pendingApprovals: p?.totalElements ?? 0,
            totalCenterOwners: o?.totalElements ?? 0,
            totalCustomers: c?.totalElements ?? 0,
            approvedCenters: approvedCenters < 0 ? 0 : approvedCenters,
          },
        };
      },
      providesTags: ['AdminStats', 'PendingUsers'],
    }),
    approveUser: builder.mutation<AdminUserResponse, number>({
      query: (id) => ({ url: `admin/users/${id}/approve`, method: 'PUT' }),
      invalidatesTags: ['PendingUsers', 'AllUsers', 'AdminStats'],
    }),
    rejectUser: builder.mutation<AdminUserResponse, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `admin/users/${id}/reject`,
        method: 'PUT',
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: ['PendingUsers', 'AllUsers', 'AdminStats'],
    }),
  }),
});

export const {
  useGetPendingUsersQuery,
  useGetAllUsersQuery,
  useGetAdminStatsQuery,
  useApproveUserMutation,
  useRejectUserMutation,
} = adminApi;
