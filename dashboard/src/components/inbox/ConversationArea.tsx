import { useState, useEffect, useRef, useCallback } from "react";
import { ChatUser, Message } from "@/types/inbox";
import { X } from "lucide-react";
import { MessageBubble, DateDivider } from "./MessageBubble";
import { MessageInput, MessageInputHandle } from "./MessageInput";
import { AISuggestions } from "./AISuggestions";
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);
  const prevMessagesLength = useRef(0);

  const handleNewMessage = useCallback(() => {
    scrollToBottom();
    // Mark as read when new message arrives while chat is open
    if (selectedUser) {
      markAsRead(selectedUser.id).catch(() => {});
    }
  }, [selectedUser]);

  const { messages, loading, error } = useMessagesSocket({
    userId: selectedUser?.id || null,
    onNewMessage: handleNewMessage,
  });

  // Reset prevMessagesLength when switching users
  useEffect(() => {
    prevMessagesLength.current = 0;
  }, [selectedUser?.id]);

  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessagesLength.current) {
      // Use instant scroll on initial load, smooth on new messages
      const isInitialLoad = prevMessagesLength.current === 0;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isInitialLoad ? "instant" : "smooth",
        });
      }, isInitialLoad ? 50 : 100);
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

  const handleSuggestionSelect = useCallback((text: string) => {
    messageInputRef.current?.setText(text);
  }, []);

  const handleTemplateSend = useCallback(async (text: string, images?: string[]) => {
    if (!selectedUser) return;
    setSending(true);
    try {
      // Send text first
      if (text) {
        await sendMessage({
          oduserId: selectedUser.oduserId,
          docId: selectedUser.id,
          text,
          channel: selectedUser.channel,
        });
      }
      // Send each image
      if (images && images.length > 0) {
        for (const imageUrl of images) {
          await sendMessage({
            oduserId: selectedUser.oduserId,
            docId: selectedUser.id,
            mediaType: "image",
            mediaUrl: imageUrl,
            previewUrl: imageUrl,
            channel: selectedUser.channel,
          });
        }
      }
      onMessageSent();
    } catch (err) {
      console.error("Failed to send template:", err);
    } finally {
      setSending(false);
    }
  }, [selectedUser, onMessageSent]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (
    text: string,
    media?: { file: File; mediaType: "image" | "video" | "file" },
    sticker?: { packageId: string; stickerId: string }
  ) => {
    if (!selectedUser) return;

    setSending(true);
    try {
      let mediaUrl: string | undefined;
      let previewUrl: string | undefined;
      let mediaType: "image" | "video" | "file" | undefined;
      let sendText = text || undefined;

      // Upload media first if present
      if (media) {
        const uploaded = await uploadChatMedia(media.file, selectedUser.id);
        mediaUrl = uploaded.url;
        previewUrl = uploaded.previewUrl;
        if (media.mediaType === "file") {
          sendText = sendText || `[ไฟล์: ${media.file.name}]`;
          mediaType = "file";
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
        ...(sticker ? { stickerId: sticker.stickerId, stickerPackageId: sticker.packageId } : {}),
        ...(replyTo ? { replyToId: replyTo.id } : {}),
      });

      setReplyTo(null);
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
      <div className="flex items-center justify-between px-5 h-[57px] border-b border-slate-100/80 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 ring-2 ring-white shadow-sm">
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
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px] border-white ${
                selectedUser.channelType === "line"
                  ? "bg-emerald-400"
                  : "bg-blue-400"
              }`}
            />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800 leading-tight tracking-[-0.01em]">
              {selectedUser.displayName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[2px] rounded-[4px] ${
                  selectedUser.channelType === "line"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {channelLabel}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{channelName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setCustomerStatus(selectedUser.id, "FOLLOW_UP");
              onMessageSent();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-all duration-150"
          >
            <Clock className="w-3 h-3" />
            Follow up
          </button>
          <button
            onClick={() => {
              setCustomerStatus(selectedUser.id, "RESOLVED");
              onMessageSent();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all duration-150"
          >
            <CheckCircle2 className="w-3 h-3" />
            Resolve
          </button>
          {onToggleInfoPanel && (
            <div className="w-px h-5 bg-slate-200/60 mx-0.5" />
          )}
          {onToggleInfoPanel && (
            <button
              onClick={onToggleInfoPanel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150"
              title="Customer info"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-[12px] text-slate-400 font-medium">
              Loading messages...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <WifiOff className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-[13px] font-semibold text-slate-600 mb-1">
              Could not load messages
            </p>
            <p className="text-[12px] text-slate-400">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-[13px] text-slate-400">
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
                <MessageBubble message={msg} onReply={(m) => {
                  setReplyTo(m);
                  messageInputRef.current?.focus?.();
                }} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* AI Suggestions */}
      <AISuggestions
        customerId={selectedUser.id}
        onSelect={handleSuggestionSelect}
      />

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex-1 border-l-2 border-brand-400 pl-3">
            <p className="text-[10px] font-semibold text-brand-500">
              {replyTo.type === "outgoing" ? (replyTo.adminName || "Admin") : "ลูกค้า"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {replyTo.mediaType ? `[${replyTo.mediaType === "image" ? "รูปภาพ" : "วิดีโอ"}] ` : ""}
              {replyTo.text || ""}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <MessageInput
        ref={messageInputRef}
        channelType={selectedUser.channelType === 'line' ? 'line' : 'facebook'}
        onSendWithImages={handleTemplateSend}
        onSend={handleSendMessage}
        disabled={loading || !!error}
        placeholder={replyTo ? `ตอบกลับข้อความ...` : `Reply to ${selectedUser.displayName}...`}
        replyToId={replyTo?.id}
        onSent={() => setReplyTo(null)}
      />
    </div>
  );
}
