import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGetBookingByIdQuery } from '@/store/api/bookingsApi';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { useTranslation } from 'react-i18next';

function StaffBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { data: booking, isLoading } = useGetBookingByIdQuery(Number(id), { skip: !id });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>{t('bookings.notFound')}</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('bookings.customer')}:</Text>
          <Text style={styles.value}>{booking.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('bookings.status')}:</Text>
          <StatusBadge status={booking.bookingStatus} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('bookings.date')}:</Text>
          <Text style={styles.value}>{formatDate(booking.bookingDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('bookings.time')}:</Text>
          <Text style={styles.value}>{booking.bookingTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('bookings.service')}:</Text>
          <Text style={styles.value}>{booking.serviceType}</Text>
        </View>
        {booking.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.label}>{t('bookings.notes')}:</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function StaffBookingDetailWrapper() {
  return (
    <ErrorBoundary>
      <StaffBookingDetailScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  label: { fontSize: 14, color: '#6B7280', minWidth: 70 },
  value: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1 },
  notesBlock: { marginTop: 4 },
  notes: { fontSize: 14, color: '#374151', marginTop: 4, lineHeight: 20 },
});
