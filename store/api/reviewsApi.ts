import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/constants/config';
import { RootState } from '../index';

export interface Review {
  id: number;
  customerId: number; customerName: string;
  centerId: number;
  rating: number; comment: string;
  ownerReply?: string;
  createdAt: string;
}

export interface ReviewsResponse {
  content: Review[];
  totalElements: number; totalPages: number;
  size: number; number: number;
  first: boolean; last: boolean;
}

export const reviewsApi = createApi({
  reducerPath: 'reviewsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Review'],
  endpoints: (builder) => ({
    getReviews: builder.query<ReviewsResponse, { page?: number; size?: number }>({
      query: (params) => ({ url: '/reviews/center', params }),
      providesTags: ['Review'],
    }),
    replyToReview: builder.mutation<Review, { id: number; reply: string }>({
      query: ({ id, reply }) => ({ url: `/reviews/${id}/reply`, method: 'POST', body: { reply } }),
      invalidatesTags: ['Review'],
    }),
  }),
});

export const { useGetReviewsQuery, useReplyToReviewMutation } = reviewsApi;
