import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyCenterQuery, useUpdateCenterMutation, useUploadCenterImageMutation, useDeleteCenterImageMutation } from '../../../store/api/centerApi';
import * as ImagePicker from 'expo-image-picker';
import { SERVER_URL } from '../../../lib/constants/config';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data: center, isLoading, refetch } = useGetMyCenterQuery();
  const [updateCenter, { isLoading: isUpdating }] = useUpdateCenterMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadCenterImageMutation();
  const [deleteImage] = useDeleteCenterImageMutation();

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [street, setStreet] = useState('');

  React.useEffect(() => {
    if (center) {
      setNameAr(center.nameAr);
      setNameEn(center.nameEn);
      setDescriptionAr(center.descriptionAr || '');
      setDescriptionEn(center.descriptionEn || '');
      setPhone(center.phone);
      setEmail(center.email || '');
      setOpeningHours(center.openingHours || '');
      setIsOpen(center.isOpen);
      setCity(center.address.city);
      setArea(center.address.area);
      setStreet(center.address.street);
    }
  }, [center]);

  const handleUpdateProfile = async () => {
    if (!nameAr || !nameEn || !phone || !city || !area || !street) {
      Alert.alert(t('common.error'), 'Please fill in all required fields');
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
        openingHours,
        isOpen,
        address: {
          city,
          area,
          street,
        },
      }).unwrap();
      Alert.alert(t('common.save'), t('profile.profileUpdated'));
      refetch();
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to update profile');
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

        await uploadImage(formData).unwrap();
        refetch();
      }
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to upload image');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
          placeholder="+966 50 123 4567"
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
        <InputField
          label={t('profile.openingHours')}
          value={openingHours}
          onChangeText={setOpeningHours}
          placeholder="9:00 AM - 9:00 PM"
        />
        <View style={[styles.switchRow, isRTL && styles.rowRtl]}>
          <Text style={styles.switchLabel}>{center?.isOpen ? t('profile.isOpen') : t('profile.isClosed')}</Text>
          <Switch
            value={isOpen}
            onValueChange={setIsOpen}
            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
            thumbColor={isOpen ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.address')}</Text>
        <InputField
          label={t('profile.city')}
          value={city}
          onChangeText={setCity}
          placeholder="Riyadh"
        />
        <InputField
          label={t('profile.area')}
          value={area}
          onChangeText={setArea}
          placeholder="Al Olaya"
        />
        <InputField
          label="Street"
          value={street}
          onChangeText={setStreet}
          placeholder="King Fahd Road"
        />
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
                  source={{ uri: imageUrl.startsWith('http') ? imageUrl : SERVER_URL + imageUrl }}
                  style={styles.photo}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
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
});
