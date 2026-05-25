import React from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetDepartmentsQuery } from '@/store/api/departmentsApi';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import type { Department } from '@/types/department';

function DepartmentListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: departments = [], isLoading, isFetching, refetch } = useGetDepartmentsQuery();

  const sorted = [...departments].sort((a, b) => {
    if (a.isActive === b.isActive) return a.displayOrder - b.displayOrder;
    return a.isActive ? -1 : 1;
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sorted.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="grid-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('departments.empty')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/staff/departments/add' as any)}
          >
            <Text style={styles.addButtonText}>{t('departments.add')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item: Department) => item.id.toString()}
          renderItem={({ item }) => (
            <DepartmentCard
              department={item}
              onPress={() => router.push(`/staff/departments/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/staff/departments/add' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export default function DepartmentListWrapper() {
  return (
    <ErrorBoundary>
      <DepartmentListScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  listContent: {
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
