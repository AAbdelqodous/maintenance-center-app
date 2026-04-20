import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateWorkProgressMutation } from '@/store/api/workProgressApi';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '@/lib/constants/config';
import { useAppSelector } from '@/store';
import PhotoUploader from '@/components/progress/PhotoUploader';

export default function AddProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  
  const [createWorkProgress, { isLoading: isCreating }] = useCreateWorkProgressMutation();
  const token = useAppSelector((state) => state.auth.session?.token);
  
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; name: string }[]>([]);
  const [uploadStates, setUploadStates] = useState<Record<number, { progress: number; error?: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token) {
      Alert.alert(t('common.error'), 'Authentication required');
      return;
    }

    setErrorMessage(null);
    
    try {
      const progressResult = await createWorkProgress({
        bookingId: Number(bookingId),
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        estimatedMinutesRemaining: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
      }).unwrap();

      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          setUploadStates(prev => ({ ...prev, [i]: { progress: 0 } }));
          
          try {
            await FileSystem.uploadAsync(
              `${API_BASE_URL}bookings/${bookingId}/media`,
              photo.uri,
              {
                headers: { Authorization: `Bearer ${token}` },
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file',
              }
            );
            setUploadStates(prev => ({ ...prev, [i]: { progress: 100 } }));
          } catch (uploadError) {
            console.error('Upload failed:', uploadError);
            setUploadStates(prev => ({ ...prev, [i]: { progress: 0, error: t('progress.uploadError') } }));
          }
        }
      }

      router.back();
    } catch (error) {
      console.error('Failed to create progress:', error);
      setErrorMessage(t('progress.errorSave'));
    }
  };

  const hasUploadError = Object.values(uploadStates).some(state => state.error);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('progress.notes')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('progress.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('progress.internalNotes')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('progress.internalNotes')}
            value={internalNotes}
            onChangeText={setInternalNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('progress.estimatedTime')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="30"
            value={estimatedTime}
            onChangeText={setEstimatedTime}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        <PhotoUploader
          onPhotosChange={setPhotos}
          currentPhotos={photos}
        />

        {hasUploadError && (
          <Text style={styles.uploadErrorText}>
            {t('progress.uploadError')}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (isCreating || hasUploadError) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isCreating || hasUploadError}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 80,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadErrorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 8,
  },
});
