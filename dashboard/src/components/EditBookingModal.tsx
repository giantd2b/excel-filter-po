import { useMemo, useState } from "react";
import { X, Loader2, Save, MapPin } from "lucide-react";
import ThaiDateSelect from "@/components/ThaiDateSelect";
import { updateBooking, type MeritBooking, type UpdateBookingPatch } from "@/lib/api-service";
import { TH_AREAS } from "@/data/th-areas";

const field = "w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const lbl = "text-[11px] font-medium text-slate-500 mb-1 block";
const TIME_SLOTS = ["เช้า 07.00-07.30 น.", "เพล 10.00-10.30 น."];
const FLOORS = ["ชั้น 1", "ชั้น 2", "ชั้น 3", "ชั้น 4 ขึ้นไป"];

type Area = { tambon: string; amphoe: string; province: string; zip: string };
const parseArea = (row: string): Area => { const t = row.split("|"); return { tambon: t[0], amphoe: t[1], province: t[2], zip: t[3] }; };

/** ตำบล search over the service-area dataset (same list the public booking page uses). */
function AreaPicker({ value, onPick }: { value: Area; onPick: (a: Area) => void }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const s = q.trim();
    if (s.length < 1) return [] as Area[];
    return TH_AREAS.filter((x) => x.includes(s)).slice(0, 8).map(parseArea);
  }, [q]);
  return (
    <div>
      <div className="relative">
        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อตำบลเพื่อเปลี่ยนพื้นที่" className={`${field} pl-8`} />
        {hits.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-lg ring-1 ring-slate-200 shadow-lg max-h-56 overflow-auto">
            {hits.map((a) => (
              <button key={`${a.tambon}|${a.amphoe}`} type="button" onClick={() => { onPick(a); setQ(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                <span className="font-semibold text-slate-700">{a.province === "กรุงเทพฯ" ? "แขวง" : "ต."}{a.tambon}</span>
                <span className="text-slate-400"> · {a.province === "กรุงเทพฯ" ? a.amphoe : `อ.${a.amphoe}`} · จ.{a.province} · {a.zip}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        ปัจจุบัน: {value.tambon ? `${value.province === "กรุงเทพฯ" ? "แขวง" : "ต."}${value.tambon} ${value.province === "กรุงเทพฯ" ? value.amphoe : `อ.${value.amphoe}`} จ.${value.province} ${value.zip}` : "ยังไม่ระบุ"}
      </p>
    </div>
  );
}

interface Props {
  booking: MeritBooking;
  onClose: () => void;
  onSaved: (b: MeritBooking, warnings: string[]) => void;
}

/**
 * Correct a booking's contact / date / venue / billing details. The API re-derives travel fee +
 * estimate and pushes date, time, address and phone into the linked quotation while it is still open.
 */
export default function EditBookingModal({ booking: b, onClose, onSaved }: Props) {
  const [f, setF] = useState<UpdateBookingPatch>({
    customerName: b.customerName,
    phone: b.phone,
    occasion: b.occasion,
    eventDate: b.eventDate,
    timeSlot: b.timeSlot,
    venue: b.venue || "",
    tambon: b.tambon || "",
    amphoe: b.amphoe || "",
    province: b.province || "",
    zip: b.zip || "",
    floor: b.floor || "ชั้น 1",
    billingName: b.billingName || "",
    taxId: b.taxId || "",
    billingLine: (b as any).billingLine || "",
    billingTambon: (b as any).billingTambon || "",
    billingAmphoe: (b as any).billingAmphoe || "",
    billingProvince: (b as any).billingProvince || "",
    billingZip: (b as any).billingZip || "",
    wantVat: b.wantVat ?? undefined,
    note: b.note || "",
  });
  const [sameBilling, setSameBilling] = useState(!((b as any).billingTambon && (b as any).billingTambon !== b.tambon));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof UpdateBookingPatch>(k: K, v: UpdateBookingPatch[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: UpdateBookingPatch = { ...f };
      if (sameBilling) {
        patch.billingLine = f.venue; patch.billingTambon = f.tambon; patch.billingAmphoe = f.amphoe; patch.billingProvince = f.province; patch.billingZip = f.zip;
      }
      const res = await updateBooking(b.id, patch);
      onSaved(res.booking, res.warnings || []);
    } catch (e: any) {
      setError(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const venueArea: Area = { tambon: f.tambon || "", amphoe: f.amphoe || "", province: f.province || "", zip: f.zip || "" };
  const billingArea: Area = { tambon: f.billingTambon || "", amphoe: f.billingAmphoe || "", province: f.billingProvince || "", zip: f.billingZip || "" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">แก้ไขการจอง {b.code}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {b.packageName} · แพ็กเกจและจำนวนแขกเปลี่ยนไม่ได้ที่นี่ (สร้างการจองใหม่แทน) · วันงาน ที่อยู่ เบอร์ จะอัปเดตลงใบเสนอราคา {b.quotationDocNo || ""} ให้ถ้าใบยังไม่อนุมัติ
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>ชื่อผู้ติดต่อ</span><input value={f.customerName || ""} onChange={(e) => set("customerName", e.target.value)} className={field} /></label>
          <label className="block"><span className={lbl}>เบอร์โทร</span><input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} className={field} /></label>
          <label className="block"><span className={lbl}>ประเภทงาน</span><input value={f.occasion || ""} onChange={(e) => set("occasion", e.target.value)} className={field} /></label>
          <label className="block"><span className={lbl}>ช่วงเวลา</span>
            <select value={f.timeSlot || ""} onChange={(e) => set("timeSlot", e.target.value)} className={field}>
              {[f.timeSlot || "", ...TIME_SLOTS].filter((v, i, a) => v && a.indexOf(v) === i).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="block"><span className={lbl}>วันที่จัดงาน</span><ThaiDateSelect value={f.eventDate || ""} onChange={(v) => set("eventDate", v)} /></div>
          <label className="block"><span className={lbl}>ชั้นที่จัดงาน</span>
            <select value={f.floor || ""} onChange={(e) => set("floor", e.target.value)} className={field}>
              {[f.floor || "", ...FLOORS].filter((v, i, a) => v && a.indexOf(v) === i).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-xl ring-1 ring-amber-100 bg-amber-50/40 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800">สถานที่จัดงาน (ใช้คิดค่าเดินทาง / พื้นที่บริการ)</p>
          <label className="block"><span className={lbl}>บ้านเลขที่ / หมู่ / ถนน / ชื่อสถานที่</span><input value={f.venue || ""} onChange={(e) => set("venue", e.target.value)} className={field} /></label>
          <AreaPicker value={venueArea} onPick={(a) => setF((x) => ({ ...x, tambon: a.tambon, amphoe: a.amphoe, province: a.province, zip: a.zip }))} />
        </div>

        <div className="rounded-xl ring-1 ring-slate-100 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">ที่อยู่ออกใบเสนอราคา</p>
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} className="w-4 h-4" /> เดียวกับสถานที่จัดงาน</label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block"><span className={lbl}>ออกในนาม (เว้นว่าง = ชื่อผู้ติดต่อ)</span><input value={f.billingName || ""} onChange={(e) => set("billingName", e.target.value)} className={field} /></label>
            <label className="block"><span className={lbl}>เลขผู้เสียภาษี (13 หลัก)</span><input value={f.taxId || ""} onChange={(e) => set("taxId", e.target.value)} className={field} /></label>
          </div>
          {!sameBilling && (
            <>
              <label className="block"><span className={lbl}>บ้านเลขที่ / หมู่ / ถนน</span><input value={f.billingLine || ""} onChange={(e) => set("billingLine", e.target.value)} className={field} /></label>
              <AreaPicker value={billingArea} onPick={(a) => setF((x) => ({ ...x, billingTambon: a.tambon, billingAmphoe: a.amphoe, billingProvince: a.province, billingZip: a.zip }))} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>ใบกำกับภาษี (VAT 7%)</span>
            <select value={f.wantVat === true ? "yes" : f.wantVat === false ? "no" : ""} onChange={(e) => set("wantVat", e.target.value === "" ? undefined : e.target.value === "yes")} className={field}>
              <option value="">ไม่ได้ระบุ</option><option value="yes">ต้องการ</option><option value="no">ไม่ต้องการ</option>
            </select>
          </label>
          <label className="block"><span className={lbl}>หมายเหตุ</span><input value={f.note || ""} onChange={(e) => set("note", e.target.value)} className={field} /></label>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">ยกเลิก</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
