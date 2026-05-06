import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '@/store/api/notificationsApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

function StaffNotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const { data: notificationsData, isLoading, refetch } = useGetNotificationsQuery({ page: 0, size: 100 });
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch {}
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id).unwrap();
        refetch();
      } catch {}
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    if (type.startsWith('BOOKING')) return 'calendar';
    if (type === 'NEW_REVIEW') return 'star';
    if (type === 'NEW_MESSAGE') return 'chatbubbles';
    return 'notifications';
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        {notificationsData?.content?.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllRead}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {notificationsData?.content?.length ? (
        <FlatList
          data={notificationsData.content}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.isRead && styles.unreadItem, isRTL && styles.itemRtl]}
              onPress={() => handleNotificationPress(item)}
            >
              {!item.isRead && <View style={styles.unreadDot} />}
              <View style={styles.iconWrap}>
                <Ionicons name={getIcon(item.notificationType) as any} size={24} color="#4F46E5" />
              </View>
              <View style={styles.body}>
                <Text style={styles.itemTitle}>
                  {i18n.language === 'ar' ? item.titleAr : item.titleEn}
                </Text>
                <Text style={styles.itemBody}>
                  {i18n.language === 'ar' ? item.bodyAr : item.bodyEn}
                </Text>
                <Text style={styles.itemTime}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
        </View>
      )}
    </View>
  );
}

export default function StaffNotificationsWrapper() {
  return (
    <ErrorBoundary>
      <StaffNotificationsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerRtl: { flexDirection: 'row-reverse' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333333' },
  markAllRead: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemRtl: { flexDirection: 'row-reverse' },
  unreadItem: { backgroundColor: '#F5F3FF' },
  unreadDot: { width: 4, backgroundColor: '#4F46E5', borderRadius: 2, marginRight: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  body: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 4 },
  itemBody: { fontSize: 14, color: '#666666', marginBottom: 4 },
  itemTime: { fontSize: 12, color: '#999999' },
  emptyText: { fontSize: 16, color: '#999999', marginTop: 16, textAlign: 'center' },
});
