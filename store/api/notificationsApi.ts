import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export interface Notification {
  id: number;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  notificationType: string;
  notificationPriority: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  content: Notification[];
  totalElements: number;
  unreadCount: number;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, { page?: number; size?: number }>({
      query: (params) => ({ url: '/notifications', params }),
      providesTags: ['Notification'],
      transformResponse: (response: any) => ({
        content: response.content ?? [],
        totalElements: response.totalElements ?? 0,
        unreadCount: response.unreadCount ?? 0,
      }),
    }),
    markNotificationAsRead: builder.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } = notificationsApi;
