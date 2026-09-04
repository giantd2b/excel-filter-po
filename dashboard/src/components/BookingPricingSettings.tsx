import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, Plus, X } from "lucide-react";
import {
  getBookingPricing,
  saveBookingPricing,
  type BookingPricingSettings as Settings,
  type PricingConfig,
  type TierConfig,
} from "@/lib/api-service";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 bg-white text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelCls = "text-[11px] text-slate-500 mb-1 block";

const fmt = (n: number) => n.toLocaleString("th-TH");

/**
 * Edits every package price the /booking page and the quotation builder use.
 * Stored in SystemSetting (booking_pricing) — the public page reads it on load.
 */
export default function BookingPricingSettings({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<Settings | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    getBookingPricing()
      .then((d) => {
        setData(d);
        setPricing(d.pricing);
      })
      .catch((e: any) => setMsg({ kind: "err", text: e?.message || "โหลดราคาไม่สำเร็จ" }))
      .finally(() => setLoading(false));
  }, []);

  const setPkg = (id: string, patch: Partial<PricingConfig["packages"][string]>) =>
    setPricing((p) => p && { ...p, packages: { ...p.packages, [id]: { ...p.packages[id], ...patch } } });

  const setTierCfg = (id: string, mode: "buffet" | "table", cfg: TierConfig) => setPkg(id, { [mode]: cfg });

  const save = async () => {
    if (!pricing) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await saveBookingPricing(pricing);
      setPricing(res.pricing);
      setMsg({ kind: "ok", text: "บันทึกแล้ว หน้า /booking และใบเสนอราคาที่สร้างต่อจากนี้จะใช้ราคานี้" });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => data && setPricing(JSON.parse(JSON.stringify(data.defaults)));

  const TierTable = ({
    id,
    mode,
    cfg,
    unit,
  }: {
    id: string;
    mode: "buffet" | "table";
    cfg: TierConfig | null | undefined;
    unit: string;
  }) => {
    const c: TierConfig = cfg || { tiers: [], extra: 0 };
    const update = (tiers: [number, number][], extra = c.extra) => setTierCfg(id, mode, { tiers, extra });
    return (
      <div className="rounded-lg bg-white ring-1 ring-slate-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-700">{mode === "buffet" ? "บุฟเฟต์ (ตามจำนวนแขก)" : "โต๊ะจีน (ตามจำนวนโต๊ะ)"}</div>
          <button
            type="button"
            onClick={() => {
              const last = c.tiers[c.tiers.length - 1];
              update([...c.tiers, [last ? last[0] + 10 : 20, last ? last[1] : 0]]);
            }}
            className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline"
          >
            <Plus className="w-3 h-3" /> เพิ่มขั้น
          </button>
        </div>
        <div className="grid grid-cols-12 gap-1.5 text-[11px] text-slate-400 mb-1 px-0.5">
          <div className="col-span-4">ตั้งแต่ ({unit})</div>
          <div className="col-span-7 text-right">ราคาแพ็กเกจรวมอาหาร (บาท)</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-1.5">
          {c.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
              <input
                type="number"
                min={1}
                value={t[0]}
                onChange={(e) => update(c.tiers.map((x, j) => (j === i ? [Number(e.target.value) || 0, x[1]] : x)))}
                className={inputCls + " col-span-4"}
              />
              <input
                type="number"
                min={0}
                step={10}
                value={t[1]}
                onChange={(e) => update(c.tiers.map((x, j) => (j === i ? [x[0], Number(e.target.value) || 0] : x)))}
                className={inputCls + " col-span-7"}
              />
              <button
                type="button"
                onClick={() => update(c.tiers.filter((_, j) => j !== i))}
                className="col-span-1 flex justify-center text-slate-400 hover:text-red-500"
                title="ลบขั้น"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-1.5 items-center mt-2 pt-2 border-t border-slate-100">
          <div className="col-span-7 text-xs text-slate-600">เพิ่มต่อ 1 {unit} เมื่อเกินขั้น</div>
          <input
            type="number"
            min={0}
            step={10}
            value={c.extra}
            onChange={(e) => update(c.tiers, Number(e.target.value) || 0)}
            className={inputCls + " col-span-4"}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl ring-1 ring-slate-200 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดราคา…
      </div>
    );
  }
  if (!pricing || !data) {
    return <div className="bg-white rounded-xl ring-1 ring-red-200 p-4 text-sm text-red-600">{msg?.text || "โหลดไม่สำเร็จ"}</div>;
  }

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800">ราคาแพ็กเกจ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ราคาที่หน้า /booking แสดงและใช้คำนวณราคาประเมิน รวมถึงใบเสนอราคาที่สร้างจากรายการจอง · ส่วนพิธีสงฆ์ในใบเสนอราคา = ราคาแพ็กเกจ − (ราคาเพิ่มต่อคน/โต๊ะ × จำนวน)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs text-slate-600 hover:bg-slate-50">
            <RotateCcw className="w-3.5 h-3.5" /> ค่าเริ่มต้น
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs text-slate-600 hover:bg-slate-50">
              ปิด
            </button>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} บันทึก
          </button>
        </div>
      </div>

      {msg && (
        <div className={`text-xs rounded-lg px-3 py-2 ring-1 ${msg.kind === "ok" ? "text-emerald-700 bg-emerald-50 ring-emerald-200" : "text-red-600 bg-red-50 ring-red-200"}`}>{msg.text}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.packages.map((pkg) => {
          const p = pricing.packages[pkg.id];
          if (!p) return null;
          return (
            <div key={pkg.id} className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4 space-y-3">
              <div>
                <div className="font-medium text-slate-800">{pkg.name}</div>
                <div className="text-[11px] font-mono text-slate-400">{pkg.id}</div>
              </div>
              {pkg.kind === "ceremony" ? (
                <div>
                  <label className={labelCls}>ราคาแพ็กเกจ (บาท)</label>
                  <input type="number" min={0} step={10} value={p.base ?? 0} onChange={(e) => setPkg(pkg.id, { base: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
              ) : (
                <>
                  <TierTable id={pkg.id} mode="buffet" cfg={p.buffet} unit="คน" />
                  <TierTable id={pkg.id} mode="table" cfg={p.table} unit="โต๊ะ" />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
          <div className="font-medium text-slate-800 mb-3">ออปชั่นเสริม (บาท)</div>
          <div className="space-y-2">
            {data.addons.map((a) => (
              <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-7 text-sm text-slate-700">
                  {a.label} <span className="text-[11px] font-mono text-slate-400">({a.id})</span>
                </div>
                <input type="number" min={0} step={10} value={pricing.addons[a.id] ?? 0} onChange={(e) => setPricing((x) => x && { ...x, addons: { ...x.addons, [a.id]: Number(e.target.value) || 0 } })} className={inputCls + " col-span-5"} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
          <div className="font-medium text-slate-800 mb-3">ส่วนลด (บาท)</div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7 text-sm text-slate-700">นิมนต์และรับ-ส่งพระเอง</div>
              <input type="number" min={0} step={100} value={pricing.selfTransportDiscount} onChange={(e) => setPricing((x) => x && { ...x, selfTransportDiscount: Number(e.target.value) || 0 })} className={inputCls + " col-span-5"} />
            </div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7 text-sm text-slate-700">พระ 5 รูป (แทน 9 รูป)</div>
              <input type="number" min={0} step={100} value={pricing.fiveMonksDiscount} onChange={(e) => setPricing((x) => x && { ...x, fiveMonksDiscount: Number(e.target.value) || 0 })} className={inputCls + " col-span-5"} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            ส่วนลดนิมนต์เองในใบเสนอราคามาจาก "ลดเมื่อไม่รับ" ของรายการรับ-ส่งพระในสินค้าฝั่ง FlowAccount app ถ้าเปลี่ยนตัวเลขนี้ต้องไปแก้ที่สินค้าให้ตรงกันด้วย (ตอนนี้ {fmt(pricing.selfTransportDiscount)})
          </p>
        </div>
      </div>
    </div>
  );
}
