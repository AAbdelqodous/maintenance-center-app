import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  CENTER_STAFF = 'CENTER_STAFF',
  SYSTEM = 'SYSTEM',
}

export interface Message {
  id: number; conversationId: number;
  senderId: number; senderType: SenderType; senderName: string;
  content: string; read: boolean; createdAt: string;
}

export interface Conversation {
  id: number; centerId: number;
  centerNameAr: string; centerNameEn: string;
  customerId: number; customerName: string;
  lastMessage?: string; lastMessageAt?: string;
  unreadCount: number;
}

export interface SendMessageRequest {
  centerId: number; content: string;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Conversation', 'Message'],
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => '/conversations/center',
      providesTags: ['Conversation'],
    }),
    getMessages: builder.query<Message[], number>({
      query: (conversationId) => `/conversations/${conversationId}/messages`,
      providesTags: (result, error, id) => [{ type: 'Message', id }],
    }),
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: (body) => ({ url: '/conversations/messages', method: 'POST', body }),
      invalidatesTags: ['Conversation'],
    }),
    markConversationAsRead: builder.mutation<void, number>({
      query: (conversationId) => ({ url: `/conversations/${conversationId}/read`, method: 'PUT' }),
      invalidatesTags: ['Conversation'],
    }),
  }),
});

export const { useGetConversationsQuery, useGetMessagesQuery, useSendMessageMutation, useMarkConversationAsReadMutation } = chatApi;
