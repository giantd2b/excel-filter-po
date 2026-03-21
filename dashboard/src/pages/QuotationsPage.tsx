import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  RefreshCw,
  ExternalLink,
  Clock,
  FileText,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getQuotationPipeline,
  getQuotationStats,
  syncQuotations,
} from "@/lib/api-service";

const STATUS_TABS = [
  "ทั้งหมด",
  "รออนุมัติ",
  "อนุมัติ",
  "ดำเนินการแล้ว",
  "มัดจำแล้ว",
  "ไม่อนุมัติ",
];

const STATUS_COLORS: Record<string, string> = {
  รออนุมัติ: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  อนุมัติ: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  ดำเนินการแล้ว: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  มัดจำแล้ว: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  ไม่อนุมัติ: "bg-red-50 text-red-500 ring-1 ring-red-200",
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activeStatus, setActiveStatus] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedFilter, setMatchedFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pipeline, statsData] = await Promise.all([
        getQuotationPipeline({
          status: activeStatus !== "ทั้งหมด" ? activeStatus : undefined,
          search: searchQuery || undefined,
          matched: matchedFilter || undefined,
          dateFrom: dateFrom || undefined,
          page,
          limit: 30,
        }),
        getQuotationStats(),
      ]);

      setQuotations(pipeline.data || []);
      setTotal(pipeline.total || 0);
      setTotalPages(pipeline.totalPages || 1);
      setUpdatedAt(pipeline.updatedAt || 0);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch quotations:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, searchQuery, matchedFilter, dateFrom, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncQuotations();
      await fetchData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const goToChat = (customerId: string) => {
    // Navigate to inbox — the inbox page will need to handle selecting this user
    navigate(`/dashboard/inbox?user=${customerId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysAgoLabel = (days: number) => {
    if (days === 0) return "วันนี้";
    if (days === 1) return "เมื่อวาน";
    if (days <= 7) return `${days} วันที่แล้ว`;
    if (days <= 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
    return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  };

  const getDaysColor = (days: number) => {
    if (days <= 3) return "text-emerald-500";
    if (days <= 7) return "text-amber-500";
    return "text-red-400";
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-[0.08em] mb-1">
            Sales Pipeline
          </p>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            ใบเสนอราคา
          </h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-[13px] font-semibold rounded-lg hover:bg-brand-600 transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "กำลัง Sync..." : "Sync ข้อมูล"}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  ทั้งหมด
                </p>
                <p className="text-xl font-bold text-slate-800 tabular-nums">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  รออนุมัติ
                </p>
                <p className="text-xl font-bold text-amber-600 tabular-nums">
                  {stats.statusCounts?.["รออนุมัติ"] || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  มูลค่ารอนุมัติ
                </p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">
                  ฿{formatCurrency(stats.pendingValue || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  จับคู่ลูกค้า CRM
                </p>
                <p className="text-xl font-bold text-blue-600 tabular-nums">
                  {stats.matchedToCrm || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Status Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100/80">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="ค้นหาลูกค้า, เลขเอกสาร, โปรเจ็ค, เซลล์..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Status tabs */}
            <div className="flex gap-1">
              {STATUS_TABS.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                    activeStatus === status
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {status}
                  {stats?.statusCounts?.[status] !== undefined && (
                    <span className="ml-1 opacity-70">
                      ({stats.statusCounts[status]})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Extra filters row */}
          <div className="flex items-center gap-3 mt-3">
            {/* CRM match filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-medium">CRM:</span>
              {[
                { value: "", label: "ทั้งหมด" },
                { value: "yes", label: "จับคู่แล้ว" },
                { value: "no", label: "ไม่อยู่ใน CRM" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setMatchedFilter(opt.value); setPage(1); }}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                    matchedFilter === opt.value
                      ? "bg-blue-500 text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Date filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-medium">ตั้งแต่:</span>
              {[
                { value: "", label: "ทั้งหมด" },
                { value: "2025-01-01", label: "2025" },
                { value: "2026-01-01", label: "2026" },
                { value: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0], label: "90 วัน" },
                { value: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], label: "30 วัน" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDateFrom(opt.value); setPage(1); }}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                    dateFrom === opt.value
                      ? "bg-blue-500 text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Last updated */}
          {updatedAt > 0 && (
            <p className="text-[10px] text-slate-300 mt-2">
              อัปเดตล่าสุด:{" "}
              {new Date(updatedAt).toLocaleString("th-TH")}
            </p>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-[14px] font-medium text-slate-400">
              ไม่พบใบเสนอราคา
            </p>
            <p className="text-[12px] text-slate-300 mt-1">
              กด Sync ข้อมูล เพื่อดึงข้อมูลใหม่
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100/80">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    เลขที่
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    ลูกค้า / โปรเจ็ค
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    เซลล์
                  </th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    วันงาน
                  </th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    ผ่านมา
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotations.map((q) => (
                  <tr
                    key={q.docNo}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-slate-500 tabular-nums">
                        {formatDate(q.date)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {q.editUrl ? (
                        <a
                          href={q.editUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-semibold text-brand-500 hover:text-brand-600 inline-flex items-center gap-1"
                        >
                          {q.docNo}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      ) : (
                        <span className="text-[13px] font-semibold text-slate-700">
                          {q.docNo}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">
                          {q.customer}
                        </p>
                        {q.project && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[300px]">
                            {q.project}
                          </p>
                        )}
                        {q.crmCustomerId && (
                          <button
                            onClick={() => goToChat(q.crmCustomerId)}
                            className="text-[10px] text-blue-500 hover:text-blue-600 font-medium mt-0.5 inline-flex items-center gap-0.5"
                          >
                            💬 {q.crmDisplayName || "เปิดแชท"}
                            {q.crmChannelType === "line" ? " (LINE)" : " (FB)"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-bold text-slate-800 tabular-nums">
                        ฿{formatCurrency(q.grandTotal || 0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] text-slate-500">
                        {q.salesName || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          STATUS_COLORS[q.status] ||
                          "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {q.jobDate ? (
                        <div>
                          <span className="text-[12px] font-semibold text-slate-700 tabular-nums">
                            {formatDate(q.jobDate)}
                          </span>
                          {q.daysUntilJob !== null && q.daysUntilJob !== undefined && (
                            <p className={`text-[10px] font-medium mt-0.5 ${
                              q.daysUntilJob < 0 ? "text-slate-300" :
                              q.daysUntilJob <= 3 ? "text-red-500" :
                              q.daysUntilJob <= 7 ? "text-amber-500" :
                              "text-emerald-500"
                            }`}>
                              {q.daysUntilJob < 0 ? `ผ่านแล้ว ${Math.abs(q.daysUntilJob)} วัน` :
                               q.daysUntilJob === 0 ? "วันนี้!" :
                               `อีก ${q.daysUntilJob} วัน`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-200">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {q.daysSinceQuote !== undefined && (
                        <span
                          className={`text-[11px] font-semibold ${getDaysColor(
                            q.daysSinceQuote
                          )}`}
                        >
                          {getDaysAgoLabel(q.daysSinceQuote)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {q.crmCustomerId && (
                        <button
                          onClick={() => goToChat(q.crmCustomerId)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all"
                          title="เปิดแชท"
                        >
                          💬
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100/80">
                <p className="text-[12px] text-slate-400">
                  แสดง {(page - 1) * 30 + 1}-
                  {Math.min(page * 30, total)} จาก {total} รายการ
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex items-center px-3 text-[12px] font-medium text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage(Math.min(totalPages, page + 1))
                    }
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
