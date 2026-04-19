import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getAvailableNextStages, getStageDisplayName, WorkStage } from '@/types/workProgress';

interface Props {
  currentStage: WorkStage;
  onConfirm: (stage: WorkStage, notes?: string) => void;
  isLoading: boolean;
}

export default function WorkStageSelector({ currentStage, onConfirm, isLoading }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [selectedStage, setSelectedStage] = useState<WorkStage | null>(null);
  const [notes, setNotes] = useState('');

  const nextStages = getAvailableNextStages(currentStage);

  if (nextStages.length === 0) {
    return null;
  }

  if (!selectedStage) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('progress.selectStage')}</Text>
        <View style={styles.stagesContainer}>
          {nextStages.map((stage) => (
            <TouchableOpacity
              key={stage.stage}
              style={[styles.stageButton, isRTL && styles.stageButtonRtl]}
              onPress={() => setSelectedStage(stage.stage)}
              disabled={isLoading}
            >
              <Text style={styles.stageButtonText}>
                {getStageDisplayName(stage.stage, i18n.language)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const handleConfirm = () => {
    onConfirm(selectedStage, notes || undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('progress.selectStage')}</Text>
      <View style={styles.stagesContainer}>
        {nextStages.map((stage) => (
          <TouchableOpacity
            key={stage.stage}
            style={[
              styles.stageButton,
              selectedStage === stage.stage && styles.stageButtonSelected,
              isRTL && styles.stageButtonRtl
            ]}
            onPress={() => setSelectedStage(stage.stage)}
            disabled={isLoading}
          >
            <Text style={[
              styles.stageButtonText,
              selectedStage === stage.stage && styles.stageButtonTextSelected
            ]}>
              {getStageDisplayName(stage.stage, i18n.language)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notesContainer}>
        <Text style={styles.notesLabel}>{t('progress.notesForCustomer')}</Text>
        <TextInput
          style={[styles.notesInput, isRTL && styles.rtlInput]}
          placeholder={t('progress.notesForCustomer')}
          value={notes}
          onChangeText={setNotes}
          maxLength={500}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{notes.length}/500</Text>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.confirmButtonText}>{t('progress.confirmSend')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  stagesContainer: {
    gap: 8,
  },
  stageButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stageButtonRtl: {
    textAlign: 'right',
  },
  stageButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  stageButtonText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  stageButtonTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    minHeight: 80,
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
