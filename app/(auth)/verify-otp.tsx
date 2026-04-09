import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useActivateAccountMutation, useResendOtpMutation } from '../../store/api/authApi';

export default function VerifyOTPScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [activateAccount, { isLoading }] = useActivateAccountMutation();
  const [resendOtp, { isLoading: resendLoading }] = useResendOtpMutation();

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setErrorMessage(t('auth.invalidOTP'));
      return;
    }

    try {
      await activateAccount({ token: otp }).unwrap();
      setSuccessMessage(t('auth.accountActivated'));
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error?.data?.error || t('auth.activationFailed'));
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await resendOtp({ email }).unwrap();
      setSuccessMessage(t('auth.otpResent'));
      setCooldown(60);
    } catch {
      setErrorMessage(t('auth.otpResendFailed'));
    }
  };

  const handleOtpChange = (value: string) => {
    if (/^\d*$/.test(value) && value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.verifyOTP')}</Text>
          <Text style={styles.subtitle}>{t('auth.otpSent')}</Text>

          <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TextInput
                key={index}
                style={[styles.otpInput, isRTL && styles.rtlInput]}
                value={otp[index] || ''}
                onChangeText={(value) => {
                  const newOtp = otp.split('');
                  newOtp[index] = value;
                  handleOtpChange(newOtp.join(''));
                }}
                maxLength={1}
                keyboardType="number-pad"
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, isRTL && styles.textRtl]}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={[styles.successText, isRTL && styles.textRtl]}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.verifyButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, (cooldown > 0 || resendLoading) && styles.resendButtonDisabled]}
            onPress={handleResend}
            disabled={cooldown > 0 || resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#2196F3" />
            ) : (
              <Text style={[styles.resendButtonText, cooldown > 0 && styles.resendButtonTextDisabled]}>
                {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resendOTP')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 40,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  rtlInput: {
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'left',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'left',
  },
  textRtl: {
    textAlign: 'right',
  },
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  resendButtonTextDisabled: {
    color: '#999999',
  },
});
