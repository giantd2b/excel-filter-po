import React, { useState, useRef, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}
import type { Message } from '../hooks/useMessages';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.72;

interface Props {
  message: Message;
  onReply?: (message: Message) => void;
}

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChatBubble({ message, onReply }: Props) {
  const isOutgoing = message.direction === 'outgoing';
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const soundRef = useRef<any>(null);

  // Swipe to reply
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeTriggered = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        !!onReply && Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        // Only allow swipe right (positive dx)
        const dx = Math.max(0, Math.min(gs.dx, 80));
        swipeX.setValue(dx);
        if (dx >= 60 && !swipeTriggered.current) {
          swipeTriggered.current = true;
        }
      },
      onPanResponderRelease: () => {
        if (swipeTriggered.current && onReply) {
          onReply(message);
        }
        swipeTriggered.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, tension: 40, friction: 6 }).start();
      },
    })
  ).current;

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        if (imageError || (!message.mediaUrl && !message.previewUrl)) {
          return (
            <View style={styles.imageErrorContainer}>
              <Text style={styles.imageErrorText}>🖼 รูปภาพไม่สามารถแสดงได้</Text>
              {message.mediaUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(message.mediaUrl!)}>
                  <Text style={[styles.fileAction, isOutgoing && { color: '#c7d2fe' }]}>แตะเพื่อเปิดในเบราว์เซอร์</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowFullImage(true)}
          >
            <Image
              source={{ uri: message.previewUrl || message.mediaUrl }}
              style={styles.imageContent}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </TouchableOpacity>
        );

      case 'video':
        return (
          <TouchableOpacity
            style={styles.videoContainer}
            onPress={() => {
              if (message.mediaUrl) Linking.openURL(message.mediaUrl);
            }}
          >
            {message.previewUrl ? (
              <Image
                source={{ uri: message.previewUrl }}
                style={styles.imageContent}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.playOverlay}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
            <Text style={styles.videoLabel}>วิดีโอ</Text>
          </TouchableOpacity>
        );

      case 'sticker':
        return (
          <Image
            source={{ uri: message.stickerUrl || message.mediaUrl }}
            style={styles.stickerContent}
            resizeMode="contain"
          />
        );

      case 'audio':
        return (
          <TouchableOpacity
            onPress={async () => {
              if (!message.mediaUrl || !Audio) return;
              if (audioPlaying && soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
                setAudioPlaying(false);
                return;
              }
              setAudioLoading(true);
              try {
                const { sound } = await Audio.Sound.createAsync({ uri: message.mediaUrl });
                soundRef.current = sound;
                sound.setOnPlaybackStatusUpdate((status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    setAudioPlaying(false);
                    sound.unloadAsync();
                    soundRef.current = null;
                  }
                });
                await sound.playAsync();
                setAudioPlaying(true);
              } catch {
                setAudioPlaying(false);
              } finally {
                setAudioLoading(false);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {audioLoading ? (
                <ActivityIndicator size="small" color={isOutgoing ? '#fff' : '#6366f1'} />
              ) : (
                <Text style={[styles.text, isOutgoing && styles.textOutgoing]}>
                  {audioPlaying ? '⏹' : '▶'}
                </Text>
              )}
              <Text style={[styles.text, isOutgoing && styles.textOutgoing]}>
                🎵 เสียง
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'file':
        return (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={() => {
              if (message.mediaUrl) Linking.openURL(message.mediaUrl);
            }}
          >
            <Text style={styles.fileIcon}>📎</Text>
            <View style={styles.fileInfo}>
              <Text style={[styles.text, isOutgoing && styles.textOutgoing]} numberOfLines={1}>
                {message.text?.replace(/^\[ไฟล์: /, '').replace(/\]$/, '') || 'ไฟล์แนบ'}
              </Text>
              <Text style={[styles.fileAction, isOutgoing && { color: '#c7d2fe' }]}>
                แตะเพื่อเปิด
              </Text>
            </View>
          </TouchableOpacity>
        );

      default:
        return (
          <LinkifiedText
            text={message.text || ''}
            style={[styles.text, isOutgoing && styles.textOutgoing]}
            linkStyle={isOutgoing ? styles.linkOutgoing : styles.linkIncoming}
            selectable
          />
        );
    }
  };

  const isMedia = ['image', 'video', 'sticker'].includes(message.type);

  const handleLongPress = () => {
    const options: any[] = [];
    if (onReply) {
      options.push({ text: 'ตอบกลับ', onPress: () => onReply(message) });
    }
    if (message.text) {
      options.push({
        text: 'คัดลอกข้อความ',
        onPress: () => Clipboard.setStringAsync(message.text!),
      });
    }
    if (message.mediaUrl) {
      options.push({
        text: 'เปิดลิงก์สื่อ',
        onPress: () => Linking.openURL(message.mediaUrl!),
      });
    }
    options.push({ text: 'ยกเลิก', style: 'cancel' });
    Alert.alert('ข้อความ', undefined, options);
  };

  const replyIconOpacity = swipeX.interpolate({
    inputRange: [0, 40, 60],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.wrapper,
        isOutgoing ? styles.wrapperOutgoing : styles.wrapperIncoming,
      ]}
    >
      {/* Swipe reply icon */}
      {onReply && (
        <Animated.View style={[styles.swipeReplyIcon, { opacity: replyIconOpacity }]}>
          <Text style={{ fontSize: 16, color: '#6366f1' }}>↩</Text>
        </Animated.View>
      )}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX: swipeX }] }}
      >
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={[
          styles.bubble,
          isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
          isMedia && styles.bubbleMedia,
          message.status === 'sending' && { opacity: 0.6 },
        ]}
      >
        {message.replyTo && (
          <View style={[styles.replyQuote, isOutgoing ? styles.replyQuoteOutgoing : styles.replyQuoteIncoming]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyQuoteName, isOutgoing && { color: '#c7d2fe' }]}>
                  {message.replyTo.sender === 'admin' ? (message.replyTo.adminName || 'Admin') : 'ลูกค้า'}
                </Text>
                <Text style={[styles.replyQuoteText, isOutgoing && { color: '#a5b4fc' }]} numberOfLines={1}>
                  {message.replyTo.mediaType === 'image' ? '🖼 รูปภาพ' :
                   message.replyTo.mediaType === 'video' ? '🎬 วิดีโอ' : ''}
                  {message.replyTo.text || ''}
                </Text>
              </View>
            </View>
          </View>
        )}
        {message.senderName && (
          <Text style={[styles.senderName, isOutgoing && styles.senderNameOutgoing]}>
            {isOutgoing ? '👤 ' : ''}{message.senderName}
          </Text>
        )}
        {renderContent()}
      </TouchableOpacity>
      <View style={[styles.metaRow, isOutgoing ? styles.metaRowOutgoing : styles.metaRowIncoming]}>
        <Text style={styles.timestamp}>
          {formatMessageTime(message.timestamp)}
        </Text>
        {isOutgoing && (
          message.status === 'sending' ? (
            <Text style={styles.statusIcon}>...</Text>
          ) : (
            <Text style={[
              styles.statusIcon,
              message.status === 'failed' && styles.statusFailed,
            ]}>
              {message.status === 'failed' ? '!' : message.status === 'delivered' ? '✓✓' : '✓'}
            </Text>
          )
        )}
      </View>

      </Animated.View>

      {/* Full-screen image viewer with pinch-to-zoom */}
      {showFullImage && message.mediaUrl && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowFullImage(false)}>
              <Text style={styles.lightboxCloseText}>✕</Text>
            </TouchableOpacity>
            <ScrollView
              contentContainerStyle={styles.lightboxScrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              bouncesZoom
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default memo(ChatBubble);

function LinkifiedText({ text, style, linkStyle, selectable }: { text: string; style: any; linkStyle: any; selectable?: boolean }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    return <Text style={style} selectable={selectable}>{text}</Text>;
  }

  return (
    <Text style={style} selectable={selectable}>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <Text
            key={i}
            style={linkStyle}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  wrapperIncoming: {
    alignItems: 'flex-start',
  },
  wrapperOutgoing: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: MAX_BUBBLE_WIDTH,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleIncoming: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  bubbleOutgoing: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleMedia: {
    padding: 3,
    overflow: 'hidden',
  },
  swipeReplyIcon: {
    position: 'absolute',
    left: -24,
    top: '50%' as any,
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyQuote: {
    borderLeftWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  replyQuoteIncoming: {
    backgroundColor: '#e2e8f0',
    borderLeftColor: '#94a3b8',
  },
  replyQuoteOutgoing: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.4)',
  },
  replyQuoteName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
  },
  replyQuoteText: {
    fontSize: 11,
    color: '#64748b',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 2,
  },
  senderNameOutgoing: {
    color: '#c7d2fe',
  },
  text: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 21,
  },
  textOutgoing: {
    color: '#fff',
  },
  imageErrorContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  imageErrorText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontSize: 22,
  },
  fileInfo: {
    flex: 1,
  },
  fileAction: {
    fontSize: 11,
    color: '#6366f1',
    marginTop: 2,
  },
  linkIncoming: {
    color: '#6366f1',
    textDecorationLine: 'underline' as const,
  },
  linkOutgoing: {
    color: '#c7d2fe',
    textDecorationLine: 'underline' as const,
  },
  imageContent: {
    width: MAX_BUBBLE_WIDTH - 6,
    height: 200,
    borderRadius: 13,
  },
  stickerContent: {
    width: 120,
    height: 120,
  },
  videoContainer: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 36,
    color: 'rgba(255,255,255,0.9)',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
    gap: 4,
  },
  metaRowIncoming: {
    marginLeft: 4,
  },
  metaRowOutgoing: {
    marginRight: 4,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusIcon: {
    fontSize: 10,
    color: '#94a3b8',
  },
  statusFailed: {
    color: '#ef4444',
    fontWeight: '700',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  lightboxScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
});
