import { useState, useEffect } from "react";
import {
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";
import { getInboxStats } from "@/lib/api-service";

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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getInboxStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected = !selectedChannel && !selectedType;

  const Badge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-white/15 text-[10px] font-semibold tabular-nums">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand header */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Inbox className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white tracking-tight">
              Inbox
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {stats?.totalUnread || 0} unread
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* All conversations */}
        <button
          onClick={onSelectAll}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            isAllSelected
              ? "bg-white/10 text-white shadow-sm"
              : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4" />
            <span>All Conversations</span>
          </div>
          <Badge count={stats?.totalUnread || 0} />
        </button>

        {/* LINE Section */}
        <div className="pt-4">
          <button
            onClick={() => setLineExpanded(!lineExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors"
          >
            <div className="flex items-center gap-2">
              {lineExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <div className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center">
                <span className="text-[7px] font-black text-white">L</span>
              </div>
              <span>LINE</span>
            </div>
            <Badge count={stats?.line?.totalUnread || 0} />
          </button>

          {lineExpanded && (
            <div className="mt-1 space-y-0.5 ml-2">
              <button
                onClick={() => onSelectType("line")}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                  selectedType === "line" && !selectedChannel
                    ? "bg-emerald-500/15 text-emerald-400 font-medium"
                    : "hover:bg-white/5 text-slate-400 hover:text-slate-300"
                }`}
              >
                <span>All LINE</span>
                <Badge count={stats?.line?.totalUnread || 0} />
              </button>

              {stats?.line?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                    selectedChannel === channel.id
                      ? "bg-emerald-500/15 text-emerald-400 font-medium"
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <span className="truncate">{channel.name}</span>
                  <Badge count={channel.unreadCount} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Facebook Section */}
        <div className="pt-4">
          <button
            onClick={() => setFbExpanded(!fbExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors"
          >
            <div className="flex items-center gap-2">
              {fbExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <div className="w-3.5 h-3.5 rounded bg-blue-500 flex items-center justify-center">
                <span className="text-[7px] font-black text-white">f</span>
              </div>
              <span>Facebook</span>
            </div>
            <Badge count={stats?.facebook?.totalUnread || 0} />
          </button>

          {fbExpanded && (
            <div className="mt-1 space-y-0.5 ml-2">
              <button
                onClick={() => onSelectType("facebook")}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                  selectedType === "facebook" && !selectedChannel
                    ? "bg-blue-500/15 text-blue-400 font-medium"
                    : "hover:bg-white/5 text-slate-400 hover:text-slate-300"
                }`}
              >
                <span>All Facebook</span>
                <Badge count={stats?.facebook?.totalUnread || 0} />
              </button>

              {stats?.facebook?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                    selectedChannel === channel.id
                      ? "bg-blue-500/15 text-blue-400 font-medium"
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <span className="truncate">{channel.name}</span>
                  <Badge count={channel.unreadCount} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
