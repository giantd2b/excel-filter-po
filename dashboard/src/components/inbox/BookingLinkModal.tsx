import { useEffect, useState } from "react";
import { X, Link2, Copy, Check, Send, Loader2, ExternalLink } from "lucide-react";
import ThaiDateSelect, { fmtThaiDate } from "@/components/ThaiDateSelect";
import {
  createBookingLink,
  estimateBooking,
  getBookingPricing,
  sendMessage,
  type BookingLink,
  type BookingPreset,
  type BookingEstimate,
} from "@/lib/api-service";

/** Fallbacks when /bookings/pricing is unreachable (ids match booking/src/data/packages.ts). */
const FALLBACK_PACKAGES = [
  { id: "ceremony", name: "พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)", kind: "ceremony" },
  { id: "ceremony-prime", name: "PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)", kind: "ceremony" },
  { id: "full", name: "ครบวงจร", kind: "full" },
  { id: "full-plus", name: "ครบวงจร พลัส", kind: "full" },
  { id: "prime", name: "PRIME ครบวงจร", kind: "full" },
];
const FALLBACK_ADDONS = [
  { id: "stage", label: "เวทีพระ" },
  { id: "tent", label: "เต็นท์เพิ่ม 1 หลัง" },
  { id: "drape", label: "โยงผ้าประดับเพิ่ม" },
];
const OCCASIONS = ["ทำบุญขึ้นบ้านใหม่", "ทำบุญบริษัท / เปิดกิจการ", "ทำบุญวันเกิด", "ทำบุญอุทิศส่วนกุศล", "ทำบุญบ้าน / ครบรอบ", "งานอื่น ๆ"];
const TIME_SLOTS = [
  { v: "", label: "ให้ลูกค้าเลือก" },
  { v: "เช้า 07.00-07.30 น.", label: "ทำบุญเช้า 07.00-07.30 น." },
  { v: "เพล 10.00-10.30 น.", label: "ถวายเพล 10.00-10.30 น." },
];

const DEFAULT_PRESET: BookingPreset = {
  occasion: "ทำบุญขึ้นบ้านใหม่",
  eventDate: "",
  timeSlot: "",
  packageId: "full",
  foodMode: "buffet",
  guests: 30,
  tables: 10,
  monks: 9,
  selfTransport: false,
  addons: [],
  note: "",
  wantVat: null,
  depositAmount: null,
};

interface Props {
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  onClose: () => void;
  /** called after the link was sent into the chat, so the parent can refresh messages */
  onSent?: () => void;
}

/**
 * "ลิงก์จอง": a unique /booking/?ref=<token> link for one chat customer.
 * Mode "preset": sales fixes the whole package (+ live price) and the customer only fills in
 * personal details. Mode "free": the customer picks the package in the wizard.
 */
export default function BookingLinkModal({ customer, onClose, onSent }: Props) {
  const [mode, setMode] = useState<"preset" | "free">("preset");
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [addons, setAddons] = useState<{ id: string; label: string }[]>(FALLBACK_ADDONS);
  const [preset, setPreset] = useState<BookingPreset>(DEFAULT_PRESET);
  const [estimate, setEstimate] = useState<BookingEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [freePackageId, setFreePackageId] = useState("");
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const pkg = packages.find((p) => p.id === preset.packageId);
  const hasFood = pkg?.kind === "full";

  useEffect(() => {
    getBookingPricing()
      .then((d) => {
        if (d.packages?.length) setPackages(d.packages);
        if (d.addons?.length) setAddons(d.addons);
      })
      .catch(() => {});
  }, []);

  // live price while sales configures the preset
  useEffect(() => {
    if (mode !== "preset") return;
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      estimateBooking(cleanPreset(preset))
        .then((e) => { if (!cancelled) setEstimate(e); })
        .catch(() => { if (!cancelled) setEstimate(null); })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [mode, preset]);

  // free mode: the stable per-customer link is fetched right away (as before)
  useEffect(() => {
    if (mode !== "free") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSent(false);
    createBookingLink(customer.id, { packageId: freePackageId || undefined })
      .then((l) => { if (!cancelled) setLink(l); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || "สร้างลิงก์ไม่สำเร็จ"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, customer.id, freePackageId]);

  const set = <K extends keyof BookingPreset>(k: K, v: BookingPreset[K]) => {
    setPreset((p) => ({ ...p, [k]: v }));
    setLink(null);
    setSent(false);
  };

  const createPresetLink = async () => {
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      setLink(await createBookingLink(customer.id, { preset: cleanPreset(preset) }));
    } catch (e: any) {
      setError(e?.message || "สร้างลิงก์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

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

  const chatText = () => {
    if (!link) return "";
    if (mode === "preset" && link.preset) {
      const p = link.preset;
      const food = hasFood ? (p.foodMode === "table" ? `โต๊ะจีน ${p.tables} โต๊ะ` : `บุฟเฟต์ ${p.guests} ท่าน`) : "อาหารถวายพระ";
      const price =
        link.estimatedTotal != null
          ? p.wantVat
            ? `ราคาประเมิน ${Math.round(link.estimatedTotal * 1.07).toLocaleString("th-TH")} บาท (รวม VAT 7%)`
            : `ราคาประเมิน ${link.estimatedTotal.toLocaleString("th-TH")} บาท${p.wantVat === false ? " (ไม่รวม VAT)" : ""}`
          : "";
      return [
        `สรุปแพ็กเกจที่คุยกันไว้ค่ะ: ${link.packageName} · พระ ${p.monks} รูป · ${food}${p.eventDate ? ` · วันที่ ${fmtThaiDate(p.eventDate)}` : ""}${p.timeSlot ? ` (${p.timeSlot})` : ""}`,
        price,
        link.depositAmount != null ? `มัดจำ ${link.depositAmount.toLocaleString("th-TH")} บาท เพื่อยืนยันคิว` : "",
        `กรอกชื่อ เบอร์ และสถานที่จัดงานที่ลิงก์นี้ ระบบจะออกใบเสนอราคาให้ทันทีค่ะ`,
        link.url,
      ].filter(Boolean).join("\n");
    }
    return `จองงานบุญกับ IRIS เติมบุญ ได้ที่ลิงก์นี้เลยค่ะ\n${link.url}\nกรอกรายละเอียดงานแล้วระบบจะออกใบเสนอราคาให้ทันทีค่ะ`;
  };

  const sendToChat = async () => {
    if (!link || !customer.oduserId) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ oduserId: customer.oduserId, docId: customer.id, text: chatText(), channel: customer.channel });
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setError(e?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white";
  const lbl = "text-xs font-medium text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
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

        <div className="flex gap-1 bg-slate-100 rounded-full p-0.5">
          {[
            { key: "preset", label: "ตั้งแพ็กเกจให้ลูกค้า" },
            { key: "free", label: "ให้ลูกค้าเลือกเอง" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key as "preset" | "free"); setLink(null); setError(null); }}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === m.key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "free" ? (
          <label className="block">
            <span className={lbl}>แพ็กเกจเริ่มต้น (ไม่บังคับ)</span>
            <select value={freePackageId} onChange={(e) => setFreePackageId(e.target.value)} className={field}>
              <option value="">ให้ลูกค้าเลือกเอง</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className={lbl}>ประเภทงาน</span>
                <input list="booking-occasions" value={preset.occasion || ""} onChange={(e) => set("occasion", e.target.value)} className={field} placeholder="เช่น ทำบุญขึ้นบ้านใหม่" />
                <datalist id="booking-occasions">
                  {OCCASIONS.map((o) => <option key={o} value={o} />)}
                </datalist>
              </label>
              <label className="block">
                <span className={lbl}>วันที่จัดงาน (เว้นว่างให้ลูกค้าเลือก)</span>
                <ThaiDateSelect value={preset.eventDate || ""} onChange={(v) => set("eventDate", v)} className="mt-1" />
                {preset.eventDate && (
                  <button type="button" onClick={() => set("eventDate", "")} className="mt-1 text-[11px] text-slate-400 hover:text-slate-600">ล้างวันที่ (ให้ลูกค้าเลือก)</button>
                )}
                {preset.eventDate && (
                  <span className="block mt-1 text-[11px] font-semibold text-violet-700">วันที่เลือก: {fmtThaiDate(preset.eventDate)}</span>
                )}
              </label>
              <label className="block">
                <span className={lbl}>ช่วงเวลาพิธี</span>
                <select value={preset.timeSlot || ""} onChange={(e) => set("timeSlot", e.target.value)} className={field}>
                  {TIME_SLOTS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </label>
              <label className="block col-span-2">
                <span className={lbl}>แพ็กเกจ</span>
                <select value={preset.packageId} onChange={(e) => set("packageId", e.target.value)} className={field}>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              {hasFood && (
                <>
                  <label className="block">
                    <span className={lbl}>อาหารเลี้ยงแขก</span>
                    <select value={preset.foodMode} onChange={(e) => set("foodMode", e.target.value as "buffet" | "table")} className={field}>
                      <option value="buffet">บุฟเฟต์</option>
                      <option value="table">โต๊ะจีน</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={lbl}>{preset.foodMode === "table" ? "จำนวนโต๊ะ" : "จำนวนแขก (ท่าน)"}</span>
                    <input
                      type="number"
                      min={preset.foodMode === "table" ? 8 : 20}
                      value={preset.foodMode === "table" ? preset.tables : preset.guests}
                      onChange={(e) => set(preset.foodMode === "table" ? "tables" : "guests", Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className={field}
                    />
                  </label>
                </>
              )}
              <label className="block">
                <span className={lbl}>พระสงฆ์</span>
                <select value={preset.monks} onChange={(e) => set("monks", parseInt(e.target.value, 10))} className={field}>
                  <option value={9}>9 รูป</option>
                  <option value={5}>5 รูป (ลด 1,500)</option>
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                <input type="checkbox" checked={preset.selfTransport} onChange={(e) => set("selfTransport", e.target.checked)} className="w-4 h-4" />
                ลูกค้านิมนต์รับ-ส่งพระเอง
              </label>
            </div>
            <div>
              <span className={lbl}>ออปชั่นเสริม</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {addons.map((a) => {
                  const on = preset.addons.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set("addons", on ? preset.addons.filter((x) => x !== a.id) : [...preset.addons, a.id])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition-colors ${
                        on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className={lbl}>ใบกำกับภาษี (VAT 7%)</span>
              <select
                value={preset.wantVat === true ? "yes" : preset.wantVat === false ? "no" : ""}
                onChange={(e) => set("wantVat", e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}
                className={field}
              >
                <option value="">ให้ลูกค้าเลือกเอง</option>
                <option value="yes">รับ VAT — ราคารวมภาษี 7% / ออกใบกำกับภาษี</option>
                <option value="no">ไม่รับ VAT — ราคาไม่รวมภาษี</option>
              </select>
            </label>
            <label className="block">
              <span className={lbl}>ยอดมัดจำ (บาท) — เว้นว่าง = ตามกติกาค่าอาหาร{estimate ? ` (${estimate.depositAmount.toLocaleString("th-TH")} บาท จากค่าอาหาร ${estimate.foodAmount.toLocaleString("th-TH")})` : ""}</span>
              <input
                type="number"
                min={0}
                value={preset.depositAmount ?? ""}
                onChange={(e) => set("depositAmount", e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0))}
                className={field}
                placeholder="ระบุเองเมื่อต้องการยอดต่างจากกติกา"
              />
            </label>
            <label className="block">
              <span className={lbl}>ข้อความถึงลูกค้า (แสดงบนหน้าจอง ไม่บังคับ)</span>
              <input value={preset.note || ""} onChange={(e) => set("note", e.target.value)} className={field} placeholder="เช่น ราคานี้รวมเต้นท์ใหญ่ 1 หลังแล้วค่ะ" />
            </label>

            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3 text-sm">
              {estimate ? (
                <>
                  {estimate.rows.map((r) => (
                    <div key={r.k} className="flex justify-between text-xs text-slate-600 py-0.5">
                      <span>{r.k}</span>
                      <span className="tabular-nums">{r.v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-slate-600 py-0.5">
                    <span>มัดจำเพื่อยืนยันคิว{estimate.depositManual ? " (ระบุเอง)" : ""}</span>
                    <span className="tabular-nums font-semibold text-amber-700">{estimate.depositAmount.toLocaleString("th-TH")} บาท</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1 pt-1.5 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">ราคาประเมิน {estimating && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</span>
                    <span className="font-bold text-slate-800 tabular-nums">฿{(preset.wantVat ? estimate.grandTotal : estimate.total).toLocaleString("th-TH")}{preset.wantVat ? " รวม VAT" : ""}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังคำนวณราคาจาก FlowAccount…
                </div>
              )}
            </div>

            {!link && (
              <button
                onClick={createPresetLink}
                disabled={loading || !estimate}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                สร้างลิงก์จองด้วยแพ็กเกจนี้
              </button>
            )}
          </div>
        )}

        {loading && mode === "free" ? (
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
              <button onClick={copy} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>ช่องทาง: {link.channel}</span>
              {link.packageName && <span>แพ็กเกจ: {link.packageName}{link.estimatedTotal != null ? ` · ฿${link.estimatedTotal.toLocaleString("th-TH")}` : ""}</span>}
              {link.createdByName && <span>สร้างโดย: {link.createdByName}</span>}
              <span>เปิดแล้ว {link.openCount} ครั้ง</span>
              <span>จองผ่านลิงก์นี้ {link.bookingCount} รายการ</span>
            </div>
          </div>
        ) : null}

        {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {link && (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
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

/** Drop empty optional strings so the API validators see undefined, not "". */
function cleanPreset(p: BookingPreset): BookingPreset {
  return {
    ...p,
    occasion: p.occasion?.trim() || undefined,
    eventDate: p.eventDate || undefined,
    timeSlot: p.timeSlot || undefined,
    note: p.note?.trim() || undefined,
    wantVat: typeof p.wantVat === "boolean" ? p.wantVat : undefined,
    depositAmount: typeof p.depositAmount === "number" ? p.depositAmount : undefined,
  };
}
