import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetBookingByIdQuery, useConfirmBookingMutation, useStartServiceMutation,
  useCompleteBookingMutation, useCancelBookingMutation, useAssignBookingManuallyMutation,
  useGetBookingRerouteHistoryQuery, BookingStatus, ServiceType,
} from '@/store/api/bookingsApi';
import { TechnicianPicker } from '@/components/bookings/TechnicianPicker';
import { RerouteForm } from '@/components/bookings/RerouteForm';
import RerouteHistoryList from '@/components/bookings/RerouteHistoryList';
import { PermissionGate } from '@/components/staff/PermissionGate';
import StageUpdateForm from '@/components/progress/StageUpdateForm';
import ProgressTimeline from '@/components/progress/ProgressTimeline';
import QuoteCard from '@/components/quotes/QuoteCard';
import { SettlementSummaryCard } from '@/components/payments/SettlementSummaryCard';
import { useGetBookingQuotesQuery } from '@/store/api/quotesApi';
import { useGetMyMembershipsQuery } from '@/store/api/staffApi';
import { useAppSelector } from '@/store';
import type { WorkStage } from '@/types/workProgress';
import { useLookup } from '@/lib/hooks/useLookup';
import { LOOKUP_PARAMS, OTHER_SHORT_NAME } from '@/types/lookup';

export default function BookingDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'quotes'>('details');
  const [showRejectionSheet, setShowRejectionSheet] = useState(false);
  const [cancellationMode, setCancellationMode] = useState<'reject' | 'cancel'>('reject');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalCost, setFinalCost] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTechnicianPicker, setShowTechnicianPicker] = useState(false);
  const [showRerouteForm, setShowRerouteForm] = useState(false);

  const { data: booking, isLoading, refetch } = useGetBookingByIdQuery(Number(id));
  // Spec 022 — history list lives on the detail screen below progress timeline.
  const { data: rerouteHistory } = useGetBookingRerouteHistoryQuery(Number(id));

  // Resolve the current user's membership at the active center so we can answer
  // "is the caller the assigned technician?" — required for the canReroute gate per the
  // visual smoke test (hide button for non-assigned techs).
  const activeCenterId = useAppSelector((s) => s.center.activeCenterId);
  const activeUserRole = useAppSelector((s) => s.center.activeUserRole);
  const { data: myMemberships } = useGetMyMembershipsQuery();
  const myMembershipAtActiveCenter = myMemberships?.find((m) => m.centerId === activeCenterId);

  const isAssignedTech =
    activeUserRole === 'TECHNICIAN'
    && myMembershipAtActiveCenter?.id != null
    && booking?.assignedMembershipId === myMembershipAtActiveCenter.id;
  const canReroute =
    activeUserRole === 'OWNER' || activeUserRole === 'BRANCH_MANAGER' || isAssignedTech;
  const [confirmBooking, { isLoading: isConfirming }] = useConfirmBookingMutation();
  const [startService, { isLoading: isStarting }] = useStartServiceMutation();
  const [completeBooking, { isLoading: isCompleting }] = useCompleteBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [assignBookingManually] = useAssignBookingManuallyMutation();
  const isUpdating = isConfirming || isStarting || isCompleting || isCancelling;
  const { data: quotes } = useGetBookingQuotesQuery(Number(id), { skip: activeTab !== 'quotes' });
  const {
    values: rejectionReasons,
    getLabel: getRejectionLabel,
    isLoading: isRejectionLoading,
  } = useLookup(LOOKUP_PARAMS.REJECTION_REASON);

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
        showFeedback('error', err?.data?.businessErrorDescription ?? t('bookings.crossBranchError'));
      }
    }
  };

  const isOverdue = () => {
    if (!booking || booking.bookingStatus !== BookingStatus.PENDING) return false;
    const scheduledDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
    return scheduledDateTime < new Date();
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    if (Platform.OS === 'web') {
      setActionMessage({ type, text });
    } else {
      Alert.alert(type === 'success' ? t('common.save') : t('common.error'), text);
    }
  };

  const withConfirmation = (onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('bookings.updateStatus')}?`)) onConfirm();
    } else {
      Alert.alert(t('common.confirm'), `${t('bookings.updateStatus')}?`, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.yes'), onPress: onConfirm },
      ]);
    }
  };

  const handleConfirm = () => {
    withConfirmation(async () => {
      try {
        await confirmBooking(Number(id)).unwrap();
        showFeedback('success', t('bookings.statusUpdated'));
        refetch();
      } catch {
        showFeedback('error', 'Failed to confirm booking');
      }
    });
  };

  const handleStart = () => {
    withConfirmation(async () => {
      try {
        await startService(Number(id)).unwrap();
        showFeedback('success', t('bookings.statusUpdated'));
        refetch();
      } catch {
        showFeedback('error', 'Failed to start service');
      }
    });
  };

  const handleCompleteSubmit = async () => {
    const cost = parseFloat(finalCost);
    if (!finalCost || isNaN(cost) || cost < 0) {
      showFeedback('error', t('bookings.invalidCost'));
      return;
    }
    try {
      await completeBooking({ id: Number(id), data: { finalCost: cost, completionNotes: completionNotes || undefined } }).unwrap();
      setShowCompleteModal(false);
      setFinalCost('');
      setCompletionNotes('');
      showFeedback('success', t('bookings.statusUpdated'));
      refetch();
    } catch {
      showFeedback('error', 'Failed to complete booking');
    }
  };

  const handleReject = () => {
    setCancellationMode('reject');
    setShowRejectionSheet(true);
  };

  const handleCancel = () => {
    setCancellationMode('cancel');
    setSelectedReason(null);
    setCustomReason('');
    setShowRejectionSheet(true);
  };

  const handleCancellationConfirm = async () => {
    if (!selectedReason) {
      showFeedback('error', t('bookings.selectReason'));
      return;
    }
    if (selectedReason === OTHER_SHORT_NAME && !customReason.trim()) {
      showFeedback('error', t('bookings.enterReason'));
      return;
    }
    const reason = selectedReason === OTHER_SHORT_NAME
      ? customReason
      : getRejectionLabel(selectedReason);
    try {
      await cancelBooking({ id: Number(id), reason }).unwrap();
      setShowRejectionSheet(false);
      setSelectedReason(null);
      setCustomReason('');
      showFeedback('success', t('bookings.statusUpdated'));
      refetch();
    } catch {
      showFeedback('error', cancellationMode === 'reject' ? 'Failed to reject booking' : 'Failed to cancel booking');
    }
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

  const canConfirm = booking.bookingStatus === BookingStatus.PENDING;
  const canStart = booking.bookingStatus === BookingStatus.CONFIRMED;
  const canComplete = booking.bookingStatus === BookingStatus.IN_PROGRESS;
  const canCancel = booking.bookingStatus === BookingStatus.PENDING || booking.bookingStatus === BookingStatus.CONFIRMED;
  const isBookingOverdue = isOverdue();

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
          {getRejectionLabel(reason)}
        </Text>
      </TouchableOpacity>
    );
  };

  const TabBar = () => (
    <View style={[styles.tabBar, isRTL && styles.tabBarRtl]}>
      {(['details', 'progress', 'quotes'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && styles.tabActive,
            isRTL && styles.tabRtl
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab && styles.tabTextActive
          ]}>
            {t(`progress.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </Text>
        </TouchableOpacity>
      ))}
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
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#333333" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <TabBar />

      {actionMessage && (
        <View style={[styles.messageBanner, actionMessage.type === 'success' ? styles.successBanner : styles.errorBanner]}>
          <Text style={styles.messageBannerText}>{actionMessage.text}</Text>
          <TouchableOpacity onPress={() => setActionMessage(null)}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {booking.bookingStatus === BookingStatus.CANCELLED && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="information-circle" size={16} color="#FFFFFF" />
            <Text style={styles.cancelledBannerText}>{t('bookings.customerCancelled')}</Text>
          </View>
        )}

        {activeTab === 'details' && (
          <>
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
              <DetailRow label={t('bookings.date')} value={formatDate(booking.bookingDate)} />
              <DetailRow label={t('bookings.time')} value={booking.bookingTime} />
              <DetailRow label={t('bookings.status')} value={t(`bookings.${booking.bookingStatus.toLowerCase()}`)} />
              {booking.notes && <DetailRow label={t('bookings.notes')} value={booking.notes} />}
            </View>

            {/* Spec 023 — payment settlement (gross − commission = net) + refund. Completed bookings
                show the full summary widget; earlier states show a lightweight link. */}
            <PermissionGate permission="VIEW_REVENUE">
              {booking.bookingStatus === BookingStatus.COMPLETED ? (
                <SettlementSummaryCard
                  bookingId={booking.id}
                  onPress={() => router.push(`/(app)/earnings/settlement/${booking.id}` as any)}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.card, styles.settlementRow, isRTL && styles.rowRtl]}
                  onPress={() => router.push(`/(app)/earnings/settlement/${booking.id}` as any)}
                >
                  <Ionicons name="cash-outline" size={20} color="#2E7D32" />
                  <Text style={styles.settlementText}>{t('earnings.settlement.entry')}</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
                </TouchableOpacity>
              )}
            </PermissionGate>

            <PermissionGate permission="ASSIGN_TECHNICIAN_MANUAL">
              <View style={styles.card}>
                <View style={[styles.header, isRTL && styles.rowRtl]}>
                  <Text style={styles.detailLabel}>{t('bookings.assignedTo')}:</Text>
                  <Text style={booking.assignedStaffName ? styles.detailValue : styles.unassignedText}>
                    {booking.assignedStaffName ?? t('bookings.unassigned')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.assignButton, isRTL && styles.rowRtl]}
                  onPress={() => setShowTechnicianPicker(true)}
                >
                  <Ionicons name="person-add-outline" size={16} color="#2196F3" />
                  <Text style={styles.assignButtonText}>
                    {booking.assignedMembershipId ? t('bookings.reassign') : t('bookings.assignTechnician')}
                  </Text>
                </TouchableOpacity>
              </View>
            </PermissionGate>

            {/* Spec 022 — re-route history shown above the action area on the details tab. */}
            <RerouteHistoryList entries={rerouteHistory} />

            {(canConfirm || canStart || canComplete || canCancel || canReroute) && (
              <View style={styles.actionsContainer}>
                {canReroute && booking.bookingStatus !== BookingStatus.COMPLETED
                  && booking.bookingStatus !== BookingStatus.CANCELLED
                  && booking.bookingStatus !== BookingStatus.NO_SHOW && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rerouteButton]}
                    onPress={() => setShowRerouteForm(true)}
                    disabled={isUpdating}
                  >
                    <Ionicons name="git-branch-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>{t('reroute.action')}</Text>
                  </TouchableOpacity>
                )}
                {canConfirm && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleConfirm}
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
                    onPress={handleStart}
                    disabled={isUpdating}
                  >
                    <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>{t('bookings.startService')}</Text>
                  </TouchableOpacity>
                )}
                {canComplete && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => setShowCompleteModal(true)}
                    disabled={isUpdating}
                  >
                    <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>{t('bookings.completeService')}</Text>
                  </TouchableOpacity>
                )}
                {canCancel && !canConfirm && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={isUpdating}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>{t('bookings.cancelBooking')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === 'progress' && (
          <View>
            {booking.bookingStatus !== BookingStatus.CANCELLED && (
              <StageUpdateForm
                bookingId={Number(id)}
                currentStage={booking.workStage as WorkStage}
                onSuccess={() => refetch()}
              />
            )}
            <TouchableOpacity
              style={[styles.addUpdateButton, isRTL && styles.buttonRtl]}
              onPress={() => router.push(`./add-progress?bookingId=${id}`)}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.addUpdateButtonText}>{t('progress.addUpdate')}</Text>
            </TouchableOpacity>
            <ProgressTimeline bookingId={Number(id)} />
          </View>
        )}

        {activeTab === 'quotes' && (
          <View>
            <TouchableOpacity
              style={[styles.createQuoteButton, isRTL && styles.buttonRtl]}
              onPress={() => router.push(`./create-quote?bookingId=${id}`)}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createQuoteButtonText}>{t('quote.createQuote')}</Text>
            </TouchableOpacity>
            {quotes && quotes.length > 0 ? (
              quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onPress={() => router.push(`./quote-detail?bookingId=${id}&quoteId=${quote.id}`)}
                />
              ))
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="document-text-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyText}>{t('quote.noQuotes')}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <TechnicianPicker
        visible={showTechnicianPicker}
        currentMembershipId={booking?.assignedMembershipId ?? null}
        onSelect={handleAssign}
        onClose={() => setShowTechnicianPicker(false)}
      />

      <RerouteForm
        visible={showRerouteForm}
        bookingId={Number(id)}
        currentDepartmentId={booking?.departmentId}
        onClose={() => setShowRerouteForm(false)}
        onSuccess={() => {
          showFeedback('success', t('bookings.statusUpdated'));
          refetch();
        }}
      />

      <Modal
        visible={showCompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowRtl]}>
              <Text style={styles.modalTitle}>{t('bookings.completeService')}</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.customReasonLabel}>{t('bookings.finalCost')}</Text>
            <TextInput
              style={[styles.customReasonInput, { minHeight: 48, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="0.000"
              value={finalCost}
              onChangeText={setFinalCost}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.customReasonLabel, { marginTop: 12 }]}>{t('bookings.completionNotes')}</Text>
            <TextInput
              style={[styles.customReasonInput, { textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('bookings.completionNotesPlaceholder')}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.confirmButton, (!finalCost || isCompleting) && styles.disabledButton, { marginTop: 16 }]}
              onPress={handleCompleteSubmit}
              disabled={!finalCost || isCompleting}
            >
              {isCompleting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
              <Text style={styles.modalTitle}>{cancellationMode === 'reject' ? t('bookings.rejectReason') : t('bookings.cancelReason')}</Text>
              <TouchableOpacity onPress={() => setShowRejectionSheet(false)}>
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reasonsList}>
              {isRejectionLoading ? (
                <ActivityIndicator size="small" color="#2196F3" style={{ margin: 16 }} />
              ) : (
                rejectionReasons.map((detail) => (
                  <RejectionReasonOption key={detail.shortName} reason={detail.shortName} />
                ))
              )}
            </ScrollView>

            {selectedReason === OTHER_SHORT_NAME && (
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
              style={[styles.confirmButton, (!selectedReason || (selectedReason === OTHER_SHORT_NAME && !customReason.trim()) || isCancelling) && styles.disabledButton]}
              onPress={handleCancellationConfirm}
              disabled={!selectedReason || (selectedReason === OTHER_SHORT_NAME && !customReason.trim()) || isCancelling}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabBarRtl: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabRtl: {
    textAlign: 'right',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: '600',
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
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settlementText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
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
  rerouteButton: {
    backgroundColor: '#6366F1',
  },
  addUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createQuoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  buttonRtl: {
    flexDirection: 'row-reverse',
  },
  addUpdateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createQuoteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
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
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  successBanner: {
    backgroundColor: '#4CAF50',
  },
  errorBanner: {
    backgroundColor: '#F44336',
  },
  messageBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  unassignedText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
    flex: 1,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  assignButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
});
