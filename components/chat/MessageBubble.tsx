import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Message, SenderType } from '../../store/api/chatApi';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSenderName = () => {
    if (message.senderType === SenderType.CENTER_STAFF) {
      return t('profile.title') || 'You';
    }
    return message.senderName || t('chat.customer') || 'Customer';
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownMessage : styles.otherMessage, isRTL && styles.rtlContainer]}>
      {!isOwn && <Text style={styles.senderName}>{getSenderName()}</Text>}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>{message.content}</Text>
      </View>
      <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  rtlContainer: {
    flexDirection: 'row',
  },
  senderName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E0E0E0',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#333333',
  },
  time: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
  },
  ownTime: {
    textAlign: 'right',
  },
  otherTime: {
    textAlign: 'left',
  },
});
