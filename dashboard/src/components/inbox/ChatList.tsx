"use client";

import { useState, useCallback } from "react";
import { ChatUser } from "@/types/inbox";
import { ChatListItem } from "./ChatListItem";
import { useConversationsListener } from "@/hooks/useFirestoreListener";
import { useNotifications } from "@/hooks/useNotifications";
import { useSound } from "@/hooks/useSound";
import { Search, Loader2, Bell, BellOff } from "lucide-react";

interface ChatListProps {
  selectedChannel: string | null;
  channelType: "line" | "facebook" | null;
  selectedUserId: string | null;
  onSelectUser: (user: ChatUser) => void;
}

export function ChatList({
  selectedChannel,
  channelType,
  selectedUserId,
  onSelectUser,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { showNotification, requestPermission, permission } = useNotifications();
  const { playNotificationSound } = useSound();

  const handleNewMessage = useCallback(
    (user: ChatUser) => {
      if (!notificationsEnabled) return;

      // Play sound
      playNotificationSound();

      // Show browser notification
      showNotification({
        title: user.displayName,
        body: user.lastMessagePreview || "New message",
        icon: user.pictureUrl,
        tag: `inbox-${user.id}`,
        onClick: () => onSelectUser(user),
      });
    },
    [notificationsEnabled, playNotificationSound, showNotification, onSelectUser]
  );

  const { conversations, loading, error } = useConversationsListener({
    channel: selectedChannel,
    channelType,
    limitCount: 100,
    onNewMessage: handleNewMessage,
  });

  const filteredConversations = conversations.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query)
    );
  });

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled && permission !== "granted") {
      await requestPermission();
    }
    setNotificationsEnabled(!notificationsEnabled);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <p className="text-gray-500 text-xs">Real-time updates unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and notifications toggle */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {filteredConversations.length} conversations
          </span>
          <button
            onClick={handleToggleNotifications}
            className={`p-2 rounded-lg transition-colors ${
              notificationsEnabled
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-400"
            }`}
            title={
              notificationsEnabled
                ? "Notifications enabled"
                : "Notifications disabled"
            }
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((user) => (
            <ChatListItem
              key={user.id}
              user={user}
              isSelected={selectedUserId === user.id}
              onClick={() => onSelectUser(user)}
            />
          ))
        )}
      </div>

      {/* Real-time indicator */}
      <div className="p-2 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Real-time updates active</span>
        </div>
      </div>
    </div>
  );
}
