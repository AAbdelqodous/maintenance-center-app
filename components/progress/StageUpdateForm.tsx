import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUpdateWorkStageMutation } from '@/store/api/workProgressApi';
import WorkStageSelector from '../bookings/WorkStageSelector';
import { WorkStage } from '@/types/workProgress';

interface Props {
  bookingId: number;
  currentStage: WorkStage;
  onSuccess: () => void;
}

export default function StageUpdateForm({ bookingId, currentStage, onSuccess }: Props) {
  const { t } = useTranslation();
  const [updateWorkStage, { isLoading }] = useUpdateWorkStageMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async (stage: WorkStage, notes?: string) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      await updateWorkStage({
        bookingId,
        data: { stage, notes },
      }).unwrap();
      setSuccessMessage(t('progress.stageUpdated'));
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (error) {
      console.error('Failed to update stage:', error);
      setErrorMessage(t('progress.errorStageUpdate'));
    }
  };

  return (
    <View>
      {successMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.bannerText}>{successMessage}</Text>
        </View>
      )}
      
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.bannerText}>{errorMessage}</Text>
        </View>
      )}

      <WorkStageSelector
        currentStage={currentStage}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 14,
  },
});
