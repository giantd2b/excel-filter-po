"use client";

import { useState, useCallback } from "react";
import { ChatUser } from "@/types/inbox";
import { ChannelsSidebar } from "@/components/inbox/ChannelsSidebar";
import { ChatList } from "@/components/inbox/ChatList";
import { ConversationArea } from "@/components/inbox/ConversationArea";
import { useTotalUnreadListener } from "@/hooks/useFirestoreListener";
import { useNotifications } from "@/hooks/useNotifications";

export default function InboxPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"line" | "facebook" | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);

  const { updateDocumentTitle } = useNotifications();

  // Update document title with unread count
  const handleUnreadUpdate = useCallback(
    (count: number) => {
      updateDocumentTitle(count);
    },
    [updateDocumentTitle]
  );

  useTotalUnreadListener(handleUnreadUpdate);

  const handleSelectAll = useCallback(() => {
    setSelectedChannel(null);
    setSelectedType(null);
  }, []);

  const handleSelectType = useCallback((type: "line" | "facebook") => {
    setSelectedChannel(null);
    setSelectedType(type);
  }, []);

  const handleSelectChannel = useCallback((channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedType(null);
  }, []);

  const handleSelectUser = useCallback((user: ChatUser) => {
    setSelectedUser(user);
  }, []);

  const handleMessageSent = useCallback(() => {
    // Real-time updates handle this now
  }, []);

  return (
    <div className="flex h-full">
      {/* Channels Sidebar */}
      <div className="w-64 border-r flex-shrink-0">
        <ChannelsSidebar
          selectedChannel={selectedChannel}
          selectedType={selectedType}
          onSelectAll={handleSelectAll}
          onSelectType={handleSelectType}
          onSelectChannel={handleSelectChannel}
        />
      </div>

      {/* Chat List */}
      <div className="w-80 border-r flex-shrink-0 bg-white">
        <ChatList
          selectedChannel={selectedChannel}
          channelType={selectedType}
          selectedUserId={selectedUser?.id || null}
          onSelectUser={handleSelectUser}
        />
      </div>

      {/* Conversation Area */}
      <div className="flex-1">
        <ConversationArea
          selectedUser={selectedUser}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
