import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SatisfactionSummary as SatisfactionSummaryType } from '@/types/analytics';
import { RatingStars } from '@/components/ui/RatingStars';
import { Ionicons } from '@expo/vector-icons';

interface SatisfactionSummaryProps {
  data: SatisfactionSummaryType | undefined;
  isLoading: boolean;
}

export function SatisfactionSummary({ data, isLoading }: SatisfactionSummaryProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('analytics.satisfaction.title')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!data || data.totalReviews === 0) {
    return null;
  }

  const getTrendIcon = () => {
    if (data.previousPeriodAverage === null) return null;
    
    const difference = data.averageRating - data.previousPeriodAverage;
    if (difference > 0) {
      return <Ionicons name="trending-up" size={16} color="#4CAF50" />;
    } else if (difference < 0) {
      return <Ionicons name="trending-down" size={16} color="#F44336" />;
    }
    return <Ionicons name="remove" size={16} color="#9E9E9E" />;
  };

  const getTrendColor = () => {
    if (data.previousPeriodAverage === null) return '#9E9E9E';
    
    const difference = data.averageRating - data.previousPeriodAverage;
    if (difference > 0) return '#4CAF50';
    if (difference < 0) return '#F44336';
    return '#9E9E9E';
  };

  const distribution = Array.isArray(data.distribution) ? data.distribution : [];
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('analytics.satisfaction.title')}</Text>

      <View style={styles.container}>
        <View style={[styles.header, isRTL && styles.headerRtl]}>
          <View style={styles.ratingDisplay}>
            <RatingStars rating={data.averageRating} size={28} />
            <Text style={styles.ratingValue}>{data.averageRating?.toFixed(1)}</Text>
          </View>
          
          <View style={[styles.trendInfo, isRTL && styles.trendInfoRtl]}>
            <Text style={styles.totalReviews}>
              {data.totalReviews} {t('analytics.satisfaction.reviews')}
            </Text>
            {data.previousPeriodAverage !== null && (
              <View style={[styles.trend, isRTL && styles.trendRtl]}>
                {getTrendIcon()}
                <Text style={[styles.trendText, { color: getTrendColor() }]}>
                  {data.previousPeriodAverage?.toFixed(1)} {t('analytics.satisfaction.trendUp')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.distribution}>
          {distribution.map((item) => {
            const percentage = (item.count / maxCount) * 100;
            return (
              <View key={item.stars} style={[styles.barRow, isRTL && styles.barRowRtl]}>
                <View style={[styles.starLabel, isRTL && styles.starLabelRtl]}>
                  <Text style={styles.starText}>{item.stars}</Text>
                  <Ionicons name="star" size={14} color="#FFD700" />
                </View>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${Math.max(percentage, 2)}%` }]} />
                  <Text style={styles.countText}>{item.count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  trendInfo: {
    alignItems: 'flex-end',
  },
  trendInfoRtl: {
    alignItems: 'flex-start',
  },
  totalReviews: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendRtl: {
    flexDirection: 'row-reverse',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  distribution: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barRowRtl: {
    flexDirection: 'row-reverse',
  },
  starLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 40,
  },
  starLabelRtl: {
    flexDirection: 'row-reverse',
  },
  starText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  bar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
    position: 'absolute',
  },
  countText: {
    fontSize: 12,
    color: '#666666',
    position: 'absolute',
    right: 0,
    fontWeight: '500',
  },
});
