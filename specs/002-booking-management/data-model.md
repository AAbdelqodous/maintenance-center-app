# Data Model: Phase 2 — Booking Management

**Branch**: `phase-2-booking-management` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## TypeScript Types

### Booking Enums

```typescript
// store/api/bookingsApi.ts
export enum BookingStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED  = 'REJECTED',
}

export enum ServiceType {
  CAR           = 'CAR',
  ELECTRONICS   = 'ELECTRONICS',
  HOME_APPLIANCE = 'HOME_APPLIANCE',
  RESTAURANT    = 'RESTAURANT',
  HOTEL         = 'HOTEL',
  OTHER         = 'OTHER',
}

export enum PaymentMethod {
  CASH  = 'CASH',
  KNET  = 'KNET',
  CARD  = 'CARD',
}

export enum PaymentStatus {
  PENDING  = 'PENDING',
  PAID     = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum CancelledBy {
  CUSTOMER = 'CUSTOMER',
  CENTER   = 'CENTER',
}
```

### Booking Response

```typescript
// store/api/bookingsApi.ts
export interface BookingResponse {
  id: number;
  customerName: string;
  customerPhone?: string;
  serviceType: ServiceType;
  bookingStatus: BookingStatus;      // NOT "status"
  bookingDate: string;               // "YYYY-MM-DD"  NOT "scheduledDate"
  bookingTime: string;               // "HH:mm:ss"    NOT "scheduledTime"
  notes?: string;
  rejectionReason?: string;
  cancelledBy?: CancelledBy;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  createdAt: string;
}

export interface BookingStats {
  pendingCount: number;
  activeCount: number;
  completedCount: number;
  totalReviews: number;
  averageRating: number;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  reason?: string;    // required when rejecting
  notes?: string;
}
```

### Paginated Response Wrapper

```typescript
// Shared shape — backend wraps all paginated responses
interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-indexed)
  size: number;
}
```

---

## RTK Query Slice — `store/api/bookingsApi.ts`

```typescript
import { baseApi } from './baseApi';

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBookings: builder.query<
      { bookings: BookingResponse[]; totalElements: number },
      { page: number; size: number; status?: BookingStatus }
    >({
      query: ({ page, size, status }) => ({
        url: 'bookings',
        params: { page, size, ...(status ? { status } : {}) },
      }),
      transformResponse: (raw: PageResponse<BookingResponse>) => ({
        bookings: raw.content,
        totalElements: raw.totalElements,
      }),
      providesTags: ['Bookings'],
    }),

    getBookingById: builder.query<BookingResponse, number>({
      query: (id) => `bookings/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Bookings', id }],
    }),

    getBookingStats: builder.query<BookingStats, void>({
      query: () => 'bookings/stats',
      providesTags: ['Bookings'],
    }),

    updateBookingStatus: builder.mutation<
      BookingResponse,
      { id: number; data: UpdateBookingStatusRequest }
    >({
      query: ({ id, data }) => ({
        url: `bookings/${id}/status`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Bookings', id },
        'Bookings',
      ],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useGetBookingStatsQuery,
  useUpdateBookingStatusMutation,
} = bookingsApi;
```

---

## Component State Patterns

### Booking List (`bookings/index.tsx`)

```typescript
// Filter tab state
const [activeStatus, setActiveStatus] = useState<BookingStatus | undefined>(undefined);
// Page state for pagination
const [page, setPage] = useState(0);
const [allBookings, setAllBookings] = useState<BookingResponse[]>([]);

// Each status change resets to page 0 — RTK Query caches per (page, status) key
const { data, isFetching } = useGetBookingsQuery({
  page,
  size: 20,
  status: activeStatus,
});
```

### Overdue Detection (for PENDING bookings only)

```typescript
const isOverdue = (booking: BookingResponse): boolean => {
  if (booking.bookingStatus !== BookingStatus.PENDING) return false;
  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
  return bookingDateTime < new Date();
};
```

### Reject Bottom Sheet State (`bookings/[id].tsx`)

```typescript
const [rejectModalVisible, setRejectModalVisible] = useState(false);
const [selectedReason, setSelectedReason] = useState<string | null>(null);

// Rendered as React Native Modal with animationType="slide" and transparent={true}
```

---

## i18n Key Structure

```json
{
  "bookings": {
    "title": "Bookings",
    "all": "All",
    "pending": "Pending",
    "confirmed": "Confirmed",
    "inProgress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "rejected": "Rejected",
    "overdue": "Overdue",
    "noBookings": "No bookings found",
    "customer": "Customer",
    "service": "Service",
    "date": "Date",
    "time": "Time",
    "notes": "Notes",
    "accept": "Accept",
    "reject": "Reject",
    "startProgress": "Mark In Progress",
    "complete": "Mark Completed",
    "confirmAccept": "Accept this booking?",
    "confirmProgress": "Mark this booking as in progress?",
    "confirmComplete": "Mark this booking as completed?",
    "rejectTitle": "Select Rejection Reason",
    "rejectConfirm": "Confirm Rejection",
    "rejectionReasons": {
      "fullyBooked": "Fully booked for this time slot",
      "outsideServiceArea": "Outside service area",
      "serviceUnavailable": "Service not available",
      "customerNoShow": "Customer no-show",
      "other": "Other reason"
    }
  }
}
```
