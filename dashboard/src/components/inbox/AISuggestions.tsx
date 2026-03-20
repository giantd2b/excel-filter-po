import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { getSocket } from "@/lib/socket";

interface AISuggestionsProps {
  customerId: string | null;
  onSelect: (text: string) => void;
}

export function AISuggestions({ customerId, onSelect }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevCustomerIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const fetchSuggestions = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get<string[]>(`/messages/${id}/suggestions`);
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch AI suggestions:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on customerId change
  useEffect(() => {
    if (!customerId) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Reset dismissed state when switching customers
    if (customerId !== prevCustomerIdRef.current) {
      setDismissed(false);
      prevCustomerIdRef.current = customerId;
    }

    fetchSuggestions(customerId);
  }, [customerId, fetchSuggestions]);

  // Listen for WebSocket suggestion updates
  useEffect(() => {
    if (!customerId) return;

    let cleanup = false;

    (async () => {
      try {
        const socket = await getSocket();
        const handler = (data: { userId: string; suggestions: string[] }) => {
          if (cleanup) return;
          if (data.userId === customerId) {
            setSuggestions(data.suggestions);
            setDismissed(false);
            setLoading(false);
          }
        };

        socket.on("suggestions:update", handler);

        if (!cleanup) {
          cleanupRef.current = () => {
            socket.off("suggestions:update", handler);
          };
        }
      } catch {
        // Socket not ready
      }
    })();

    return () => {
      cleanup = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [customerId]);

  if (!customerId || dismissed || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-t border-indigo-100/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-semibold text-indigo-500">
            AI แนะนำ
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 rounded-md hover:bg-indigo-100/60 text-indigo-300 hover:text-indigo-500 transition-all duration-150"
          title="ปิด"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-0.5">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[28px] rounded-full bg-indigo-100/60 animate-pulse"
                style={{ width: `${55 + i * 18}px` }}
              />
            ))}
          </div>
          <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-400 rounded-full animate-spin ml-1" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((text, index) => (
            <button
              key={index}
              onClick={() => onSelect(text)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium
                bg-white text-indigo-600 border border-indigo-200/60
                hover:bg-indigo-50 hover:border-indigo-300
                active:bg-indigo-100
                transition-all duration-150 shadow-sm shadow-indigo-500/[0.04]"
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
