import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { getBookingPricing, refreshBookingPricing, type BookingPricingSettings as Settings } from "@/lib/api-service";

const fmt = (n: number | null | undefined) => (typeof n === "number" ? n.toLocaleString("th-TH") : "—");

/**
 * Read-only view of the booking prices. flowaccount-app is the single source of
 * prices: each number here is derived from the mapped products (ceremony product per
 * tier + food formula / Chinese-table price + add-ons + product discounts).
 */
export default function BookingPricingSettings({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBookingPricing()
      .then(setData)
      .catch((e: any) => setError(e?.message || "โหลดราคาไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await refreshBookingPricing());
    } catch (e: any) {
      setError(e?.message || "รีเฟรชไม่สำเร็จ");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl ring-1 ring-slate-200 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดราคา…
      </div>
    );
  }
  if (!data) return <div className="bg-white rounded-xl ring-1 ring-red-200 p-4 text-sm text-red-600">{error || "โหลดไม่สำเร็จ"}</div>;

  const p = data.pricing;
  const productsUrl = `${data.appUrl}/products`;
  const Code = ({ code }: { code?: string | null }) =>
    code ? <span className="font-mono text-[10px] text-slate-400 ml-1">{code}</span> : null;

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800">ราคาแพ็กเกจ (จาก FlowAccount app)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ราคาทั้งหมดคำนวณจากสินค้าใน FlowAccount app ตามการผูกในแท็บ "ผูกสินค้า" · แก้ราคาได้ที่{" "}
            <a href={productsUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
              หน้าสินค้า FlowAccount <ExternalLink className="w-3 h-3" />
            </a>{" "}
            แล้วกดรีเฟรช · ราคาขั้น = พิธีสงฆ์ของขั้นนั้น + อาหาร (สูตรต่อหัว / โต๊ะจีน × โต๊ะ)
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            แหล่งข้อมูล: {data.source === "flowaccount" ? "FlowAccount (สด)" : "สำเนาล่าสุดที่เก็บไว้"}
            {data.fetchedAt ? ` · ดึงเมื่อ ${new Date(data.fetchedAt).toLocaleString("th-TH")}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs text-slate-600 hover:bg-slate-50">
              ปิด
            </button>
          )}
          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> รีเฟรชจาก FlowAccount
          </button>
        </div>
      </div>

      {(data.catalogError || error) && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error || `ดึงจาก FlowAccount ไม่ได้ (${data.catalogError}) — แสดงจากสำเนาล่าสุด`}</span>
        </div>
      )}
      {data.missingCodes.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            ไม่พบสินค้าใน FlowAccount: <span className="font-mono">{data.missingCodes.join(", ")}</span> — ขั้นที่ใช้สินค้าเหล่านี้จะแสดงราคาสำรองจากโค้ด แก้ในแท็บ "ผูกสินค้า" หรือสร้างสินค้าให้ตรงรหัส
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.packages.map((pkg) => {
          const pp = p.packages[pkg.id];
          const used = data.usedCodes[pkg.id];
          if (!pp) return null;
          return (
            <div key={pkg.id} className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4 space-y-3">
              <div>
                <div className="font-medium text-slate-800">{pkg.name}</div>
                <div className="text-[11px] font-mono text-slate-400">{pkg.id}</div>
              </div>
              {pkg.kind === "ceremony" ? (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-600">
                    ราคาแพ็กเกจ <Code code={used?.base} />
                  </span>
                  <span className="font-semibold tabular-nums">{fmt(pp.base)} บาท</span>
                </div>
              ) : (
                (["buffet", "table"] as const).map((mode) => {
                  const cfg = pp[mode];
                  const unit = mode === "buffet" ? "คน" : "โต๊ะ";
                  return (
                    <div key={mode} className="rounded-lg bg-white ring-1 ring-slate-100 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">{mode === "buffet" ? "บุฟเฟต์ (ตามจำนวนแขก)" : "โต๊ะจีน (ตามจำนวนโต๊ะ)"}</div>
                      {cfg ? (
                        <table className="w-full text-sm">
                          <tbody>
                            {cfg.tiers.map(([count, price]) => (
                              <tr key={count} className="border-t border-slate-50">
                                <td className="py-1 text-slate-600">
                                  {count} {unit}
                                  <Code code={used?.[mode]?.[count]} />
                                </td>
                                <td className="py-1 text-right font-semibold tabular-nums">{fmt(price)}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-slate-100">
                              <td className="py-1 text-slate-500 text-xs">เพิ่มต่อ 1 {unit} เมื่อเกินขั้น</td>
                              <td className="py-1 text-right text-xs tabular-nums">{fmt(cfg.extra)}</td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-slate-400 italic">ไม่มีราคา (ยังไม่ได้ผูกสินค้า)</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
          <div className="font-medium text-slate-800 mb-2">ออปชั่นเสริม</div>
          <table className="w-full text-sm">
            <tbody>
              {data.addons.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-1 text-slate-600">
                    {a.label}
                    <Code code={a.code} />
                  </td>
                  <td className="py-1 text-right font-semibold tabular-nums">{fmt(p.addons[a.id])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
          <div className="font-medium text-slate-800 mb-2">ส่วนลด (จากสินค้าพิธีสงฆ์)</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="py-1 text-slate-600">นิมนต์และรับ-ส่งพระเอง (รายการ "ลดเมื่อไม่รับ")</td>
                <td className="py-1 text-right font-semibold tabular-nums">−{fmt(p.selfTransportDiscount)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-1 text-slate-600">พระ 5 รูป (ราคาฐาน 9 รูป − 5 รูป)</td>
                <td className="py-1 text-right font-semibold tabular-nums">−{fmt(p.fiveMonksDiscount)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2">ตัวเลขที่หน้า /booking แสดง ใช้ค่านี้ ส่วนใบเสนอราคาจริงใช้ส่วนลดของสินค้าแต่ละตัวโดยตรง</p>
        </div>
      </div>
    </div>
  );
}
