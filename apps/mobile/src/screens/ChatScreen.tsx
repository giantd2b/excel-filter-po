import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ChatBubble from '../components/ChatBubble';
import { useMessages, type Message } from '../hooks/useMessages';

interface ReplyTemplate {
  id: string;
  title: string;
  text: string;
  category?: string;
}

export default function ChatScreen({ route }: any) {
  const {
    userId,
    docId,
    displayName,
    pictureUrl,
    channel,
    channelType,
  } = route.params;

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { messages, loading, loadingMore, hasMore, loadMore, refresh } = useMessages(docId);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const isLine = channelType === 'line';

  const compressImage = async (uri: string) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      return result.uri;
    } catch {
      return uri; // fallback to original
    }
  };

  // Mark as read when entering chat
  useEffect(() => {
    if (docId) {
      api.post(`/users/${docId}/read`).catch(() => {});
    }
  }, [docId]);

  // Fetch templates when quick replies panel opens
  useEffect(() => {
    if (showQuickReplies && templates.length === 0) {
      setTemplatesLoading(true);
      api.get('/templates')
        .then(({ data }) => setTemplates(Array.isArray(data) ? data : []))
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [showQuickReplies]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText || text).trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await api.post('/messages/send', {
        oduserId: userId,
        docId,
        text: trimmed,
        channel,
      });
      setText('');
      setShowQuickReplies(false);
    } catch (err: any) {
      Alert.alert('ส่งข้อความไม่สำเร็จ', err.message);
    } finally {
      setSending(false);
    }
  }, [text, sending, userId, docId, channel]);

  const handlePickImage = useCallback(async () => {
    setShowHelper(false);
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const compressedUri = await compressImage(asset.uri);
      setPendingImage({
        uri: compressedUri,
        fileName: asset.fileName || undefined,
        mimeType: 'image/jpeg',
      });
    } catch (err: any) {
      Alert.alert('เลือกรูปไม่สำเร็จ', err.message);
    }
  }, []);

  const handleCamera = useCallback(async () => {
    setShowHelper(false);
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาอนุญาตการใช้กล้อง');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const compressedUri = await compressImage(asset.uri);
      setPendingImage({
        uri: compressedUri,
        fileName: asset.fileName || undefined,
        mimeType: 'image/jpeg',
      });
    } catch (err: any) {
      Alert.alert('ถ่ายรูปไม่สำเร็จ', err.message);
    }
  }, []);

  const handleSendImage = useCallback(async () => {
    if (!pendingImage || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: pendingImage.uri,
        name: pendingImage.fileName || 'image.jpg',
        type: pendingImage.mimeType || 'image/jpeg',
      } as any);
      formData.append('docId', docId);

      const { data: uploadResult } = await api.post(
        '/messages/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        },
      );

      await api.post('/messages/send', {
        oduserId: userId,
        docId,
        mediaType: 'image',
        mediaUrl: uploadResult.url,
        previewUrl: uploadResult.previewUrl || uploadResult.url,
        channel,
      });

      setPendingImage(null);
    } catch (err: any) {
      Alert.alert('ส่งรูปไม่สำเร็จ', err.message);
    } finally {
      setSending(false);
    }
  }, [pendingImage, sending, userId, docId, channel]);

  const handlePickFile = useCallback(async () => {
    setShowHelper(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSending(true);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'file',
        type: asset.mimeType || 'application/octet-stream',
      } as any);
      formData.append('docId', docId);

      const { data: uploadResult } = await api.post(
        '/messages/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        },
      );

      // Determine media type
      const isImage = asset.mimeType?.startsWith('image/');
      const isVideo = asset.mimeType?.startsWith('video/');

      await api.post('/messages/send', {
        oduserId: userId,
        docId,
        text: isImage || isVideo ? undefined : `[ไฟล์: ${asset.name}]`,
        mediaType: isImage ? 'image' : isVideo ? 'video' : 'file',
        mediaUrl: uploadResult.url,
        previewUrl: uploadResult.previewUrl || uploadResult.url,
        channel,
      });
    } catch (err: any) {
      Alert.alert('ส่งไฟล์ไม่สำเร็จ', err.message);
    } finally {
      setSending(false);
    }
  }, [userId, docId, channel]);

  const handleQuickReply = useCallback((reply: string) => {
    setShowQuickReplies(false);
    setShowHelper(false);
    handleSend(reply);
  }, [handleSend]);

  const toggleHelper = useCallback(() => {
    Keyboard.dismiss();
    setShowHelper((prev) => !prev);
    setShowQuickReplies(false);
  }, []);

  const filteredMessages = messageSearch.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(messageSearch.toLowerCase()))
    : messages;

  const formatDateDivider = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'วันนี้';
    if (date.toDateString() === yesterday.toDateString()) return 'เมื่อวาน';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      // In inverted list, index 0 = newest. Show divider below when next (older) message has different date.
      const nextItem = filteredMessages[index + 1];
      const showDivider =
        nextItem &&
        new Date(item.timestamp).toDateString() !== new Date(nextItem.timestamp).toDateString();

      return (
        <>
          <ChatBubble message={item} />
          {showDivider && (
            <View style={styles.dateDivider}>
              <View style={styles.dateDividerLine} />
              <Text style={styles.dateDividerText}>{formatDateDivider(item.timestamp)}</Text>
              <View style={styles.dateDividerLine} />
            </View>
          )}
        </>
      );
    },
    [filteredMessages],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header info bar */}
      <View style={styles.infoBar}>
        {pictureUrl ? (
          <Image source={{ uri: pictureUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
            <Text style={styles.headerAvatarText}>
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName || 'ไม่ทราบชื่อ'}
          </Text>
          <View style={styles.channelTag}>
            <View
              style={[
                styles.channelDot,
                { backgroundColor: isLine ? '#10b981' : '#3b82f6' },
              ]}
            />
            <Text style={styles.channelText}>
              {isLine ? 'LINE' : 'Facebook'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => {
            setShowMessageSearch(!showMessageSearch);
            if (showMessageSearch) setMessageSearch('');
          }}
        >
          <Text style={styles.searchToggleText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Message search bar */}
      {showMessageSearch && (
        <View style={styles.messageSearchBar}>
          <TextInput
            style={styles.messageSearchInput}
            placeholder="ค้นหาข้อความ..."
            placeholderTextColor="#94a3b8"
            value={messageSearch}
            onChangeText={setMessageSearch}
            autoFocus
          />
          {messageSearch.trim() !== '' && (
            <Text style={styles.messageSearchCount}>
              {filteredMessages.length} ผลลัพธ์
            </Text>
          )}
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          onTouchStart={() => {
            setShowHelper(false);
            setShowQuickReplies(false);
          }}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 12 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ยังไม่มีข้อความ</Text>
            </View>
          }
        />
      )}

      {/* Image preview */}
      {pendingImage && (
        <View style={styles.previewBar}>
          <Image
            source={{ uri: pendingImage.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewCancel}
              onPress={() => setPendingImage(null)}
              disabled={sending}
            >
              <Text style={styles.previewCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewSend, sending && styles.sendButtonDisabled]}
              onPress={handleSendImage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.previewSendText}>ส่งรูป</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick replies panel */}
      {showQuickReplies && (
        <View style={styles.quickRepliesPanel}>
          <View style={styles.quickRepliesHeader}>
            <Text style={styles.quickRepliesTitle}>ข้อความด่วน</Text>
            <TouchableOpacity onPress={() => setShowQuickReplies(false)}>
              <Text style={styles.quickRepliesClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.quickRepliesSearch}
            placeholder="ค้นหาข้อความ..."
            placeholderTextColor="#94a3b8"
            value={templateSearch}
            onChangeText={setTemplateSearch}
          />
          <ScrollView style={styles.quickRepliesScroll}>
            {templatesLoading ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 20 }} />
            ) : templates.length === 0 ? (
              <Text style={styles.quickRepliesEmpty}>ยังไม่มีข้อความด่วน</Text>
            ) : (
              (() => {
                const filtered = templates.filter(
                  (t) =>
                    !templateSearch.trim() ||
                    t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    t.text.toLowerCase().includes(templateSearch.toLowerCase())
                );
                const grouped = filtered.reduce<Record<string, ReplyTemplate[]>>((acc, t) => {
                  const cat = t.category || 'ทั่วไป';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(t);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([category, items]) => (
                  <View key={category}>
                    <Text style={styles.quickRepliesCategory}>{category}</Text>
                    {items.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.quickReplyItem}
                        onPress={() => handleQuickReply(t.text)}
                        disabled={sending}
                      >
                        <Text style={styles.quickReplyItemTitle}>{t.title}</Text>
                        <Text style={styles.quickReplyItemText} numberOfLines={2}>{t.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ));
              })()
            )}
          </ScrollView>
        </View>
      )}

      {/* Helper panel */}
      {showHelper && (
        <View style={styles.helperPanel}>
          <View style={styles.helperGrid}>
            <TouchableOpacity style={styles.helperItem} onPress={handleCamera}>
              <View style={[styles.helperIcon, { backgroundColor: '#eef2ff' }]}>
                <Text style={styles.helperIconText}>📷</Text>
              </View>
              <Text style={styles.helperLabel}>กล้อง</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helperItem} onPress={handlePickImage}>
              <View style={[styles.helperIcon, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.helperIconText}>🖼</Text>
              </View>
              <Text style={styles.helperLabel}>รูปภาพ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helperItem} onPress={handlePickFile}>
              <View style={[styles.helperIcon, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.helperIconText}>📎</Text>
              </View>
              <Text style={styles.helperLabel}>ไฟล์</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helperItem}
              onPress={() => {
                setShowHelper(false);
                setShowQuickReplies(true);
              }}
            >
              <View style={[styles.helperIcon, { backgroundColor: '#fff7ed' }]}>
                <Text style={styles.helperIconText}>💬</Text>
              </View>
              <Text style={styles.helperLabel}>ข้อความด่วน</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helperItem}
              onPress={() => {
                setShowHelper(false);
                navigation.navigate('CustomerInfo', { docId, displayName, pictureUrl, channel, channelType });
              }}
            >
              <View style={[styles.helperIcon, { backgroundColor: '#fdf2f8' }]}>
                <Text style={styles.helperIconText}>👤</Text>
              </View>
              <Text style={styles.helperLabel}>ข้อมูลลูกค้า</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helperItem}
              onPress={() => {
                setShowHelper(false);
                Alert.alert('เปลี่ยนสถานะ', 'เลือกสถานะการสนทนา', [
                  {
                    text: 'เปิด (Open)',
                    onPress: () => api.post(`/users/${docId}/status`, { status: 'OPEN' }).catch(() => Alert.alert('ผิดพลาด')),
                  },
                  {
                    text: 'ติดตาม (Follow Up)',
                    onPress: () => api.post(`/users/${docId}/status`, { status: 'FOLLOW_UP' }).catch(() => Alert.alert('ผิดพลาด')),
                  },
                  {
                    text: 'เสร็จสิ้น (Resolved)',
                    onPress: () => api.post(`/users/${docId}/status`, { status: 'RESOLVED' }).catch(() => Alert.alert('ผิดพลาด')),
                  },
                  { text: 'ยกเลิก', style: 'cancel' },
                ]);
              }}
            >
              <View style={[styles.helperIcon, { backgroundColor: '#ecfdf5' }]}>
                <Text style={styles.helperIconText}>📋</Text>
              </View>
              <Text style={styles.helperLabel}>สถานะ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helperItem}
              onPress={async () => {
                setShowHelper(false);
                try {
                  const { data: admins } = await api.get('/admins');
                  const buttons = (Array.isArray(admins) ? admins : []).map((admin: any) => ({
                    text: admin.displayName || admin.email,
                    onPress: () => api.post(`/users/${docId}/assign`, {
                      adminId: admin.uid,
                      adminName: admin.displayName || admin.email,
                    }).then(() => Alert.alert('สำเร็จ', `มอบหมายให้ ${admin.displayName || admin.email}`))
                      .catch(() => Alert.alert('ผิดพลาด')),
                  }));
                  buttons.push({
                    text: 'ยกเลิกมอบหมาย',
                    onPress: () => api.post(`/users/${docId}/unassign`).catch(() => {}),
                  });
                  buttons.push({ text: 'ปิด', onPress: () => {} });
                  Alert.alert('มอบหมายให้', 'เลือกแอดมิน', buttons);
                } catch {
                  Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดรายชื่อแอดมินได้');
                }
              }}
            >
              <View style={[styles.helperIcon, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.helperIconText}>👥</Text>
              </View>
              <Text style={styles.helperLabel}>มอบหมาย</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity
          style={styles.helperButton}
          onPress={toggleHelper}
          disabled={sending}
        >
          <Text style={[styles.helperButtonText, showHelper && styles.helperButtonActive]}>
            {showHelper ? '✕' : '+'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          editable={!sending}
          onFocus={() => {
            setShowHelper(false);
            setShowQuickReplies(false);
          }}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>ส่ง</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  channelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  channelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  channelText: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  // Date dividers
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Search
  searchToggle: {
    padding: 8,
  },
  searchToggleText: {
    fontSize: 18,
  },
  messageSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messageSearchInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  messageSearchCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
  },
  // Helper panel
  helperPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  helperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  helperItem: {
    alignItems: 'center',
    width: 72,
  },
  helperIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  helperIconText: {
    fontSize: 24,
  },
  helperLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Quick replies
  quickRepliesPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    maxHeight: 280,
  },
  quickRepliesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickRepliesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  quickRepliesClose: {
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
  quickRepliesSearch: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  quickRepliesScroll: {
    flex: 1,
  },
  quickRepliesEmpty: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    paddingVertical: 20,
  },
  quickRepliesCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    letterSpacing: 0.5,
  },
  quickReplyItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  quickReplyItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  quickReplyItemText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  // Image preview
  previewBar: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  previewActions: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  previewCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  previewCancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  previewSend: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  previewSendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  helperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  helperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  helperButtonActive: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
