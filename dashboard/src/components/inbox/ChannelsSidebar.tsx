import { useState, useEffect } from "react";
import {
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Inbox,
  Hash,
  CalendarClock,
} from "lucide-react";
import { getInboxStats } from "@/lib/api-service";
import { getSocket } from "@/lib/socket";

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
  selectedFilter: string | null;
  onSelectAll: () => void;
  onSelectType: (type: "line" | "facebook") => void;
  onSelectChannel: (channelId: string) => void;
  onSelectFilter: (filter: string) => void;
}

export function ChannelsSidebar({
  selectedChannel,
  selectedType,
  selectedFilter,
  onSelectAll,
  onSelectType,
  onSelectChannel,
  onSelectFilter,
}: ChannelsSidebarProps) {
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineExpanded, setLineExpanded] = useState(true);
  const [fbExpanded, setFbExpanded] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);

    // Listen for real-time unread updates via WebSocket
    let socket: any = null;
    getSocket().then((s) => {
      socket = s;
      socket.on('unread:update', () => {
        fetchStats();
      });
      socket.on('conversation:updated', () => {
        fetchStats();
      });
    }).catch(() => {});

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('unread:update');
        socket.off('conversation:updated');
      }
    };
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

  const isAllSelected = !selectedChannel && !selectedType && !selectedFilter;

  const Badge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand-50 text-[10px] font-semibold tabular-nums text-brand-500">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/80 text-slate-600 select-none border-r border-slate-200/60">
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
            <Inbox className="w-[15px] h-[15px] text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-800 leading-tight tracking-[-0.01em]">
              Inbox
            </h2>
            {(stats?.totalUnread || 0) > 0 && (
              <p className="text-[10px] text-brand-500 font-medium mt-0.5 tabular-nums">
                {stats?.totalUnread} unread
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {/* All conversations */}
        <button
          onClick={onSelectAll}
          className={`w-full flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 group ${
            isAllSelected
              ? "bg-brand-50 text-brand-500 shadow-sm"
              : "hover:bg-white text-slate-700 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-[15px] h-[15px] opacity-70" />
            <span>All Conversations</span>
          </div>
          <Badge count={stats?.totalUnread || 0} />
        </button>

        {/* Upcoming Jobs */}
        <button
          onClick={() => onSelectFilter("upcoming_jobs")}
          className={`w-full flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 group ${
            selectedFilter === "upcoming_jobs"
              ? "bg-amber-50 text-amber-600 shadow-sm"
              : "hover:bg-white text-slate-700 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-[15px] h-[15px] opacity-70" />
            <span>งานที่จะถึง</span>
          </div>
        </button>

        {/* LINE Section */}
        <div className="pt-5">
          <button
            onClick={() => setLineExpanded(!lineExpanded)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 hover:text-slate-600 transition-colors duration-150"
          >
            <div className="flex items-center gap-2">
              {lineExpanded ? (
                <ChevronDown className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronRight className="w-3 h-3 opacity-60" />
              )}
              <div className="w-3 h-3 rounded-[3px] bg-emerald-500 flex items-center justify-center">
                <span className="text-[6px] font-black text-white leading-none">L</span>
              </div>
              <span>LINE</span>
            </div>
            <Badge count={stats?.line?.totalUnread || 0} />
          </button>

          {lineExpanded && (
            <div className="mt-1 space-y-px ml-1">
              <button
                onClick={() => onSelectType("line")}
                className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[13px] transition-all duration-150 ${
                  selectedType === "line" && !selectedChannel
                    ? "bg-emerald-500/10 text-emerald-400 font-medium"
                    : "hover:bg-white text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 opacity-40" />
                  <span>All LINE</span>
                </div>
                <Badge count={stats?.line?.totalUnread || 0} />
              </button>

              {stats?.line?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[13px] transition-all duration-150 ${
                    selectedChannel === channel.id
                      ? "bg-emerald-500/10 text-emerald-400 font-medium"
                      : "hover:bg-white text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-3 h-3 opacity-40 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  <Badge count={channel.unreadCount} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Facebook Section */}
        <div className="pt-5">
          <button
            onClick={() => setFbExpanded(!fbExpanded)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 hover:text-slate-600 transition-colors duration-150"
          >
            <div className="flex items-center gap-2">
              {fbExpanded ? (
                <ChevronDown className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronRight className="w-3 h-3 opacity-60" />
              )}
              <div className="w-3 h-3 rounded-[3px] bg-blue-500 flex items-center justify-center">
                <span className="text-[6px] font-black text-white leading-none">f</span>
              </div>
              <span>Facebook</span>
            </div>
            <Badge count={stats?.facebook?.totalUnread || 0} />
          </button>

          {fbExpanded && (
            <div className="mt-1 space-y-px ml-1">
              <button
                onClick={() => onSelectType("facebook")}
                className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[13px] transition-all duration-150 ${
                  selectedType === "facebook" && !selectedChannel
                    ? "bg-blue-500/10 text-blue-400 font-medium"
                    : "hover:bg-white text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 opacity-40" />
                  <span>All Facebook</span>
                </div>
                <Badge count={stats?.facebook?.totalUnread || 0} />
              </button>

              {stats?.facebook?.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[13px] transition-all duration-150 ${
                    selectedChannel === channel.id
                      ? "bg-blue-500/10 text-blue-400 font-medium"
                      : "hover:bg-white text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-3 h-3 opacity-40 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  <Badge count={channel.unreadCount} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <p className="text-[10px] text-slate-600 font-medium">
          IRIS CRM v2.0
        </p>
      </div>
    </div>
  );
}
