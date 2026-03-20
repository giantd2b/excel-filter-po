import { ChatUser } from "@/types/inbox";
import { Clock, CheckCircle2 } from "lucide-react";

interface ChatListItemProps {
  user: ChatUser & {
    status?: string;
    assignedToName?: string;
    tags?: { id: string; name: string; color: string }[];
  };
  isSelected: boolean;
  onClick: () => void;
}

export function ChatListItem({ user, isSelected, onClick }: ChatListItemProps) {
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("th-TH", { weekday: "short" });
    } else {
      return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const hasUnread = user.unreadCount > 0;
  const status = user.status;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-slate-100/60 relative ${
        isSelected
          ? "bg-brand-50/60 border-l-2 border-l-brand-500"
          : "hover:bg-slate-50/60 border-l-2 border-l-transparent"
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 ring-2 ring-white shadow-sm">
          {user.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt={user.displayName}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-semibold">
              {user.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        {/* Channel dot indicator — bottom-right */}
        <div
          className={`absolute -bottom-px -right-px w-[14px] h-[14px] rounded-full border-[2px] border-white flex items-center justify-center ${
            user.channelType === "line" ? "bg-emerald-400" : "bg-blue-400"
          }`}
        >
          <span className="text-[5px] font-black text-white leading-none">
            {user.channelType === "line" ? "L" : "f"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-[13px] truncate leading-tight ${
                hasUnread
                  ? "font-semibold text-slate-900"
                  : "font-medium text-slate-700"
              }`}
            >
              {user.displayName}
            </span>
            {/* Status icon */}
            {status === "FOLLOW_UP" && (
              <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            {status === "RESOLVED" && (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            )}
          </div>
          <span
            className={`text-[11px] flex-shrink-0 tabular-nums leading-tight ${
              hasUnread ? "text-brand-500 font-semibold" : "text-slate-300"
            }`}
          >
            {formatTime(user.lastmessagetime)}
          </span>
        </div>

        {/* Tags row */}
        {user.tags && user.tags.length > 0 && (
          <div className="flex gap-1 mt-1 overflow-hidden">
            {user.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[8px] font-semibold px-1.5 py-[1px] rounded-full"
                style={{
                  color: tag.color,
                  backgroundColor: `${tag.color}0D`,
                  border: `1px solid ${tag.color}25`,
                }}
              >
                {tag.name}
              </span>
            ))}
            {user.tags.length > 3 && (
              <span className="text-[8px] text-slate-300 self-center">
                +{user.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-1">
          <p
            className={`text-[12px] truncate leading-normal ${
              hasUnread ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {user.assignedToName && (
              <span className="text-brand-400 font-medium">
                {user.assignedToName} &middot;{" "}
              </span>
            )}
            {user.lastMessagePreview || "No messages"}
          </p>
          {hasUnread && (
            <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold tabular-nums">
              {user.unreadCount > 99 ? "99+" : user.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
