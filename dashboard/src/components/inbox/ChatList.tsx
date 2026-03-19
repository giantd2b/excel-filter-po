import { useState, useCallback } from "react";
import { ChatUser } from "@/types/inbox";
import { ChatListItem } from "./ChatListItem";
import { useConversationsSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";
import { useSound } from "@/hooks/useSound";
import { Search, Loader2, Bell, BellOff, Wifi, WifiOff } from "lucide-react";

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
      playNotificationSound();
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

  const { conversations, loading, error, connected } = useConversationsSocket({
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
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-xs text-slate-400 font-medium">Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <WifiOff className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 mb-1">Connection lost</p>
        <p className="text-xs text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Conversations
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filteredConversations.length} chats
            </p>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              notificationsEnabled
                ? "bg-indigo-50 text-indigo-500 hover:bg-indigo-100"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
            title={
              notificationsEnabled
                ? "Notifications enabled"
                : "Notifications disabled"
            }
          >
            {notificationsEnabled ? (
              <Bell className="w-3.5 h-3.5" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-slate-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No chats found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try a different search term
            </p>
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

      {/* Status bar */}
      <div className="px-4 py-2 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1.5">
          {connected ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600">
                Live
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-600">
                Reconnecting...
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
