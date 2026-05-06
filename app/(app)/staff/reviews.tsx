import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetMyAssignedReviewsQuery } from '@/store/api/staffApi';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { RatingStars } from '@/components/ui/RatingStars';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Ionicons } from '@expo/vector-icons';

function StaffReviewsScreen() {
  const { t } = useTranslation();
  const { data: reviewsData, isLoading, refetch } = useGetMyAssignedReviewsQuery({ page: 0, size: 100 });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const averageRating = React.useMemo(() => {
    if (!reviewsData?.content?.length) return 0;
    return reviewsData.content.reduce((sum, r) => sum + r.rating, 0) / reviewsData.content.length;
  }, [reviewsData]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('staff.reviews.title')}</Text>
        {(reviewsData?.content?.length ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Text style={styles.avgRating}>{averageRating.toFixed(1)}</Text>
            <RatingStars rating={averageRating} />
          </View>
        )}
      </View>

      {reviewsData?.content?.length ? (
        <FlatList
          data={reviewsData.content}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ReviewCard review={item} showReplyAction={false} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="star-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>{t('staff.reviews.empty')}</Text>
        </View>
      )}
    </View>
  );
}

export default function StaffReviewsScreenWrapper() {
  return (
    <ErrorBoundary>
      <StaffReviewsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333333', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgRating: { fontSize: 18, fontWeight: '700', color: '#111827' },
  list: { paddingVertical: 8 },
  emptyText: { fontSize: 16, color: '#999999', marginTop: 16, textAlign: 'center' },
});
