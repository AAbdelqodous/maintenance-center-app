import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetReviewsQuery } from '@/store/api/reviewsApi';
import { useGetMyCenterQuery } from '@/store/api/centerApi';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { RatingStars } from '@/components/ui/RatingStars';

export default function ReviewsScreen() {
  const { t } = useTranslation();

  const { data: reviewsData, isLoading, refetch } = useGetReviewsQuery({ page: 0, size: 100 });
  const { data: centerData } = useGetMyCenterQuery();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const calculateAverageRating = () => {
    if (!reviewsData?.content || reviewsData.content.length === 0) return 0;
    const sum = reviewsData.content.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviewsData.content.length;
  };

  const averageRating = centerData?.averageRating ?? calculateAverageRating();
  const totalReviews = centerData?.totalReviews ?? reviewsData?.content.length ?? 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.ratingContainer}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <RatingStars rating={averageRating} />
          <Text style={styles.totalReviews}>{totalReviews} {t('reviews.title')}</Text>
        </View>
      </View>

      {reviewsData?.content && reviewsData.content.length > 0 ? (
        <FlatList
          data={reviewsData.content}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ReviewCard review={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('reviews.noReviews')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalReviews: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
});
