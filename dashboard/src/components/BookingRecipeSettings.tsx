import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, ExternalLink, AlertTriangle } from "lucide-react";
import {
  getBookingRecipes,
  saveBookingRecipes,
  type BookingRecipeSettings as Settings,
  type FaRecipeConfig,
  type FaRecipe,
} from "@/lib/api-service";

const selectCls =
  "w-full px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelCls = "text-[11px] text-slate-500 mb-1 block";

/**
 * Maps each booking package (and add-on) to product codes in flowaccount-app.
 * Saved in SystemSetting; used by POST /bookings/:id/quotation.
 */
export default function BookingRecipeSettings({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<Settings | null>(null);
  const [config, setConfig] = useState<FaRecipeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    getBookingRecipes()
      .then((d) => {
        setData(d);
        setConfig(d.config);
      })
      .catch((e: any) => setMsg({ kind: "err", text: e?.message || "โหลดการตั้งค่าไม่สำเร็จ" }))
      .finally(() => setLoading(false));
  }, []);

  const products = data?.products || [];
  const byCode = useMemo(() => Object.fromEntries(products.filter((p) => p.code).map((p) => [p.code!, p])), [products]);
  const packageProducts = products.filter((p) => p.code);
  const buffetProducts = products.filter((p) => p.code && p.kind === "PACKAGE" && p.variables.includes("guests"));

  const setPkg = (id: string, patch: Partial<FaRecipe>) =>
    setConfig((c) => c && { ...c, packages: { ...c.packages, [id]: { ...c.packages[id], ...patch } } });
  const setAddon = (id: string, code: string) => setConfig((c) => c && { ...c, addons: { ...c.addons, [id]: code } });

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await saveBookingRecipes(config);
      setConfig(res.config);
      setMsg({ kind: "ok", text: "บันทึกแล้ว ใบเสนอราคาที่สร้างต่อจากนี้จะใช้การผูกนี้" });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => data && setConfig(data.defaults);

  const ProductSelect = ({
    value,
    onChange,
    options,
    allowEmpty,
  }: {
    value: string | null | undefined;
    onChange: (v: string) => void;
    options: typeof products;
    allowEmpty?: boolean;
  }) => {
    const known = options.some((p) => p.code === value);
    return (
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {allowEmpty ? <option value="">(ไม่ใช้ — ส่งเป็นข้อความ)</option> : <option value="">เลือกสินค้า…</option>}
        {value && !known && <option value={value}>{value} (ไม่พบใน flowaccount-app)</option>}
        {options.map((p) => (
          <option key={p.code!} value={p.code!}>
            {p.code} · {p.name}
          </option>
        ))}
      </select>
    );
  };

  const TransportSelect = ({ productCode, value, onChange }: { productCode: string; value: string; onChange: (v: string) => void }) => {
    const comps = byCode[productCode]?.components || [];
    const optional = comps.filter((c) => c.optional);
    if (!comps.length) {
      return <input value={value} onChange={(e) => onChange(e.target.value)} className={selectCls + " font-mono"} placeholder="เช่น transport" />;
    }
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {value && !comps.some((c) => c.code === value) && <option value={value}>{value} (ไม่พบ)</option>}
        {(optional.length ? optional : comps).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.title}
          </option>
        ))}
      </select>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl ring-1 ring-slate-200 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดการตั้งค่า…
      </div>
    );
  }
  if (!config || !data) {
    return <div className="bg-white rounded-xl ring-1 ring-red-200 p-4 text-sm text-red-600">{msg?.text || "โหลดไม่สำเร็จ"}</div>;
  }

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800">ผูกแพ็กเกจกับสินค้าใน FlowAccount app</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เลือกว่าแต่ละแพ็กเกจของหน้า /booking จะใช้รหัสสินค้าไหนตอนสร้างใบเสนอราคา · จัดการสินค้าได้ที่{" "}
            <a href={`${data.appUrl}/products`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
              {data.appUrl.replace(/^https?:\/\//, "")}/products <ExternalLink className="w-3 h-3" />
            </a>
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

      {data.catalogError && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>โหลดรายการสินค้าไม่ได้ ({data.catalogError}) — ยังพิมพ์รหัสเองได้แต่จะไม่มีตัวเลือกให้เลือก</span>
        </div>
      )}
      {msg && (
        <div className={`text-xs rounded-lg px-3 py-2 ring-1 ${msg.kind === "ok" ? "text-emerald-700 bg-emerald-50 ring-emerald-200" : "text-red-600 bg-red-50 ring-red-200"}`}>{msg.text}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.packages.map((pkg) => {
          const r = config.packages[pkg.id];
          if (!r) return null;
          const isFull = pkg.kind === "full";
          return (
            <div key={pkg.id} className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{pkg.name}</div>
                  <div className="text-[11px] font-mono text-slate-400">{pkg.id}</div>
                </div>
                <label className="text-xs text-slate-600 flex items-center gap-1.5">
                  VAT
                  <select value={r.vatRate} onChange={(e) => setPkg(pkg.id, { vatRate: Number(e.target.value) as 0 | 7 })} className="px-2 py-1 rounded-lg ring-1 ring-slate-200 bg-white text-xs">
                    <option value={0}>0%</option>
                    <option value={7}>7%</option>
                  </select>
                </label>
              </div>

              <div>
                <label className={labelCls}>สินค้าพิธีสงฆ์ (บรรทัดหลัก)</label>
                <ProductSelect value={r.monkCode} onChange={(v) => setPkg(pkg.id, { monkCode: v })} options={packageProducts} />
              </div>
              <div>
                <label className={labelCls}>รายการย่อย "นิมนต์รับ-ส่งพระ" ในสินค้านั้น (ตัดออกเมื่อลูกค้านิมนต์เอง)</label>
                <TransportSelect productCode={r.monkCode} value={r.transportCode} onChange={(v) => setPkg(pkg.id, { transportCode: v })} />
              </div>

              {isFull && (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label className={labelCls}>ถ้าแขกเกิน (คน)</label>
                      <input
                        type="number"
                        value={r.largeGuestsAbove ?? ""}
                        onChange={(e) => setPkg(pkg.id, { largeGuestsAbove: e.target.value ? Number(e.target.value) : null })}
                        className={selectCls}
                        placeholder="เช่น 40"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className={labelCls}>ใช้สินค้าพิธีสงฆ์นี้แทน</label>
                      <ProductSelect value={r.monkCodeLarge} onChange={(v) => setPkg(pkg.id, { monkCodeLarge: v || null })} options={packageProducts} allowEmpty />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>สินค้าบุฟเฟต์ (แพ็กเกจที่มีตัวแปร guests → โต๊ะ/เก้าอี้อัตโนมัติ)</label>
                    <ProductSelect value={r.buffetCode} onChange={(v) => setPkg(pkg.id, { buffetCode: v || null })} options={buffetProducts.length ? buffetProducts : packageProducts} allowEmpty />
                  </div>
                  <div>
                    <label className={labelCls}>สินค้าโต๊ะจีน (จำนวน = โต๊ะ)</label>
                    <ProductSelect value={r.chineseTableCode} onChange={(v) => setPkg(pkg.id, { chineseTableCode: v || null })} options={packageProducts} allowEmpty />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
        <div className="font-medium text-slate-800 mb-3">ออปชั่นเสริม</div>
        <div className="grid gap-3 md:grid-cols-3">
          {data.addons.map((a) => (
            <div key={a.id}>
              <label className={labelCls}>
                {a.label} · {a.price.toLocaleString("th-TH")} บาท <span className="font-mono text-slate-400">({a.id})</span>
              </label>
              <ProductSelect value={config.addons[a.id]} onChange={(v) => setAddon(a.id, v)} options={packageProducts} allowEmpty />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">ราคาของทุกรายการยังมาจากตารางราคาของหน้า booking (packages.config.ts) ไม่ใช่ราคาในสินค้า</p>
      </div>
    </div>
  );
}
