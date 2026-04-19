import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetMyTrustQuery } from '@/store/api/trustApi';
import TrustBadgeCard from '@/components/pricing/TrustBadgeCard';

export default function TrustBadgesScreen() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useGetMyTrustQuery();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.comingSoonText}>{t('trustBadge.comingSoon')}</Text>
      </View>
    );
  }

  const earnedBadges = data.badges.filter((badge) => badge.isEarned);
  const lockedBadges = data.badges.filter((badge) => !badge.isEarned);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {earnedBadges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('trustBadge.earned')}</Text>
          {earnedBadges.map((badge) => (
            <TrustBadgeCard
              key={badge.badgeType}
              badge={badge}
              locale={i18n.language}
            />
          ))}
        </>
      )}

      {lockedBadges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('trustBadge.locked')}</Text>
          {lockedBadges.map((badge) => (
            <TrustBadgeCard
              key={badge.badgeType}
              badge={badge}
              locale={i18n.language}
            />
          ))}
        </>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 24,
    marginBottom: 12,
  },
});
