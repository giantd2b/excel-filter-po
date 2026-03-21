import { useState, useEffect } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Link2,
  User,
  FileText,
  Search,
  X,
} from "lucide-react";
import { getUnmatchedCandidates, linkCustomerToQuote, syncQuotations } from "@/lib/api-service";
import { api } from "@/lib/api-client";

export default function QuoteMatchPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [linked, setLinked] = useState<Map<string, string>>(new Map()); // docNo → customerId
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    phone: string;
    customerId: string;
    customerName: string;
    docNo: string;
    faCustomer: string;
  } | null>(null);
  const [linking, setLinking] = useState(false);

  const fetchData = async (p: number) => {
    setLoading(true);
    try {
      const res = await getUnmatchedCandidates(p, 15);
      setData(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const openConfirm = (phone: string, customerId: string, customerName: string, docNo: string, faCustomer: string) => {
    setConfirmModal({ phone, customerId, customerName, docNo, faCustomer });
  };

  const handleConfirmLink = async () => {
    if (!confirmModal) return;
    setLinking(true);
    try {
      await linkCustomerToQuote(confirmModal.phone, confirmModal.customerId, confirmModal.docNo);
      // Remove from list immediately
      setData((prev) => prev.filter((q) => q.docNo !== confirmModal.docNo));
      setTotal((prev) => prev - 1);
      setConfirmModal(null);
      // Trigger background re-sync
      syncQuotations().catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLinking(false);
    }
  };

  const handleManualSearch = async (query: string) => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await api.get<any[]>(`/users?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(
        (results || []).map((u: any) => ({
          id: u.id,
          displayName: u.nickname || u.displayName,
          nickname: u.nickname,
          phoneNumber: u.phoneNumber,
          channel: u.channel,
          channelType: u.channelType === "LINE" ? "line" : "facebook",
          pictureUrl: u.pictureUrl,
          matchedBy: `search: "${query}"`,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(amount);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-[0.08em] mb-1">
          Manual Matching
        </p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          จับคู่ใบเสนอราคา
        </h1>
        <p className="text-[13px] text-slate-400 mt-1">
          ใบเสนอราคาที่ยังไม่ได้จับคู่กับลูกค้าใน CRM — เลือกลูกค้าที่ตรงกัน
        </p>
        <p className="text-[12px] text-slate-300 mt-0.5">
          {total} รายการที่รอจับคู่ (2025 เป็นต้นไป)
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200/60">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mb-3" />
          <p className="text-[14px] font-medium text-slate-500">
            ไม่มีรายการที่ต้องจับคู่
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((q) => (
            <div
              key={q.docNo}
              className={`bg-white rounded-xl border shadow-sm transition-all ${
                linked.has(q.docNo)
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200/60"
              }`}
            >
              {/* Quote info */}
              <div className="px-5 py-4 border-b border-slate-100/80">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-bold text-slate-800">
                        {q.customer}
                      </span>
                      {q.editUrl && (
                        <a
                          href={q.editUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-brand-500 font-semibold inline-flex items-center gap-0.5 hover:text-brand-600"
                        >
                          {q.docNo} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {linked.has(q.docNo) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" /> เชื่อมแล้ว
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[12px] text-slate-400">
                      <span>{q.date}</span>
                      <span className="font-semibold text-slate-600">
                        ฿{formatCurrency(q.grandTotal || 0)}
                      </span>
                      <span>{q.salesName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          q.status === "รออนุมัติ"
                            ? "bg-amber-50 text-amber-600"
                            : q.status === "อนุมัติ"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    {q.project && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[500px]">
                        {q.project}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {q.contactPhone && (
                      <p className="text-[12px] text-slate-500">
                        Tel: <span className="font-semibold">{q.contactPhone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Internal notes */}
                {q.internalNotes && (
                  <div className="mt-2 px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-100/50">
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-0.5">
                      Internal Notes
                    </p>
                    <p className="text-[12px] text-slate-600 whitespace-pre-line leading-relaxed">
                      {q.internalNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Candidates */}
              <div className="px-5 py-3">
                {q.candidates.length === 0 ? (
                  <p className="text-[12px] text-slate-300 py-2">
                    ไม่พบลูกค้าที่ตรงกัน
                  </p>
                ) : (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      ลูกค้าที่อาจตรงกัน ({q.candidates.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.candidates.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() =>
                            openConfirm(
                              q.contactPhone || q.phone || "",
                              c.id,
                              c.nickname || c.displayName,
                              q.docNo,
                              q.customer
                            )
                          }
                          disabled={linked.has(q.docNo)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                            linked.get(q.docNo) === c.id
                              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                              : linked.has(q.docNo)
                              ? "bg-slate-50 border-slate-100 opacity-40"
                              : "bg-white border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-sm"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                            {c.pictureUrl ? (
                              <img
                                src={c.pictureUrl}
                                alt={c.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-700 truncate">
                              {c.nickname || c.displayName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[9px] font-bold px-1 py-[1px] rounded ${
                                  c.channelType === "line"
                                    ? "bg-emerald-50 text-emerald-500"
                                    : "bg-blue-50 text-blue-500"
                                }`}
                              >
                                {c.channelType === "line" ? "LINE" : "FB"}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                {c.channel?.replace("Line_", "").replace("FB_", "")}
                              </span>
                              {c.phoneNumber && (
                                <span className="text-[10px] text-slate-400">
                                  {c.phoneNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-300 mt-0.5">
                              matched: "{c.matchedBy}"
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ml-1 ${
                            linked.get(q.docNo) === c.id
                              ? "bg-emerald-500 text-white"
                              : linked.has(q.docNo)
                              ? "bg-slate-200 text-slate-400"
                              : "bg-brand-500 text-white"
                          }`}>
                            {linked.get(q.docNo) === c.id ? "✓ เลือกแล้ว" : linked.has(q.docNo) ? "—" : "เลือก"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual search toggle */}
                {!linked.has(q.docNo) && (
                  <div className="mt-3 pt-3 border-t border-slate-100/60">
                    {searchOpen === q.docNo ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                            <input
                              type="text"
                              placeholder="ค้นหาชื่อลูกค้าใน CRM..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleManualSearch(searchQuery);
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder:text-slate-300"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={() => handleManualSearch(searchQuery)}
                            className="px-3 py-1.5 text-[11px] font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                          >
                            ค้นหา
                          </button>
                          <button
                            onClick={() => { setSearchOpen(null); setSearchQuery(""); setSearchResults([]); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {searching && (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                            <span className="text-[11px] text-slate-400">กำลังค้นหา...</span>
                          </div>
                        )}

                        {searchResults.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {searchResults.map((c: any) => (
                              <button
                                key={c.id}
                                onClick={() => openConfirm(q.contactPhone || q.phone || "", c.id, c.displayName, q.docNo, q.customer)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-white border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-sm transition-all text-left"
                              >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                  {c.pictureUrl ? (
                                    <img src={c.pictureUrl} alt={c.displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold text-slate-700 truncate">
                                    {c.displayName}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[9px] font-bold px-1 py-[1px] rounded ${
                                      c.channelType === "line" ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
                                    }`}>
                                      {c.channelType === "line" ? "LINE" : "FB"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 truncate">
                                      {c.channel?.replace("Line_", "").replace("FB_", "")}
                                    </span>
                                    {c.phoneNumber && (
                                      <span className="text-[10px] text-slate-400">{c.phoneNumber}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500 text-white flex-shrink-0 ml-1">
                                  เลือก
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {!searching && searchQuery && searchResults.length === 0 && (
                          <p className="text-[11px] text-slate-300 py-1">ไม่พบลูกค้า</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setSearchOpen(q.docNo); setSearchQuery(""); setSearchResults([]); }}
                        className="text-[11px] text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" /> ค้นหาลูกค้าเอง
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <p className="text-[12px] text-slate-400">
                หน้า {page} / {totalPages} ({total} รายการ)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">ยืนยันการจับคู่</h3>
                  <p className="text-[12px] text-slate-400">เชื่อมโยงใบเสนอราคากับลูกค้า CRM</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ใบเสนอราคา</p>
                  <p className="text-[13px] font-semibold text-slate-700">{confirmModal.faCustomer}</p>
                  <p className="text-[11px] text-slate-400">{confirmModal.docNo}</p>
                  {confirmModal.phone && (
                    <p className="text-[11px] text-slate-500 mt-1">Tel: {confirmModal.phone}</p>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-brand-500 text-[12px]">↓</span>
                  </div>
                </div>

                <div className="bg-brand-50/50 rounded-lg px-4 py-3 border border-brand-100">
                  <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider mb-1">ลูกค้า CRM</p>
                  <p className="text-[13px] font-bold text-brand-600">{confirmModal.customerName}</p>
                  <p className="text-[11px] text-slate-400">{confirmModal.customerId.substring(0, 30)}...</p>
                </div>
              </div>

              {!confirmModal.phone && (
                <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-[11px] text-amber-600">
                    ไม่มีเบอร์โทรในใบเสนอราคา — จะบันทึกชื่อเป็นตัวเชื่อมแทน
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={linking}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmLink}
                disabled={linking}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {linking ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> ยืนยัน</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
