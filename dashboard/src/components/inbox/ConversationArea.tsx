import { useState, useEffect, useRef, useCallback } from "react";
import { ChatUser, Message } from "@/types/inbox";
import { MessageBubble, DateDivider } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { EmptyState } from "./EmptyState";
import { useMessagesSocket } from "@/hooks/useWebSocket";
import { markAsRead, sendMessage, uploadChatMedia } from "@/lib/api-service";
import {
  Loader2,
  User,
  PanelRightOpen,
  WifiOff,
  Clock,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { setCustomerStatus } from "@/lib/api-service";

interface ConversationAreaProps {
  selectedUser: ChatUser | null;
  onMessageSent: () => void;
  onToggleInfoPanel?: () => void;
}

export function ConversationArea({
  selectedUser,
  onMessageSent,
  onToggleInfoPanel,
}: ConversationAreaProps) {
  const [, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  const handleNewMessage = useCallback(() => {
    scrollToBottom();
  }, []);

  const { messages, loading, error } = useMessagesSocket({
    userId: selectedUser?.id || null,
    onNewMessage: handleNewMessage,
  });

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (selectedUser) {
      markAsRead(selectedUser.id).catch((err: unknown) =>
        console.error("Failed to mark as read:", err)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (
    text: string,
    media?: { file: File; mediaType: "image" | "video" | "file" }
  ) => {
    if (!selectedUser) return;

    setSending(true);
    try {
      let mediaUrl: string | undefined;
      let previewUrl: string | undefined;
      let mediaType: "image" | "video" | undefined;
      let sendText = text || undefined;

      // Upload media first if present
      if (media) {
        const uploaded = await uploadChatMedia(media.file, selectedUser.id);
        mediaUrl = uploaded.url;
        previewUrl = uploaded.previewUrl;
        if (media.mediaType === "file") {
          // For non-media files, send as text with file link
          sendText = sendText || `[ไฟล์: ${media.file.name}]`;
        } else {
          mediaType = uploaded.mediaType;
        }
      }

      await sendMessage({
        oduserId: selectedUser.oduserId,
        docId: selectedUser.id,
        text: sendText,
        mediaType,
        mediaUrl,
        previewUrl,
        channel: selectedUser.channel,
      });

      onMessageSent();
    } catch (err) {
      console.error("Failed to send:", err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const shouldShowDateDivider = (
    currentMsg: Message,
    prevMsg: Message | null
  ): boolean => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  if (!selectedUser) {
    return <EmptyState />;
  }

  const channelLabel =
    selectedUser.channelType === "line" ? "LINE" : "Facebook";
  const channelName = selectedUser.channel
    .replace("Line_", "")
    .replace("FB_", "");

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ring-2 ring-white shadow-sm">
              {selectedUser.pictureUrl ? (
                <img
                  src={selectedUser.pictureUrl}
                  alt={selectedUser.displayName}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                selectedUser.channelType === "line"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 leading-tight">
              {selectedUser.displayName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  selectedUser.channelType === "line"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {channelLabel}
              </span>
              <span className="text-[11px] text-slate-400">{channelName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setCustomerStatus(selectedUser.id, "FOLLOW_UP");
              onMessageSent();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <Clock className="w-3 h-3" />
            Follow up
          </button>
          <button
            onClick={() => {
              setCustomerStatus(selectedUser.id, "RESOLVED");
              onMessageSent();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />
            Resolve
          </button>
          {onToggleInfoPanel && (
            <button
              onClick={onToggleInfoPanel}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              title="Customer info"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400 font-medium">
              Loading messages...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <WifiOff className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">
              Could not load messages
            </p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-slate-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={msg.id}>
                {shouldShowDateDivider(msg, messages[index - 1] || null) && (
                  <DateDivider timestamp={msg.timestamp} />
                )}
                <MessageBubble message={msg} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={loading || !!error}
        placeholder={`Reply to ${selectedUser.displayName}...`}
      />
    </div>
  );
}
