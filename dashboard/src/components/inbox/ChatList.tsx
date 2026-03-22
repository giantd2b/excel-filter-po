import { useState, useCallback, useRef, useEffect } from "react";
import { ChatUser } from "@/types/inbox";
import { ChatListItem } from "./ChatListItem";
import { useConversationsSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";
import { useSound } from "@/hooks/useSound";
import { Search, Loader2, Bell, BellOff, Wifi, WifiOff, CheckCheck, Pin } from "lucide-react";
import { bulkMarkAsRead, toggleCustomerPin } from "@/lib/api-service";

interface ChatListProps {
  selectedChannel: string | null;
  channelType: "line" | "facebook" | null;
  filter: string | null;
  selectedUserId: string | null;
  onSelectUser: (user: ChatUser) => void;
}

export function ChatList({
  selectedChannel,
  channelType,
  filter,
  selectedUserId,
  onSelectUser,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search — only hit API after 800ms of no typing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      // Re-focus after server results load
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }, 800);
  };

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);


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

  const { conversations: rawConversations, setConversations, loading, error, connected } = useConversationsSocket({
    channel: selectedChannel,
    channelType,
    filter,
    limitCount: 100,
    search: debouncedSearch || null,
    onNewMessage: handleNewMessage,
  });

  // Re-focus search input after results load
  useEffect(() => {
    if (searchQuery && searchInputRef.current && document.activeElement !== searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [rawConversations]);

  // Client-side filter for instant feedback while debounce waits
  const conversations = searchQuery && searchQuery !== debouncedSearch
    ? rawConversations.filter((u) => {
        const q = searchQuery.toLowerCase();
        return u.displayName?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q);
      })
    : rawConversations;

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled && permission !== "granted") {
      await requestPermission();
    }
    setNotificationsEnabled(!notificationsEnabled);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-white">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-[12px] text-slate-400 font-medium">Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <WifiOff className="w-4 h-4 text-red-400" />
        </div>
        <p className="text-[13px] font-semibold text-slate-700 mb-1">Connection lost</p>
        <p className="text-[12px] text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100/80">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800 tracking-[-0.01em]">
              Conversations
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {conversations.length} chats
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("อ่านทั้งหมดแล้ว?")) return;
              try {
                await bulkMarkAsRead([], true, selectedChannel || undefined, channelType || undefined);
                setConversations(prev => prev.map(u => ({ ...u, unreadCount: 0 })));
              } catch {}
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all duration-150"
            title="อ่านทั้งหมดแล้ว"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleNotifications}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              notificationsEnabled
                ? "bg-brand-50 text-brand-500 hover:bg-brand-100"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            autoFocus={!!searchQuery}
            key="search-input"
            className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-slate-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:bg-white transition-all duration-150 placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-[13px] font-medium text-slate-500">No chats found</p>
            <p className="text-[12px] text-slate-400 mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          (() => {
            const pinned = conversations.filter((u) => u.isPinned);
            const unpinned = conversations.filter((u) => !u.isPinned);
            const handlePinToggle = async (userId: string) => {
              await toggleCustomerPin(userId).catch(() => {});
              setConversations(prev => prev.map(u =>
                u.id === userId ? { ...u, isPinned: !u.isPinned } : u
              ));
            };
            return (
              <>
                {pinned.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-[10px] font-semibold text-brand-400 uppercase tracking-wider bg-brand-50/40 flex items-center gap-1.5">
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </div>
                    {pinned.map((user) => (
                      <ChatListItem
                        key={user.id}
                        user={user}
                        isSelected={selectedUserId === user.id}
                        onClick={() => onSelectUser(user)}
                        onPinToggle={() => handlePinToggle(user.id)}
                      />
                    ))}
                    <div className="border-b-2 border-brand-100/50" />
                  </>
                )}
                {unpinned.map((user) => (
                  <ChatListItem
                    key={user.id}
                    user={user}
                    isSelected={selectedUserId === user.id}
                    onClick={() => onSelectUser(user)}
                    onPinToggle={() => handlePinToggle(user.id)}
                  />
                ))}
              </>
            );
          })()
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t border-slate-100/80">
        <div className="flex items-center justify-center gap-1.5">
          {connected ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
              <span className="text-[10px] font-medium text-slate-400">
                Live
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-medium text-amber-500">
                Reconnecting...
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
