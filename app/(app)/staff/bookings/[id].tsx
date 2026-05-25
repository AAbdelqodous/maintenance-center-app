import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useGetBookingByIdQuery,
  useClaimBookingMutation,
  useAssignBookingManuallyMutation,
} from '@/store/api/bookingsApi';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { TechnicianPicker } from '@/components/bookings/TechnicianPicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

function StaffBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { data: booking, isLoading, refetch } = useGetBookingByIdQuery(Number(id), { skip: !id });
  const [claimBooking, { isLoading: isClaiming }] = useClaimBookingMutation();
  const [assignBookingManually] = useAssignBookingManuallyMutation();
  const [showTechnicianPicker, setShowTechnicianPicker] = useState(false);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    if (Platform.OS === 'web') window.alert(text);
    else Alert.alert(type === 'success' ? t('common.success') : t('common.error'), text);
  };

  const handleClaim = () => {
    const doClaim = async () => {
      try {
        await claimBooking(Number(id)).unwrap();
        showFeedback('success', t('bookings.claimSuccess'));
        refetch();
      } catch (err: any) {
        const errorCode: string = err?.data?.error ?? '';
        const codeToKey: Record<string, string> = {
          BOOKING_ALREADY_CLAIMED: 'bookings.alreadyClaimed',
          BOOKING_NOT_CLAIMABLE: 'bookings.notClaimable',
          STAFF_INACTIVE: 'bookings.staffInactive',
          WRONG_DEPARTMENT: 'bookings.wrongDepartment',
        };
        const msg = codeToKey[errorCode]
          ? t(codeToKey[errorCode])
          : (err?.data?.businessErrorDescription ?? t('common.error'));
        showFeedback('error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('bookings.claimConfirm'))) doClaim();
    } else {
      Alert.alert(t('bookings.claimBooking'), t('bookings.claimConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('bookings.claimBooking'), onPress: doClaim },
      ]);
    }
  };

  const handleAssign = async (staffId: number | null, reason?: string) => {
    if (staffId === null) return;

    const doAssign = async (crossDepartmentOverride = false) => {
      try {
        await assignBookingManually({
          bookingId: Number(id),
          body: { staffId, reason, crossDepartmentOverride: crossDepartmentOverride || undefined },
        }).unwrap();
        showFeedback('success', t('bookings.assignSuccess'));
        refetch();
      } catch (e: any) {
        showFeedback('error', e?.data?.businessErrorDescription ?? t('common.error'));
      }
    };

    try {
      await assignBookingManually({ bookingId: Number(id), body: { staffId, reason } }).unwrap();
      showFeedback('success', t('bookings.assignSuccess'));
      refetch();
    } catch (err: any) {
      if (err?.data?.error === 'CROSS_DEPARTMENT_NOT_ALLOWED') {
        if (Platform.OS === 'web') {
          if (window.confirm(t('bookings.crossDeptConfirmMessage'))) doAssign(true);
        } else {
          Alert.alert(t('bookings.crossDeptConfirmTitle'), t('bookings.crossDeptConfirmMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), onPress: () => doAssign(true) },
          ]);
        }
      } else {
        showFeedback('error', err?.data?.businessErrorDescription ?? t('common.error'));
      }
    }
  };

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

      {/* Self-claim — TECHNICIAN only, only when booking is unassigned */}
      <PermissionGate permission="CLAIM_BOOKING">
        {booking.assignedMembershipId === null && (
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
              onPress={handleClaim}
              disabled={isClaiming}
            >
              {isClaiming
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="hand-right-outline" size={16} color="#FFFFFF" />
              }
              <Text style={styles.claimButtonText}>{t('bookings.claimBooking')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </PermissionGate>

      {/* Manual assignment — OWNER / BRANCH_MANAGER only */}
      <PermissionGate permission="ASSIGN_TECHNICIAN_MANUAL">
        <View style={styles.card}>
          <View style={[styles.row, isRTL && styles.rowRtl]}>
            <Text style={styles.label}>{t('bookings.assignedTo')}:</Text>
            <Text style={booking.assignedStaffName ? styles.value : styles.unassignedText}>
              {booking.assignedStaffName ?? t('bookings.unassigned')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.assignButton, isRTL && styles.rowRtl]}
            onPress={() => setShowTechnicianPicker(true)}
          >
            <Ionicons name="person-add-outline" size={16} color="#4F46E5" />
            <Text style={styles.assignButtonText}>
              {booking.assignedMembershipId ? t('bookings.reassign') : t('bookings.assignTechnician')}
            </Text>
          </TouchableOpacity>
        </View>
      </PermissionGate>

      <TechnicianPicker
        visible={showTechnicianPicker}
        currentMembershipId={booking.assignedMembershipId}
        onSelect={handleAssign}
        onClose={() => setShowTechnicianPicker(false)}
      />
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
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, gap: 12 },
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
  rowRtl: { flexDirection: 'row-reverse' },
  label: { fontSize: 14, color: '#6B7280', minWidth: 70 },
  value: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1 },
  notesBlock: { marginTop: 4 },
  notes: { fontSize: 14, color: '#374151', marginTop: 4, lineHeight: 20 },
  unassignedText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', flex: 1 },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
  },
  claimButtonDisabled: { backgroundColor: '#6EE7B7' },
  claimButtonText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  assignButtonText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
});
