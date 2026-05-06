import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import { RootState } from '../index';
import type {
  CenterMembership,
  MembershipSummary,
  InvitationDetails,
  InviteStaffRequest,
} from '@/types/staff';
import type { ReviewsResponse } from './reviewsApi';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface StaffDashboardResponse {
  assignedTotal: number;
  assignedActive: number;
  assignedCompleted: number;
  assignedThisWeek: number;
  avgRating: number;
}

export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Staff'],
  endpoints: (builder) => ({
    getCenterStaff: builder.query<PageResponse<CenterMembership>, { page?: number; size?: number; status?: string }>({
      query: ({ page = 0, size = 20, status } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          size: size.toString(),
        });
        if (status) params.append('status', status);
        return `centers/my/staff?${params.toString()}`;
      },
      transformResponse: (raw: any): PageResponse<CenterMembership> => ({
        content: raw.content ?? [],
        totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
        totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
        number: raw.page?.number ?? raw.number ?? 0,
        size: raw.page?.size ?? raw.size ?? 0,
      }),
      providesTags: ['Staff'],
    }),

    inviteStaff: builder.mutation<{ invitationId: number }, InviteStaffRequest>({
      query: (body) => ({ url: 'centers/my/staff/invite', method: 'POST', body }),
      invalidatesTags: ['Staff'],
    }),

    updateMembershipRole: builder.mutation<CenterMembership, { membershipId: number; role: string }>({
      query: ({ membershipId, role }) => ({
        url: `centers/my/staff/${membershipId}`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['Staff'],
    }),

    removeMember: builder.mutation<void, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),

    suspendMember: builder.mutation<CenterMembership, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}/suspend`,
        method: 'PUT',
      }),
      invalidatesTags: ['Staff'],
    }),

    reinstateMember: builder.mutation<CenterMembership, number>({
      query: (membershipId) => ({
        url: `centers/my/staff/${membershipId}/reinstate`,
        method: 'PUT',
      }),
      invalidatesTags: ['Staff'],
    }),

    leaveCenter: builder.mutation<void, void>({
      query: () => ({ url: 'centers/my/staff/leave', method: 'DELETE' }),
      invalidatesTags: ['Staff'],
    }),

    getInvitationDetails: builder.query<InvitationDetails, string>({
      query: (token) => `invitations/${token}`,
    }),

    acceptInvitation: builder.mutation<CenterMembership, string>({
      query: (token) => ({ url: `invitations/${token}/accept`, method: 'POST' }),
      invalidatesTags: ['Staff'],
    }),

    declineInvitation: builder.mutation<void, string>({
      query: (token) => ({ url: `invitations/${token}/decline`, method: 'POST' }),
    }),

    resendInvitation: builder.mutation<{ invitationId: number }, number>({
      query: (invitationId) => ({
        url: `centers/my/staff/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: ['Staff'],
    }),

    getMyMemberships: builder.query<MembershipSummary[], void>({
      query: () => 'users/me/memberships',
      providesTags: ['Staff'],
    }),

    getStaffDashboard: builder.query<StaffDashboardResponse, void>({
      query: () => 'bookings/stats',
      transformResponse: (raw: any): StaffDashboardResponse => ({
        assignedTotal: raw.total ?? 0,
        assignedActive: (raw.pending ?? 0) + (raw.confirmed ?? 0) + (raw.inProgress ?? 0),
        assignedCompleted: raw.completed ?? 0,
        assignedThisWeek: 0,
        avgRating: 0,
      }),
      providesTags: ['Staff'],
    }),

    getMyAssignedReviews: builder.query<ReviewsResponse, { page?: number; size?: number }>({
      query: (params) => ({ url: 'reviews/center', params }),
      transformResponse: (raw: any): ReviewsResponse => ({
        content: raw.content ?? [],
        totalElements: raw.page?.totalElements ?? raw.totalElements ?? 0,
        totalPages: raw.page?.totalPages ?? raw.totalPages ?? 0,
        number: raw.page?.number ?? raw.number ?? 0,
        size: raw.page?.size ?? raw.size ?? 0,
        first: raw.first ?? true,
        last: raw.last ?? true,
      }),
      providesTags: ['Staff'],
    }),
  }),
});

export const {
  useGetCenterStaffQuery,
  useInviteStaffMutation,
  useUpdateMembershipRoleMutation,
  useRemoveMemberMutation,
  useSuspendMemberMutation,
  useReinstateMemberMutation,
  useLeaveCenterMutation,
  useGetInvitationDetailsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useResendInvitationMutation,
  useGetMyMembershipsQuery,
  useGetStaffDashboardQuery,
  useGetMyAssignedReviewsQuery,
} = staffApi;
