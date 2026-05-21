import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export function ExportReportButton() {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);

  const handlePress = () => {
    if (Platform.OS === 'web') {
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 4000);
    } else {
      Alert.alert(t('trends.export.comingSoon'), t('trends.export.comingSoonMessage'));
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons name="download-outline" size={16} color="#2196F3" />
        <Text style={styles.label}>{t('trends.export.label')}</Text>
      </TouchableOpacity>
      {showBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('trends.export.comingSoonMessage')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  banner: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
  },
  bannerText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});
