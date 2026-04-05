import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from '../../../store';
import { clearSession } from '../../../store/authSlice';

const LANGUAGE_KEY = 'app_language';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && savedLanguage !== i18n.language) {
        await i18n.changeLanguage(savedLanguage);
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (language === currentLanguage) return;

    setIsLoading(true);
    try {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      setCurrentLanguage(language);
      Alert.alert(
        t('common.success'),
        t('settings.languageChanged'),
        [{ text: t('common.yes') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.languageChangeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: () => {
            dispatch(clearSession());
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, isRTL && styles.settingItemRtl]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: '#2196F3' + '20' }]}>
        <Ionicons name={icon as any} size={24} color="#2196F3" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={20}
          color="#9E9E9E"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={[styles.languageSelector, isRTL && styles.rowRtl]}>
          <TouchableOpacity
            style={[styles.languageOption, currentLanguage === 'en' && styles.languageOptionSelected]}
            onPress={() => handleLanguageChange('en')}
            disabled={isLoading}
          >
            <View style={[styles.languageFlag, { backgroundColor: '#4CAF50' + '20' }]}>
              <Text style={styles.languageFlagText}>🇺🇸</Text>
            </View>
            <View>
              <Text style={styles.languageName}>English</Text>
              <Text style={styles.languageNative}>English</Text>
            </View>
            {currentLanguage === 'en' && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageOption, currentLanguage === 'ar' && styles.languageOptionSelected]}
            onPress={() => handleLanguageChange('ar')}
            disabled={isLoading}
          >
            <View style={[styles.languageFlag, { backgroundColor: '#FF5722' + '20' }]}>
              <Text style={styles.languageFlagText}>🇸🇦</Text>
            </View>
            <View>
              <Text style={styles.languageName}>العربية</Text>
              <Text style={styles.languageNative}>Arabic</Text>
            </View>
            {currentLanguage === 'ar' && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <SettingItem
          icon="person-circle-outline"
          title={t('settings.editProfile')}
          subtitle={t('settings.editProfileDesc')}
          onPress={() => router.back()}
          showArrow={false}
        />
        <SettingItem
          icon="notifications-outline"
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsDesc')}
          onPress={() => {}}
          showArrow={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
        <SettingItem
          icon="help-circle-outline"
          title={t('settings.help')}
          subtitle={t('settings.helpDesc')}
          onPress={() => {}}
          showArrow={false}
        />
        <SettingItem
          icon="document-text-outline"
          title={t('settings.terms')}
          subtitle={t('settings.termsDesc')}
          onPress={() => {}}
          showArrow={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, isRTL && styles.rowRtl]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#F44336" />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>

      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>{t('settings.version')} 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  languageOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageOptionSelected: {
    borderColor: '#2196F3',
  },
  languageFlag: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageFlagText: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  languageNative: {
    fontSize: 14,
    color: '#666666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItemRtl: {
    flexDirection: 'row-reverse',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#999999',
  },
});
