import { useEffect, useState } from "react";
import { X, Link2, Copy, Check, Send, Loader2, ExternalLink } from "lucide-react";
import { createBookingLink, sendMessage, type BookingLink } from "@/lib/api-service";

/** Packages the customer can be sent straight to (ids match booking/src/data/packages.ts). */
const PACKAGE_OPTIONS = [
  { id: "", name: "ให้ลูกค้าเลือกเอง" },
  { id: "ceremony", name: "พิธีสงฆ์ แพ็กเกจงานบุญ" },
  { id: "ceremony-prime", name: "พิธีสงฆ์ PRIME" },
  { id: "full", name: "พิธีสงฆ์ครบวงจร" },
  { id: "full-plus", name: "พิธีสงฆ์ครบวงจรพลัส" },
  { id: "prime", name: "PRIME ครบวงจร" },
];

interface Props {
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  onClose: () => void;
  /** called after the link was sent into the chat, so the parent can refresh messages */
  onSent?: () => void;
}

/**
 * "ลิงก์จอง": a unique /booking/?ref=<token> link for one chat customer. Bookings made through it
 * are attributed to this customer, channel and the admin who created the link.
 */
export default function BookingLinkModal({ customer, onClose, onSent }: Props) {
  const [packageId, setPackageId] = useState("");
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSent(false);
    createBookingLink(customer.id, packageId || undefined)
      .then((l) => { if (!cancelled) setLink(l); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || "สร้างลิงก์ไม่สำเร็จ"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customer.id, packageId]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const sendToChat = async () => {
    if (!link || !customer.oduserId) return;
    setSending(true);
    setError(null);
    try {
      const pkg = PACKAGE_OPTIONS.find((p) => p.id === packageId);
      const text = `จองงานบุญกับ IRIS เติมบุญ ได้ที่ลิงก์นี้เลยค่ะ${pkg?.id ? ` (${pkg.name})` : ""}\n${link.url}\nกรอกรายละเอียดงานแล้วระบบจะออกใบเสนอราคาให้ทันทีค่ะ`;
      await sendMessage({ oduserId: customer.oduserId, docId: customer.id, text, channel: customer.channel });
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setError(e?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-600" />
              ลิงก์จองสำหรับ {customer.displayName}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              การจองและใบเสนอราคาที่มาจากลิงก์นี้จะระบุว่ามาจากแชตนี้ ช่องทางไหน และเซลล์คนไหนเป็นคนส่ง
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">แพ็กเกจเริ่มต้น (ไม่บังคับ)</span>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {PACKAGE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        {loading ? (
          <div className="flex items-center justify-center py-4 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : link ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
              />
              <button
                onClick={copy}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>ช่องทาง: {link.channel}</span>
              {link.createdByName && <span>สร้างโดย: {link.createdByName}</span>}
              <span>เปิดแล้ว {link.openCount} ครั้ง</span>
              <span>จองผ่านลิงก์นี้ {link.bookingCount} รายการ</span>
            </div>
          </div>
        ) : null}

        {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {link && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิดดูหน้าจอง
            </a>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
              ปิด
            </button>
            <button
              onClick={sendToChat}
              disabled={!link || sending || sent || !customer.oduserId}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sent ? "ส่งแล้ว" : "ส่งในแชต"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
