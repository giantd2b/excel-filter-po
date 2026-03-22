import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import {
  getSocket,
  subscribeMessages,
  unsubscribeMessages,
} from '../services/socket';

export interface ReplyTo {
  id: string;
  text?: string;
  type: string;
  sender: string;
  mediaType?: string;
  adminName?: string;
}

export interface Message {
  id: string;
  text?: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  mediaUrl?: string;
  previewUrl?: string;
  stickerUrl?: string;
  timestamp: number;
  senderName?: string;
  status?: string;
  quoteToken?: string;
  replyToId?: string;
  replyTo?: ReplyTo;
}

const PAGE_SIZE = 30;
const CACHE_KEY_PREFIX = 'chat_msgs_';
const MAX_CACHED_MESSAGES = 30;

function detectType(m: any): string {
  const text = m.text || '';
  const mediaType = (m.mediaType || '').toLowerCase();
  const url = decodeURIComponent(m.mediaUrl || '').toLowerCase();

  if (mediaType === 'file') return 'file';
  if (text.includes('[ไฟล์') || text.includes('[file]')) return 'file';
  if (url.match(/\.(pdf|doc|docx|xlsx|xls|zip|rar|csv|pptx?)(\?|$)/)) return 'file';
  if (text.includes('[สติกเกอร์]') || url.includes('stickershop.line-scdn.net')) return 'image';
  if (text.includes('[เสียง]') || text.includes('[audio]') || mediaType === 'audio') return 'audio';
  if (mediaType === 'image') return 'image';
  if (mediaType === 'video') return 'video';
  if (m.mediaUrl && !mediaType) return 'file';
  return 'text';
}

function mapMessage(m: any): Message {
  return {
    id: m.id,
    text: m.text,
    type: detectType(m),
    direction: m.type === 'outgoing' ? 'outgoing' : 'incoming',
    mediaUrl: m.mediaUrl,
    previewUrl: m.previewUrl,
    stickerUrl: m.stickerUrl,
    timestamp: m.timestamp,
    senderName: m.adminName,
    status: m.status,
    quoteToken: m.quoteToken,
    replyToId: m.replyToId,
    replyTo: m.replyTo || undefined,
  };
}

async function getCachedMessages(userId: string): Promise<Message[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedMessages(userId: string, messages: Message[]) {
  try {
    const toCache = messages.slice(0, MAX_CACHED_MESSAGES);
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify(toCache));
  } catch {}
}

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);
  const optimisticCounterRef = useRef(0);

  const addOptimistic = useCallback((msg: {
    text?: string;
    type?: string;
    mediaUrl?: string;
    previewUrl?: string;
    replyTo?: ReplyTo;
  }): string => {
    const tempId = `optimistic_${Date.now()}_${++optimisticCounterRef.current}`;
    const optimistic: Message = {
      id: tempId,
      text: msg.text,
      type: msg.type || 'text',
      direction: 'outgoing',
      mediaUrl: msg.mediaUrl,
      previewUrl: msg.previewUrl,
      timestamp: Date.now(),
      status: 'sending',
      replyTo: msg.replyTo,
    };
    setMessages((prev) => [optimistic, ...prev]);
    return tempId;
  }, []);

  const markFailed = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, status: 'failed' } : m)
    );
  }, []);

  const removeOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;

    const cached = await getCachedMessages(userId);
    if (cached && cached.length > 0 && mountedRef.current) {
      setMessages(cached);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: PAGE_SIZE },
      });
      if (mountedRef.current) {
        const mapped = (Array.isArray(data) ? data : []).map(mapMessage);
        const reversed = mapped.reverse();
        setMessages(reversed);
        setHasMore(mapped.length >= PAGE_SIZE);
        setCachedMessages(userId, reversed);
      }
    } catch (err) {
      console.error('[useMessages] Fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestTimestamp = messages[messages.length - 1]?.timestamp;
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: PAGE_SIZE, before: oldestTimestamp },
      });
      if (mountedRef.current) {
        const mapped = (Array.isArray(data) ? data : []).map(mapMessage);
        if (mapped.length === 0) {
          setHasMore(false);
        } else {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newMsgs = mapped.reverse().filter((m) => !ids.has(m.id));
            return [...prev, ...newMsgs];
          });
          setHasMore(mapped.length >= PAGE_SIZE);
        }
      }
    } catch (err) {
      console.error('[useMessages] Load more error:', err);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, messages]);

  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      setMessages([]);
      return;
    }

    fetchMessages();
    subscribeMessages(userId);

    const socket = getSocket();
    const handleNewMessage = (payload: { userId: string; message: any }) => {
      if (payload.userId === userId && mountedRef.current) {
        const mapped = mapMessage(payload.message);
        setMessages((prev) => {
          // Remove matching optimistic messages
          const cleaned = prev.filter((m) => {
            if (!m.id.startsWith('optimistic_')) return true;
            if (m.direction !== mapped.direction) return true;
            if (m.text && mapped.text && m.text === mapped.text) return false;
            if (m.mediaUrl && mapped.mediaUrl && m.mediaUrl === mapped.mediaUrl) return false;
            if (m.type === mapped.type && m.type !== 'text' &&
                Math.abs(m.timestamp - mapped.timestamp) < 30000) return false;
            return true;
          });
          if (cleaned.some((msg) => msg.id === mapped.id)) return cleaned;
          const updated = [mapped, ...cleaned];
          setCachedMessages(userId, updated);
          return updated;
        });
      }
    };

    socket?.on('message:new', handleNewMessage);

    return () => {
      mountedRef.current = false;
      socket?.off('message:new', handleNewMessage);
      unsubscribeMessages();
    };
  }, [userId, fetchMessages]);

  return {
    messages, loading, loadingMore, hasMore, loadMore,
    refresh: fetchMessages,
    addOptimistic, markFailed, removeOptimistic,
  };
}
