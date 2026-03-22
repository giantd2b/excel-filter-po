import { useState, useEffect } from "react";
import { getTemplates, ReplyTemplate } from "@/lib/api-service";
import { Loader2, X, Search, Image } from "lucide-react";

// Module-level cache — persists across mount/unmount cycles
let cachedTemplates: ReplyTemplate[] | null = null;

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  onSendWithImages?: (text: string, images: string[]) => void;
  onClose: () => void;
}

export function QuickReplies({ onSelect, onSendWithImages, onClose }: QuickRepliesProps) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>(cachedTemplates || []);
  const [loading, setLoading] = useState(!cachedTemplates);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (cachedTemplates) return;
    getTemplates()
      .then((t) => { cachedTemplates = t; setTemplates(t); })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.text.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, ReplyTemplate[]>>(
    (acc, t) => {
      const cat = t.category || "ทั่วไป";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  const handleSelect = (t: ReplyTemplate) => {
    const images = (t as any).images || [];
    if (images.length > 0 && onSendWithImages) {
      onSendWithImages(t.text, images);
      onClose();
    } else {
      onSelect(t.text);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-lg shadow-slate-900/[0.08] max-h-72 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100/80">
        <span className="text-[12px] font-semibold text-slate-700">
          Quick Replies
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition-all duration-150"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-slate-50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:bg-white placeholder:text-slate-300 transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* Templates list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-slate-400">
              {templates.length === 0
                ? "No templates yet. Add from settings."
                : "No matching templates"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100/50">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  {category}
                </span>
              </div>
              {items.map((t) => {
                const images = (t as any).images || [];
                const hasImages = images.length > 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-brand-50/60 transition-all duration-150 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-medium text-slate-700 flex-1">
                        {t.title}
                      </p>
                      {hasImages && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                          <Image className="w-2.5 h-2.5" />
                          {images.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-relaxed">
                      {t.text}
                    </p>
                    {hasImages && (
                      <div className="flex gap-1 mt-1.5 overflow-x-auto">
                        {images.slice(0, 4).map((url: string, i: number) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-slate-100 flex-shrink-0"
                          />
                        ))}
                        {images.length > 4 && (
                          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-semibold flex-shrink-0">
                            +{images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
