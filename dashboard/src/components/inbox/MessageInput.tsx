import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Send, Loader2, Image, X, Zap, Paperclip, FileText, Smile } from "lucide-react";
import { QuickReplies } from "./QuickReplies";
import { api } from "@/lib/api-client";

// LINE official sticker packages (free for Messaging API)
interface LineSticker { packageId: string; stickerId: string; }
const LINE_STICKER_SETS: { name: string; packageId: string; stickerIds: string[] }[] = [
  {
    name: 'Moon',
    packageId: '11537',
    stickerIds: ['52002734','52002735','52002736','52002737','52002738','52002739','52002740','52002741','52002742','52002743','52002744','52002745'],
  },
  {
    name: 'Brown & Friends',
    packageId: '11538',
    stickerIds: ['51626494','51626495','51626496','51626497','51626498','51626499','51626500','51626501','51626502','51626503','51626504','51626505'],
  },
  {
    name: 'Brown Special',
    packageId: '6325',
    stickerIds: ['10979904','10979905','10979906','10979907','10979908','10979909','10979910','10979911','10979912','10979913','10979914','10979915'],
  },
  {
    name: 'Cony Special',
    packageId: '6359',
    stickerIds: ['11069848','11069849','11069850','11069851','11069852','11069853','11069854','11069855','11069856','11069857','11069858','11069859'],
  },
];

function stickerUrl(packageId: string, stickerId: string) {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`;
}

interface MessageInputProps {
  onSend: (
    text: string,
    media?: { file: File; mediaType: "image" | "video" | "file" },
    sticker?: { packageId: string; stickerId: string }
  ) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  channelType?: "line" | "facebook";
}

export interface MessageInputHandle {
  setText: (text: string) => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  channelType,
}, ref) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setText: (newText: string) => {
      setText(newText);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
  }));

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.type === "image/gif") {
        resolve(file);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกิน 10MB");
      return;
    }

    // Compress images
    if (file.type.startsWith("image/")) {
      file = await compressImage(file);
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
    // Reset input
    if (e.target) e.target.value = "";
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedFile) || sending || disabled) return;

    setSending(true);
    try {
      const media = selectedFile
        ? {
            file: selectedFile,
            mediaType: selectedFile.type.startsWith("image/")
              ? ("image" as const)
              : selectedFile.type.startsWith("video/")
              ? ("video" as const)
              : ("file" as const),
          }
        : undefined;

      await onSend(text.trim(), media);
      setText("");
      removeFile();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTemplateSelect = (templateText: string) => {
    setText(templateText);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-slate-100/80 bg-white">
      {/* File preview */}
      {selectedFile && (
        <div className="px-5 pt-3">
          <div className="inline-flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100/80">
            {filePreview && selectedFile?.type.startsWith("image/") ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-11 h-11 rounded-md object-cover"
              />
            ) : selectedFile?.type.startsWith("video/") ? (
              <div className="w-11 h-11 rounded-md bg-slate-200 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-slate-500 uppercase">
                  VDO
                </span>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-md bg-amber-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-700 truncate max-w-[200px]">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-slate-400 tabular-nums">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={removeFile}
              className="p-1 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors duration-150"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sticker picker */}
      {showStickers && (
        <div className="px-5 pt-3">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">
                {channelType === 'line' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
                    LINE Stickers
                  </span>
                ) : (
                  'สติกเกอร์ (ส่งเป็นรูปภาพ)'
                )}
              </span>
              <button onClick={() => setShowStickers(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {channelType === 'facebook' && (
              <p className="text-[10px] text-amber-500 mb-2 bg-amber-50 rounded px-2 py-1">
                Facebook จะได้รับสติกเกอร์เป็นรูปภาพ (ไม่ใช่สติกเกอร์แบบเคลื่อนไหว)
              </p>
            )}
            {LINE_STICKER_SETS.map((set) => (
              <div key={set.name} className="mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{set.name}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {set.stickerIds.map((sid) => (
                    <button
                      key={sid}
                      onClick={async () => {
                        setShowStickers(false);
                        setSending(true);
                        try {
                          await onSend('', undefined, { packageId: set.packageId, stickerId: sid });
                        } catch {}
                        setSending(false);
                      }}
                      className="w-14 h-14 p-1 hover:bg-slate-100 rounded-lg transition-transform hover:scale-110"
                    >
                      <img
                        src={stickerUrl(set.packageId, sid)}
                        alt={`sticker-${sid}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick replies popover */}
      {showTemplates && (
        <div className="px-5 pt-3">
          <QuickReplies
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
          />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3">
        <div className="flex items-end gap-1.5">
          {/* Toolbar buttons */}
          <div className="flex items-center gap-0.5 pb-0.5">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className={`p-2 rounded-lg transition-all duration-150 ${
                showTemplates
                  ? "bg-amber-50 text-amber-500"
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
              }`}
              title="Quick replies"
            >
              <Zap className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all duration-150"
              title="ส่งรูปภาพ/วิดีโอ"
            >
              <Image className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "*/*";
                input.onchange = (e) =>
                  handleFileSelect(
                    e as unknown as React.ChangeEvent<HTMLInputElement>
                  );
                input.click();
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all duration-150"
              title="แนบไฟล์"
            >
              <Paperclip className="w-4 h-4" />
            </button>

          {/* Sticker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowStickers(!showStickers); setShowTemplates(false); }}
              className={`p-2 rounded-lg transition-all duration-150 ${
                showStickers
                  ? "bg-emerald-50 text-emerald-500"
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
              }`}
              title={channelType === 'facebook' ? 'สติกเกอร์ (ส่งเป็นรูปภาพ)' : 'LINE สติกเกอร์'}
            >
              <Smile className="w-4 h-4" />
            </button>
            {channelType === 'line' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-[6px] text-white font-bold">L</span>
              </span>
            )}
          </div>
          </div>

          {/* Textarea */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || sending}
              rows={1}
              className="w-full resize-none rounded-xl bg-slate-50 border-0 px-4 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            />
          </div>

          {/* Send button */}
          <div className="pb-0.5">
            <button
              type="submit"
              disabled={(!text.trim() && !selectedFile) || sending || disabled}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-all duration-150 shadow-sm shadow-brand-500/15 disabled:shadow-none"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-300 mt-1.5 ml-1 select-none">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </form>
    </div>
  );
});
