import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AttentionItem as AttentionItemType } from '@/types/attention';

interface Props {
  item: AttentionItemType;
}

const HIGH_COLOR = '#F44336';
const MEDIUM_COLOR = '#FF9800';

export function AttentionItem({ item }: Props) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const severityColor = item.severity === 'HIGH' ? HIGH_COLOR : MEDIUM_COLOR;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isRTL ? { borderRightWidth: 4, borderRightColor: severityColor } : { borderLeftWidth: 4, borderLeftColor: severityColor },
      ]}
      onPress={() => router.push(item.navigateTo as any)}
      activeOpacity={0.7}
    >
      <View style={[styles.content, isRTL && styles.contentRtl]}>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color="#BBBBBB"
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentRtl: {
    flexDirection: 'row-reverse',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 8,
  },
});
