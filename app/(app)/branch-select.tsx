import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyCentersQuery } from '@/store/api/centerApi';
import { useAppDispatch } from '@/store';
import { setActiveCenterId, clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import { CenterSummary } from '@/store/api/centerApi';

export default function BranchSelectScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';
  const { data: centers, isLoading, error } = useGetMyCentersQuery();

  useEffect(() => {
    if (!isLoading && centers && centers.length === 1) {
      handleSelectBranch(centers[0]);
    }
  }, [isLoading, centers]);

  const handleSelectBranch = async (center: CenterSummary) => {
    await storage.saveActiveCenterId(center.id);
    dispatch(setActiveCenterId(center.id));
    router.replace('/(app)/(tabs)/');
  };

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('branchSelect.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('branchSelect.logout'), t('branchSelect.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('branchSelect.logout'), onPress: doLogout },
      ]);
    }
  };

  const renderCenterItem = ({ item }: { item: CenterSummary }) => (
    <TouchableOpacity
      style={[styles.centerCard, isRTL && styles.cardRtl]}
      onPress={() => handleSelectBranch(item)}
      activeOpacity={0.7}
    >
      {item.logoUrl ? (
        <Image
          source={{ uri: item.logoUrl.startsWith('http') ? item.logoUrl : item.logoUrl }}
          style={styles.centerLogo}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.centerLogo, styles.centerLogoPlaceholder]}>
          <Ionicons name="business-outline" size={40} color="#9E9E9E" />
        </View>
      )}
      <View style={[styles.centerInfo, isRTL && styles.infoRtl]}>
        <Text style={styles.centerName}>
          {i18n.language === 'ar' ? item.nameAr : item.nameEn}
        </Text>
        <View style={[styles.ratingRow, isRTL && styles.rowRtl]}>
          <Ionicons name="star" size={16} color="#FFC107" />
          <Text style={styles.ratingText}>
            {item.averageRating.toFixed(1)} ({item.totalReviews} {t('branchSelect.reviews')})
          </Text>
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, item.isActive ? styles.statusActiveText : styles.statusInactiveText]}>
            {item.isActive ? t('branchSelect.active') : t('branchSelect.inactive')}
          </Text>
        </View>
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={24}
        color="#9E9E9E"
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (error || !centers || centers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>{t('branchSelect.noCenter')}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{t('branchSelect.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (centers.length === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('branchSelect.title')}</Text>
        <Text style={styles.subtitle}>{t('branchSelect.subtitle')}</Text>
      </View>
      <FlatList
        data={centers}
        renderItem={renderCenterItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity style={styles.bottomLogoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.bottomLogoutButtonText}>{t('branchSelect.logout')}</Text>
      </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  listContainer: {
    padding: 16,
  },
  centerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  cardRtl: {
    flexDirection: 'row-reverse',
  },
  centerLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  centerLogoPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  centerInfo: {
    flex: 1,
  },
  infoRtl: {
    marginRight: 16,
  },
  centerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#4CAF50' + '20',
  },
  statusInactive: {
    backgroundColor: '#F44336' + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActiveText: {
    color: '#4CAF50',
  },
  statusInactiveText: {
    color: '#F44336',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bottomLogoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});
