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
  /** Stable key for FlatList — survives the optimistic→server id swap so rows never remount */
  clientKey?: string;
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
    clientKey: m.id,
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
    // Local file:// URIs die with the app cache — don't persist them
    const toCache = messages
      .filter((m) => !m.id.startsWith('optimistic_'))
      .slice(0, MAX_CACHED_MESSAGES)
      .map((m) => ({
        ...m,
        previewUrl: m.previewUrl?.startsWith('file:') ? undefined : m.previewUrl,
        mediaUrl: m.mediaUrl?.startsWith('file:') ? undefined : m.mediaUrl,
      }));
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
      clientKey: tempId,
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

  // Reconcile an optimistic bubble with the HTTP send response.
  // Keeps clientKey so the FlatList row never remounts.
  const confirmOptimistic = useCallback((tempId: string, server: {
    messageId: string;
    timestamp?: number;
    status?: string;
  }) => {
    setMessages((prev) => {
      // Socket echo already delivered the server message — just drop the temp bubble
      if (prev.some((m) => m.id === server.messageId)) {
        return prev.filter((m) => m.id !== tempId);
      }
      return prev.map((m) =>
        m.id === tempId
          ? {
              ...m,
              id: server.messageId,
              timestamp: server.timestamp ?? m.timestamp,
              status: server.status || 'sent',
              clientKey: m.clientKey ?? tempId,
            }
          : m
      );
    });
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

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Delta backfill after socket reconnect — fetch only messages newer than the newest local one
  const fetchLatest = useCallback(async () => {
    if (!userId) return;
    const newest = messagesRef.current.find((m) => !m.id.startsWith('optimistic_'))?.timestamp;
    if (!newest) {
      fetchMessages();
      return;
    }
    try {
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: PAGE_SIZE, after: newest },
      });
      if (!mountedRef.current) return;
      const mapped = (Array.isArray(data) ? data : []).map(mapMessage);
      if (mapped.length === 0) return;
      if (mapped.length >= PAGE_SIZE) {
        // Missed more than a page — replace instead of merging a gap
        fetchMessages();
        return;
      }
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = mapped.reverse().filter((m) => !ids.has(m.id));
        if (fresh.length === 0) return prev;
        const updated = [...fresh, ...prev];
        setCachedMessages(userId, updated);
        return updated;
      });
    } catch (err) {
      console.error('[useMessages] Backfill error:', err);
    }
  }, [userId, fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || messagesRef.current.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestTimestamp = messagesRef.current[messagesRef.current.length - 1]?.timestamp;
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
  }, [userId, loadingMore, hasMore]);

  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      setMessages([]);
      return;
    }

    fetchMessages();
    subscribeMessages(userId);

    const socket = getSocket();

    // Merge the server echo into an existing bubble, preserving clientKey (no row
    // remount) and any local image preview (no reload flash).
    const mergeIntoExisting = (existing: Message, mapped: Message): Message => ({
      ...mapped,
      clientKey: existing.clientKey ?? mapped.id,
      previewUrl: existing.previewUrl?.startsWith('file:')
        ? existing.previewUrl
        : mapped.previewUrl,
    });

    const handleNewMessage = (payload: { userId: string; message: any }) => {
      if (payload.userId === userId && mountedRef.current) {
        const mapped = mapMessage(payload.message);
        const clientTempId: string | undefined = payload.message?.clientTempId;
        setMessages((prev) => {
          // HTTP confirm may have already swapped the optimistic id for the server id
          const existingIdx = prev.findIndex((m) => m.id === mapped.id);
          if (existingIdx >= 0) {
            const updated = prev
              .filter((m) => !(clientTempId && m.id === clientTempId))
              .map((m) => (m.id === mapped.id ? mergeIntoExisting(m, mapped) : m));
            setCachedMessages(userId, updated);
            return updated;
          }

          // Deterministic match by clientTempId, else legacy heuristic fallback
          let matchIdx = clientTempId
            ? prev.findIndex((m) => m.id === clientTempId)
            : -1;
          if (matchIdx < 0) {
            matchIdx = prev.findIndex((m) =>
              m.id.startsWith('optimistic_') &&
              m.direction === mapped.direction &&
              ((!!m.text && !!mapped.text && m.text === mapped.text) ||
                (!!m.mediaUrl && !!mapped.mediaUrl && m.mediaUrl === mapped.mediaUrl) ||
                (m.type === mapped.type && m.type !== 'text' &&
                  Math.abs(m.timestamp - mapped.timestamp) < 30000))
            );
          }

          let updated: Message[];
          if (matchIdx >= 0) {
            updated = [...prev];
            updated[matchIdx] = mergeIntoExisting(prev[matchIdx], mapped);
          } else {
            updated = [mapped, ...prev];
          }
          setCachedMessages(userId, updated);
          return updated;
        });
      }
    };

    // Delivery status flips (sending → sent/failed) after the async platform send
    const handleMessageUpdate = (payload: { userId: string; messageId: string; status: string }) => {
      if (payload.userId === userId && mountedRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.messageId ? { ...m, status: payload.status } : m))
        );
      }
    };

    const handleReconnect = () => {
      if (mountedRef.current) fetchLatest();
    };

    socket?.on('message:new', handleNewMessage);
    socket?.on('message:update', handleMessageUpdate);
    socket?.on('connect', handleReconnect);

    return () => {
      mountedRef.current = false;
      socket?.off('message:new', handleNewMessage);
      socket?.off('message:update', handleMessageUpdate);
      socket?.off('connect', handleReconnect);
      unsubscribeMessages();
    };
  }, [userId, fetchMessages, fetchLatest]);

  return {
    messages, loading, loadingMore, hasMore, loadMore,
    refresh: fetchMessages,
    addOptimistic, markFailed, removeOptimistic, confirmOptimistic,
  };
}
