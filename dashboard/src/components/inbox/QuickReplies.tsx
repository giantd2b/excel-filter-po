import { useState, useEffect } from "react";
import { getTemplates, ReplyTemplate } from "@/lib/api-service";
import { Loader2, X, Search } from "lucide-react";

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function QuickReplies({ onSelect, onClose }: QuickRepliesProps) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-600">
          Quick Replies
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-slate-50 rounded-md border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 placeholder:text-slate-400"
            autoFocus
          />
        </div>
      </div>

      {/* Templates list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-slate-400">
              {templates.length === 0
                ? "No templates yet. Add from settings."
                : "No matching templates"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-1 bg-slate-50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {category}
                </span>
              </div>
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.text)}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <p className="text-[12px] font-medium text-slate-700">
                    {t.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {t.text}
                  </p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
