import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Booking } from '../../store/api/bookingsApi';
import { StatusBadge } from './StatusBadge';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getServiceTypeTranslation = (serviceType: string) => {
    const key = `bookings.serviceType.${serviceType.toLowerCase()}`;
    return t(key) || serviceType;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <Text style={styles.customerName}>{booking.customerName}</Text>
        <StatusBadge status={booking.status} />
      </View>
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <Text style={styles.label}>{t('bookings.service')}:</Text>
        <Text style={styles.value}>{getServiceTypeTranslation(booking.serviceType)}</Text>
      </View>
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <Text style={styles.label}>{t('bookings.date')}:</Text>
        <Text style={styles.value}>{formatDate(booking.scheduledDate)}</Text>
      </View>
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <Text style={styles.label}>{t('bookings.time')}:</Text>
        <Text style={styles.value}>{booking.scheduledTime}</Text>
      </View>
      {booking.notes && (
        <View style={[styles.row, isRTL && styles.rowRtl, styles.notesRow]}>
          <Text style={styles.label}>{t('bookings.notes')}:</Text>
          <Text style={styles.notes}>{booking.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  notesRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notes: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
    flex: 1,
  },
});
