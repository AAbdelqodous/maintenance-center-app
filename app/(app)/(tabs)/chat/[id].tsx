import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGetMessagesQuery, useSendMessageMutation, useMarkConversationAsReadMutation, Message, SenderType } from '@/store/api/chatApi';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useAppSelector } from '@/store';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '@/lib/constants/config';

export default function ChatDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';
  const { id, centerId } = useLocalSearchParams<{ id: string; centerId: string }>();
  const session = useAppSelector((state) => state.auth.session);

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const stompClientRef = useRef<Client | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: initialMessages, isLoading, refetch } = useGetMessagesQuery(Number(id), {
    refetchOnMountOrArgChange: true,
  });

  const [sendMessage] = useSendMessageMutation();
  const [markAsRead] = useMarkConversationAsReadMutation();

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (session) {
      const stompClient = new Client({
        brokerURL: WS_URL,
        connectHeaders: {
          Authorization: `Bearer ${session.token}`,
        },
        debug: (str) => console.log(str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.onConnect = () => {
        console.log('Connected to WebSocket');
        stompClient.subscribe(`/topic/conversation.${id}`, (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, newMessage]);
        });
      };

      stompClient.onStompError = (frame) => {
        console.error('STOMP error', frame);
      };

      stompClient.activate();
      stompClientRef.current = stompClient;

      markAsRead(Number(id)).catch(console.error);

      return () => {
        stompClient.deactivate();
      };
    }
  }, [id, session, markAsRead]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    const tempMessage: Message = {
      id: Date.now(),
      conversationId: Number(id),
      senderId: 0,
      senderType: SenderType.CENTER_STAFF,
      senderName: 'You',
      content: messageText,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    const textToSend = messageText;
    setMessageText('');

    try {
      await sendMessage({
        centerId: Number(centerId),
        content: textToSend,
      }).unwrap();
    } catch (error) {
      console.error('Failed to send message', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setMessageText(textToSend);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderType === SenderType.CENTER_STAFF;
    return <MessageBubble message={item} isOwn={isOwn} />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('chat.customer'),
        }}
      />
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={[styles.inputContainer, isRTL && styles.inputContainerRtl]}>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          value={messageText}
          onChangeText={setMessageText}
          placeholder={t('chat.typeMessage')}
          placeholderTextColor="#9E9E9E"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputContainerRtl: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    color: '#333333',
  },
  rtlInput: {
    marginRight: 0,
    marginLeft: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
