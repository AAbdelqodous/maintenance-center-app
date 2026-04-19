import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetWorkProgressQuery, useGetBookingMediaQuery } from '@/store/api/workProgressApi';
import { getStageDisplayName } from '@/types/workProgress';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  bookingId: number;
}

export default function ProgressTimeline({ bookingId }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { data: progress, isLoading: isProgressLoading, isError: isProgressError, refetch: refetchProgress } = useGetWorkProgressQuery(bookingId);
  const { data: media } = useGetBookingMediaQuery(bookingId);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (photos: string[], index: number) => {
    setViewerPhotos(photos);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  if (isProgressLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (isProgressError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('progress.errorLoad')}</Text>
        <TouchableOpacity onPress={() => refetchProgress()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!progress || progress.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="albums-outline" size={64} color="#E0E0E0" />
        <Text style={styles.emptyText}>{t('progress.noEntries')}</Text>
      </View>
    );
  }

  const sortedProgress = [...progress].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const renderItem = ({ item }: { item: any }) => {
    const entryMedia = media?.filter(m => new Date(m.createdAt).getTime() >= new Date(item.createdAt).getTime()) || [];
    const entryPhotos = entryMedia.filter(m => m.mediaType === 'PHOTO').map(m => m.url);

    return (
      <View style={[styles.entryCard, isRTL && styles.entryCardRtl]}>
        <View style={styles.entryHeader}>
          <View style={[styles.stageBadge, isRTL && styles.rowRtl]}>
            <Text style={styles.stageText}>{getStageDisplayName(item.stage, i18n.language)}</Text>
          </View>
          <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>

        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}

        {item.internalNotes && (
          <View style={styles.internalNotesContainer}>
            <Text style={styles.internalNotesLabel}>{t('progress.internalOnly')}</Text>
            <Text style={styles.internalNotesText}>{item.internalNotes}</Text>
          </View>
        )}

        {entryPhotos.length > 0 && (
          <View style={[styles.photosContainer, isRTL && styles.rowRtl]}>
            {entryPhotos.map((photo, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => openViewer(entryPhotos, idx)}
              >
                <Image source={{ uri: photo }} style={styles.thumbnail} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {item.createdByName && (
          <Text style={styles.author}>{item.createdByName}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedProgress}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={viewerVisible}
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setViewerVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <FlatList
            data={viewerPhotos}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
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
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  entryCard: {
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
  entryCardRtl: {
    textAlign: 'right',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  stageBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stageText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
  },
  notes: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  internalNotesContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  internalNotesLabel: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  internalNotesText: {
    fontSize: 14,
    color: '#666666',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  author: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    textAlign: 'right',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
