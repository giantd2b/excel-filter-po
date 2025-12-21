"use client";

import { Message } from "@/types/inbox";
import { Check, CheckCheck, AlertCircle } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing";

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOutgoing
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 ${
            isOutgoing ? "text-blue-100" : "text-gray-400"
          }`}
        >
          <span className="text-xs">{formatTime(message.timestamp)}</span>
          {isOutgoing && (
            <>
              {message.status === "failed" ? (
                <AlertCircle className="w-3 h-3 text-red-300" />
              ) : message.status === "delivered" ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface DateDividerProps {
  timestamp: number;
}

export function DateDivider({ timestamp }: DateDividerProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
        {formatDate(timestamp)}
      </span>
    </div>
  );
}
