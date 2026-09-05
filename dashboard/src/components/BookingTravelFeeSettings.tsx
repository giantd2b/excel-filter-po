import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, Plus, X, Truck } from "lucide-react";
import { getTravelFees, saveTravelFees, type TravelFeeConfig } from "@/lib/api-service";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

type Row = { key: string; fee: string };

/**
 * ค่าเดินทางตามอำเภอ/เขตของสถานที่จัดงาน — added to the booking estimate, the preset-link price
 * and as its own line on the quotation. Saved in SystemSetting (booking_travel_fees).
 */
export default function BookingTravelFeeSettings({ onClose }: { onClose?: () => void }) {
  const [defaults, setDefaults] = useState<TravelFeeConfig | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const toRows = (cfg: TravelFeeConfig): Row[] =>
    Object.entries(cfg.fees)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "th"))
      .map(([key, fee]) => ({ key, fee: String(fee) }));

  useEffect(() => {
    getTravelFees()
      .then((d) => {
        setDefaults(d.defaults);
        setRows(toRows(d.config));
      })
      .catch((e: any) => setMsg({ kind: "err", text: e?.message || "โหลดการตั้งค่าไม่สำเร็จ" }))
      .finally(() => setLoading(false));
  }, []);

  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const k = r.key.trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, "");
      if (k) seen.set(k, (seen.get(k) || 0) + 1);
    }
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));
  const addRow = () => setRows((rs) => [...rs, { key: "", fee: "" }]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const fees: Record<string, number> = {};
      for (const r of rows) {
        const k = r.key.trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, "");
        const n = parseInt(r.fee.replace(/[^0-9]/g, ""), 10);
        if (!k) continue;
        if (!Number.isFinite(n) || n < 0) throw new Error(`ค่าเดินทางของ "${k}" ต้องเป็นตัวเลข`);
        fees[k] = n;
      }
      const res = await saveTravelFees({ fees });
      setRows(toRows(res.config));
      setMsg({ kind: "ok", text: "บันทึกแล้ว — ราคาประเมินในหน้าจอง ลิงก์จอง และใบเสนอราคาที่สร้างต่อจากนี้จะใช้ค่านี้" });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => defaults && setRows(toRows(defaults));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" /> ค่าเดินทางตามอำเภอ / เขต
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
            คิดจาก <b>อำเภอของสถานที่จัดงาน</b> (ไม่ใช่ที่อยู่ออกใบเสนอราคา) อำเภอที่ไม่อยู่ในรายการ = ไม่มีค่าเดินทาง
            ค่านี้บวกเข้าราคาประเมินในหน้าจองและลิงก์จอง และออกเป็นบรรทัด "ค่าเดินทาง" ในใบเสนอราคา ไม่นับเป็นค่าอาหาร (ไม่กระทบมัดจำ)
            พิมพ์ชื่ออำเภอ/เขตอย่างเดียว ระบบตัดคำว่า "เขต" หรือ "อ." ให้เอง
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={reset} className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> ค่าเริ่มต้น
          </button>
          <button
            onClick={save}
            disabled={saving || duplicates.size > 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} บันทึก
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
      {duplicates.size > 0 && (
        <p className="text-xs text-red-500">ชื่อซ้ำ: {[...duplicates].join(", ")} — ลบให้เหลือแถวเดียวก่อนบันทึก</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
        {rows.map((r, i) => {
          const k = r.key.trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, "");
          const dup = k && duplicates.has(k);
          return (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.key}
                onChange={(e) => setRow(i, { key: e.target.value })}
                placeholder="อำเภอ / เขต"
                className={`${inputCls} ${dup ? "ring-red-300" : ""}`}
              />
              <div className="relative w-32 shrink-0">
                <input
                  value={r.fee}
                  onChange={(e) => setRow(i, { fee: e.target.value })}
                  inputMode="numeric"
                  placeholder="0"
                  className={`${inputCls} text-right pr-9 tabular-nums`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">บาท</span>
              </div>
              <button onClick={() => removeRow(i)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" title="ลบ">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={addRow} className="text-xs font-medium text-brand-600 hover:text-brand-800 inline-flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> เพิ่มอำเภอ
      </button>
      <p className="text-[11px] text-slate-400">{rows.filter((r) => r.key.trim()).length} อำเภอ/เขต</p>
    </div>
  );
}
