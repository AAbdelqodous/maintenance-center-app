import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { QuoteLineItem } from '@/types/quote';

interface Props {
  item: QuoteLineItem;
}

/**
 * Spec 022 — diagnostic-fee line item.
 * <p>Read-only by design: backend marks {@code editable: false, removable: false} so the
 * frontend renders no edit or delete affordances. The lock icon + tooltip explain to the
 * technician why this row cannot be removed.
 */
export default function DiagnosticFeeLineItem({ item }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const amount = (item.partsCost || 0) + (item.laborCost || 0);
  const formatted = `KD ${amount.toFixed(3)}`;

  const showTooltip = () => {
    if (Platform.OS === 'web') {
      // Browsers don't render RN Modal portals well over native; surface as window.alert.
      window.alert(t('diagnostic.fee.tooltip'));
    } else {
      setTooltipOpen(true);
    }
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRtl]}>
      <View style={styles.iconCol}>
        <Ionicons name="lock-closed" size={16} color="#92400E" />
      </View>
      <View style={styles.body}>
        <View style={[styles.labelRow, isRTL && styles.rowRtl]}>
          <Text style={styles.label}>{t('diagnostic.fee.label')}</Text>
          <TouchableOpacity
            onPress={showTooltip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('diagnostic.fee.tooltip')}
          >
            <Ionicons name="information-circle-outline" size={16} color="#92400E" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.amount}>{formatted}</Text>

      <Modal
        visible={tooltipOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipOpen(false)}
      >
        <TouchableOpacity
          style={styles.tooltipBackdrop}
          activeOpacity={1}
          onPress={() => setTooltipOpen(false)}
        >
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipText}>{t('diagnostic.fee.tooltip')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  containerRtl: {
    flexDirection: 'row-reverse',
  },
  iconCol: {
    width: 24,
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  tooltipBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxWidth: 320,
  },
  tooltipText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
});
