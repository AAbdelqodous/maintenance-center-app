import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { RerouteAudit } from '@/types/reroute';

interface Props {
  entries: RerouteAudit[] | undefined;
}

/**
 * Spec 022 — chronological re-route history rendered on the booking detail screen.
 * <p>Renders nothing if {@code entries} is empty or undefined (spec T054: no empty-state heading).
 */
export default function RerouteHistoryList({ entries }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (!entries || entries.length === 0) return null;

  const arrow = isRTL ? '←' : '→';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isRTL && styles.textRtl]}>{t('reroute.history.title')}</Text>
      {entries.map((entry) => {
        const fromName = i18n.language === 'ar' ? entry.fromDepartmentNameAr : entry.fromDepartmentNameEn;
        const toName = i18n.language === 'ar' ? entry.toDepartmentNameAr : entry.toDepartmentNameEn;
        return (
          <View key={entry.id} style={styles.row}>
            <View style={[styles.routeRow, isRTL && styles.rowRtl]}>
              <Text style={styles.deptText}>{fromName}</Text>
              <Text style={styles.arrow}>{arrow}</Text>
              <Text style={styles.deptText}>{toName}</Text>
              {entry.isInitialDiagnosticClassification && (
                <View style={styles.badge}>
                  <Ionicons name="medical-outline" size={11} color="#4F46E5" />
                  <Text style={styles.badgeText}>
                    {t('reroute.history.diagnosticClassification')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.meta, isRTL && styles.textRtl]}>
              {t(`reroute.reason.${entry.reason}`)} · {entry.triggeredByUserDisplayName}
            </Text>
            {entry.note ? (
              <Text style={[styles.note, isRTL && styles.textRtl]}>{entry.note}</Text>
            ) : null}
            <Text style={[styles.timestamp, isRTL && styles.textRtl]}>
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  deptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  arrow: {
    fontSize: 14,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  meta: {
    fontSize: 13,
    color: '#4B5563',
  },
  note: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  textRtl: {
    textAlign: 'right',
  },
});
