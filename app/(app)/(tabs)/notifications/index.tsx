import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '@/store/api/notificationsApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
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
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id).unwrap();
        refetch();
      } catch (error) {
        console.error('Failed to mark as read', error);
      }
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED':
      case 'BOOKING_UPDATED':
      case 'BOOKING_CANCELLED':
        return 'calendar';
      case 'NEW_REVIEW':
        return 'star';
      case 'NEW_MESSAGE':
        return 'chatbubbles';
      case 'COMPLAINT_SUBMITTED':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        {notificationsData?.content && notificationsData.content.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllRead}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {notificationsData?.content && notificationsData.content.length > 0 ? (
        <FlatList
          data={notificationsData.content}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notificationItem, !item.isRead && styles.unreadItem, isRTL && styles.itemRtl]}
              onPress={() => handleNotificationPress(item)}
            >
              {!item.isRead && <View style={styles.unreadIndicator} />}
              <View style={styles.iconContainer}>
                <Ionicons name={getNotificationIcon(item.notificationType) as any} size={24} color="#2196F3" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                  {i18n.language === 'ar' ? item.titleAr : item.titleEn}
                </Text>
                <Text style={styles.notificationBody}>
                  {i18n.language === 'ar' ? item.bodyAr : item.bodyEn}
                </Text>
                <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  markAllRead: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemRtl: {
    flexDirection: 'row-reverse',
  },
  unreadItem: {
    backgroundColor: '#F5F9FF',
  },
  unreadIndicator: {
    width: 4,
    backgroundColor: '#2196F3',
    borderRadius: 2,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
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
    marginTop: 16,
    textAlign: 'center',
  },
});
