import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetMyCenterServicesQuery,
  useDeleteCenterServiceMutation,
} from '@/store/api/centerApi';
import CategorySection from '@/components/services/CategorySection';
import type { ServiceCategory, CenterServiceResponse } from '@/store/api/centerApi';

export default function MyServicesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetMyCenterServicesQuery();
  const [deleteCenterService] = useDeleteCenterServiceMutation();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const grouped = useMemo(() => {
    const map = new Map<number, { category: ServiceCategory; services: CenterServiceResponse[] }>();
    (data ?? []).forEach((s) => {
      if (!map.has(s.category.id)) {
        map.set(s.category.id, { category: s.category, services: [] });
      }
      map.get(s.category.id)!.services.push(s);
    });
    return Array.from(map.values());
  }, [data]);

  const handleDelete = useCallback(
    (id: number) => {
      const doDelete = async () => {
        try {
          await deleteCenterService(id).unwrap();
        } catch {
          if (Platform.OS === 'web') {
            window.alert(t('services.errorDelete'));
          } else {
            Alert.alert(t('common.error'), t('services.errorDelete'));
          }
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm(t('services.deleteConfirmWeb'))) doDelete();
      } else {
        Alert.alert(t('services.deleteConfirmTitle'), t('services.deleteConfirmMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: doDelete },
        ]);
      }
    },
    [deleteCenterService, t]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('services.errorLoad')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={64} color="#E0E0E0" />
        <Text style={styles.emptyTitle}>{t('services.noServices')}</Text>
        <Text style={styles.emptySubtitle}>{t('services.noServicesSubtitle')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(app)/(tabs)/profile/services/add' as any)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t('services.addFirstService')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {grouped.map(({ category, services }) => (
          <CategorySection
            key={category.id}
            category={category}
            services={services}
            onEditService={(id) =>
              router.push(`/(app)/(tabs)/profile/services/${id}` as any)
            }
            onDeleteService={handleDelete}
          />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/(tabs)/profile/services/add' as any)}
        accessibilityLabel={t('services.addService')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 88,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
