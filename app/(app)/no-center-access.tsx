import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';
import { useAppDispatch } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NoCenterAccessScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);

  const handleLogout = async () => {
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/login');
  };

  const handleGoToCustomerApp = () => {
    if (Platform.OS === 'web') {
      window.open('https://customer-app.example.com', '_blank');
    } else {
      Linking.openURL('customerapp://').catch(() => {
        console.log('Customer app not installed');
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={80} color="#9CA3AF" />
        </View>
        <Text style={styles.title}>{t('staff.noAccess.title')}</Text>
        <Text style={styles.message}>{t('staff.noAccess.body')}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToCustomerApp}>
          <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{t('staff.noAccess.goToCustomerApp')}</Text>
        </TouchableOpacity>

        {session && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#4F46E5" />
            <Text style={styles.secondaryButtonText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
});
