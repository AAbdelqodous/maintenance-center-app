import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Review } from '../../store/api/reviewsApi';
import { RatingStars } from '../ui/RatingStars';
import { useReplyToReviewMutation } from '../../store/api/reviewsApi';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [reply, setReply] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submitReply, { isLoading }] = useReplyToReviewMutation();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubmitReply = async () => {
    if (!reply.trim()) {
      Alert.alert(t('common.error'), t('reviews.replyPlaceholder'));
      return;
    }

    try {
      await submitReply({ id: review.id, reply }).unwrap();
      setReply('');
      setShowReplyForm(false);
      Alert.alert(t('common.save'), t('reviews.submitReply'));
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to submit reply');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowRtl]}>
        <View>
          <Text style={styles.customerName}>{review.userFirstname} {review.userLastname}</Text>
          <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
        </View>
        <RatingStars rating={review.rating} />
      </View>
      <Text style={styles.comment}>{review.comment}</Text>

      {review.ownerReply ? (
        <View style={[styles.replyContainer, isRTL && styles.replyRtl]}>
          <Text style={styles.replyLabel}>{t('reviews.reply')}:</Text>
          <Text style={styles.replyText}>{review.ownerReply}</Text>
        </View>
      ) : (
        !showReplyForm && (
          <TouchableOpacity style={styles.replyButton} onPress={() => setShowReplyForm(true)}>
            <Text style={styles.replyButtonText}>{t('reviews.reply')}</Text>
          </TouchableOpacity>
        )
      )}

      {showReplyForm && !review.ownerReply && (
        <View style={styles.replyFormContainer}>
          <TextInput
            style={[styles.replyInput, isRTL && styles.rtlInput]}
            value={reply}
            onChangeText={setReply}
            placeholder={t('reviews.replyPlaceholder')}
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={3}
          />
          <View style={[styles.buttonRow, isRTL && styles.rowRtl]}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowReplyForm(false)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmitReply} disabled={isLoading}>
              <Text style={styles.submitButtonText}>{isLoading ? t('common.loading') : t('reviews.submitReply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  date: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  comment: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 12,
  },
  replyContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  replyRtl: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: '#2196F3',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
  },
  replyButton: {
    marginTop: 8,
  },
  replyButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  replyFormContainer: {
    marginTop: 12,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
