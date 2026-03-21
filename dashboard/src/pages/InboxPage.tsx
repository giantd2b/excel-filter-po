import { useState, useCallback } from "react";
import { ChatUser } from "@/types/inbox";
import { ChannelsSidebar } from "@/components/inbox/ChannelsSidebar";
import { ChatList } from "@/components/inbox/ChatList";
import { ConversationArea } from "@/components/inbox/ConversationArea";
import { CustomerInfoPanel } from "@/components/inbox/CustomerInfoPanel";
import { useUnreadSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";

export default function InboxPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"line" | "facebook" | null>(
    null
  );
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const { updateDocumentTitle } = useNotifications();

  const handleUnreadUpdate = useCallback(
    (count: number) => {
      updateDocumentTitle(count);
    },
    [updateDocumentTitle]
  );

  useUnreadSocket(handleUnreadUpdate);

  const handleSelectAll = useCallback(() => {
    setSelectedChannel(null);
    setSelectedType(null);
    setSelectedFilter(null);
  }, []);

  const handleSelectType = useCallback((type: "line" | "facebook") => {
    setSelectedChannel(null);
    setSelectedType(type);
    setSelectedFilter(null);
  }, []);

  const handleSelectChannel = useCallback((channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedType(null);
    setSelectedFilter(null);
  }, []);

  const handleSelectFilter = useCallback((filter: string) => {
    setSelectedChannel(null);
    setSelectedType(null);
    setSelectedFilter(filter);
  }, []);

  const handleSelectUser = useCallback((user: ChatUser) => {
    setSelectedUser(user);
  }, []);

  const handleMessageSent = useCallback(() => {}, []);

  return (
    <div className="flex h-full bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Noto Sans Thai', sans-serif" }}>
      {/* Channels Sidebar — dark, 224px */}
      <div className="w-56 flex-shrink-0">
        <ChannelsSidebar
          selectedChannel={selectedChannel}
          selectedType={selectedType}
          selectedFilter={selectedFilter}
          onSelectAll={handleSelectAll}
          onSelectType={handleSelectType}
          onSelectChannel={handleSelectChannel}
          onSelectFilter={handleSelectFilter}
        />
      </div>

      {/* Chat List — 320px */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200/60">
        <ChatList
          selectedChannel={selectedChannel}
          channelType={selectedType}
          filter={selectedFilter}
          selectedUserId={selectedUser?.id || null}
          onSelectUser={handleSelectUser}
        />
      </div>

      {/* Conversation Area — flex-1 */}
      <div className="flex-1 min-w-0">
        <ConversationArea
          selectedUser={selectedUser}
          onMessageSent={handleMessageSent}
          onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
        />
      </div>

      {/* Customer Info Panel — 280px */}
      {showInfoPanel && selectedUser && (
        <div className="w-[280px] flex-shrink-0 border-l border-slate-200/60">
          <CustomerInfoPanel userId={selectedUser.id} />
        </div>
      )}
    </div>
  );
}
