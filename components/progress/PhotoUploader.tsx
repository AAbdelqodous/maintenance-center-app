import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface PhotoItem {
  uri: string;
  name: string;
}

interface Props {
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  currentPhotos?: PhotoItem[];
}

export default function PhotoUploader({ onPhotosChange, maxPhotos = 5, currentPhotos = [] }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [photos, setPhotos] = useState<PhotoItem[]>(currentPhotos);

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      const result = await (source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync)({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(t('common.error'), t('progress.photoTooLarge'));
          return;
        }

        const newPhoto: PhotoItem = {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
        };

        const updatedPhotos = [...photos, newPhoto];
        setPhotos(updatedPhotos);
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), 'Failed to pick image');
    }
  };

  const handleAddPhoto = () => {
    const options = [
      { text: t('progress.camera'), onPress: () => handlePickImage('camera') },
      { text: t('progress.gallery'), onPress: () => handlePickImage('gallery') },
      { text: t('common.cancel'), style: 'cancel' as const },
    ];
    Alert.alert(t('progress.uploadPhotos'), '', options);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <Text style={styles.label}>{t('progress.uploadPhotos')}</Text>
        <Text style={styles.count}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {canAddMore && (
        <TouchableOpacity
          style={[styles.addButton, isRTL && styles.addButtonRtl]}
          onPress={handleAddPhoto}
        >
          <Ionicons name="add-circle" size={24} color="#2196F3" />
          <Text style={styles.addButtonText}>{t('progress.uploadPhotos')}</Text>
        </TouchableOpacity>
      )}

      {photos.length > 0 && (
        <FlatList
          data={photos}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosList}
          renderItem={({ item, index }) => (
            <View style={styles.photoItem}>
              <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <Ionicons name="close-circle" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {!canAddMore && (
        <Text style={styles.maxPhotosText}>{t('progress.maxPhotos')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  count: {
    fontSize: 14,
    color: '#666666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  addButtonRtl: {
    flexDirection: 'row-reverse',
  },
  addButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  photosList: {
    marginTop: 12,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  maxPhotosText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
  },
});
