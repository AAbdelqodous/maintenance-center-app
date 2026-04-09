import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/store';
import { setSession } from '@/store/authSlice';
import { useLoginMutation } from '@/store/api/authApi';
import { storage } from '@/lib/storage';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isNotActivated, setIsNotActivated] = useState(false);

  const handleLogin = async () => {
    setErrorMessage('');
    setIsNotActivated(false);
    if (!email || !password) {
      setErrorMessage(t('auth.loginError'));
      return;
    }

    try {
      const result = await login({ email, password }).unwrap();
      await storage.saveSession(result.token, email);
      dispatch(setSession({ token: result.token, email }));
      if (result.approvalStatus === 'PENDING_APPROVAL') {
        router.replace('/pending-approval');
      } else {
        router.replace('/(app)/(tabs)/');
      }
    } catch (err: any) {
      if (err?.data?.businessErrorCode === 303) {
        setIsNotActivated(true);
        setErrorMessage(t('auth.accountNotActivated'));
      } else {
        setErrorMessage(t('auth.loginError'));
      }
    }
  };

  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.login')}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#9E9E9E"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9E9E9E"
              secureTextEntry
              textContentType="password"
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, isRTL && styles.textRtl]}>{errorMessage}</Text>
              {isNotActivated && email ? (
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/verify-otp?email=' + encodeURIComponent(email))}
                  style={styles.verifyLink}
                >
                  <Text style={styles.verifyLinkText}>{t('auth.verifyNow')} →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('auth.loginButton')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
            <Text style={styles.registerLinkText}>{t('auth.createAccount')}</Text>
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
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
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
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#666666',
  },
  registerLinkText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
  textRtl: {
    textAlign: 'right',
  },
  verifyLink: {
    marginTop: 8,
  },
  verifyLinkText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
