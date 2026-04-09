import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';

export default function PendingApprovalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color="#FF9800" />
        </View>

        <Text style={styles.title}>{t('auth.pendingTitle')}</Text>
        <Text style={styles.message}>{t('auth.pendingMessage')}</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>{t('auth.pendingInfo')}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 40,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  logoutButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 15,
    color: '#555555',
    fontWeight: '600',
  },
});
