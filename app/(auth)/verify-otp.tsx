import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    if (otp.length !== 6) {
      Alert.alert(t('common.error'), t('auth.invalidOTP'));
      return;
    }

    try {
      await activateAccount({ token: otp }).unwrap();
      Alert.alert(t('common.success'), t('auth.accountActivated'), [
        {
          text: t('auth.login'),
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } catch (error: any) {
      const errorMessage = error?.data?.message || t('auth.activationFailed');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    try {
      await resendOtp({ email }).unwrap();
      Alert.alert(t('common.success'), t('auth.otpResent'));
      setCooldown(60);
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.otpResendFailed'));
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
                  const updatedOtp = newOtp.join('');
                  handleOtpChange(updatedOtp);
                }}
                maxLength={1}
                keyboardType="number-pad"
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading || otp.length !== 6}>
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
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
