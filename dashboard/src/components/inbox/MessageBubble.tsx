import { useState } from "react";
import { Message } from "@/types/inbox";
import { Check, CheckCheck, AlertCircle, X, FileDown, Volume2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing";
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasMedia = message.mediaType && message.mediaUrl;

  return (
    <>
      <div
        className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-3`}
      >
        <div
          className={`max-w-[65%] rounded-2xl shadow-sm overflow-hidden ${
            isOutgoing
              ? "bg-indigo-500 text-white rounded-br-lg"
              : "bg-white text-slate-800 rounded-bl-lg border border-slate-100"
          }`}
        >
          {/* Media content */}
          {hasMedia && message.mediaType === "image" && (
            <button
              onClick={() => setLightboxUrl(message.mediaUrl!)}
              className="block w-full"
            >
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </button>
          )}
          {hasMedia && message.mediaType === "video" && (
            <video
              src={message.mediaUrl}
              controls
              className="w-full max-h-64"
              preload="metadata"
            />
          )}
          {/* Audio */}
          {message.mediaUrl && (message.text?.includes("[เสียง]") || message.text?.includes("[audio]")) && (
            <div className="px-4 pt-3">
              <audio src={message.mediaUrl} controls className="w-full h-8" preload="metadata" />
            </div>
          )}
          {/* File download link */}
          {message.mediaUrl && (message.text?.includes("[ไฟล์") || message.text?.includes("[file]")) && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 pt-3 ${
                isOutgoing ? "text-indigo-100 hover:text-white" : "text-indigo-500 hover:text-indigo-600"
              }`}
            >
              <FileDown className="w-5 h-5" />
              <span className="text-[12px] font-medium underline">ดาวน์โหลดไฟล์</span>
            </a>
          )}

          {/* Admin name label */}
          {isOutgoing && message.adminName && (
            <div className="px-4 pt-2 pb-0">
              <span className="text-[10px] font-semibold text-indigo-200">
                {message.adminName}
              </span>
            </div>
          )}

          {/* Text content */}
          <div className={`px-4 ${isOutgoing && message.adminName ? 'pt-1 pb-2.5' : 'py-2.5'}`}>
            {message.text && (
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                <LinkifyText text={message.text} isOutgoing={isOutgoing} />
              </p>
            )}
            {!message.text && hasMedia && (
              <p
                className={`text-[11px] ${
                  isOutgoing ? "text-indigo-200" : "text-slate-400"
                }`}
              >
                {message.mediaType === "image" ? "รูปภาพ" : "วิดีโอ"}
              </p>
            )}
            <div
              className={`flex items-center justify-end gap-1 mt-1 ${
                isOutgoing ? "text-indigo-200" : "text-slate-400"
              }`}
            >
              <span className="text-[10px] font-medium">
                {formatTime(message.timestamp)}
              </span>
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
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function LinkifyText({ text, isOutgoing }: { text: string; isOutgoing: boolean }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${
              isOutgoing
                ? "text-indigo-100 hover:text-white"
                : "text-indigo-500 hover:text-indigo-600"
            }`}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
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
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-slate-200/80" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {formatDate(timestamp)}
      </span>
      <div className="flex-1 h-px bg-slate-200/80" />
    </div>
  );
}
