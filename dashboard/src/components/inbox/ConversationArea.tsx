"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatUser, Message } from "@/types/inbox";
import { MessageBubble, DateDivider } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { EmptyState } from "./EmptyState";
import { useMessagesListener } from "@/hooks/useFirestoreListener";
import { Loader2, User } from "lucide-react";
import Image from "next/image";

interface ConversationAreaProps {
  selectedUser: ChatUser | null;
  onMessageSent: () => void;
}

export function ConversationArea({
  selectedUser,
  onMessageSent,
}: ConversationAreaProps) {
  const [, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  const handleNewMessage = useCallback(() => {
    // Scroll to bottom when new message arrives
    scrollToBottom();
  }, []);

  const { messages, loading, error } = useMessagesListener({
    userId: selectedUser?.id || null,
    onNewMessage: handleNewMessage,
  });

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (selectedUser) {
      markAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const markAsRead = async () => {
    if (!selectedUser) return;

    try {
      await fetch("/api/inbox/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id }),
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedUser) return;

    setSending(true);
    try {
      const response = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oduserId: selectedUser.oduserId,
          docId: selectedUser.id,
          text,
          channel: selectedUser.channel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      onMessageSent();
      // Message will appear via real-time listener
    } catch (err) {
      console.error("Failed to send:", err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const shouldShowDateDivider = (
    currentMsg: Message,
    prevMsg: Message | null
  ): boolean => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  if (!selectedUser) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {selectedUser.pictureUrl ? (
              <Image
                src={selectedUser.pictureUrl}
                alt={selectedUser.displayName}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {selectedUser.displayName}
            </h3>
            <p className="text-xs text-gray-500">
              {selectedUser.channelType === "line" ? "LINE" : "Facebook"} -{" "}
              {selectedUser.channel.replace("Line_", "").replace("FB_", "")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <p className="text-gray-500 text-xs">Could not load messages</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={msg.id}>
                {shouldShowDateDivider(msg, messages[index - 1] || null) && (
                  <DateDivider timestamp={msg.timestamp} />
                )}
                <MessageBubble message={msg} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={loading || !!error}
        placeholder={`Reply to ${selectedUser.displayName}...`}
      />
    </div>
  );
}
