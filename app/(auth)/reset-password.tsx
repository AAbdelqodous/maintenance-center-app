import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useResetPasswordMutation, useForgotPasswordMutation } from '@/store/api/authApi';

export default function ResetPasswordScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const hiddenInputRef = useRef<TextInput>(null);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [forgotPassword, { isLoading: resendLoading }] = useForgotPasswordMutation();

  useEffect(() => {
    const timer = setTimeout(() => hiddenInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, 6));
  };

  const activeBoxIndex = Math.min(otp.length, 5);

  const handleReset = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setErrorMessage(t('auth.invalidOTP'));
      return;
    }
    if (!newPassword || !confirmPassword) {
      setErrorMessage(t('common.fillRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatch'));
      return;
    }

    try {
      await resetPassword({ token: otp, newPassword }).unwrap();
      setSuccessMessage(t('auth.resetPasswordSuccess'));
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch {
      setErrorMessage(t('auth.resetPasswordError'));
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await forgotPassword({ email }).unwrap();
      setSuccessMessage(t('auth.otpResent'));
      setCooldown(60);
    } catch {
      setErrorMessage(t('auth.otpResendFailed'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRtl]}>{t('auth.resetPasswordSubtitle')}</Text>

          <Text style={[styles.label, { marginBottom: 12 }]}>{t('auth.resetCode')}</Text>
          <TouchableOpacity
            style={styles.otpContainer}
            onPress={() => hiddenInputRef.current?.focus()}
            activeOpacity={1}
          >
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isActive = isFocused && index === activeBoxIndex;
              const isFilled = !!otp[index];
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isActive && styles.otpBoxActive,
                    isFilled && !isActive && styles.otpBoxFilled,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[index] ?? ''}</Text>
                  {isActive && !isFilled && <View style={styles.cursor} />}
                </View>
              );
            })}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.newPassword')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              placeholderTextColor="#9E9E9E"
              secureTextEntry
              textContentType="newPassword"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#9E9E9E"
              secureTextEntry
              textContentType="newPassword"
            />
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
            onPress={handleReset}
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.resetPasswordButton')}</Text>
            )}
          </TouchableOpacity>

          {email ? (
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
          ) : null}

          <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backLinkText}>{t('auth.backToLogin')}</Text>
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
    fontSize: 15,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBox: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: '#2196F3',
  },
  otpBoxFilled: {
    borderColor: '#BDBDBD',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: '#2196F3',
    borderRadius: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  rtlInput: {
    textAlign: 'right',
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
  backLink: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  backLinkText: {
    fontSize: 14,
    color: '#666666',
  },
});
