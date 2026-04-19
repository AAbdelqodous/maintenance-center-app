# Data Model: Phase 5 — Review Management

**Branch**: `phase-5-review-management` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

```typescript
// store/api/reviewsApi.ts
export interface ReviewResponse {
  id: number;
  userFirstname: string;      // NOT "customerName"
  userLastname: string;
  rating: number;             // 1–5
  comment?: string;
  ownerReply?: string;        // NOT "centerReply" or "reply"; maps from Review.centerResponse
  createdAt: string;
}

export interface ReplyRequest {
  reply: string;
}
```

---

## RTK Query Slice — `store/api/reviewsApi.ts`

```typescript
import { baseApi } from './baseApi';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCenterReviews: builder.query<
      { reviews: ReviewResponse[]; totalElements: number },
      { page: number; size: number }
    >({
      query: ({ page, size }) => ({
        url: 'reviews/center',
        params: { page, size },
      }),
      transformResponse: (raw: { content: ReviewResponse[]; totalElements: number }) => ({
        reviews: raw.content,
        totalElements: raw.totalElements,
      }),
      providesTags: ['Reviews'],
    }),

    replyToReview: builder.mutation<ReviewResponse, { id: number; reply: string }>({
      query: ({ id, reply }) => ({
        url: `reviews/${id}/reply`,
        method: 'POST',
        body: { reply },
      }),
      invalidatesTags: ['Reviews'],
    }),
  }),
});

export const {
  useGetCenterReviewsQuery,
  useReplyToReviewMutation,
} = reviewsApi;
```

---

## Shared Component — `components/ui/RatingStars.tsx`

```typescript
interface RatingStarsProps {
  rating: number;   // 1–5 (float accepted, rounds for display)
  size?: number;    // default 16
}

// Renders filled/half/empty star icons based on rating value
// Used in ReviewCard and dashboard stats
```

---

## Component State Patterns

### Review List (`reviews/index.tsx`)

```typescript
const [page, setPage] = useState(0);
const [allReviews, setAllReviews] = useState<ReviewResponse[]>([]);

const { data, isFetching } = useGetCenterReviewsQuery({ page, size: 20 });

// Append on next page, replace on pull-to-refresh (page === 0)
```

### Inline Reply (`components/reviews/ReviewCard.tsx`)

```typescript
const [replyText, setReplyText] = useState('');
const [isReplying, setIsReplying] = useState(false);
const [replyToReview, { isLoading }] = useReplyToReviewMutation();

// If review.ownerReply exists → show read-only reply, no input
// If not → show "Reply" button that expands inline TextInput
```

---

## i18n Key Structure

```json
{
  "reviews": {
    "title": "Reviews",
    "rating": "Rating",
    "noReviews": "No reviews yet",
    "reply": "Reply",
    "replyPlaceholder": "Write your reply...",
    "submitReply": "Submit Reply",
    "yourReply": "Your Reply",
    "anonymous": "Anonymous"
  }
}
```
