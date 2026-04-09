import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRegisterOwnerMutation } from '@/store/api/authApi';

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [registerOwner, { isLoading }] = useRegisterOwnerMutation();

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const showError = (msg: string) => {
    setSuccessMessage('');
    setErrorMessage(msg);
  };

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!firstname || !lastname || !email || !password || !confirmPassword) {
      showError(t('common.fillRequired'));
      return;
    }

    if (password !== confirmPassword) {
      showError(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      showError(t('auth.passwordTooShort'));
      return;
    }

    try {
      await registerOwner({ firstname, lastname, email, password }).unwrap();
      setSuccessMessage(t('auth.registerSuccess'));
      setTimeout(() => {
        router.replace('/(auth)/verify-otp?email=' + encodeURIComponent(email));
      }, 1500);
    } catch (err: any) {
      if (err?.status === 409) {
        showError(t('auth.emailAlreadyExists'));
      } else {
        showError(t('auth.registerError'));
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>{t('auth.firstname')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={firstname}
                onChangeText={setFirstname}
                placeholder={t('auth.firstname')}
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
                textContentType="givenName"
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>{t('auth.lastname')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={lastname}
                onChangeText={setLastname}
                placeholder={t('auth.lastname')}
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
                textContentType="familyName"
              />
            </View>
          </View>

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

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.registerButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginText}>{t('auth.haveAccount')} </Text>
            <Text style={styles.loginLinkText}>{t('auth.login')}</Text>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
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
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666666',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
});
