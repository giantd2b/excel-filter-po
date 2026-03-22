import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api-client";
import { ChatUser, Message, getChannelType } from "@/types/inbox";

// ─── Conversations (replaces useConversationsListener) ──────────────

interface UseConversationsSocketOptions {
  channel?: string | null;
  channelType?: "line" | "facebook" | null;
  filter?: string | null;
  search?: string | null;
  limitCount?: number;
  onNewMessage?: (user: ChatUser) => void;
}

export function useConversationsSocket({
  channel,
  channelType,
  filter,
  search,
  limitCount = 50,
  onNewMessage,
}: UseConversationsSocketOptions) {
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const initialFetchedRef = useRef(false);

  // Fetch initial data via REST
  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limitCount) });
      if (channel) params.set("channel", channel);
      if (channelType) params.set("channelType", channelType);
      if (filter) params.set("filter", filter);
      if (search) params.set("search", search);

      const data = await api.get<any[]>(
        `/inbox/conversations?${params}`
      );

      const mapped: ChatUser[] = data.map((u: any) => ({
        id: u.id,
        oduserId: u.oduserId || u.userId || u.id,
        displayName: u.displayName || "ไม่ระบุชื่อ",
        pictureUrl: u.pictureUrl || "",
        profile_pic: u.profile_pic || u.pictureUrl || "",
        channel: u.channel || "",
        channelType: getChannelType(u.channel || ""),
        timestamp: u.timestamp || 0,
        lastmessagetime: u.lastmessagetime || 0,
        unreadCount: u.unreadCount || 0,
        lastMessagePreview: u.lastMessagePreview || "",
        status: u.status,
        assignedToName: u.assignedToName,
        nextJobDate: u.nextJobDate || null,
        nextJobTitle: u.nextJobTitle || null,
        isPinned: u.isPinned || false,
        tags: u.tags || [],
      }));

      setConversations(mapped);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channel, channelType, filter, search, limitCount]);

  useEffect(() => {
    initialFetchedRef.current = false;
    fetchInitial().then(() => { initialFetchedRef.current = true; });

    let socket: Socket;
    let cancelled = false;

    const onConnect = () => {
      setConnected(true);
      socket.emit("subscribe:conversations", { channel, channelType });
      // Only refetch on reconnect, not on initial connect
      if (initialFetchedRef.current) {
        fetchInitial();
      }
    };

    const onDisconnect = () => setConnected(false);

    const onConversationUpdated = (data: any) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.id);
        const updated: ChatUser = {
          ...(idx >= 0 ? prev[idx] : ({} as ChatUser)),
          id: data.id,
          oduserId: data.oduserId || prev[idx]?.oduserId || data.id,
          displayName: data.displayName || prev[idx]?.displayName || "ไม่ระบุชื่อ",
          pictureUrl: data.pictureUrl || prev[idx]?.pictureUrl || "",
          profile_pic: data.profile_pic || prev[idx]?.profile_pic || "",
          channel: data.channel || prev[idx]?.channel || "",
          channelType: getChannelType(data.channel || prev[idx]?.channel || ""),
          lastmessagetime: data.lastmessagetime || Date.now(),
          unreadCount: data.unreadCount ?? prev[idx]?.unreadCount ?? 0,
          lastMessagePreview: data.lastMessagePreview || prev[idx]?.lastMessagePreview || "",
          timestamp: data.timestamp || prev[idx]?.timestamp || 0,
          nextJobDate: data.nextJobDate || prev[idx]?.nextJobDate || null,
          nextJobTitle: data.nextJobTitle || prev[idx]?.nextJobTitle || null,
        };

        // Notify new message
        if (idx >= 0 && updated.lastmessagetime > prev[idx].lastmessagetime) {
          onNewMessageRef.current?.(updated);
        } else if (idx < 0) {
          onNewMessageRef.current?.(updated);
        }

        let next: ChatUser[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = updated;
        } else {
          // Only add new conversation if it matches current filter
          const matchesChannel = !channel || updated.channel === channel;
          const matchesType = !channelType || updated.channelType === channelType;
          const matchesFilter = !filter || (filter === "upcoming_jobs" ? !!updated.nextJobDate : true);
          if (!matchesChannel || !matchesType || !matchesFilter) return prev;
          next = [updated, ...prev];
        }

        // Re-sort by lastmessagetime desc
        next.sort((a, b) => b.lastmessagetime - a.lastmessagetime);
        return next;
      });
    };

    (async () => {
      try {
        socket = await getSocket();
        if (cancelled) return;
        socketRef.current = socket;

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.emit("subscribe:conversations", { channel, channelType });
        socket.on("conversation:updated", onConversationUpdated);

        if (socket.connected) {
          setConnected(true);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.off("conversation:updated", onConversationUpdated);
      }
    };
  }, [channel, channelType, filter, search, limitCount, fetchInitial]);

  return { conversations, setConversations, loading, error, connected };
}

// ─── Messages (replaces useMessagesListener) ─────────────────────────

interface UseMessagesSocketOptions {
  userId: string | null;
  onNewMessage?: (message: Message) => void;
}

export function useMessagesSocket({
  userId,
  onNewMessage,
}: UseMessagesSocketOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const onMessageNew = (data: any) => {
      if (data.userId !== userId) return;
      const msg: Message = {
        id: data.message.id,
        text: data.message.text || "",
        type: data.message.type || "incoming",
        sender: data.message.sender || "user",
        timestamp: data.message.timestamp || 0,
        mediaType: data.message.mediaType,
        mediaUrl: data.message.mediaUrl,
        previewUrl: data.message.previewUrl,
        status: data.message.status,
        adminId: data.message.adminId,
        adminName: data.message.adminName,
        replyToId: data.message.replyToId,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Resolve replyTo from existing messages
        if (msg.replyToId) {
          const original = prev.find((m) => m.id === msg.replyToId);
          if (original) {
            msg.replyTo = {
              id: original.id,
              text: original.text,
              type: original.type,
              sender: original.sender,
              mediaType: original.mediaType,
              adminName: original.adminName,
            };
          }
        }
        return [...prev, msg];
      });
      if (msg.type === "incoming") {
        onNewMessageRef.current?.(msg);
      }
    };

    (async () => {
      try {
        // Fetch history via REST
        setLoading(true);
        const data = await api.get<any[]>(`/messages/${userId}?limit=200`);
        if (cancelled) return;

        const mapped: Message[] = data.map((m: any) => ({
          id: m.id,
          text: m.text || "",
          type: m.type || "incoming",
          sender: m.sender || "user",
          timestamp: m.timestamp || 0,
          adminName: m.adminName,
          status: m.status,
          adminId: m.adminId,
          mediaType: m.mediaType,
          mediaUrl: m.mediaUrl,
          previewUrl: m.previewUrl,
          quoteToken: m.quoteToken,
          replyToId: m.replyToId,
          replyTo: m.replyTo,
        }));
        setMessages(mapped);
        setLoading(false);

        // Subscribe to real-time
        const socket = await getSocket();
        if (cancelled) return;
        socketRef.current = socket;

        socket.emit("subscribe:messages", { userId });
        socket.on("message:new", onMessageNew);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.emit("unsubscribe:messages");
        s.off("message:new", onMessageNew);
      }
    };
  }, [userId]);

  return { messages, loading, error };
}

// ─── Unread Count (replaces useTotalUnreadListener) ──────────────────

export function useUnreadSocket(onUpdate?: (count: number) => void) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onUnreadUpdate = (data: { totalUnread: number; channelUnread: Record<string, number> }) => {
      setTotalUnread(data.totalUnread);
      setChannelUnread(data.channelUnread);
      onUpdateRef.current?.(data.totalUnread);
    };

    (async () => {
      try {
        // Initial load via REST
        const stats = await api.get<{
          totalUnread: number;
          channelUnread: Record<string, number>;
        }>("/inbox/stats");
        if (cancelled) return;

        setTotalUnread(stats.totalUnread);
        setChannelUnread(stats.channelUnread);
        setLoading(false);
        onUpdateRef.current?.(stats.totalUnread);

        // Listen for real-time updates
        const socket = await getSocket();
        if (cancelled) return;
        socketRef.current = socket;

        socket.on("unread:update", onUnreadUpdate);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Unread socket error:", err);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.off("unread:update", onUnreadUpdate);
      }
    };
  }, []);

  return { totalUnread, channelUnread, loading };
}
