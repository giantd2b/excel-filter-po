import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, ExternalLink, AlertTriangle, Plus, X, ChevronDown, ChevronRight, Utensils, Users, Sparkles } from "lucide-react";
import {
  getBookingRecipes,
  saveBookingRecipes,
  type BookingRecipeSettings as Settings,
  type FaRecipeConfig,
  type FaRecipe,
  type MonkTier,
  type FaCatalogProduct,
} from "@/lib/api-service";

const selectCls =
  "w-full px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelCls = "text-[11px] font-medium text-slate-500 mb-1 block";
const TIER_UNIT: Record<string, string> = { buffet: "คน", table: "โต๊ะ", any: "" };
const TIER_TITLE: Record<string, string> = { buffet: "บุฟเฟต์ — เลือกตามจำนวนแขก", table: "โต๊ะจีน — เลือกตามจำนวนโต๊ะ", any: "ทุกโหมด" };

/**
 * Maps each booking package to flowaccount-app products and remark templates.
 * Saved in SystemSetting; used by POST /bookings/:id/quotation and for deriving prices.
 */
export default function BookingRecipeSettings({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<Settings | null>(null);
  const [config, setConfig] = useState<FaRecipeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [advanced, setAdvanced] = useState<Record<string, boolean>>({});
  // raw text of the "display tiers" inputs so a trailing comma survives re-render
  const [tiersText, setTiersText] = useState<Record<string, string>>({});

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
  const monkProducts = products.filter((p) => p.code && p.kind === "PACKAGE" && p.variables.includes("monks"));
  const buffetProducts = products.filter((p) => p.code && p.kind === "PACKAGE" && p.variables.includes("guests"));
  const allProducts = products.filter((p) => p.code);
  const remarkOptions = (data?.remarkTemplates || []).filter((x) => x.code);

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

  const reset = () => data && setConfig(JSON.parse(JSON.stringify(data.defaults)));

  // ── small controls ─────────────────────────────────────────────
  const ProductSelect = ({
    value, onChange, options, allowEmpty, emptyLabel,
  }: { value: string | null | undefined; onChange: (v: string) => void; options: FaCatalogProduct[]; allowEmpty?: boolean; emptyLabel?: string }) => {
    const known = options.some((p) => p.code === value);
    return (
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        <option value="">{allowEmpty ? emptyLabel || "(ไม่ใช้ — ส่งเป็นข้อความ)" : "เลือกสินค้า…"}</option>
        {value && !known && <option value={value}>{value} (ไม่พบใน IRIS Quotation)</option>}
        {options.map((p) => (
          <option key={p.code!} value={p.code!}>{p.code} · {p.name}</option>
        ))}
      </select>
    );
  };

  const RemarkSelect = ({ value, onChange, emptyLabel }: { value: string | null | undefined; onChange: (v: string | null) => void; emptyLabel: string }) => (
    <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className={selectCls}>
      <option value="">{emptyLabel}</option>
      {value && !remarkOptions.some((x) => x.code === value) && <option value={value}>{value} (ไม่พบ)</option>}
      {remarkOptions.map((x) => (
        <option key={x.code!} value={x.code!}>{x.code} · {x.name}{x.isDefault ? " (ค่าเริ่มต้น)" : ""}</option>
      ))}
    </select>
  );

  const TransportField = ({ productCode, value, onChange }: { productCode: string; value: string; onChange: (v: string) => void }) => {
    const comps = byCode[productCode]?.components || [];
    const optional = comps.filter((c) => c.optional);
    const found = comps.some((c) => c.code === value);
    const suggested = comps.find((c) => c.optional && /นิมนต์|รับ.?ส่งพระ/.test(c.title));
    return (
      <div>
        {comps.length ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
            {!found && <option value={value}>{value} (ไม่พบในสินค้านี้)</option>}
            {(optional.length ? optional : comps).map((c) => (
              <option key={c.code} value={c.code}>{c.code} · {c.title}</option>
            ))}
          </select>
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} className={selectCls + " font-mono"} placeholder="เช่น transport" />
        )}
        {!found && suggested && (
          <button type="button" onClick={() => onChange(suggested.code)} className="mt-1 text-[11px] text-brand-600 hover:underline">
            ใช้ "{suggested.code} · {suggested.title}" ที่พบในสินค้า
          </button>
        )}
      </div>
    );
  };

  // ── tier group (buffet / table) ────────────────────────────────
  const TierGroup = ({ pkg, r, mode }: { pkg: { id: string }; r: FaRecipe; mode: MonkTier["mode"] }) => {
    const tiers = r.monkTiers || [];
    const rows = tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.mode === mode);
    const update = (i: number, patch: Partial<MonkTier>) => setPkg(pkg.id, { monkTiers: tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
    const remove = (i: number) => setPkg(pkg.id, { monkTiers: tiers.filter((_, j) => j !== i) });
    const add = () => {
      const last = rows[rows.length - 1]?.t;
      setPkg(pkg.id, { monkTiers: [...tiers, { mode, from: last ? last.from + 10 : 0, code: last?.code || r.monkCode, remarkCode: null }] });
    };
    if (mode === "any" && rows.length === 0) return null;
    return (
      <div className="rounded-lg bg-white ring-1 ring-slate-100">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            {mode === "buffet" ? <Users className="w-3.5 h-3.5 text-slate-400" /> : <Utensils className="w-3.5 h-3.5 text-slate-400" />}
            {TIER_TITLE[mode]}
          </div>
          <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline">
            <Plus className="w-3 h-3" /> เพิ่มขั้น
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-slate-400 italic">ยังไม่มีขั้น — ใช้สินค้าค่าเริ่มต้นของแพ็กเกจ</p>
        ) : (
          <div className="divide-y divide-slate-50">
            <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
              <div className="col-span-2">ตั้งแต่ ({TIER_UNIT[mode] || "จำนวน"})</div>
              <div className="col-span-5">สินค้าพิธีสงฆ์</div>
              <div className="col-span-4">หมายเหตุ</div>
              <div className="col-span-1" />
            </div>
            {rows.map(({ t, i }) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center">
                <input
                  type="number"
                  min={0}
                  value={t.from}
                  onChange={(e) => update(i, { from: Math.max(0, Number(e.target.value) || 0) })}
                  className={selectCls + " col-span-2 text-right tabular-nums"}
                />
                <div className="col-span-5">
                  <ProductSelect value={t.code} onChange={(v) => update(i, { code: v })} options={monkProducts.length ? monkProducts : allProducts} />
                </div>
                <div className="col-span-4">
                  <RemarkSelect value={t.remarkCode} onChange={(v) => update(i, { remarkCode: v })} emptyLabel="(ตามแพ็กเกจ)" />
                </div>
                <button type="button" onClick={() => remove(i)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-500" title="ลบขั้น">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
      {/* header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800">ผูกแพ็กเกจกับสินค้าใน IRIS Quotation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แต่ละแพ็กเกจของหน้า /booking จะกลายเป็นบรรทัดในใบเสนอราคาตามที่ผูกไว้ · ราคาและข้อความมาจากสินค้าใน{" "}
            <a href={`${data.appUrl}/products`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
              IRIS Quotation <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs text-slate-600 hover:bg-slate-50">
            <RotateCcw className="w-3.5 h-3.5" /> ค่าเริ่มต้น
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs text-slate-600 hover:bg-slate-50">ปิด</button>
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

      {/* packages */}
      <div className="space-y-4">
        {data.packages.map((pkg) => {
          const r = config.packages[pkg.id];
          if (!r) return null;
          const isFull = pkg.kind === "full";
          const open = !!advanced[pkg.id];
          return (
            <section key={pkg.id} className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
              <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-800">{pkg.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">{pkg.id}</span>
                  <span className="text-[11px] text-slate-400">{isFull ? "· พิธีสงฆ์ + อาหาร + โต๊ะ/เก้าอี้" : "· พิธีสงฆ์อย่างเดียว"}</span>
                </div>
                <label className="text-xs text-slate-600 flex items-center gap-1.5">
                  VAT
                  <select value={r.vatRate} onChange={(e) => setPkg(pkg.id, { vatRate: Number(e.target.value) as 0 | 7 })} className="px-2 py-1 rounded-lg ring-1 ring-slate-200 bg-white text-xs">
                    <option value={0}>0%</option>
                    <option value={7}>7%</option>
                  </select>
                </label>
              </header>

              <div className="p-4 space-y-4">
                {isFull ? (
                  <>
                    {/* 1. ceremony product per tier */}
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-2">1. สินค้าพิธีสงฆ์ (เลือกตามขนาดงาน) และหมายเหตุ</div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <TierGroup pkg={pkg} r={r} mode="buffet" />
                        <TierGroup pkg={pkg} r={r} mode="table" />
                        <TierGroup pkg={pkg} r={r} mode="any" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 mt-3">
                        <div>
                          <label className={labelCls}>สินค้าพิธีสงฆ์ค่าเริ่มต้น (เมื่อไม่มีขั้นที่ตรง)</label>
                          <ProductSelect value={r.monkCode} onChange={(v) => setPkg(pkg.id, { monkCode: v })} options={monkProducts.length ? monkProducts : allProducts} />
                        </div>
                        <div>
                          <label className={labelCls}>หมายเหตุค่าเริ่มต้นของแพ็กเกจ (เมื่อขั้นไม่ได้ตั้ง)</label>
                          <RemarkSelect value={r.remarkCode} onChange={(v) => setPkg(pkg.id, { remarkCode: v })} emptyLabel="(ใช้เทมเพลตค่าเริ่มต้นของ FlowAccount)" />
                        </div>
                      </div>
                    </div>

                    {/* 2. food */}
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-2">2. อาหาร</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className={labelCls}>บุฟเฟต์ (สินค้าที่มีตัวแปร guests → ได้โต๊ะกลม/เก้าอี้อัตโนมัติ)</label>
                          <ProductSelect value={r.buffetCode} onChange={(v) => setPkg(pkg.id, { buffetCode: v || null })} options={buffetProducts.length ? buffetProducts : allProducts} allowEmpty />
                        </div>
                        <div>
                          <label className={labelCls}>โต๊ะจีน (คิดต่อโต๊ะ)</label>
                          <ProductSelect value={r.chineseTableCode} onChange={(v) => setPkg(pkg.id, { chineseTableCode: v || null })} options={allProducts} allowEmpty />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>สินค้าพิธีสงฆ์</label>
                      <ProductSelect value={r.monkCode} onChange={(v) => setPkg(pkg.id, { monkCode: v })} options={monkProducts.length ? monkProducts : allProducts} />
                    </div>
                    <div>
                      <label className={labelCls}>หมายเหตุในใบเสนอราคา</label>
                      <RemarkSelect value={r.remarkCode} onChange={(v) => setPkg(pkg.id, { remarkCode: v })} emptyLabel="(ใช้เทมเพลตค่าเริ่มต้นของ FlowAccount)" />
                    </div>
                  </div>
                )}

                {/* advanced */}
                <div className="border-t border-slate-100 pt-2">
                  <button type="button" onClick={() => setAdvanced((a) => ({ ...a, [pkg.id]: !open }))} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} ตั้งค่าขั้นสูง
                    <span className="text-slate-400">· รายการรับ-ส่งพระ{isFull ? " · ขั้นที่แสดงบนหน้า booking" : ""}</span>
                  </button>
                  {open && (
                    <div className="grid gap-3 md:grid-cols-3 mt-3">
                      <div className={isFull ? "" : "md:col-span-3"}>
                        <label className={labelCls}>รายการย่อย "นิมนต์รับ-ส่งพระ" ในสินค้าพิธีสงฆ์ (ตัดออกเมื่อลูกค้านิมนต์เอง)</label>
                        <TransportField productCode={r.monkCode} value={r.transportCode} onChange={(v) => setPkg(pkg.id, { transportCode: v })} />
                      </div>
                      {isFull &&
                        (["buffet", "table"] as const).map((mode) => (
                          <div key={mode}>
                            <label className={labelCls}>{mode === "buffet" ? "ขั้นแขกที่แสดงบนหน้า booking (คน)" : "ขั้นโต๊ะจีนที่แสดง (โต๊ะ)"}</label>
                            <input
                              value={tiersText[`${pkg.id}:${mode}`] ?? (r.displayTiers?.[mode] || []).join(", ")}
                              onChange={(e) => {
                                setTiersText((t) => ({ ...t, [`${pkg.id}:${mode}`]: e.target.value }));
                                const list = e.target.value.split(/[,\s]+/).map((s) => Number(s)).filter((n) => Number.isFinite(n) && n > 0);
                                setPkg(pkg.id, { displayTiers: { buffet: r.displayTiers?.buffet || [], table: r.displayTiers?.table || [], [mode]: Array.from(new Set(list)).sort((a, b) => a - b) } });
                              }}
                              className={selectCls}
                              placeholder={mode === "buffet" ? "20, 30, 40, 50" : "8, 10, 20"}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* add-ons */}
      <section className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
        <header className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-800">ออปชั่นเสริม</span>
          <span className="text-[11px] text-slate-400">· แต่ละรายการเป็นบรรทัดแยกในใบเสนอราคา ราคาจากสินค้า</span>
        </header>
        <div className="p-4 grid gap-3 md:grid-cols-3">
          {data.addons.map((a) => (
            <div key={a.id}>
              <label className={labelCls}>
                {a.label} <span className="font-mono text-slate-400">({a.id})</span>
              </label>
              <ProductSelect value={config.addons[a.id]} onChange={(v) => setAddon(a.id, v)} options={allProducts} allowEmpty />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
