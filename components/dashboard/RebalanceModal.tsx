import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useAssignBookingManuallyMutation } from '@/store/api/bookingsApi';
import { analyticsApi } from '@/store/api/analyticsApi';
import type { RebalanceSuggestion, StaffPerformanceCard, ActiveBookingSummary } from '@/types/staffPerformance';
import { AppDispatch } from '@/store';

interface Props {
  visible: boolean;
  suggestion: RebalanceSuggestion;
  onClose: () => void;
}

type Step = 'SELECT_BOOKING' | 'SELECT_RECIPIENT';

export function RebalanceModal({ visible, suggestion, onClose }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [assignBookingManually, { isLoading }] = useAssignBookingManuallyMutation();

  const [selectedStaff, setSelectedStaff] = useState<StaffPerformanceCard | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ActiveBookingSummary | null>(null);
  const [step, setStep] = useState<Step>('SELECT_BOOKING');

  const reset = () => {
    setSelectedStaff(null);
    setSelectedBooking(null);
    setStep('SELECT_BOOKING');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBookingSelect = (staff: StaffPerformanceCard, booking: ActiveBookingSummary) => {
    setSelectedStaff(staff);
    setSelectedBooking(booking);
    setStep('SELECT_RECIPIENT');
  };

  const handleConfirm = (recipient: StaffPerformanceCard) => {
    if (!selectedStaff || !selectedBooking) return;

    const fromId = selectedStaff.membershipId;
    const toId = recipient.membershipId;
    const bookingId = selectedBooking.bookingId;

    const doAssign = async () => {
      // Optimistic update — T017
      const patch = dispatch(
        analyticsApi.util.updateQueryData('getStaffPerformanceBoard', undefined, (draft) => {
          const from = draft.staff.find((s) => s.membershipId === fromId);
          const to = draft.staff.find((s) => s.membershipId === toId);
          if (from) from.activeBookingsCount = Math.max(0, from.activeBookingsCount - 1);
          if (to) to.activeBookingsCount += 1;
          // Remove booking from overloaded staff's activeBookings list
          if (from?.activeBookings) {
            from.activeBookings = from.activeBookings.filter((b) => b.bookingId !== bookingId);
          }
        }),
      );

      try {
        await assignBookingManually({ bookingId, body: { staffId: toId } }).unwrap();
        handleClose();
      } catch {
        patch.undo();
        const msg = t('performanceBoard.rebalance.error');
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert(t('common.error'), msg);
        }
      }
    };

    const confirmMsg = `${t('performanceBoard.rebalance.selectRecipient')}: ${recipient.firstName} ${recipient.lastName}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) doAssign();
    } else {
      Alert.alert(
        t('performanceBoard.rebalance.confirm'),
        confirmMsg,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: doAssign },
        ],
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('performanceBoard.rebalance.title')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'SELECT_BOOKING' ? (
            <ScrollView>
              <Text style={styles.sectionLabel}>
                {t('performanceBoard.rebalance.overloadedSection')}
              </Text>
              {suggestion.overloadedStaff.map((staff) => (
                <View key={staff.membershipId} style={styles.staffBlock}>
                  <Text style={styles.staffName}>
                    {staff.firstName} {staff.lastName}
                  </Text>
                  <Text style={styles.bookingPrompt}>
                    {t('performanceBoard.rebalance.selectBooking')}
                  </Text>
                  {(staff.activeBookings ?? []).map((booking) => (
                    <TouchableOpacity
                      key={booking.bookingId}
                      style={styles.bookingRow}
                      onPress={() => handleBookingSelect(staff, booking)}
                    >
                      <Text style={styles.bookingCustomer} numberOfLines={1}>
                        {booking.customerName}
                      </Text>
                      <Text style={styles.bookingMeta} numberOfLines={1}>
                        {booking.serviceType} · {booking.bookingDate}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView>
              <TouchableOpacity onPress={() => { setStep('SELECT_BOOKING'); setSelectedBooking(null); }} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← {t('common.back')}</Text>
              </TouchableOpacity>
              <Text style={styles.sectionLabel}>
                {t('performanceBoard.rebalance.selectRecipient')}
              </Text>
              <Text style={styles.bookingMeta} numberOfLines={2}>
                {selectedBooking?.customerName} · {selectedBooking?.bookingDate}
              </Text>
              {isLoading && (
                <ActivityIndicator size="small" color="#1D4ED8" style={{ marginTop: 12 }} />
              )}
              {suggestion.eligibleRecipients.map((r) => (
                <TouchableOpacity
                  key={r.membershipId}
                  style={styles.recipientRow}
                  onPress={() => !isLoading && handleConfirm(r)}
                  disabled={isLoading}
                >
                  <Text style={styles.staffName}>
                    {r.firstName} {r.lastName}
                  </Text>
                  <Text style={styles.bookingMeta}>
                    {r.activeBookingsCount} active
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#6B7280',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffBlock: {
    marginBottom: 16,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookingPrompt: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  bookingRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  bookingCustomer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bookingMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  recipientRow: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: '#1D4ED8',
  },
});
