import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import {
  getSocket,
  subscribeMessages,
  unsubscribeMessages,
} from '../services/socket';

export interface Message {
  id: string;
  text?: string;
  type: string; // 'text' | 'image' | 'video' | 'sticker' | 'audio' | 'file'
  direction: 'incoming' | 'outgoing';
  mediaUrl?: string;
  previewUrl?: string;
  stickerUrl?: string;
  timestamp: number;
  senderName?: string;
  status?: string;
}

const PAGE_SIZE = 50;

function mapMessage(m: any): Message {
  return {
    id: m.id,
    text: m.text,
    type: m.mediaType || 'text',
    direction: m.type === 'outgoing' ? 'outgoing' : 'incoming',
    mediaUrl: m.mediaUrl,
    previewUrl: m.previewUrl,
    stickerUrl: m.stickerUrl,
    timestamp: m.timestamp,
    senderName: m.adminName,
    status: m.status,
  };
}

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);

  // Fetch latest messages
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: PAGE_SIZE },
      });
      if (mountedRef.current) {
        const mapped = (Array.isArray(data) ? data : []).map(mapMessage);
        setMessages(mapped.reverse());
        setHasMore(mapped.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error('[useMessages] Fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      // Oldest message is at the end of array (newest-first for inverted list)
      const oldestTimestamp = messages[messages.length - 1]?.timestamp;
      const { data } = await api.get(`/messages/${userId}`, {
        params: { limit: PAGE_SIZE, before: oldestTimestamp },
      });
      if (mountedRef.current) {
        const mapped = (Array.isArray(data) ? data : []).map(mapMessage);
        if (mapped.length === 0) {
          setHasMore(false);
        } else {
          // Append older messages at the end
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

  // Subscribe to real-time updates
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
          if (prev.some((msg) => msg.id === mapped.id)) return prev;
          return [mapped, ...prev];
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

  return { messages, loading, loadingMore, hasMore, loadMore, refresh: fetchMessages };
}
