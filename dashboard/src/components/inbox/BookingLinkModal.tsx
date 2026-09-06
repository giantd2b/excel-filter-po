import { useEffect, useState } from "react";
import { X, Link2, Copy, Check, Send, Loader2, ExternalLink } from "lucide-react";
import ThaiDateSelect, { fmtThaiDate } from "@/components/ThaiDateSelect";
import {
  createBookingLink,
  estimateBooking,
  getBookingPricing,
  sendBookingMenuToChat,
  sendMessage,
  type BookingLink,
  type BookingPreset,
  type BookingEstimate,
  type BookingPackageInfo,
  type BookingAddonInfo,
  type BookingPackageLine,
} from "@/lib/api-service";

/** Fallbacks when /bookings/pricing is unreachable (ids match booking/src/data/packages.ts). */
const FALLBACK_PACKAGES: BookingPackageInfo[] = [
  { id: "ceremony", name: "พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)", kind: "ceremony", line: "merit" },
  { id: "ceremony-prime", name: "PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)", kind: "ceremony", line: "merit", includedAddons: ["drape"] },
  { id: "full", name: "ครบวงจร", kind: "full", line: "merit" },
  { id: "full-plus", name: "ครบวงจร พลัส", kind: "full", line: "merit" },
  { id: "prime", name: "PRIME ครบวงจร", kind: "full", line: "merit", includedAddons: ["drape"] },
  { id: "buffet-standard", name: "บุฟเฟต์อาหารไทย แพคเกจเริ่มต้น", kind: "catering", line: "buffet", unit: "guest", minCount: 40 },
  { id: "buffet-premium", name: "บุฟเฟต์อาหารไทย แพคเกจพรีเมียม", kind: "catering", line: "buffet", unit: "guest", minCount: 40 },
  { id: "chinese-2000", name: "โต๊ะจีน 2,000 (8 อย่าง)", kind: "catering", line: "chinese", unit: "table", minCount: 10, courses: 8 },
  { id: "chinese-2300", name: "โต๊ะจีน 2,300 (9 อย่าง)", kind: "catering", line: "chinese", unit: "table", minCount: 10, courses: 9 },
  { id: "chinese-2600", name: "โต๊ะจีน 2,600 (10 อย่าง)", kind: "catering", line: "chinese", unit: "table", minCount: 10, courses: 10 },
];
const FALLBACK_ADDONS: BookingAddonInfo[] = [
  { id: "stage", label: "เวทีพระ", price: 5000, lines: ["merit"] },
  { id: "tent", label: "เต็นท์เพิ่ม 1 หลัง", price: 3000, lines: ["merit"] },
  { id: "drape", label: "โยงผ้าประดับเพิ่ม", price: 1000, lines: ["merit"] },
  { id: "drinks", label: "เครื่องดื่ม", price: 250, perUnit: "table", lines: ["chinese"] },
];
const LINE_LABELS: Record<BookingPackageLine, string> = { merit: "งานบุญ", buffet: "บุฟเฟต์อาหารไทย", chinese: "โต๊ะจีน" };
/** the three things sales can offer — picking one filters the package list and every field below */
const LINE_CHOICES: { line: BookingPackageLine; icon: string; label: string; hint: string }[] = [
  { line: "merit", icon: "🙏", label: "พิธีสงฆ์ / งานบุญ", hint: "นิมนต์พระ + เลี้ยงแขก (หรือไม่มีแขก)" },
  { line: "buffet", icon: "🍛", label: "บุฟเฟต์อย่างเดียว", hint: "อาหารไทยต่อท่าน ไม่มีพิธี" },
  { line: "chinese", icon: "🥢", label: "โต๊ะจีนอย่างเดียว", hint: "ต่อโต๊ะ 8 ท่าน ไม่มีพิธี" },
];
/** package the form jumps to when sales switches line (mirrors the storefront defaults) */
const LINE_FIRST: Record<BookingPackageLine, string> = { merit: "full", buffet: "buffet-standard", chinese: "chinese-2300" };
/** select value that reveals the free-text occasion input */
const CUSTOM_OCCASION = "__custom__";
const OCCASIONS = ["ทำบุญขึ้นบ้านใหม่", "ทำบุญบริษัท / เปิดกิจการ", "ทำบุญวันเกิด", "ทำบุญอุทิศส่วนกุศล", "ทำบุญบ้าน / ครบรอบ", "งานอื่น ๆ"];
const CATERING_OCCASIONS = ["งานเลี้ยงบริษัท / สัมมนา", "งานแต่งงาน", "งานบวช", "งานศพ", "งานเลี้ยงรุ่น / ครอบครัว", "งานอื่น ๆ"];
const TIME_SLOTS = [
  { v: "", label: "ให้ลูกค้าเลือก" },
  { v: "เช้า 07.00-07.30 น.", label: "ทำบุญเช้า 07.00-07.30 น." },
  { v: "เพล 10.00-10.30 น.", label: "ถวายเพล 10.00-10.30 น." },
];
const CATERING_TIME_SLOTS = [
  { v: "", label: "ให้ลูกค้าเลือก" },
  { v: "เที่ยง 11.00-13.00 น.", label: "มื้อเที่ยง 11.00-13.00 น." },
  { v: "เย็น 17.00-19.00 น.", label: "มื้อเย็น 17.00-19.00 น." },
];
const DISH_COUNTS = [5, 6, 7, 8];

const DEFAULT_PRESET: BookingPreset = {
  occasion: "ทำบุญขึ้นบ้านใหม่",
  eventDate: "",
  timeSlot: "",
  packageId: "full",
  foodMode: "buffet",
  guests: 30,
  tables: 10,
  monks: 9,
  dishCount: 6,
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
  const [packages, setPackages] = useState<BookingPackageInfo[]>(FALLBACK_PACKAGES);
  const [addons, setAddons] = useState<BookingAddonInfo[]>(FALLBACK_ADDONS);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [travelFees, setTravelFees] = useState<Record<string, number>>({});
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
  // also push the package menu posters before the link text (packages with a menu only)
  const [attachMenu, setAttachMenu] = useState(false);

  const pkg = packages.find((p) => p.id === preset.packageId);
  const hasFood = pkg?.kind === "full";
  const isCatering = pkg?.kind === "catering";
  const line: BookingPackageLine = pkg?.line || "merit";
  // the package whose menu would be attached: the preset package, or the fixed package in free mode
  const menuPkg = mode === "preset" ? pkg : packages.find((p) => p.id === freePackageId);
  const menuParts = menuPkg?.menuParts || [];
  const menuPart = menuParts.length > 1 ? (mode === "preset" ? (preset.foodMode === "table" ? "table" : "buffet") : "all") : "all";
  const includedAddons = pkg?.includedAddons || [];
  const linePackages = packages.filter((p) => (p.line || "merit") === line);
  const occasionOptions = line === "merit" ? OCCASIONS : CATERING_OCCASIONS;
  // an occasion typed by hand (not in the list) keeps the free-text input open
  const occasionIsCustom = !occasionOptions.includes(preset.occasion || "");
  const switchLine = (l: BookingPackageLine) => {
    if (l === line) return;
    const first = packages.find((p) => p.id === LINE_FIRST[l]) || packages.find((p) => (p.line || "merit") === l);
    if (first) set("packageId", first.id);
  };
  // add-ons the selected package can be sold with (its line's, minus the ones it already includes)
  const lineAddons = addons.filter((a) => (!a.lines || a.lines.includes(line)) && !includedAddons.includes(a.id));
  // Keep the preset consistent with the package: drop add-ons it can't have (PRIME's drape, other
  // lines' items), no monks / self-transport for catering, food mode follows the catering unit,
  // counts lifted to the minimum, occasion/time reset when they belong to another line.
  useEffect(() => {
    if (!pkg) return;
    setPreset((p) => {
      const ok = new Set(lineAddons.map((a) => a.id));
      const next: BookingPreset = { ...p, addons: p.addons.filter((a) => ok.has(a)) };
      if (pkg.kind === "catering") {
        next.foodMode = pkg.unit === "table" ? "table" : "buffet";
        next.monks = 0;
        next.selfTransport = false;
        const min = pkg.minCount ?? 1;
        if (pkg.unit === "table") next.tables = Math.max(min, p.tables || 0);
        else next.guests = Math.max(min, p.guests || 0);
        if (!(next.dishCount && next.dishCount >= 5 && next.dishCount <= 8)) next.dishCount = 6;
      } else if (!p.monks) {
        next.monks = 9;
      }
      const occ = line === "merit" ? OCCASIONS : CATERING_OCCASIONS;
      if (next.occasion && !occ.includes(next.occasion) && (OCCASIONS.includes(next.occasion) || CATERING_OCCASIONS.includes(next.occasion))) next.occasion = occ[0];
      const slots = line === "merit" ? TIME_SLOTS : CATERING_TIME_SLOTS;
      if (next.timeSlot && !slots.some((s) => s.v === next.timeSlot)) next.timeSlot = "";
      return JSON.stringify(next) === JSON.stringify(p) ? p : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.packageId, packages, addons]);

  useEffect(() => {
    getBookingPricing()
      .then((d) => {
        if (d.packages?.length) setPackages(d.packages);
        if (d.addons?.length) setAddons(d.addons);
        if (d.travelFees) setTravelFees(d.travelFees);
      })
      .catch(() => {});
  }, []);

  // live price while sales configures the preset
  useEffect(() => {
    if (mode !== "preset") return;
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      estimateBooking(cleanPreset(preset, pkg))
        .then((e) => { if (!cancelled) { setEstimate(e); setEstimateError(null); } })
        .catch((e: any) => { if (!cancelled) { setEstimate(null); setEstimateError(e?.message || null); } })
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
      setLink(await createBookingLink(customer.id, { preset: cleanPreset(preset, pkg) }));
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
      const food = isCatering
        ? pkg?.unit === "table"
          ? `${p.tables} โต๊ะ${pkg?.courses ? ` (${pkg.courses} อย่าง)` : ""}${p.addons.includes("drinks") ? " + เครื่องดื่ม" : ""}`
          : `${p.dishCount ?? 6} อย่าง · ${p.guests} ท่าน`
        : hasFood
          ? p.foodMode === "table"
            ? `โต๊ะจีน ${p.tables} โต๊ะ`
            : `บุฟเฟต์ ${p.guests} ท่าน`
          : "อาหารถวายพระ";
      const head = isCatering ? `${link.packageName} · ${food}` : `${link.packageName} · พระ ${p.monks} รูป · ${food}`;
      const price =
        link.estimatedTotal != null
          ? p.wantVat
            ? `ราคาประเมิน ${Math.round(link.estimatedTotal * 1.07).toLocaleString("th-TH")} บาท (รวม VAT 7%)`
            : `ราคาประเมิน ${link.estimatedTotal.toLocaleString("th-TH")} บาท${p.wantVat === false ? " (ไม่รวม VAT)" : ""}`
          : "";
      return [
        `สรุปแพ็กเกจที่คุยกันไว้ค่ะ: ${head}${p.eventDate ? ` · วันที่ ${fmtThaiDate(p.eventDate)}` : ""}${p.timeSlot ? ` (${p.timeSlot})` : ""}`,
        price,
        link.depositAmount != null ? `มัดจำ ${link.depositAmount.toLocaleString("th-TH")} บาท เพื่อยืนยันคิว` : "",
        `กรอกชื่อ เบอร์ และสถานที่จัดงานที่ลิงก์นี้ ระบบจะออกใบเสนอราคาให้ทันทีค่ะ`,
        link.url,
      ].filter(Boolean).join("\n");
    }
    return `จองงานบุญ บุฟเฟต์ หรือโต๊ะจีนกับ IRIS ได้ที่ลิงก์นี้เลยค่ะ\n${link.url}\nกรอกรายละเอียดงานแล้วระบบจะออกใบเสนอราคาให้ทันทีค่ะ`;
  };

  const sendToChat = async () => {
    if (!link || !customer.oduserId) return;
    setSending(true);
    setError(null);
    try {
      if (attachMenu && menuPkg && menuParts.length) {
        await sendBookingMenuToChat({ customerId: customer.id, packageId: menuPkg.id, part: menuPart, withLink: false });
      }
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
              {(["merit", "buffet", "chinese"] as BookingPackageLine[]).map((l) => (
                <optgroup key={l} label={LINE_LABELS[l]}>
                  {packages.filter((p) => (p.line || "merit") === l).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <div className="space-y-3">
            {/* 1. which line — the package list and every field below follow it */}
            <div>
              <span className={lbl}>รูปแบบงานที่จะเสนอให้ลูกค้า</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {LINE_CHOICES.map((c) => (
                  <button
                    key={c.line}
                    type="button"
                    onClick={() => switchLine(c.line)}
                    className={`rounded-xl border px-2 py-2 text-left transition-colors ${
                      line === c.line ? "border-violet-500 bg-violet-50 ring-1 ring-violet-300" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${line === c.line ? "text-violet-800" : "text-slate-700"}`}>{c.icon} {c.label}</div>
                    <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{c.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className={lbl}>แพ็กเกจ · {LINE_LABELS[line]}</span>
                <select value={preset.packageId} onChange={(e) => set("packageId", e.target.value)} className={field}>
                  {linePackages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              {isCatering && pkg?.unit === "guest" && (
                <label className="block">
                  <span className={lbl}>จำนวนอาหารคาว</span>
                  <select value={preset.dishCount ?? 6} onChange={(e) => set("dishCount", parseInt(e.target.value, 10))} className={field}>
                    {DISH_COUNTS.map((n) => <option key={n} value={n}>{n} อย่าง</option>)}
                  </select>
                </label>
              )}
              {isCatering && (
                <label className="block">
                  <span className={lbl}>{pkg?.unit === "table" ? `จำนวนโต๊ะ (ขั้นต่ำ ${pkg?.minCount ?? 10})` : `จำนวนแขก (ท่าน, ขั้นต่ำ ${pkg?.minCount ?? 40})`}</span>
                  <input
                    type="number"
                    min={pkg?.minCount ?? 1}
                    step={pkg?.unit === "table" ? 1 : 10}
                    value={pkg?.unit === "table" ? preset.tables : preset.guests}
                    onChange={(e) => set(pkg?.unit === "table" ? "tables" : "guests", Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className={field}
                  />
                </label>
              )}
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
              {!isCatering && (
                <>
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
                </>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className={lbl}>ประเภทงาน</span>
                <select
                  value={occasionIsCustom ? CUSTOM_OCCASION : preset.occasion || ""}
                  onChange={(e) => set("occasion", e.target.value === CUSTOM_OCCASION ? "" : e.target.value)}
                  className={field}
                >
                  {occasionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  <option value={CUSTOM_OCCASION}>อื่น ๆ (ระบุเอง)</option>
                </select>
                {occasionIsCustom && (
                  <input
                    autoFocus
                    value={preset.occasion || ""}
                    onChange={(e) => set("occasion", e.target.value)}
                    className={field}
                    placeholder={line === "merit" ? "เช่น ทำบุญครบรอบวันตาย" : "เช่น งานเปิดตัวสินค้า"}
                  />
                )}
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
                <span className={lbl}>{isCatering ? "ช่วงเวลาเสิร์ฟ" : "ช่วงเวลาพิธี"}</span>
                <select value={preset.timeSlot || ""} onChange={(e) => set("timeSlot", e.target.value)} className={field}>
                  {(line === "merit" ? TIME_SLOTS : CATERING_TIME_SLOTS).map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className={lbl}>อำเภอ/เขตของสถานที่จัดงาน (คิดค่าเดินทาง)</span>
              <select value={preset.amphoe || ""} onChange={(e) => set("amphoe", e.target.value || undefined)} className={field}>
                <option value="">ไม่มีค่าเดินทาง / ยังไม่ทราบ — คิดตามที่ลูกค้ากรอก</option>
                {Object.entries(travelFees)
                  .sort((a, b) => a[0].localeCompare(b[0], "th"))
                  .map(([k, v]) => (
                    <option key={k} value={k}>{k} · +{v.toLocaleString("th-TH")} บาท</option>
                  ))}
              </select>
              <span className="text-[10px] text-slate-400">ราคาจริงคิดจากอำเภอที่ลูกค้าเลือกในฟอร์มเสมอ</span>
            </label>
            <div>
              <span className={lbl}>ออปชั่นเสริม</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {lineAddons.length === 0 && <span className="text-xs text-slate-400 italic">แพ็กเกจนี้ไม่มีออปชั่นเสริม</span>}
                {addons.filter((a) => !a.lines || a.lines.includes(line)).map((a) => {
                  const included = includedAddons.includes(a.id);
                  const on = !included && preset.addons.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={included}
                      title={included ? "แพ็กเกจนี้รวมรายการนี้อยู่แล้ว" : undefined}
                      onClick={() => set("addons", on ? preset.addons.filter((x) => x !== a.id) : [...preset.addons, a.id])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition-colors ${
                        included
                          ? "bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed"
                          : on
                            ? "bg-brand-600 text-white ring-brand-600"
                            : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {a.label}
                      {included ? " · รวมในแพ็กเกจแล้ว" : a.perUnit === "table" ? ` · ${(a.price ?? 250).toLocaleString("th-TH")}/โต๊ะ` : ""}
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
              ) : estimateError && !estimating ? (
                <div className="text-xs text-red-600">{estimateError}</div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังคำนวณราคาจาก IRIS Quotation…
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

        {menuParts.length > 0 && (
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={attachMenu} onChange={(e) => setAttachMenu(e.target.checked)} className="rounded border-slate-300" />
            ส่งรูปเมนูอาหาร{menuParts.length > 1 ? ` (${menuPart === "table" ? "โต๊ะจีน" : menuPart === "buffet" ? "บุฟเฟต์" : "บุฟเฟต์ + โต๊ะจีน"})` : ""}ก่อนลิงก์จองด้วย
          </label>
        )}
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

/** Drop empty optional strings so the API validators see undefined, not "". dishCount only travels for buffet catering. */
function cleanPreset(p: BookingPreset, pkg?: BookingPackageInfo): BookingPreset {
  return {
    ...p,
    dishCount: pkg?.kind === "catering" && pkg.unit === "guest" ? p.dishCount ?? 6 : undefined,
    occasion: p.occasion?.trim() || undefined,
    eventDate: p.eventDate || undefined,
    timeSlot: p.timeSlot || undefined,
    note: p.note?.trim() || undefined,
    wantVat: typeof p.wantVat === "boolean" ? p.wantVat : undefined,
    depositAmount: typeof p.depositAmount === "number" ? p.depositAmount : undefined,
    amphoe: p.amphoe?.trim() || undefined,
    province: p.province?.trim() || undefined,
  };
}
