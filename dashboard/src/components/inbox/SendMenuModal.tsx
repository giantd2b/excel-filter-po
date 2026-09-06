import { useEffect, useState } from "react";
import { X, UtensilsCrossed, Send, Loader2, Check, ExternalLink } from "lucide-react";
import {
  getBookingMenuPreview,
  getBookingPricing,
  sendBookingMenuToChat,
  type BookingMenuPartChoice,
  type BookingMenuPreview,
  type BookingPackageInfo,
  type BookingPackageLine,
} from "@/lib/api-service";

/** Fallback when /bookings/pricing is unreachable (ids/parts mirror apps/api/src/modules/bookings/menu-assets.ts). */
const FALLBACK_PACKAGES: BookingPackageInfo[] = [
  { id: "full", name: "ครบวงจร", kind: "full", line: "merit", menuParts: ["buffet", "table"] },
  { id: "full-plus", name: "ครบวงจร พลัส", kind: "full", line: "merit", menuParts: ["buffet", "table"] },
  { id: "prime", name: "PRIME ครบวงจร", kind: "full", line: "merit", menuParts: ["buffet", "table"] },
  { id: "buffet-standard", name: "บุฟเฟต์อาหารไทย แพคเกจเริ่มต้น", kind: "catering", line: "buffet", menuParts: ["buffet"] },
  { id: "buffet-premium", name: "บุฟเฟต์อาหารไทย แพคเกจพรีเมียม", kind: "catering", line: "buffet", menuParts: ["buffet"] },
  { id: "chinese-2000", name: "โต๊ะจีน 2,000 (8 อย่าง)", kind: "catering", line: "chinese", menuParts: ["table"] },
  { id: "chinese-2300", name: "โต๊ะจีน 2,300 (9 อย่าง)", kind: "catering", line: "chinese", menuParts: ["table"] },
  { id: "chinese-2600", name: "โต๊ะจีน 2,600 (10 อย่าง)", kind: "catering", line: "chinese", menuParts: ["table"] },
];
const LINE_LABELS: Record<BookingPackageLine, string> = { merit: "งานบุญ (เมนูเลี้ยงแขก)", buffet: "บุฟเฟต์อาหารไทย", chinese: "โต๊ะจีน" };
const PART_OPTIONS: { key: BookingMenuPartChoice; label: string }[] = [
  { key: "all", label: "ทั้งสองแบบ" },
  { key: "buffet", label: "บุฟเฟต์" },
  { key: "table", label: "โต๊ะจีน" },
];

interface Props {
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  /** package to start on (e.g. the customer's latest booking) */
  defaultPackageId?: string | null;
  onClose: () => void;
  /** called after the menu was pushed into the chat, so the parent can refresh messages */
  onSent?: () => void;
}

/**
 * "ส่งเมนู": push a package's menu posters into the customer's chat as images, followed by a
 * caption with the price line and the storefront detail link. The API fans the images out —
 * one LINE/FB message per poster — so this dialog only picks the package and previews.
 */
export default function SendMenuModal({ customer, defaultPackageId, onClose, onSent }: Props) {
  const [packages, setPackages] = useState<BookingPackageInfo[]>(FALLBACK_PACKAGES);
  const [packageId, setPackageId] = useState(defaultPackageId && FALLBACK_PACKAGES.some((p) => p.id === defaultPackageId) ? defaultPackageId : "buffet-premium");
  const [part, setPart] = useState<BookingMenuPartChoice>("all");
  const [withLink, setWithLink] = useState(true);
  const [preview, setPreview] = useState<BookingMenuPreview | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withMenu = packages.filter((p) => (p.menuParts?.length ?? 0) > 0);
  const pkg = withMenu.find((p) => p.id === packageId);
  const parts = pkg?.menuParts || [];
  const isFacebook = /facebook|fb|messenger/i.test(customer.channel);

  useEffect(() => {
    getBookingPricing()
      .then((res) => {
        const list = (res.packages || []).filter((p) => (p.menuParts?.length ?? 0) > 0);
        if (list.length) {
          setPackages(list);
          if (defaultPackageId && list.some((p) => p.id === defaultPackageId)) setPackageId(defaultPackageId);
        }
      })
      .catch(() => {});
  }, [defaultPackageId]);

  // a package with a single part has nothing to choose
  useEffect(() => {
    if (parts.length === 1 && part !== "all") setPart("all");
  }, [parts.length, part]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSent(false);
    getBookingMenuPreview(packageId, part, withLink)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        setText(res.text);
      })
      .catch((e: any) => !cancelled && setError(e?.message || "โหลดเมนูไม่สำเร็จ"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [packageId, part, withLink]);

  const send = async () => {
    if (!preview || !customer.id) return;
    setSending(true);
    setError(null);
    try {
      await sendBookingMenuToChat({ customerId: customer.id, packageId, part, withLink, text: text.trim() || undefined });
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setError(e?.message || "ส่งเมนูไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const total = (preview?.images.length ?? 0) + 1;
  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white";
  const lbl = "text-xs font-medium text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
              ส่งเมนูอาหารให้ {customer.displayName}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              ระบบจะส่งรูปเมนูทุกหน้าเข้าแชต แล้วตามด้วยข้อความราคาและลิงก์หน้าแพ็กเกจ
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className={lbl}>แพ็กเกจ</label>
          <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={field}>
            {(["buffet", "chinese", "merit"] as BookingPackageLine[]).map((line) => {
              const items = withMenu.filter((p) => (p.line || "merit") === line);
              if (!items.length) return null;
              return (
                <optgroup key={line} label={LINE_LABELS[line]}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {parts.length > 1 && (
          <div>
            <label className={lbl}>เมนูที่จะส่ง</label>
            <div className="mt-1 flex gap-1 bg-slate-100 rounded-full p-0.5">
              {PART_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setPart(o.key)}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${part === o.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className={lbl}>รูปที่จะส่ง {preview ? `(${preview.images.length} รูป)` : ""}</label>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {(preview?.images || []).map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="shrink-0 relative">
                <img src={src} alt={`เมนูหน้า ${i + 1}`} className="h-24 w-[68px] object-cover rounded-lg ring-1 ring-slate-200 bg-slate-50" loading="lazy" />
                <span className="absolute bottom-1 right-1 text-[9px] px-1 rounded bg-black/55 text-white">{i + 1}</span>
              </a>
            ))}
            {!loading && preview && preview.images.length === 0 && (
              <p className="text-[11px] text-slate-400">แพ็กเกจนี้ไม่มีรูปเมนู</p>
            )}
          </div>
        </div>

        <div>
          <label className={lbl}>ข้อความท้ายรูป</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className={`${field} leading-relaxed`} />
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} className="rounded border-slate-300" />
            แนบลิงก์หน้าแพ็กเกจ
            {preview?.detailUrl && (
              <a href={preview.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-slate-400 hover:text-brand-600">
                <ExternalLink className="w-3 h-3" />
                เปิดดู
              </a>
            )}
          </label>
        </div>

        {isFacebook && (
          <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Facebook ส่งได้เฉพาะแชตที่ลูกค้าทักเข้ามาภายใน 24 ชั่วโมง หากเกินกำหนดข้อความจะขึ้นสถานะส่งไม่สำเร็จ
          </div>
        )}
        {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-400">จะส่งทั้งหมด {total} ข้อความ</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
              ปิด
            </button>
            <button
              onClick={send}
              disabled={!preview || loading || sending || sent || preview.images.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sent ? "ส่งแล้ว" : "ส่งเข้าแชต"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
