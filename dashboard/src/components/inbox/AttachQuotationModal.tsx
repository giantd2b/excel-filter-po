import { useEffect, useState } from "react";
import { X, Link2, Loader2, Search, ExternalLink } from "lucide-react";
import { faStatusLabel, faStatusStyle } from "@/lib/faStatus";
import { attachQuotationToCustomer, searchFaQuotations, type FaSearchHit } from "@/lib/api-service";

interface Props {
  customer: { id: string; displayName: string };
  onClose: () => void;
  /** called after a document was attached (the parent reloads its list) */
  onAttached: (docNo: string) => void;
}

const ORIGIN_LABEL: Record<string, string> = { chat: "จากแชต", booking: "จองงานบุญ", attached: "ผูกกับแชตอื่น", manual: "สร้างเอง" };

/**
 * "ผูกใบที่มีอยู่": find a document an admin made by hand in IRIS Quotation and attribute it to this
 * chat customer, so it shows up in the panel and the pipeline like chat-created ones.
 */
export default function AttachQuotationModal({ customer, onClose, onAttached }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchFaQuotations(q)
        .then((res) => { if (!cancelled) setHits(res.data || []); })
        .catch((e: any) => { if (!cancelled) setError(e?.message || "ค้นหาไม่สำเร็จ"); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const attach = async (hit: FaSearchHit) => {
    if (hit.crmCustomerId && hit.crmCustomerId !== customer.id) {
      if (!window.confirm(`${hit.docNo} ผูกกับ "${hit.crmChatName || "ลูกค้าอื่น"}" อยู่แล้ว ต้องการย้ายมาผูกกับ ${customer.displayName} แทน?`)) return;
    }
    setBusy(hit.docNo);
    setError(null);
    try {
      await attachQuotationToCustomer(hit.docNo, customer.id);
      onAttached(hit.docNo);
    } catch (e: any) {
      setError(e?.message || "ผูกไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-600" />
              ผูกใบเสนอราคากับ {customer.displayName}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              ค้นใบที่สร้างเองใน IRIS Quotation ด้วยเลขที่ ชื่อลูกค้า ชื่องาน หรือเบอร์โทร แล้วผูกกับแชตนี้เพื่อติดตามสถานะจาก CRM
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="relative block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="เช่น QT2026090045 หรือ ชื่อลูกค้า"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="space-y-1.5 min-h-[80px]">
          {searching ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-amber-400" /></div>
          ) : hits.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {query.trim().length < 2 ? "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา" : "ไม่พบใบเสนอราคา"}
            </p>
          ) : (
            hits.map((h) => {
              const attachedHere = h.crmCustomerId === customer.id;
              return (
                <div key={h.docNo} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={h.editUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-amber-600 hover:underline inline-flex items-center gap-1">
                        {h.docNo}<ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${faStatusStyle(h.status)}`}>{faStatusLabel(h.status)}</span>
                      <span className="text-[9px] text-slate-400">{ORIGIN_LABEL[h.origin] || h.origin}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{h.customer}{h.project ? ` · ${h.project}` : ""}</p>
                    <p className="text-[10px] text-slate-400">
                      {h.date} · ฿{Number(h.grandTotal || 0).toLocaleString("th-TH")}{h.salesName ? ` · ${h.salesName}` : ""}
                      {h.crmCustomerId && !attachedHere ? ` · ผูกกับ ${h.crmChatName || "ลูกค้าอื่น"} อยู่` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => attach(h)}
                    disabled={busy === h.docNo || attachedHere}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {attachedHere ? "ผูกแล้ว" : busy === h.docNo ? "กำลังผูก…" : "ผูก"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">ปิด</button>
        </div>
      </div>
    </div>
  );
}
