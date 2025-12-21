"use client";

import { ChatUser } from "@/types/inbox";
import Image from "next/image";

interface ChatListItemProps {
  user: ChatUser;
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

  const getChannelBadge = () => {
    if (user.channelType === "line") {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-green-500 text-white text-[8px] font-bold">
          L
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-600 text-white text-[8px] font-bold">
          F
        </span>
      );
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${
        isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
          {user.pictureUrl ? (
            <Image
              src={user.pictureUrl}
              alt={user.displayName}
              width={48}
              height={48}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
              {user.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1">{getChannelBadge()}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-gray-900 truncate">
            {user.displayName}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(user.lastmessagetime)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-500 truncate">
            {user.lastMessagePreview || "No messages"}
          </p>
          {user.unreadCount > 0 && (
            <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
              {user.unreadCount > 99 ? "99+" : user.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
