import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import { RootState } from '../index';
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentMembershipUpdate,
} from '@/types/department';
import type { CenterMembership } from '@/types/staff';

export const departmentsApi = createApi({
  reducerPath: 'departmentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Department'],
  endpoints: (builder) => ({

    getDepartments: builder.query<Department[], void>({
      query: () => 'centers/my/departments',
      providesTags: ['Department'],
    }),

    createDepartment: builder.mutation<Department, CreateDepartmentRequest>({
      query: (body) => ({ url: 'centers/my/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),

    updateDepartment: builder.mutation<Department, { id: number; body: UpdateDepartmentRequest }>({
      query: ({ id, body }) => ({ url: `centers/my/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Department'],
    }),

    deactivateDepartment: builder.mutation<void, number>({
      query: (id) => ({ url: `centers/my/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Department'],
    }),

    getDepartmentMembers: builder.query<CenterMembership[], number>({
      query: (id) => `centers/my/departments/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),

    addDepartmentMember: builder.mutation<Department, { departmentId: number; body: DepartmentMembershipUpdate }>({
      query: ({ departmentId, body }) => ({
        url: `centers/my/departments/${departmentId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        'Department',
        { type: 'Department', id: departmentId },
      ],
    }),

    removeDepartmentMember: builder.mutation<void, { departmentId: number; membershipId: number }>({
      query: ({ departmentId, membershipId }) => ({
        url: `centers/my/departments/${departmentId}/members/${membershipId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        'Department',
        { type: 'Department', id: departmentId },
      ],
    }),

  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentMembersQuery,
  useAddDepartmentMemberMutation,
  useRemoveDepartmentMemberMutation,
} = departmentsApi;
