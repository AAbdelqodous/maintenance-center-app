import { useState, useEffect, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGetCenterBookingsQuery, BookingStatus } from '@/store/api/bookingsApi';
import { useGetMyCenterQuery } from '@/store/api/centerApi';
import { useGetReviewsQuery } from '@/store/api/reviewsApi';
import { useGetConversationsQuery } from '@/store/api/chatApi';
import { useAppSelector } from '@/store';
import { AttentionItem } from '@/types/attention';

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
];

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

// T008: business hours helper
function isWithinBusinessHours(
  now: Date,
  openingTime: string | undefined,
  closingTime: string | undefined,
): boolean {
  if (!openingTime || !closingTime) return true;
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  // Convert to Asia/Kuwait (UTC+3)
  const kuwaitNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const nowMinutes = kuwaitNow.getUTCHours() * 60 + kuwaitNow.getUTCMinutes();
  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

function parseScheduledTime(bookingDate: string, bookingTime: string): Date {
  return new Date(`${bookingDate}T${bookingTime}`);
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatRelativeTime(date: Date, now: Date): string {
  const ms = now.getTime() - date.getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function useAttentionItems() {
  const isFocused = useIsFocused();
  const pollingInterval = isFocused ? 60_000 : 0;
  const { t } = useTranslation();
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const activeCenterId = useAppSelector((state) => state.center.activeCenterId);

  // T004: booking query
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
  } = useGetCenterBookingsQuery(
    { centerId: activeCenterId!, page: 0, size: 50 },
    { skip: !activeCenterId, pollingInterval },
  );

  const { data: centerData } = useGetMyCenterQuery(undefined, { skip: !activeCenterId });

  // T013: reviews query
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
  } = useGetReviewsQuery(
    { page: 0, size: 20 },
    { skip: !activeCenterId, pollingInterval },
  );

  // T012: conversations query
  const {
    data: conversations,
    isLoading: chatsLoading,
    isError: chatsError,
    refetch: refetchChats,
  } = useGetConversationsQuery(undefined, { skip: !activeCenterId, pollingInterval } as any);

  const isLoading = bookingsLoading || reviewsLoading || chatsLoading;
  const isError = bookingsError || reviewsError || chatsError;

  useEffect(() => {
    if (!isLoading && !isError) {
      setLastCheckedAt(new Date());
    }
  }, [isLoading, isError, bookingsData, reviewsData, conversations]);

  const refetch = useCallback(() => {
    refetchBookings();
    refetchReviews();
    refetchChats();
  }, [refetchBookings, refetchReviews, refetchChats]);

  const items: AttentionItem[] = [];
  const now = new Date();

  const bookings = bookingsData?.content ?? [];
  const overdueIds = new Set<number>();

  // T009: overdue booking derivation
  for (const booking of bookings) {
    if (TERMINAL_STATUSES.includes(booking.bookingStatus as BookingStatus)) continue;
    const scheduled = parseScheduledTime(booking.bookingDate, booking.bookingTime);
    if (scheduled >= now) continue;
    const overdueMs = now.getTime() - scheduled.getTime();
    overdueIds.add(booking.id);
    const assignedTo = booking.assignedStaffName ?? t('attention.unassigned');
    items.push({
      id: `OVERDUE_BOOKING-${booking.id}`,
      category: 'OVERDUE_BOOKING',
      severity: overdueMs > TWO_HOURS_MS ? 'HIGH' : 'MEDIUM',
      title: t('attention.bookingTitle', { id: booking.id }),
      subtitle: t('attention.overdue.subtitle', { duration: formatDuration(overdueMs), assignedTo }),
      occurredAt: scheduled,
      sourceId: booking.id,
      navigateTo: `/bookings/${booking.id}`,
    });
  }

  // T010: stalled booking derivation (gated on business hours)
  const withinBusinessHours = isWithinBusinessHours(now, centerData?.openingTime, centerData?.closingTime);
  if (withinBusinessHours) {
    for (const booking of bookings) {
      if (!ACTIVE_STATUSES.includes(booking.bookingStatus as BookingStatus)) continue;
      if (overdueIds.has(booking.id)) continue;
      const updatedAt = new Date(booking.updatedAt);
      const stalledMs = now.getTime() - updatedAt.getTime();
      if (stalledMs <= TWO_HOURS_MS) continue;
      const assignedTo = booking.assignedStaffName ?? t('attention.unassigned');
      items.push({
        id: `STALLED_BOOKING-${booking.id}`,
        category: 'STALLED_BOOKING',
        severity: 'MEDIUM',
        title: t('attention.bookingTitle', { id: booking.id }),
        subtitle: t('attention.stalled.subtitle', { duration: formatDuration(stalledMs), assignedTo }),
        occurredAt: updatedAt,
        sourceId: booking.id,
        navigateTo: `/bookings/${booking.id}`,
      });
    }
  }

  // T011: unassigned booking derivation
  for (const booking of bookings) {
    if (booking.bookingStatus !== BookingStatus.CONFIRMED) continue;
    if (booking.assignedMembershipId !== null) continue;
    const scheduled = parseScheduledTime(booking.bookingDate, booking.bookingTime);
    const msUntilStart = scheduled.getTime() - now.getTime();
    if (msUntilStart <= 0 || msUntilStart > TWO_HOURS_MS) continue;
    items.push({
      id: `UNASSIGNED_BOOKING-${booking.id}`,
      category: 'UNASSIGNED_BOOKING',
      severity: msUntilStart < THIRTY_MIN_MS ? 'HIGH' : 'MEDIUM',
      title: t('attention.bookingTitle', { id: booking.id }),
      subtitle: t('attention.unassignedBooking.subtitle', { timeUntil: formatDuration(msUntilStart) }),
      occurredAt: scheduled,
      sourceId: booking.id,
      navigateTo: `/bookings/${booking.id}`,
    });
  }

  // T013: low-rated review derivation
  for (const review of reviewsData?.content ?? []) {
    if (review.rating > 3) continue;
    if (review.ownerReply) continue;
    items.push({
      id: `LOW_RATED_REVIEW-${review.id}`,
      category: 'LOW_RATED_REVIEW',
      severity: review.rating <= 2 ? 'HIGH' : 'MEDIUM',
      title: `${review.userFirstname} ${review.userLastname}`,
      subtitle: t('attention.review.subtitle', {
        rating: review.rating,
        time: formatRelativeTime(new Date(review.createdAt), now),
      }),
      occurredAt: new Date(review.createdAt),
      sourceId: review.id,
      navigateTo: '/(tabs)/reviews/',
    });
  }

  // T012: unanswered chat derivation
  for (const conv of conversations ?? []) {
    if (conv.unreadCount <= 0) continue;
    if (!conv.lastMessageAt) continue;
    const lastMsg = new Date(conv.lastMessageAt);
    if (now.getTime() - lastMsg.getTime() <= THIRTY_MIN_MS) continue;
    items.push({
      id: `UNANSWERED_CHAT-${conv.id}`,
      category: 'UNANSWERED_CHAT',
      severity: 'MEDIUM',
      title: conv.customerName,
      subtitle: t('attention.chat.subtitle', {
        time: formatRelativeTime(lastMsg, now),
        count: conv.unreadCount,
      }),
      occurredAt: lastMsg,
      sourceId: conv.id,
      navigateTo: `/(tabs)/chat/${conv.id}`,
    });
  }

  // Sort: HIGH before MEDIUM, then oldest first within same severity
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
    return a.occurredAt.getTime() - b.occurredAt.getTime();
  });

  return { items, isLoading, isError, lastCheckedAt, refetch };
}
