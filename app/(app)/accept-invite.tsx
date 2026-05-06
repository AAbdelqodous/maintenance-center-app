import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGetInvitationDetailsQuery, useAcceptInvitationMutation, useDeclineInvitationMutation } from '@/store/api/staffApi';
import { RoleBadge } from '@/components/staff/RoleBadge';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '@/store';
import { setActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { ROLE_PERMISSIONS, CenterRole } from '@/types/staff';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const dispatch = useAppDispatch();
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isWrongAccount, setIsWrongAccount] = useState(false);

  const { data: invitationDetails, isLoading, error } = useGetInvitationDetailsQuery(token || '', {
    skip: !token,
  });

  const session = useAppSelector((state) => state.auth.session);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAccept = async () => {
    if (!token) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await acceptInvitation(token).unwrap();
      dispatch(setActiveCenter({
        centerId: result.centerId,
        role: result.role as CenterRole,
        permissions: ROLE_PERMISSIONS[result.role as CenterRole],
      }));
      await storage.saveActiveCenterId(result.centerId);
      setSuccessMessage(t('staff.invite_accept.success'));
      setTimeout(() => {
        router.replace('/(app)/(tabs)/');
      }, 1500);
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      const description: string = err?.data?.businessErrorDescription || err?.data?.message || '';
      const emailMismatch = err?.status === 409 && description.toLowerCase().includes('different email');
      if (emailMismatch) {
        setIsWrongAccount(true);
        setErrorMessage(t('staff.invite_auth.wrongAccountGeneric'));
      } else {
        setErrorMessage(description || (err?.status === 409 ? t('staff.invite_accept.alreadyMember') : t('staff.invite_accept.error')));
      }
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await declineInvitation(token).unwrap();
      setSuccessMessage(t('staff.invite_accept.declined'));
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (err: any) {
      console.error('Decline invitation error:', err);
      const msg = err?.data?.message || err?.data?.businessErrorDescription || t('staff.invite_accept.error');
      setErrorMessage(msg);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t('staff.invite_accept.loading')}</Text>
      </View>
    );
  }

  if (error || !invitationDetails) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>{t('staff.invite_accept.errorTitle')}</Text>
        <Text style={styles.errorMessage}>
          {t('staff.invite_accept.notFound')}
        </Text>
      </View>
    );
  }

  if (invitationDetails.status === 'EXPIRED') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="time-outline" size={64} color="#F59E0B" />
        <Text style={styles.warningTitle}>{t('staff.invite_accept.expired')}</Text>
        <Text style={styles.warningMessage}>
          {t('staff.invite_accept.expiredMessage')}
        </Text>
      </View>
    );
  }

  if (invitationDetails.status === 'REDEEMED') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
        <Text style={styles.successTitle}>{t('staff.invite_accept.alreadyAccepted')}</Text>
        <Text style={styles.successMessage}>
          {t('staff.invite_accept.alreadyAcceptedMessage')}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/branch-select')}
        >
          <Text style={styles.buttonText}>{t('staff.invite_accept.goToDashboard')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (invitationDetails.status === 'DECLINED' || invitationDetails.status === 'CANCELLED') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="close-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>{t('staff.invite_accept.declined')}</Text>
        <Text style={styles.errorMessage}>
          {t('staff.invite_accept.declinedMessage')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}
      {isWrongAccount && (
        <TouchableOpacity
          style={[styles.button, styles.switchAccountButton]}
          onPress={() => router.push(`/(auth)/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}` as any)}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{t('staff.invite_auth.switchAccount')}</Text>
        </TouchableOpacity>
      )}
      {successMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={48} color="#4F46E5" />
        </View>
        <Text style={styles.title}>{t('staff.invite_accept.title')}</Text>
        <Text style={styles.body}>
          {t('staff.invite_accept.body', {
            inviter: invitationDetails.inviterName,
            center: i18n.language === 'ar' ? invitationDetails.centerNameAr : invitationDetails.centerNameEn,
            role: i18n.language === 'ar' ? invitationDetails.roleAr : invitationDetails.roleEn,
          })}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('staff.invite_accept.center')}:</Text>
            <Text style={styles.detailValue}>
              {i18n.language === 'ar' ? invitationDetails.centerNameAr : invitationDetails.centerNameEn}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('staff.invite_accept.role')}:</Text>
            <RoleBadge role={invitationDetails.targetRole} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('staff.invite_accept.expiresAt')}:</Text>
            <Text style={styles.detailValue}>{formatDate(invitationDetails.expiresAt)}</Text>
          </View>
        </View>

        {!session ? (
          <View style={styles.authPrompt}>
            <Ionicons name="person-outline" size={32} color="#6B7280" />
            <Text style={styles.authPromptText}>
              {t('staff.invite_auth.signInPrompt')}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push(`/(auth)/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}` as any)}
            >
              <Text style={styles.buttonText}>{t('staff.invite_auth.signIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => router.push(`/(auth)/register?staff=true&email=${encodeURIComponent(invitationDetails?.targetEmail ?? '')}&token=${token}` as any)}
            >
              <Text style={styles.buttonSecondaryText}>{t('staff.invite_auth.createAccount')}</Text>
            </TouchableOpacity>
          </View>
        ) : invitationDetails.targetEmail && session.email.toLowerCase() !== invitationDetails.targetEmail.toLowerCase() ? (
          <View style={styles.wrongAccountPrompt}>
            <Ionicons name="warning-outline" size={32} color="#F59E0B" />
            <Text style={styles.wrongAccountText}>
              {t('staff.invite_auth.wrongAccount', { email: invitationDetails.targetEmail })}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.buttonText}>{t('staff.invite_auth.switchAccount')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonDecline]}
              onPress={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <ActivityIndicator color="#6B7280" />
              ) : (
                <Text style={styles.buttonDeclineText}>{t('staff.invite_accept.decline')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonAccept]}
              onPress={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('staff.invite_accept.accept')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  warningMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  successBannerText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  authPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  authPromptText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    marginTop: 12,
  },
  buttonSecondaryText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDecline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonDeclineText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  wrongAccountPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  wrongAccountText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    marginBottom: 12,
  },
  buttonAccept: {
    backgroundColor: '#4F46E5',
  },
});
