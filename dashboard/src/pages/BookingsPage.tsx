import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Trash2, Phone, MapPin, CalendarDays, ExternalLink, FileText, Settings2, Link2, Search, MessageCircle, Send, Check } from "lucide-react";
import BookingRecipeSettings from "@/components/BookingRecipeSettings";
import BookingPricingSettings from "@/components/BookingPricingSettings";
import {
  getBookings,
  updateBookingStatus,
  deleteBooking,
  createBookingQuotation,
  sendBookingQuotationToChat,
  type MeritBooking,
} from "@/lib/api-service";

const STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "DONE"] as const;

const STATUS_LABELS: Record<string, string> = {
  NEW: "ใหม่",
  CONTACTED: "ติดต่อแล้ว",
  CONFIRMED: "ยืนยันแล้ว",
  DONE: "เสร็จสิ้น",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  CONTACTED: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  CONFIRMED: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  DONE: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

const NEXT_STATUS: Record<string, string> = {
  NEW: "CONTACTED",
  CONTACTED: "CONFIRMED",
  CONFIRMED: "DONE",
  DONE: "NEW",
};

function formatBaht(n: number) {
  return n.toLocaleString("th-TH") + " บาท";
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function addressLine(b: MeritBooking) {
  const bkk = b.province === "กรุงเทพฯ";
  const p: string[] = [];
  if (b.venue) p.push(b.venue);
  if (b.tambon) p.push((bkk ? "แขวง" : "ต.") + b.tambon);
  if (b.amphoe) p.push(bkk ? b.amphoe : "อ." + b.amphoe);
  if (b.province) p.push("จ." + b.province);
  return p.join(" ") || "-";
}

function foodLine(b: MeritBooking) {
  if (b.foodMode === "table") return `โต๊ะจีน ${b.tables} โต๊ะ`;
  if (b.foodMode === "buffet") return `บุฟเฟต์ ${b.guests} ท่าน`;
  return "ไม่รวมอาหารเลี้ยงแขก";
}

/** Big-tent rule: 50+ guests / 8+ tables include one 5x12 tent (≈64 guests = 8 tables); 20 tables include two. */
function tentAdvice(b: MeritBooking): string | null {
  if (b.foodMode === "buffet" && b.guests > 64) return `แขก ${b.guests} ท่าน เกินความจุเต้นท์ใหญ่ 1 หลัง (64 ท่าน)`;
  if (b.foodMode === "table" && b.tables > 8 && b.tables < 20) return `โต๊ะจีน ${b.tables} โต๊ะ เกินความจุเต้นท์ใหญ่ 1 หลัง (8 โต๊ะ)`;
  return null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<MeritBooking[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBookings(filter, { source, q: debouncedQuery });
      setBookings(res.bookings || []);
      setStatusCounts(res.statusCounts || {});
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, source, debouncedQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const advance = async (b: MeritBooking) => {
    setBusyId(b.id);
    try {
      const updated = await updateBookingStatus(b.id, NEXT_STATUS[b.status]);
      setBookings((list) => list.map((x) => (x.id === b.id ? { ...x, status: updated.status } : x)));
      setStatusCounts((c) => ({
        ...c,
        [b.status]: Math.max(0, (c[b.status] || 1) - 1),
        [updated.status]: (c[updated.status] || 0) + 1,
      }));
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (b: MeritBooking) => {
    if (!window.confirm(`ลบรายการจอง ${b.code} ของ ${b.customerName}?`)) return;
    setBusyId(b.id);
    try {
      await deleteBooking(b.id);
      setBookings((list) => list.filter((x) => x.id !== b.id));
      setTotal((t) => Math.max(0, t - 1));
      setStatusCounts((c) => ({ ...c, [b.status]: Math.max(0, (c[b.status] || 1) - 1) }));
    } catch (err) {
      console.error("Failed to delete booking:", err);
    } finally {
      setBusyId(null);
    }
  };

  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"pricing" | "recipes">("pricing");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const createQuote = async (b: MeritBooking) => {
    setBusyId(b.id);
    setQuoteError(null);
    try {
      const res = await createBookingQuotation(b.id);
      setBookings((list) =>
        list.map((x) =>
          x.id === b.id
            ? { ...x, quotationDocNo: res.docNo, quotationUrl: res.quotationUrl, quotationPublicUrl: res.publicUrl, quotationCreatedAt: new Date().toISOString() }
            : x
        )
      );
      if (res.quotationUrl) window.open(res.quotationUrl, "_blank", "noopener");
    } catch (err: any) {
      console.error("Failed to create quotation:", err);
      setQuoteError(`${b.code}: ${err?.message || "สร้างใบเสนอราคาไม่สำเร็จ"}`);
    } finally {
      setBusyId(null);
    }
  };

  const sendChat = async (b: MeritBooking) => {
    setBusyId(b.id);
    setQuoteError(null);
    try {
      await sendBookingQuotationToChat(b.id);
      // delivery is asynchronous — refresh shortly so the status chip catches up
      setTimeout(() => fetchData(), 2500);
      await fetchData();
    } catch (err: any) {
      setQuoteError(`${b.code}: ${err?.message || "ส่งลิงก์ในแชตไม่สำเร็จ"}`);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: "ALL", label: `ทั้งหมด (${total})` },
    ...STATUSES.map((s) => ({ key: s, label: `${STATUS_LABELS[s]} (${statusCounts[s] || 0})` })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">จองงานบุญ</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            รายการจองจากหน้าเว็บ{" "}
            <a
              href="/booking/"
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:underline inline-flex items-center gap-1"
            >
              /booking <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg ring-1 text-sm font-medium ${
              showSettings ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="ผูกแพ็กเกจกับสินค้าใน FlowAccount app"
          >
            <Settings2 className="w-4 h-4" />
            ตั้งค่าใบเสนอราคา
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="space-y-3">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {([
              ["pricing", "ราคาแพ็กเกจ"],
              ["recipes", "ผูกสินค้า FlowAccount"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSettingsTab(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${settingsTab === key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {settingsTab === "pricing" ? (
            <BookingPricingSettings onClose={() => setShowSettings(false)} />
          ) : (
            <BookingRecipeSettings onClose={() => setShowSettings(false)} />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา รหัส / ชื่อ / เบอร์ / ชื่อในแชต / เลขใบเสนอราคา"
            className="pl-9 pr-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm w-80 max-w-full focus:outline-none focus:ring-brand-400"
          />
        </div>
        <div className="flex gap-1 bg-white ring-1 ring-slate-200 rounded-full p-0.5">
          {[
            { key: "ALL", label: "ทุกช่องทาง" },
            { key: "chat_link", label: "จากลิงก์แชต" },
            { key: "web", label: "เว็บ" },
          ].map((o) => (
            <button
              key={o.key}
              onClick={() => setSource(o.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                source === o.key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">ยังไม่มีรายการจองในหมวดนี้</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {quoteError && (
            <div className="md:col-span-2 text-sm text-red-600 bg-red-50 ring-1 ring-red-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span>{quoteError}</span>
              <button onClick={() => setQuoteError(null)} className="text-red-400 hover:text-red-600 text-xs">ปิด</button>
            </div>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{b.billingName || b.customerName}</div>
                  {b.billingName && (
                    <div className="text-xs text-slate-500">ผู้ติดต่อ: {b.customerName}{b.taxId ? ` · เลขผู้เสียภาษี ${b.taxId}` : ""}</div>
                  )}
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{b.code}</span>
                    <span>·</span>
                    <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                      <Phone className="w-3 h-3" />
                      {b.phone}
                    </a>
                  </div>
                  <div className="mt-1">
                    {b.customerId ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                          b.source === "chat_link" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"
                        }`}
                        title={b.source === "chat_link" ? "จองผ่านลิงก์ที่ส่งจากแชต" : "จองจากหน้าเว็บ จับคู่ลูกค้าแชตด้วยเบอร์โทร"}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {b.channel || "แชต"} · {b.chatCustomerName || "-"}
                        {b.salesName ? ` · เซลล์ ${b.salesName}` : ""}
                        {b.source !== "chat_link" ? " (จับคู่ด้วยเบอร์)" : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        เว็บ · ไม่พบในแชต
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[b.status]}`}
                >
                  {STATUS_LABELS[b.status]}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                <div className="font-medium text-slate-700">
                  {b.packageName} · พระ {b.monks} รูป · {foodLine(b)}
                </div>
                {b.depositAmount != null && (
                  <div>
                    <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      มัดจำ {b.depositAmount.toLocaleString("th-TH")} บาท{b.depositManual ? " · ระบุเอง" : ""}
                    </span>
                  </div>
                )}
                {typeof b.wantVat === "boolean" && (
                  <div>
                    <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full ${b.wantVat ? "bg-blue-50 text-blue-700 font-semibold" : "bg-slate-100 text-slate-600"}`}>
                      {b.wantVat ? `รับ VAT 7% · รวม ${Math.round(b.estimatedTotal * 1.07).toLocaleString("th-TH")} บาท` : "ไม่รับ VAT"}
                    </span>
                  </div>
                )}
                {b.floor && (
                  <div>
                    <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full ${/ชั้น\s*1(\D|$)/.test(b.floor) ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700 font-semibold"}`}>
                      จัดงาน{b.floor}{/ชั้น\s*1(\D|$)/.test(b.floor) ? "" : " · ตรวจสอบราคา"}
                    </span>
                  </div>
                )}
                {b.customerAddress && (
                  <div className="text-xs text-slate-500">ที่อยู่ออกใบเสนอราคา: {b.customerAddress}</div>
                )}
                {tentAdvice(b) && (
                  <div className={`text-xs rounded-md px-2 py-1 ${b.addons?.includes("tent") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {b.addons?.includes("tent")
                      ? `เลือกเต้นท์ใหญ่เพิ่ม 1 หลังแล้ว (${tentAdvice(b)})`
                      : `แนะนำเพิ่มเต้นท์ใหญ่ 5x12 อีก 1 หลัง: ${tentAdvice(b)} — ลูกค้ายังไม่ได้เลือก`}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {b.eventDate} · {b.timeSlot} · {b.occasion}
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{addressLine(b)}</span>
                </div>
                {b.selfTransport && <div className="text-xs text-emerald-600">นิมนต์รับ-ส่งพระเอง (ลด 1,000)</div>}
                {b.note && <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">หมายเหตุ: {b.note}</div>}
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <div>
                  <div className="font-bold text-brand-700">{formatBaht(b.estimatedTotal)}</div>
                  <div className="text-[11px] text-slate-400">จองเมื่อ {formatDateTime(b.createdAt)}</div>
                </div>
                <div className="flex gap-2 items-center">
                  {b.quotationUrl ? (
                    <a
                      href={b.quotationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                      title="เปิดใบเสนอราคาใน FlowAccount app"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {b.quotationDocNo}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                  {b.quotationPublicUrl ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(b.quotationPublicUrl!); } catch { /* ignore */ }
                        setCopiedId(b.id);
                        setTimeout(() => setCopiedId((c) => (c === b.id ? null : c)), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full ring-1 ring-slate-200 text-slate-500 text-xs hover:text-brand-700 hover:ring-brand-200"
                      title="คัดลอกลิงก์ใบเสนอราคาสำหรับส่งให้ลูกค้า (เปิดได้ไม่ต้อง login)"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {copiedId === b.id ? "คัดลอกแล้ว" : "ลิงก์ลูกค้า"}
                    </button>
                  ) : null}
                  {b.quotationPublicUrl && b.customerId ? (
                    <button
                      type="button"
                      onClick={() => sendChat(b)}
                      disabled={busyId === b.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs ring-1 disabled:opacity-50 ${
                        b.quotationSendStatus === "sent"
                          ? "ring-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : b.quotationSendStatus === "failed"
                            ? "ring-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                            : "ring-violet-200 text-violet-700 hover:bg-violet-50"
                      }`}
                      title={
                        b.quotationSendStatus === "sent"
                          ? `ส่งลิงก์เข้าแชต ${b.channel || ""} แล้ว${b.quotationSentAt ? ` เมื่อ ${new Date(b.quotationSentAt).toLocaleString("th-TH")}` : ""} · กดเพื่อส่งอีกครั้ง`
                          : b.quotationSendStatus === "failed"
                            ? "ส่งเข้าแชตไม่สำเร็จ (Facebook อาจเกินหน้าต่าง 24 ชม.) · กดเพื่อลองใหม่"
                            : "ส่งลิงก์ใบเสนอราคาเข้าห้องแชตของลูกค้า"
                      }
                    >
                      {busyId === b.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : b.quotationSendStatus === "sent" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {b.quotationSendStatus === "sent"
                        ? "ส่งในแชตแล้ว"
                        : b.quotationSendStatus === "failed"
                          ? "ส่งไม่สำเร็จ · ลองใหม่"
                          : b.quotationSendStatus === "sending"
                            ? "กำลังส่ง…"
                            : "ส่งลิงก์ในแชต"}
                    </button>
                  ) : null}
                  {!b.quotationUrl ? (
                    <button
                      onClick={() => createQuote(b)}
                      disabled={busyId === b.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full ring-1 ring-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-50 disabled:opacity-50"
                      title="สร้างใบเสนอราคาใน FlowAccount app"
                    >
                      {busyId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      ใบเสนอราคา
                    </button>
                  ) : null}
                  <button
                    onClick={() => advance(b)}
                    disabled={busyId === b.id}
                    className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 disabled:opacity-50"
                  >
                    → {STATUS_LABELS[NEXT_STATUS[b.status]]}
                  </button>
                  <button
                    onClick={() => remove(b)}
                    disabled={busyId === b.id}
                    className="px-2.5 py-1.5 rounded-full ring-1 ring-slate-200 text-slate-400 hover:text-red-500 hover:ring-red-200 disabled:opacity-50"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
