import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChatUser, Message, getChannelType } from "@/types/inbox";

interface UseConversationsListenerOptions {
  channel?: string | null;
  channelType?: "line" | "facebook" | null;
  limitCount?: number;
  onNewMessage?: (user: ChatUser) => void;
}

export function useConversationsListener({
  channel,
  channelType,
  limitCount = 50,
  onNewMessage,
}: UseConversationsListenerOptions) {
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastMessageTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!db) {
      setError("Firebase not initialized");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let q = query(
      collection(db, "user"),
      orderBy("lastmessagetime", "desc"),
      limit(limitCount)
    );

    // Apply channel filter
    if (channel) {
      q = query(
        collection(db, "user"),
        where("channel", "==", channel),
        orderBy("lastmessagetime", "desc"),
        limit(limitCount)
      );
    } else if (channelType === "line") {
      q = query(
        collection(db, "user"),
        where("channel", ">=", "Line_"),
        where("channel", "<=", "Line_\uf8ff"),
        orderBy("channel"),
        orderBy("lastmessagetime", "desc"),
        limit(limitCount)
      );
    } else if (channelType === "facebook") {
      q = query(
        collection(db, "user"),
        where("channel", ">=", "FB_"),
        where("channel", "<=", "FB_\uf8ff"),
        orderBy("channel"),
        orderBy("lastmessagetime", "desc"),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newConversations: ChatUser[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const user: ChatUser = {
            id: doc.id,
            oduserId: data.userId || doc.id,
            displayName: data.displayName || data.first_name || "ไม่ระบุชื่อ",
            pictureUrl: data.pictureUrl || data.profile_pic || "",
            profile_pic: data.profile_pic || data.pictureUrl || "",
            channel: data.channel || "",
            channelType: getChannelType(data.channel || ""),
            timestamp: data.timestamp || 0,
            lastmessagetime: data.lastmessagetime || 0,
            unreadCount: data.unreadCount || 0,
            lastMessagePreview: data.lastMessagePreview || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
          };

          newConversations.push(user);

          // Check for new messages
          const prevTime = lastMessageTimes.current[doc.id];
          if (prevTime && user.lastmessagetime > prevTime && onNewMessage) {
            onNewMessage(user);
          }
          lastMessageTimes.current[doc.id] = user.lastmessagetime;
        });

        setConversations(newConversations);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [channel, channelType, limitCount, onNewMessage]);

  return { conversations, loading, error };
}

interface UseMessagesListenerOptions {
  userId: string | null;
  onNewMessage?: (message: Message) => void;
}

export function useMessagesListener({
  userId,
  onNewMessage,
}: UseMessagesListenerOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!db || !userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    messageIds.current = new Set();

    const q = query(
      collection(db, "user", userId, "messages"),
      orderBy("timestamp", "asc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages: Message[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const message: Message = {
            id: doc.id,
            text: data.text || "",
            type: data.type || "incoming",
            sender: data.sender || "user",
            timestamp: data.timestamp || 0,
            status: data.status,
            adminId: data.adminId,
          };

          newMessages.push(message);

          // Check for new incoming messages
          if (!messageIds.current.has(doc.id)) {
            messageIds.current.add(doc.id);
            if (message.type === "incoming" && onNewMessage) {
              onNewMessage(message);
            }
          }
        });

        setMessages(newMessages);
        setLoading(false);
      },
      (err) => {
        console.error("Messages listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, onNewMessage]);

  return { messages, loading, error };
}

export function useTotalUnreadListener(onUpdate?: (count: number) => void) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "user"),
      where("unreadCount", ">", 0),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        snapshot.docs.forEach((doc) => {
          total += doc.data().unreadCount || 0;
        });
        setTotalUnread(total);
        setLoading(false);
        onUpdate?.(total);
      },
      (err) => {
        console.error("Unread listener error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [onUpdate]);

  return { totalUnread, loading };
}
