"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface ChannelStats {
  id: string;
  name: string;
  type: "line" | "facebook";
  unreadCount: number;
  totalConversations: number;
}

interface InboxStats {
  totalUnread: number;
  line: {
    totalUnread: number;
    channels: ChannelStats[];
  };
  facebook: {
    totalUnread: number;
    channels: ChannelStats[];
  };
}

interface ChannelsSidebarProps {
  selectedChannel: string | null;
  selectedType: "line" | "facebook" | null;
  onSelectAll: () => void;
  onSelectType: (type: "line" | "facebook") => void;
  onSelectChannel: (channelId: string) => void;
}

export function ChannelsSidebar({
  selectedChannel,
  selectedType,
  onSelectAll,
  onSelectType,
  onSelectChannel,
}: ChannelsSidebarProps) {
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineExpanded, setLineExpanded] = useState(true);
  const [fbExpanded, setFbExpanded] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/inbox/stats");
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected = !selectedChannel && !selectedType;

  const renderBadge = (count: number) => {
    if (count === 0) return null;
    return (
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg text-gray-800">Inbox</h2>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All conversations */}
        <button
          onClick={onSelectAll}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
            isAllSelected
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">All Conversations</span>
          </div>
          {renderBadge(stats?.totalUnread || 0)}
        </button>

        {/* LINE Section */}
        <div className="mt-4">
          <button
            onClick={() => setLineExpanded(!lineExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600"
          >
            <div className="flex items-center gap-2">
              {lineExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-500 text-white text-[10px] font-bold">
                L
              </span>
              <span>LINE</span>
            </div>
            {renderBadge(stats?.line?.totalUnread || 0)}
          </button>

          {lineExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {/* All LINE */}
              <button
                onClick={() => onSelectType("line")}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                  selectedType === "line" && !selectedChannel
                    ? "bg-green-100 text-green-700"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <span>All LINE</span>
                {renderBadge(stats?.line?.totalUnread || 0)}
              </button>

              {/* Individual LINE channels */}
              {stats?.line?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                    selectedChannel === channel.id
                      ? "bg-green-100 text-green-700"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <span className="truncate">{channel.name}</span>
                  {renderBadge(channel.unreadCount)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Facebook Section */}
        <div className="mt-4">
          <button
            onClick={() => setFbExpanded(!fbExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600"
          >
            <div className="flex items-center gap-2">
              {fbExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-bold">
                F
              </span>
              <span>Facebook</span>
            </div>
            {renderBadge(stats?.facebook?.totalUnread || 0)}
          </button>

          {fbExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {/* All Facebook */}
              <button
                onClick={() => onSelectType("facebook")}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                  selectedType === "facebook" && !selectedChannel
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <span>All Facebook</span>
                {renderBadge(stats?.facebook?.totalUnread || 0)}
              </button>

              {/* Individual Facebook channels */}
              {stats?.facebook?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                    selectedChannel === channel.id
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <span className="truncate">{channel.name}</span>
                  {renderBadge(channel.unreadCount)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
