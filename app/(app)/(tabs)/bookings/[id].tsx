import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetBookingByIdQuery, useUpdateBookingStatusMutation, BookingStatus, ServiceType } from '@/store/api/bookingsApi';

export default function BookingDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: booking, isLoading } = useGetBookingByIdQuery(Number(id));
  const [updateStatus, { isLoading: isUpdating }] = useUpdateBookingStatusMutation();

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    Alert.alert(
      t('common.confirm'),
      `${t('bookings.updateStatus')}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            try {
              await updateStatus({ id: Number(id), status: newStatus }).unwrap();
              Alert.alert(t('common.save'), t('bookings.statusUpdated'));
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const STATUS_KEY_MAP: Record<string, string> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'inProgress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  };

  const SERVICE_TYPE_KEY_MAP: Record<string, string> = {
    CAR: 'car',
    ELECTRONICS: 'electronics',
    HOME_APPLIANCE: 'homeAppliance',
  };

  const getServiceTypeTranslation = (serviceType: ServiceType) => {
    const key = `bookings.serviceType.${SERVICE_TYPE_KEY_MAP[serviceType] ?? serviceType.toLowerCase()}`;
    return t(key) || serviceType;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('bookings.noBookings')}</Text>
      </View>
    );
  }

  const canConfirm = booking.bookingStatus === BookingStatus.PENDING;
  const canStart = booking.bookingStatus === BookingStatus.CONFIRMED;
  const canComplete = booking.bookingStatus === BookingStatus.IN_PROGRESS;
  const canCancel = booking.bookingStatus === BookingStatus.PENDING || booking.bookingStatus === BookingStatus.CONFIRMED;

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${t('bookings.bookingId', { id: booking.id })}`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333333" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={[styles.header, isRTL && styles.rowRtl]}>
            <View>
              <Text style={styles.customerName}>{booking.customerName}</Text>
              <Text style={styles.customerPhone}>{booking.customerPhone}</Text>
            </View>
            <Text style={styles.idText}>#{booking.id}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <DetailRow label={t('bookings.service')} value={getServiceTypeTranslation(booking.serviceType)} />
          <DetailRow label={t('bookings.date')} value={formatDate(booking.bookingDate)} />
          <DetailRow label={t('bookings.time')} value={booking.bookingTime} />
          <DetailRow label={t('bookings.status')} value={t(`bookings.${STATUS_KEY_MAP[booking.bookingStatus] ?? booking.bookingStatus.toLowerCase()}`)} />
          {booking.notes && <DetailRow label={t('bookings.notes')} value={booking.notes} />}
        </View>

        {(canConfirm || canStart || canComplete || canCancel) && (
          <View style={styles.actionsContainer}>
            {canConfirm && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => handleStatusUpdate(BookingStatus.CONFIRMED)}
                disabled={isUpdating}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('bookings.confirmBooking')}</Text>
              </TouchableOpacity>
            )}
            {canStart && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => handleStatusUpdate(BookingStatus.IN_PROGRESS)}
                disabled={isUpdating}
              >
                <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('bookings.startService')}</Text>
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleStatusUpdate(BookingStatus.COMPLETED)}
                disabled={isUpdating}
              >
                <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('bookings.completeService')}</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleStatusUpdate(BookingStatus.CANCELLED)}
                disabled={isUpdating}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('bookings.cancelBooking')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  idText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  startButton: {
    backgroundColor: '#9C27B0',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
});
