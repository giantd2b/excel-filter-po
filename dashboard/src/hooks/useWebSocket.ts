import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api-client";
import { ChatUser, Message, getChannelType } from "@/types/inbox";

// ─── Conversations (replaces useConversationsListener) ──────────────

interface UseConversationsSocketOptions {
  channel?: string | null;
  channelType?: "line" | "facebook" | null;
  limitCount?: number;
  onNewMessage?: (user: ChatUser) => void;
}

export function useConversationsSocket({
  channel,
  channelType,
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

  // Fetch initial data via REST
  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limitCount) });
      if (channel) params.set("channel", channel);
      if (channelType) params.set("channelType", channelType);

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
      }));

      setConversations(mapped);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channel, channelType, limitCount]);

  useEffect(() => {
    fetchInitial();

    let socket: Socket;

    (async () => {
      try {
        socket = await getSocket();
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          // Re-subscribe on reconnect
          socket.emit("subscribe:conversations", { channel, channelType });
          fetchInitial();
        });

        socket.on("disconnect", () => setConnected(false));

        // Subscribe
        socket.emit("subscribe:conversations", { channel, channelType });

        // Listen for conversation updates
        socket.on("conversation:updated", (data: any) => {
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === data.id);
            const updated: ChatUser = {
              ...(idx >= 0 ? prev[idx] : ({} as ChatUser)),
              id: data.id,
              oduserId: data.oduserId || data.id,
              displayName: data.displayName || prev[idx]?.displayName || "ไม่ระบุชื่อ",
              pictureUrl: data.pictureUrl || prev[idx]?.pictureUrl || "",
              profile_pic: data.profile_pic || prev[idx]?.profile_pic || "",
              channel: data.channel || prev[idx]?.channel || "",
              channelType: getChannelType(data.channel || prev[idx]?.channel || ""),
              lastmessagetime: data.lastmessagetime || Date.now(),
              unreadCount: data.unreadCount ?? prev[idx]?.unreadCount ?? 0,
              lastMessagePreview: data.lastMessagePreview || prev[idx]?.lastMessagePreview || "",
              timestamp: data.timestamp || prev[idx]?.timestamp || 0,
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
              next = [updated, ...prev];
            }

            // Re-sort by lastmessagetime desc
            next.sort((a, b) => b.lastmessagetime - a.lastmessagetime);
            return next;
          });
        });
      } catch (err: any) {
        setError(err.message);
      }
    })();

    return () => {
      socketRef.current?.off("conversation:updated");
    };
  }, [channel, channelType, limitCount, fetchInitial]);

  return { conversations, loading, error, connected };
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

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let socket: Socket;

    (async () => {
      try {
        // Fetch history via REST
        setLoading(true);
        const data = await api.get<any[]>(`/messages/${userId}?limit=200`);
        const mapped: Message[] = data.map((m: any) => ({
          id: m.id,
          text: m.text || "",
          type: m.type || "incoming",
          sender: m.sender || "user",
          timestamp: m.timestamp || 0,
          status: m.status,
          adminId: m.adminId,
          mediaType: m.mediaType,
          mediaUrl: m.mediaUrl,
          previewUrl: m.previewUrl,
        }));
        setMessages(mapped);
        setLoading(false);

        // Subscribe to real-time
        socket = await getSocket();
        socket.emit("subscribe:messages", { userId });

        socket.on("message:new", (data: any) => {
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
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.type === "incoming") {
            onNewMessageRef.current?.(msg);
          }
        });
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    })();

    return () => {
      getSocket().then((s) => {
        s.emit("unsubscribe:messages");
        s.off("message:new");
      }).catch(() => {});
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

  useEffect(() => {
    (async () => {
      try {
        // Initial load via REST
        const stats = await api.get<{
          totalUnread: number;
          channelUnread: Record<string, number>;
        }>("/inbox/stats");
        setTotalUnread(stats.totalUnread);
        setChannelUnread(stats.channelUnread);
        setLoading(false);
        onUpdateRef.current?.(stats.totalUnread);

        // Listen for real-time updates
        const socket = await getSocket();
        socket.on(
          "unread:update",
          (data: { totalUnread: number; channelUnread: Record<string, number> }) => {
            setTotalUnread(data.totalUnread);
            setChannelUnread(data.channelUnread);
            onUpdateRef.current?.(data.totalUnread);
          }
        );
      } catch (err: any) {
        console.error("Unread socket error:", err);
        setLoading(false);
      }
    })();

    return () => {
      getSocket().then((s) => s.off("unread:update")).catch(() => {});
    };
  }, []);

  return { totalUnread, channelUnread, loading };
}
