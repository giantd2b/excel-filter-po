import { useState } from "react";
import { Message } from "@/types/inbox";
import { Check, CheckCheck, AlertCircle, X, FileDown, Volume2, SmilePlus, Reply } from "lucide-react";
import { api } from "@/lib/api-client";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏", "✅"];

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
}

export function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const isOutgoing = message.type === "outgoing";
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasMedia = message.mediaType && message.mediaUrl;
  const isSticker = message.mediaType === "sticker" ||
    (message.mediaType === "image" && message.text === "[สติกเกอร์]");

  // Sticker: render without bubble, just the image + timestamp
  if (isSticker && message.mediaUrl) {
    return (
      <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-2.5`}>
        <div className="flex flex-col items-center">
          <img
            src={message.mediaUrl}
            alt="sticker"
            className="w-[120px] h-[120px] object-contain"
            loading="lazy"
            onError={(e) => {
              // Fallback: try android/sticker.png if iPhone version fails
              const img = e.currentTarget;
              if (message.previewUrl && img.src !== message.previewUrl) {
                img.src = message.previewUrl;
              }
            }}
          />
          <span className={`text-[10px] font-medium tabular-nums mt-0.5 ${
            isOutgoing ? "text-brand-300" : "text-slate-300"
          }`}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-2.5 group relative`}
      >
        <div
          className={`max-w-[65%] overflow-hidden transition-all duration-150 ${
            isOutgoing
              ? "bg-brand-500 text-white rounded-2xl rounded-br-md shadow-sm shadow-brand-500/10"
              : "bg-white text-slate-800 rounded-2xl rounded-bl-md border border-slate-100/80 shadow-sm shadow-slate-900/[0.03]"
          }`}
        >
          {/* Reply quote */}
          {message.replyTo && (
            <div className={`mx-3 mt-2 mb-1 px-3 py-1.5 rounded-lg border-l-2 ${
              isOutgoing
                ? "bg-white/10 border-white/30"
                : "bg-slate-50 border-slate-300"
            }`}>
              <p className={`text-[10px] font-semibold ${isOutgoing ? "text-brand-200" : "text-slate-500"}`}>
                {message.replyTo.sender === "admin" ? (message.replyTo.adminName || "Admin") : "ลูกค้า"}
              </p>
              <p className={`text-[11px] truncate ${isOutgoing ? "text-brand-100" : "text-slate-400"}`}>
                {message.replyTo.mediaType ? `[${message.replyTo.mediaType === "image" ? "รูปภาพ" : "วิดีโอ"}]` : ""}
                {message.replyTo.text || ""}
              </p>
            </div>
          )}

          {/* Media content */}
          {hasMedia && message.mediaType === "image" && (
            <button
              onClick={() => setLightboxUrl(message.mediaUrl!)}
              className="block w-full group"
            >
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="w-full max-h-64 object-cover cursor-pointer group-hover:opacity-[0.92] transition-opacity duration-150"
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
              className={`flex items-center gap-2 px-4 pt-3 transition-colors duration-150 ${
                isOutgoing ? "text-brand-100 hover:text-white" : "text-brand-500 hover:text-brand-600"
              }`}
            >
              <FileDown className="w-5 h-5" />
              <span className="text-[12px] font-medium underline underline-offset-2">ดาวน์โหลดไฟล์</span>
            </a>
          )}

          {/* Admin name label */}
          {isOutgoing && message.adminName && (
            <div className="px-4 pt-2 pb-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white">
                👤 {message.adminName}
              </span>
            </div>
          )}

          {/* Text content */}
          <div className={`px-4 ${isOutgoing && message.adminName ? 'pt-1 pb-2.5' : 'py-2.5'}`}>
            {message.text && (
              <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.55]">
                <LinkifyText text={message.text} isOutgoing={isOutgoing} />
              </p>
            )}
            {!message.text && hasMedia && (
              <p
                className={`text-[11px] ${
                  isOutgoing ? "text-brand-200" : "text-slate-400"
                }`}
              >
                {message.mediaType === "image" ? "รูปภาพ" : "วิดีโอ"}
              </p>
            )}
            <div
              className={`flex items-center justify-end gap-1 mt-1 ${
                isOutgoing ? "text-brand-200/70" : "text-slate-300"
              }`}
            >
              <span className="text-[10px] font-medium tabular-nums">
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

        {/* Reply + React buttons - shows on hover */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center ${
          isOutgoing ? "order-first mr-1" : "ml-1"
        }`}>
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className={`absolute ${isOutgoing ? "right-0" : "left-0"} -top-8 z-20 flex gap-0.5 bg-white rounded-full shadow-lg border border-slate-200 px-1.5 py-1`}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={async () => {
                  setShowReactions(false);
                  try {
                    await api.post(`/messages/${message.id}/react`, { emoji });
                    setReactions(prev => {
                      const filtered = prev.filter(r => r.adminId !== 'self');
                      return [...filtered, { emoji, adminName: 'You', adminId: 'self' }];
                    });
                  } catch {}
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-full text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reactions display */}
      {reactions.length > 0 && (
        <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} -mt-1.5 mb-1 px-2`}>
          <div className="flex gap-0.5 bg-white rounded-full shadow-sm border border-slate-100 px-1.5 py-0.5">
            {Object.entries(
              reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span key={emoji} className="text-xs" title={reactions.filter(r => r.emoji === emoji).map(r => r.adminName).join(', ')}>
                {emoji}{count > 1 ? <span className="text-[9px] text-slate-400 ml-0.5">{count}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-150"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
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
            className={`underline underline-offset-2 break-all transition-colors duration-150 ${
              isOutgoing
                ? "text-brand-100 hover:text-white"
                : "text-brand-500 hover:text-brand-600"
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
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-slate-200/50" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 bg-slate-50/30 px-2">
        {formatDate(timestamp)}
      </span>
      <div className="flex-1 h-px bg-slate-200/50" />
    </div>
  );
}
