import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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

  const [showRejectionSheet, setShowRejectionSheet] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const REJECTION_REASONS = ['fullyBooked', 'serviceNotAvailable', 'outsideServiceArea', 'other'] as const;

  const isOverdue = () => {
    if (!booking || booking.status !== BookingStatus.PENDING) return false;
    const scheduledDateTime = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
    return scheduledDateTime < new Date();
  };

  const handleStatusUpdate = async (newStatus: BookingStatus, reason?: string) => {
    Alert.alert(
      t('common.confirm'),
      `${t('bookings.updateStatus')}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            try {
              await updateStatus({ id: Number(id), status: newStatus, reason }).unwrap();
              Alert.alert(t('common.save'), t('bookings.statusUpdated'));
              if (newStatus === BookingStatus.CANCELLED && reason) {
                setShowRejectionSheet(false);
                setSelectedReason(null);
                setCustomReason('');
              }
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    setShowRejectionSheet(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedReason) {
      Alert.alert(t('common.error'), t('bookings.selectReason'));
      return;
    }
    if (selectedReason === 'other' && !customReason.trim()) {
      Alert.alert(t('common.error'), t('bookings.enterReason'));
      return;
    }
    const reason = selectedReason === 'other' ? customReason : t(`bookings.${selectedReason}`);
    handleStatusUpdate(BookingStatus.CANCELLED, reason);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getServiceTypeTranslation = (serviceType: ServiceType) => {
    const key = `bookings.serviceType.${serviceType.toLowerCase()}`;
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

  const canConfirm = booking.status === BookingStatus.PENDING;
  const canStart = booking.status === BookingStatus.CONFIRMED;
  const canComplete = booking.status === BookingStatus.IN_PROGRESS;
  const canCancel = booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED;
  const isBookingOverdue = isOverdue();

  const getPaymentMethodTranslation = (method: string) => {
    if (!method) return '-';
    const key = `bookings.paymentMethods.${method.toLowerCase()}`;
    return t(key) || method;
  };

  const getPaymentStatusTranslation = (status: string) => {
    if (!status) return '-';
    const key = `bookings.paymentStatus.${status.toLowerCase()}`;
    return t(key) || status;
  };

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const RejectionReasonOption = ({ reason }: { reason: string }) => {
    const isSelected = selectedReason === reason;
    return (
      <TouchableOpacity
        style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
        onPress={() => setSelectedReason(reason)}
      >
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]} />
        <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
          {t(`bookings.${reason}`)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${t('bookings.bookingId', { id: booking.id })}`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#333333" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.content}>
        {booking.status === BookingStatus.CANCELLED && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="information-circle" size={16} color="#FFFFFF" />
            <Text style={styles.cancelledBannerText}>{t('bookings.customerCancelled')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={[styles.header, isRTL && styles.rowRtl]}>
            <View>
              <Text style={styles.customerName}>{booking.customerName}</Text>
              {booking.customerPhone ? (
                <Text style={styles.customerPhone}>{booking.customerPhone}</Text>
              ) : null}
              {isBookingOverdue && (
                <View style={styles.overdueBadge}>
                  <Ionicons name="warning" size={12} color="#FFFFFF" />
                  <Text style={styles.overdueText}>{t('bookings.overdue')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.idText}>#{booking.id}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <DetailRow label={t('bookings.service')} value={getServiceTypeTranslation(booking.serviceType)} />
          <DetailRow label={t('bookings.date')} value={formatDate(booking.scheduledDate)} />
          <DetailRow label={t('bookings.time')} value={booking.scheduledTime} />
          <DetailRow label={t('bookings.status')} value={t(`bookings.${booking.status.toLowerCase()}`)} />
          <DetailRow label={t('bookings.paymentMethod')} value={getPaymentMethodTranslation(booking.paymentMethod || '')} />
          <DetailRow label={t('bookings.paymentStatus')} value={getPaymentStatusTranslation(booking.paymentStatus || '')} />
          {booking.notes && <DetailRow label={t('bookings.notes')} value={booking.notes} />}
        </View>

        {(canConfirm || canStart || canComplete || canCancel) && (
          <View style={styles.actionsContainer}>
            {canConfirm && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleStatusUpdate(BookingStatus.CONFIRMED)}
                  disabled={isUpdating}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>{t('bookings.confirmBooking')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={isUpdating}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>{t('bookings.rejectBooking')}</Text>
                </TouchableOpacity>
              </>
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
            {canCancel && !canConfirm && (
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

      <Modal
        visible={showRejectionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectionSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowRtl]}>
              <Text style={styles.modalTitle}>{t('bookings.rejectReason')}</Text>
              <TouchableOpacity onPress={() => setShowRejectionSheet(false)}>
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reasonsList}>
              {REJECTION_REASONS.map((reason) => (
                <RejectionReasonOption key={reason} reason={reason} />
              ))}
            </ScrollView>

            {selectedReason === 'other' && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.customReasonLabel}>{t('bookings.customReason')}</Text>
                <TextInput
                  style={[styles.customReasonInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('bookings.customReasonPlaceholder')}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{customReason.length}/200</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, (!selectedReason || (selectedReason === 'other' && !customReason.trim())) && styles.disabledButton]}
              onPress={handleRejectConfirm}
              disabled={!selectedReason || (selectedReason === 'other' && !customReason.trim())}
            >
              <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  acceptButton: {
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
  rejectButton: {
    backgroundColor: '#FF9800',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  reasonsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  reasonText: {
    fontSize: 16,
    color: '#333333',
  },
  reasonTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  customReasonContainer: {
    marginBottom: 16,
  },
  customReasonLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  cancelledBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  overdueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
