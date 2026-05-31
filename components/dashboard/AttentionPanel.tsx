import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AttentionItem as AttentionItemType, AttentionCategory, ATTENTION_CATEGORY_ORDER } from '@/types/attention';
import { AttentionItem } from './AttentionItem';
import { AllClearState } from './AllClearState';

const MAX_ITEMS_PER_CATEGORY = 5;

const CATEGORY_NAV_TARGETS: Record<AttentionCategory, string> = {
  OVERDUE_BOOKING: '/(tabs)/bookings/',
  STALLED_BOOKING: '/(tabs)/bookings/',
  UNASSIGNED_BOOKING: '/(tabs)/bookings/',
  LOW_RATED_REVIEW: '/(tabs)/reviews/',
  UNANSWERED_CHAT: '/(tabs)/chat/',
  PENDING_QUOTE: '/(tabs)/bookings/',
  NEW_QUOTE_REQUEST: '/(app)/quote-requests',
  LOW_STOCK: '/(app)/(tabs)/profile/inventory',
};

interface Props {
  items: AttentionItemType[];
  isLoading: boolean;
  isError: boolean;
  lastCheckedAt: Date | null;
  refetch: () => void;
}

function CategorySection({
  category,
  items,
  isRTL,
}: {
  category: AttentionCategory;
  items: AttentionItemType[];
  isRTL: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const visible = items.slice(0, MAX_ITEMS_PER_CATEGORY);
  const overflow = items.length - MAX_ITEMS_PER_CATEGORY;

  return (
    <View style={styles.categoryBlock}>
      <Text style={[styles.categoryTitle, isRTL && styles.textRtl]}>
        {t(`attention.categories.${category}`)}
      </Text>
      {visible.map((item) => (
        <AttentionItem key={item.id} item={item} />
      ))}
      {overflow > 0 && (
        <TouchableOpacity
          style={[styles.seeAllRow, isRTL && styles.seeAllRowRtl]}
          onPress={() => router.push(CATEGORY_NAV_TARGETS[category] as any)}
        >
          <Text style={styles.seeAllText}>
            {t('attention.seeAll', { count: items.length })}
          </Text>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={14}
            color="#2196F3"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AttentionPanel({ items, isLoading, isError, lastCheckedAt, refetch }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const renderBody = () => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={[styles.errorBanner, isRTL && styles.errorBannerRtl]}>
          <Ionicons name="alert-circle-outline" size={18} color="#F44336" />
          <Text style={styles.errorText}>{t('attention.errorMessage')}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('attention.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (items.length === 0) {
      return <AllClearState lastCheckedAt={lastCheckedAt} />;
    }

    return (
      <>
        {ATTENTION_CATEGORY_ORDER.map((category) => {
          const categoryItems = items.filter((i) => i.category === category);
          if (categoryItems.length === 0) return null;
          return (
            <CategorySection
              key={category}
              category={category}
              items={categoryItems}
              isRTL={isRTL}
            />
          );
        })}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>
        {t('attention.title')}
      </Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  textRtl: {
    textAlign: 'right',
  },
  centerContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
    gap: 8,
  },
  errorBannerRtl: {
    flexDirection: 'row-reverse',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#C53030',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F44336',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    gap: 2,
  },
  seeAllRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  seeAllText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
});
