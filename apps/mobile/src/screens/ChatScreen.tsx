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
  Keyboard,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ChatBubble from '../components/ChatBubble';
import { useMessages, type Message } from '../hooks/useMessages';

const STICKER_PACKS = [
  { name: 'Moon', packageId: '11537', ids: ['52002734','52002735','52002736','52002737','52002738','52002739','52002740','52002741','52002742','52002743','52002744','52002745'] },
  { name: 'Brown & Friends', packageId: '11538', ids: ['51626494','51626495','51626496','51626497','51626498','51626499','51626500','51626501','51626502','51626503','51626504','51626505'] },
  { name: 'Brown Special', packageId: '6325', ids: ['10979904','10979905','10979906','10979907','10979908','10979909','10979910','10979911','10979912','10979913','10979914','10979915'] },
  { name: 'Cony Special', packageId: '6359', ids: ['11069848','11069849','11069850','11069851','11069852','11069853','11069854','11069855','11069856','11069857','11069858','11069859'] },
];

function formatDateDivider(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'วันนี้';
  if (date.toDateString() === yesterday.toDateString()) return 'เมื่อวาน';
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ReplyTemplate {
  id: string;
  title: string;
  text: string;
  category?: string;
  images?: string[];
}

export default function ChatScreen({ route }: any) {
  const {
    userId,
    docId,
    displayName,
    pictureUrl,
    channel,
    channelType,
    unreadCount: initialUnread = 0,
  } = route.params;

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showHelper, setShowHelper] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [pendingImages, setPendingImages] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  }[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const { messages, loading, loadingMore, hasMore, loadMore, refresh, addOptimistic, markFailed, removeOptimistic } = useMessages(docId);
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

  // Pre-fetch templates on mount
  useEffect(() => {
    setTemplatesLoading(true);
    api.get('/templates')
      .then(({ data }) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleSend = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText || text).trim();
    if (!trimmed || sending) return;

    const tempId = addOptimistic({
      text: trimmed,
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.text,
        type: replyTo.direction === 'outgoing' ? 'outgoing' : 'incoming',
        sender: replyTo.direction === 'outgoing' ? 'admin' : 'user',
        mediaType: replyTo.type !== 'text' ? replyTo.type : undefined,
        adminName: replyTo.senderName,
      } : undefined,
    });
    const currentReplyToId = replyTo?.id;
    setText('');
    setShowQuickReplies(false);
    setReplyTo(null);

    try {
      await api.post('/messages/send', {
        oduserId: userId,
        docId,
        text: trimmed,
        channel,
        ...(currentReplyToId ? { replyToId: currentReplyToId } : {}),
      });
    } catch (err: any) {
      markFailed(tempId);
      Alert.alert('ส่งข้อความไม่สำเร็จ', err.message);
    }
  }, [text, sending, userId, docId, channel, addOptimistic, markFailed]);

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
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (result.canceled || !result.assets?.length) return;

      const compressed = await Promise.all(
        result.assets.map(async (asset) => ({
          uri: await compressImage(asset.uri),
          fileName: asset.fileName || undefined,
          mimeType: 'image/jpeg',
        }))
      );
      setPendingImages((prev) => [...prev, ...compressed]);
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
      setPendingImages((prev) => [...prev, {
        uri: compressedUri,
        fileName: asset.fileName || undefined,
        mimeType: 'image/jpeg',
      }]);
    } catch (err: any) {
      Alert.alert('ถ่ายรูปไม่สำเร็จ', err.message);
    }
  }, []);

  const handleSendImages = useCallback(async () => {
    if (pendingImages.length === 0 || sending) return;

    const tempIds = pendingImages.map((img) =>
      addOptimistic({ type: 'image', mediaUrl: img.uri, previewUrl: img.uri })
    );
    const imagesToSend = [...pendingImages];
    setPendingImages([]);
    setSending(true);
    try {
      for (let i = 0; i < imagesToSend.length; i++) {
        const img = imagesToSend[i];
        const formData = new FormData();
        formData.append('file', {
          uri: img.uri,
          name: img.fileName || 'image.jpg',
          type: img.mimeType || 'image/jpeg',
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
        removeOptimistic(tempIds[i]);
      }
    } catch (err: any) {
      tempIds.forEach((id) => markFailed(id));
      Alert.alert('ส่งรูปไม่สำเร็จ', err.message);
    } finally {
      setSending(false);
    }
  }, [pendingImages, sending, userId, docId, channel, addOptimistic, markFailed, removeOptimistic]);

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

  const handleSendSticker = useCallback(async (packageId: string, stickerId: string) => {
    setShowStickers(false);
    setSending(true);
    try {
      await api.post('/messages/send', {
        oduserId: userId,
        docId,
        stickerId,
        stickerPackageId: packageId,
        channel,
      });
    } catch (err: any) {
      Alert.alert('ส่งสติกเกอร์ไม่สำเร็จ', err.message);
    } finally {
      setSending(false);
    }
  }, [userId, docId, channel]);

  const handleQuickReply = useCallback(async (reply: string, images?: string[]) => {
    setShowQuickReplies(false);
    setShowHelper(false);

    if (images && images.length > 0) {
      const tempIds: string[] = [];
      if (reply.trim()) tempIds.push(addOptimistic({ text: reply }));
      for (const url of images) tempIds.push(addOptimistic({ type: 'image', mediaUrl: url, previewUrl: url }));

      try {
        if (reply.trim()) {
          await api.post('/messages/send', { oduserId: userId, docId, text: reply, channel });
        }
        for (const imageUrl of images) {
          await api.post('/messages/send', {
            oduserId: userId, docId, mediaType: 'image',
            mediaUrl: imageUrl, previewUrl: imageUrl, channel,
          });
        }
      } catch (err: any) {
        tempIds.forEach((id) => markFailed(id));
        Alert.alert('ส่งข้อความไม่สำเร็จ', err.message);
      }
    } else {
      handleSend(reply);
    }
  }, [handleSend, userId, docId, channel, addOptimistic, markFailed]);

  const toggleHelper = useCallback(() => {
    Keyboard.dismiss();
    setShowHelper((prev) => !prev);
    setShowQuickReplies(false);
  }, []);

  const messageKeyExtractor = useCallback((item: Message) => item.id, []);

  const dismissPanels = useCallback(() => {
    setShowHelper(false);
    setShowQuickReplies(false);
  }, []);

  const groupedTemplates = React.useMemo(() => {
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
    return Object.entries(grouped);
  }, [templates, templateSearch]);

  const filteredMessages = React.useMemo(() => {
    if (!messageSearch.trim()) return messages;
    const q = messageSearch.toLowerCase();
    return messages.filter((m) => m.text?.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const unreadRef = useRef(initialUnread);
  const filteredMessagesRef = useRef(filteredMessages);
  filteredMessagesRef.current = filteredMessages;

  const handleReply = useCallback((m: Message) => setReplyTo(m), []);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const nextItem = filteredMessagesRef.current[index + 1];
      const showDivider =
        nextItem &&
        new Date(item.timestamp).toDateString() !== new Date(nextItem.timestamp).toDateString();

      const showUnread = unreadRef.current > 0 && index === unreadRef.current - 1 &&
        item.direction === 'incoming';

      return (
        <View>
          <ChatBubble message={item} onReply={handleReply} pictureUrl={item.direction === 'incoming' ? pictureUrl : undefined} />
          {showUnread && (
            <View style={styles.unreadDivider}>
              <View style={styles.unreadDividerLine} />
              <Text style={styles.unreadDividerText}>ข้อความใหม่</Text>
              <View style={styles.unreadDividerLine} />
            </View>
          )}
          {showDivider && (
            <View style={styles.dateDivider}>
              <View style={styles.dateDividerLine} />
              <Text style={styles.dateDividerText}>{formatDateDivider(item.timestamp)}</Text>
              <View style={styles.dateDividerLine} />
            </View>
          )}
        </View>
      );
    },
    [handleReply],
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
          <Image source={{ uri: pictureUrl }} style={styles.headerAvatar} cachePolicy="disk" />
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
          keyExtractor={messageKeyExtractor}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          onTouchStart={dismissPanels}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
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
      {pendingImages.length > 0 && (
        <View style={styles.previewBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 1 }}>
            {pendingImages.map((img) => (
              <View key={img.uri} style={{ position: 'relative', marginRight: 8 }}>
                <Image
                  source={{ uri: img.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.previewRemove}
                  onPress={() => setPendingImages((prev) => prev.filter((p) => p.uri !== img.uri))}
                  disabled={sending}
                >
                  <Text style={styles.previewRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewCancel}
              onPress={() => setPendingImages([])}
              disabled={sending}
            >
              <Text style={styles.previewCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewSend, sending && styles.sendButtonDisabled]}
              onPress={handleSendImages}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.previewSendText}>ส่ง {pendingImages.length} รูป</Text>
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
              groupedTemplates.map(([category, items]) => (
                <View key={category}>
                  <Text style={styles.quickRepliesCategory}>{category}</Text>
                  {items.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.quickReplyItem}
                      onPress={() => handleQuickReply(t.text, t.images)}
                      disabled={sending}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.quickReplyItemTitle, { flex: 1 }]}>{t.title}</Text>
                        {t.images && t.images.length > 0 && (
                          <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#6366f1' }}>🖼 {t.images.length}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.quickReplyItemText} numberOfLines={2}>{t.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
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
                setShowStickers(true);
              }}
            >
              <View style={[styles.helperIcon, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.helperIconText}>😊</Text>
              </View>
              <Text style={styles.helperLabel}>สติกเกอร์</Text>
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
                    onPress: async () => { await api.post(`/users/${docId}/unassign`).catch(() => {}); },
                  });
                  buttons.push({ text: 'ปิด', onPress: async () => {} });
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

      {/* Sticker picker */}
      {showStickers && (
        <View style={styles.stickerPanel}>
          <View style={styles.quickRepliesHeader}>
            <Text style={styles.quickRepliesTitle}>
              {isLine ? 'LINE สติกเกอร์' : 'สติกเกอร์ (ส่งเป็นรูปภาพ)'}
            </Text>
            <TouchableOpacity onPress={() => setShowStickers(false)}>
              <Text style={styles.quickRepliesClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {STICKER_PACKS.map((set) => (
              <View key={set.name} style={{ marginBottom: 12 }}>
                <Text style={styles.quickRepliesCategory}>{set.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12 }}>
                  {set.ids.map((sid) => (
                    <TouchableOpacity
                      key={sid}
                      onPress={() => handleSendSticker(set.packageId, sid)}
                      disabled={sending}
                      style={{ width: 56, height: 56, padding: 4 }}
                    >
                      <Image
                        source={{ uri: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${sid}/iPhone/sticker@2x.png` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        cachePolicy="disk"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reply bar */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>
              {replyTo.direction === 'outgoing' ? (replyTo.senderName || 'Admin') : 'ลูกค้า'}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.type !== 'text' ? `[${replyTo.type === 'image' ? 'รูปภาพ' : replyTo.type}] ` : ''}
              {replyTo.text || ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
            <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
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
  // Unread divider
  unreadDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  unreadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#6366f1',
  },
  unreadDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    marginHorizontal: 10,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
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
  // Sticker panel
  stickerPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
    height: 280,
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
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRemoveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  previewActions: {
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
  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyBarContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#6366f1',
    paddingLeft: 10,
  },
  replyBarName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
  replyBarText: {
    fontSize: 12,
    color: '#64748b',
  },
  replyBarClose: {
    padding: 8,
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
