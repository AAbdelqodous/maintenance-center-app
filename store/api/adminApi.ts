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
  totalCenterOwners: number | null;
  approvedCenters: number | null;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function flattenPage<T>(raw: any): PageResponse<T> {
  return {
    content: raw.content ?? [],
    totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
    totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
    number: raw.page?.number ?? raw.number ?? 0,
    size: raw.page?.size ?? raw.size ?? 0,
  };
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
      transformResponse: (raw: any) => flattenPage<AdminUserResponse>(raw),
      providesTags: ['PendingUsers'],
    }),
    getAllUsers: builder.query<PageResponse<AdminUserResponse>, { page?: number; size?: number; type?: string }>({
      query: ({ page = 0, size = 20, type } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (type) params.append('type', type);
        return `admin/users?${params}`;
      },
      transformResponse: (raw: any) => flattenPage<AdminUserResponse>(raw),
      providesTags: ['AllUsers'],
    }),
    getAdminStats: builder.query<AdminStats, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const [pending, owners, centers] = await Promise.all([
          baseQuery('admin/users/pending?page=0&size=1'),
          baseQuery('admin/users?page=0&size=1&type=OWNER'),
          baseQuery('admin/centers?page=0&size=1'),
        ]);
        if (pending.error) return { error: pending.error };
        const p = pending.data as any;
        const o = owners.data as any;
        const c = centers.data as any;
        const pendingCount = p?.page?.totalElements ?? p?.totalElements ?? 0;
        const ownerCount = owners.error ? null : (o?.page?.totalElements ?? o?.totalElements ?? 0);
        const centerCount = centers.error ? null : (c?.page?.totalElements ?? c?.totalElements ?? 0);
        return {
          data: {
            pendingApprovals: pendingCount,
            totalCenterOwners: ownerCount,
            approvedCenters: centerCount,
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
