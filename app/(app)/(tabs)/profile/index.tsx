import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, Switch, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useGetMyCenterQuery, useUpdateCenterMutation, useUploadCenterImageMutation, useDeleteCenterImageMutation, useGetMyCenterServicesQuery } from '@/store/api/centerApi';
import type { ServiceCategory } from '@/store/api/centerApi';
import * as ImagePicker from 'expo-image-picker';
import { resolveImageUrl } from '@/lib/constants/config';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearSession } from '@/store/authSlice';
import { clearActiveCenter } from '@/store/centerSlice';
import { storage } from '@/lib/storage';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { TimePickerField } from '@/components/ui/TimePickerField';
import { useGetMyMembershipsQuery } from '@/store/api/staffApi';
import { RoleBadge } from '@/components/staff/RoleBadge';
import type { CenterRole } from '@/types/staff';

function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';
  const activePermissions = useAppSelector((state) => state.center.activePermissions);
  const canRespondToQuotes = activePermissions.includes('RESPOND_TO_QUOTES');
  const canViewRevenue = activePermissions.includes('VIEW_REVENUE');
  const canViewInventory = activePermissions.includes('CONSUME_PARTS') || activePermissions.includes('MANAGE_INVENTORY');

  const { data: center, isLoading, refetch, error: centerError } = useGetMyCenterQuery();
  const { data: centerServices } = useGetMyCenterServicesQuery();
  const [updateCenter, { isLoading: isUpdating, error: updateError }] = useUpdateCenterMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadCenterImageMutation();
  const [deleteImage] = useDeleteCenterImageMutation();


  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [cityAr, setCityAr] = useState('');
  const [cityEn, setCityEn] = useState('');
  const [districtAr, setDistrictAr] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [streetAr, setStreetAr] = useState('');
  const [streetEn, setStreetEn] = useState('');

  React.useEffect(() => {
    if (center) {
      setNameAr(center.nameAr ?? '');
      setNameEn(center.nameEn ?? '');
      setDescriptionAr(center.descriptionAr ?? '');
      setDescriptionEn(center.descriptionEn ?? '');
      setPhone(center.phone ?? '');
      setEmail(center.email ?? '');
      setOpeningTime(center.openingTime ?? '');
      setClosingTime(center.closingTime ?? '');
      setIsActive(center.isActive ?? false);
      setCityAr(center.address?.cityAr ?? '');
      setCityEn(center.address?.cityEn ?? '');
      setDistrictAr(center.address?.districtAr ?? '');
      setDistrictEn(center.address?.districtEn ?? '');
      setStreetAr(center.address?.streetAr ?? '');
      setStreetEn(center.address?.streetEn ?? '');
    }
  }, [center]);

  const handleUpdateProfile = async () => {
    if (!nameAr || !nameEn || !phone || !cityAr || !cityEn) {
      Alert.alert(t('common.error'), t('common.fillRequired'));
      return;
    }

    try {
      await updateCenter({
        nameAr,
        nameEn,
        descriptionAr,
        descriptionEn,
        phone,
        email,
        openingTime: openingTime || undefined,
        closingTime: closingTime || undefined,
        isActive,
        address: { cityAr, cityEn, districtAr, districtEn, streetAr, streetEn },
      }).unwrap();
      Alert.alert(t('common.save'), t('profile.profileUpdated'));
      refetch();
    } catch (error: any) {
      const msg = error?.data?.businessErrorDescription ?? error?.data?.error ?? t('common.error');
      Alert.alert(t('common.error'), msg);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const formData = new FormData();

        if ((asset as any).file) {
          formData.append('file', (asset as any).file, asset.fileName ?? 'photo.jpg');
        } else {
          formData.append('file', {
            uri: asset.uri,
            name: asset.fileName ?? 'photo.jpg',
            type: asset.mimeType ?? 'image/jpeg',
          } as any);
        }

        console.log('Uploading image...');
        const uploadResult = await uploadImage(formData).unwrap();
        console.log('Upload success, result:', uploadResult);
        const refetchResult = await refetch();
        console.log('Refetch result imageUrls:', (refetchResult.data as any)?.imageUrls);
      }
    } catch (error: any) {
      console.error('Upload failed:', JSON.stringify(error));
      const msg = error?.data?.error ?? error?.data?.businessErrorDescription ?? 'Failed to upload image';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    Alert.alert(
      t('common.delete'),
      'Are you sure you want to delete this image?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: async () => {
            try {
              await deleteImage(imageUrl).unwrap();
              refetch();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), onPress: doLogout },
      ]);
    }
  };

  const derivedCategories = React.useMemo<ServiceCategory[]>(() => {
    if (!centerServices) return [];
    const seen = new Set<number>();
    return centerServices
      .filter((s) => s.isActive)
      .reduce<ServiceCategory[]>((acc, s) => {
        if (!seen.has(s.category.id)) {
          seen.add(s.category.id);
          acc.push(s.category);
        }
        return acc;
      }, []);
  }, [centerServices]);

  const InputField = ({ label, value, onChangeText, placeholder, multiline = false }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isRTL && styles.rtlInput, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9E9E9E"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: center ? (i18n.language === 'ar' ? center.nameAr : center.nameEn) : t('profile.title'),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={24} color="#333333" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.centerName')}</Text>
        <InputField
          label={`${t('profile.centerName')} (العربية)`}
          value={nameAr}
          onChangeText={setNameAr}
          placeholder="اسم المركز"
        />
        <InputField
          label={`${t('profile.centerName')} (English)`}
          value={nameEn}
          onChangeText={setNameEn}
          placeholder="Center Name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.description')}</Text>
        <InputField
          label={`${t('profile.description')} (العربية)`}
          value={descriptionAr}
          onChangeText={setDescriptionAr}
          placeholder="وصف المركز"
          multiline
        />
        <InputField
          label={`${t('profile.description')} (English)`}
          value={descriptionEn}
          onChangeText={setDescriptionEn}
          placeholder="Center Description"
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('common.contact')}</Text>
        <InputField
          label={t('profile.phone')}
          value={phone}
          onChangeText={setPhone}
          placeholder="+965 XXXX XXXX"
          keyboardType="phone-pad"
        />
        <InputField
          label={t('profile.email')}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TimePickerField
          label={t('profile.openingTime')}
          value={openingTime}
          onChange={setOpeningTime}
          isRTL={isRTL}
        />
        <TimePickerField
          label={t('profile.closingTime')}
          value={closingTime}
          onChange={setClosingTime}
          isRTL={isRTL}
        />
        <View style={[styles.switchRow, isRTL && styles.rowRtl]}>
          <Text style={styles.switchLabel}>{center?.isActive ? t('profile.isOpen') : t('profile.isClosed')}</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
            thumbColor={isActive ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.address')}</Text>
        <InputField
          label={`${t('profile.city')} (العربية)`}
          value={cityAr}
          onChangeText={setCityAr}
          placeholder="الكويت"
        />
        <InputField
          label={`${t('profile.city')} (English)`}
          value={cityEn}
          onChangeText={setCityEn}
          placeholder="Kuwait City"
        />
        <InputField
          label={`${t('profile.area')} (العربية)`}
          value={districtAr}
          onChangeText={setDistrictAr}
          placeholder="الروضة"
        />
        <InputField
          label={`${t('profile.area')} (English)`}
          value={districtEn}
          onChangeText={setDistrictEn}
          placeholder="Rumaithiya"
        />
        <InputField
          label={`${t('profile.street')} (العربية)`}
          value={streetAr}
          onChangeText={setStreetAr}
          placeholder="شارع الخليج"
        />
        <InputField
          label={`${t('profile.street')} (English)`}
          value={streetEn}
          onChangeText={setStreetEn}
          placeholder="Gulf Road"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('services.categoriesServed')}</Text>
        <View style={styles.categoriesGrid}>
          {derivedCategories.length === 0 ? (
            <Text style={styles.noPhotos}>{t('services.noServices')}</Text>
          ) : (
            derivedCategories.map((cat) => (
              <View key={cat.id} style={styles.categoryChipSelected}>
                <Text style={styles.categoryChipTextSelected}>
                  {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.rowRtl]}>
          <Text style={styles.sectionTitle}>{t('profile.photos')}</Text>
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={handlePickImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addPhotoText}>{t('profile.addPhoto')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {center?.imageUrls && center.imageUrls.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            {center.imageUrls.map((imageUrl, index) => (
              <View key={index} style={styles.photoItem}>
                <Image
                  source={{ uri: resolveImageUrl(imageUrl) ?? undefined }}
                  style={styles.photo}
                  onError={(e) => console.error('Image load error:', imageUrl, e.nativeEvent)}
                  onLoad={() => console.log('Image loaded OK:', imageUrl)}
                />
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() => handleDeleteImage(imageUrl)}
                >
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noPhotos}>{t('common.noData')}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleUpdateProfile}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>{t('profile.updateProfile')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.section}>
        {canRespondToQuotes && (
          <TouchableOpacity
            style={[styles.menuRow, isRTL && styles.rowRtl]}
            onPress={() => router.push('/(app)/quote-requests' as any)}
          >
            <Ionicons name="pricetags-outline" size={20} color="#2196F3" />
            <Text style={styles.menuRowText}>{t('quoteRequests.entry')}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}

        {canViewRevenue && (
          <TouchableOpacity
            style={[styles.menuRow, isRTL && styles.rowRtl]}
            onPress={() => router.push('/(app)/earnings' as any)}
          >
            <Ionicons name="cash-outline" size={20} color="#2E7D32" />
            <Text style={styles.menuRowText}>{t('earnings.entry')}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}

        {canViewInventory && (
          <TouchableOpacity
            style={[styles.menuRow, isRTL && styles.rowRtl]}
            onPress={() => router.push('/(app)/(tabs)/profile/inventory' as any)}
          >
            <Ionicons name="cube-outline" size={20} color="#7B1FA2" />
            <Text style={styles.menuRowText}>{t('inventory.entry')}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.menuRow, isRTL && styles.rowRtl]}
          onPress={() => router.push('/(app)/(tabs)/profile/services' as any)}
        >
          <Ionicons name="construct-outline" size={20} color="#2196F3" />
          <Text style={styles.menuRowText}>{t('services.manageServices')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, isRTL && styles.rowRtl]}
          onPress={() => router.push('/(app)/(tabs)/profile/trust' as any)}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#FF9800" />
          <Text style={styles.menuRowText}>{t('trustBadge.title')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, isRTL && styles.rowRtl]}
          onPress={() => router.push('/(app)/(tabs)/profile/offers' as any)}
        >
          <Ionicons name="megaphone-outline" size={20} color="#9C27B0" />
          <Text style={styles.menuRowText}>{t('offers.title')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, isRTL && styles.rowRtl]}
          onPress={() => router.push('/(app)/(tabs)/profile/staff' as any)}
        >
          <Ionicons name="people-outline" size={20} color="#009688" />
          <Text style={styles.menuRowText}>{t('staff.title')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9E9E9E" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
  );
}

function MemberProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isRTL = i18n.dir() === 'rtl';

  const session = useAppSelector((state) => state.auth.session);
  const activeUserRole = useAppSelector((state) => state.center.activeUserRole);

  const { data: memberships, isLoading } = useGetMyMembershipsQuery();
  const membership = memberships?.[0];

  const centerName = membership
    ? (i18n.language === 'ar' ? membership.centerNameAr : membership.centerNameEn)
    : null;

  const initials = [session?.firstname, session?.email?.charAt(0).toUpperCase()]
    .filter(Boolean)
    .map((s) => s!.charAt(0).toUpperCase())
    .join('');

  const doLogout = async () => {
    await storage.clearAll();
    dispatch(clearSession());
    dispatch(clearActiveCenter());
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) doLogout();
    } else {
      Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={memberStyles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={memberStyles.container} contentContainerStyle={memberStyles.content}>
      {/* Avatar */}
      <View style={memberStyles.avatarSection}>
        <View style={memberStyles.avatar}>
          <Text style={memberStyles.avatarText}>{initials}</Text>
        </View>
        <Text style={memberStyles.name}>{session?.firstname ?? session?.email}</Text>
        <Text style={memberStyles.email}>{session?.email}</Text>
        {activeUserRole && (
          <View style={memberStyles.badgeRow}>
            <RoleBadge role={activeUserRole as CenterRole} />
          </View>
        )}
      </View>

      {/* Center info */}
      {centerName && (
        <View style={memberStyles.section}>
          <Text style={[memberStyles.sectionTitle, isRTL && memberStyles.rtl]}>{t('profile.member.center')}</Text>
          <View style={memberStyles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#6B7280" />
            <Text style={[memberStyles.infoText, isRTL && memberStyles.rtl]}>{centerName}</Text>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={memberStyles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={memberStyles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const memberStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 24, paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#BBDEFB', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#1565C0' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  badgeRow: { marginTop: 4 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  sectionTitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rtl: { textAlign: 'right' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, marginTop: 8,
  },
  logoutText: { color: '#F44336', fontSize: 16, fontWeight: '600' },
});

export default function ProfileScreenWrapper() {
  const userType = useAppSelector((state) => state.auth.session?.userType);
  return (
    <ErrorBoundary>
      {userType === 'STAFF' ? <MemberProfileScreen /> : <ProfileScreen />}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333333',
  },
  photosContainer: {
    flexDirection: 'row',
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addPhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666666',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noPhotos: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuRowText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
});
