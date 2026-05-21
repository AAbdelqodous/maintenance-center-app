import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  lastCheckedAt: Date | null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AllClearState({ lastCheckedAt }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <View style={[styles.container, isRTL && styles.containerRtl]}>
      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={styles.icon} />
      <View>
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t('attention.allClear')}</Text>
        {lastCheckedAt && (
          <Text style={[styles.subtitle, isRTL && styles.textRtl]}>
            {t('attention.allClearSubtitle', { time: formatTime(lastCheckedAt) })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  containerRtl: {
    flexDirection: 'row-reverse',
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#276749',
  },
  subtitle: {
    fontSize: 12,
    color: '#48BB78',
    marginTop: 2,
  },
  textRtl: {
    textAlign: 'right',
  },
});
