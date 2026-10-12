import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ChevronDown, Loader2, RefreshCw, Settings2, UserRound, X } from "lucide-react";
import { api } from "@/lib/api-client";

/* AI ทดสอบเงียบ — what the AI would have replied vs what the admin actually replied, per customer turn */

interface AdminReply {
  text: string | null;
  adminName: string | null;
  timestamp: number;
  mediaType: string | null;
}
interface ShadowItem {
  id: string;
  customerId: string;
  customerName: string;
  pictureUrl: string | null;
  channel: string;
  triggerAt: number;
  question: string;
  action: "reply" | "handoff" | "no_reply" | "error";
  aiReply: string | null;
  handoffReason: string | null;
  intent: string | null;
  confidence: number | null;
  sources: string[];
  model: string;
  latencyMs: number | null;
  error: string | null;
  rating: "good" | "partial" | "bad" | null;
  ratingNote: string | null;
  ratedBy: string | null;
  adminReplies: AdminReply[];
  adminDelaySec: number | null;
}
interface ListRes {
  total: number;
  page: number;
  pageSize: number;
  items: ShadowItem[];
}
interface Stats {
  total: number;
  today: number;
  byAction: Record<string, number>;
  byRating: Record<string, number>;
  avgLatencyMs: number;
  avgConfidence: number | null;
  tokens: { input: number; output: number; cacheRead: number };
}
interface ReplayJob {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  channels: string[];
  target: number;
  found: number;
  done: number;
  errors: number;
  message: string | null;
}
interface Settings {
  enabled: boolean;
  channels: string[];
  dailyCap: number;
  model: string;
}

const ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  reply: { label: "AI ตอบเองได้", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  handoff: { label: "ส่งต่อแอดมิน", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  no_reply: { label: "ไม่ต้องตอบ", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  error: { label: "ผิดพลาด", cls: "bg-red-50 text-red-700 ring-red-200" },
};
const RATINGS: { id: "good" | "partial" | "bad"; label: string; on: string }[] = [
  { id: "good", label: "✅ ใช้ได้", on: "bg-emerald-600 text-white border-emerald-600" },
  { id: "partial", label: "⚠️ พอใช้", on: "bg-amber-500 text-white border-amber-500" },
  { id: "bad", label: "❌ ผิด", on: "bg-red-600 text-white border-red-600" },
];

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDelay = (s: number | null) =>
  s == null ? "" : s < 60 ? `${s} วินาที` : s < 3600 ? `${Math.round(s / 60)} นาที` : `${(s / 3600).toFixed(1)} ชม.`;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "-");

export default function AiShadowPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<ListRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("");
  const [action, setAction] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  /** live = drafted as chats happen · replay = past questions re-answered for the experiment */
  const [mode, setMode] = useState<"replay" | "live">("replay");
  const [job, setJob] = useState<ReplayJob | null>(null);
  const [replayChannels, setReplayChannels] = useState<string[]>(["FB_เติมบุญ", "Line_เติมบุญ"]);
  const [replayCount, setReplayCount] = useState(100);
  const [replayDays, setReplayDays] = useState(90);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allChannels, setAllChannels] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [context, setContext] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (channel) qs.set("channel", channel);
    if (action) qs.set("action", action);
    if (rating) qs.set("rating", rating);
    qs.set("mode", mode);
    qs.set("page", String(page));
    const sq = new URLSearchParams({ mode });
    if (channel) sq.set("channel", channel);
    try {
      const [l, s] = await Promise.all([api.get<ListRes>(`/ai-shadow?${qs}`), api.get<Stats>(`/ai-shadow/stats?${sq}`)]);
      setData(l);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [channel, action, rating, mode, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api.get<{ settings: Settings; channels: string[] }>("/ai-shadow/settings").then((r) => {
      setSettings(r.settings);
      setAllChannels(r.channels);
    });
    api.get<ReplayJob>("/ai-shadow/replay").then(setJob);
  }, []);
  // follow a running replay; refresh the list as answers come in
  useEffect(() => {
    if (!job?.running) return;
    const t = setInterval(async () => {
      const j = await api.get<ReplayJob>("/ai-shadow/replay");
      setJob(j);
      if (mode === "replay") load();
    }, 5000);
    return () => clearInterval(t);
  }, [job?.running, mode, load]);

  const startReplay = async () => {
    const j = await api.post<ReplayJob>("/ai-shadow/replay", { channels: replayChannels, count: replayCount, days: replayDays });
    setJob(j);
    setMode("replay");
    setPage(1);
  };

  const saveSettings = async (patch: Partial<Settings>) => {
    const next = await api.put<Settings>("/ai-shadow/settings", patch);
    setSettings(next);
  };

  const rate = async (item: ShadowItem, r: ShadowItem["rating"], note?: string | null) => {
    const res = await api.patch<{ rating: ShadowItem["rating"]; ratingNote: string | null; ratedBy: string | null }>(
      `/ai-shadow/${item.id}/rating`,
      { rating: r, note: note ?? item.ratingNote },
    );
    setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === item.id ? { ...x, ...res } : x)) } : d));
    const sq = new URLSearchParams({ mode });
    if (channel) sq.set("channel", channel);
    api.get<Stats>(`/ai-shadow/stats?${sq}`).then(setStats);
  };

  const openContext = async () => {
    setShowContext(true);
    if (!context) {
      const r = await api.get<{ knowledge: string }>("/ai-shadow/context");
      setContext(r.knowledge);
    }
  };

  const rated = stats ? stats.total - (stats.byRating.unrated || 0) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-semibold text-slate-800">AI ทดสอบเงียบ</h1>
          <p className="text-sm text-slate-500">
            AI ร่างคำตอบทุกข้อความลูกค้าแต่ <b>ไม่ส่งจริง</b> — เทียบกับที่แอดมินตอบ แล้วให้คะแนนเพื่อวัดว่าพร้อมตอบเองหรือยัง
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${settings?.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}
        >
          {settings ? (settings.enabled ? "● กำลังทดสอบ" : "หยุดอยู่") : "…"}
        </span>
        <button onClick={openContext} className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          AI ใช้ข้อมูลอะไรตอบ?
        </button>
        <button onClick={() => setShowSettings((v) => !v)} className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5">
          <Settings2 className="w-4 h-4" /> ตั้งค่า
        </button>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="รีเฟรช">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* settings */}
      {showSettings && settings && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => saveSettings({ enabled: e.target.checked })} />
            เปิดทดสอบเงียบ (AI ร่างคำตอบ ไม่ส่งให้ลูกค้า)
          </label>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1.5">ช่องทางที่ทดสอบ</div>
            <div className="flex flex-wrap gap-2">
              {allChannels.map((c) => {
                const on = settings.channels.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => saveSettings({ channels: on ? settings.channels.filter((x) => x !== c) : [...settings.channels, c] })}
                    className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              จำกัดวันละ
              <input
                type="number"
                min={0}
                defaultValue={settings.dailyCap}
                onBlur={(e) => saveSettings({ dailyCap: Number(e.target.value) })}
                className="w-24 px-2 py-1 border border-slate-200 rounded-md"
              />
              ครั้ง
            </label>
            <span className="text-slate-500">โมเดล: {settings.model}</span>
          </div>
        </div>
      )}

      {/* mode tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit text-sm">
        {([
          ["replay", "ทดลองย้อนหลัง (คำถามจริงในอดีต)"],
          ["live", "ใช้งานจริง (แชทที่เข้ามาตอนนี้)"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setMode(id); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg ${mode === id ? "bg-white shadow-sm font-medium text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "replay" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="text-sm text-slate-600">
            ดึงคำถามที่ลูกค้าพิมพ์เองจากแชทจริง (ตัดปุ่มคำถามอัตโนมัติของเพจ สติกเกอร์ รูป และคำตอบรับสั้น ๆ ออก) เฉพาะข้อที่แอดมินตอบแล้ว
            ให้ AI ตอบโดยเห็นแชทแค่ถึงตอนนั้น แล้ววางเทียบกับคำตอบแอดมินจริง · ราคาที่ AI ใช้เป็นราคาปัจจุบัน ซึ่งอาจต่างจากตอนที่ลูกค้าถาม
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(allChannels.length ? allChannels : ["FB_เติมบุญ", "Line_เติมบุญ"]).map((c) => {
              const on = replayChannels.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setReplayChannels(on ? replayChannels.filter((x) => x !== c) : [...replayChannels, c])}
                  className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              จำนวนคำถาม
              <input type="number" min={1} max={500} value={replayCount} onChange={(e) => setReplayCount(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded-md" />
            </label>
            <label className="flex items-center gap-2">
              ย้อนหลัง
              <input type="number" min={1} max={365} value={replayDays} onChange={(e) => setReplayDays(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded-md" />
              วัน
            </label>
            <button
              onClick={startReplay}
              disabled={!!job?.running || replayChannels.length === 0}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {job?.running ? "กำลังทดลอง…" : "เริ่มทดลอง"}
            </button>
            <span className="text-xs text-slate-500">ค่า AI ประมาณ 1 บาท/คำถาม</span>
          </div>
          {job && (job.running || job.finishedAt) && (
            <div className="text-sm">
              <div className="flex justify-between text-slate-600 mb-1">
                <span>{job.message}</span>
                <span>{job.done} / {job.found || job.target}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all" style={{ width: `${job.found ? Math.round((job.done / job.found) * 100) : job.running ? 5 : 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="ร่างคำตอบทั้งหมด" value={stats.total.toLocaleString()} sub={`วันนี้ ${stats.today}`} />
          <StatCard label="AI ตอบเองได้" value={pct(stats.byAction.reply || 0, stats.total)} sub={`${stats.byAction.reply || 0} ครั้ง`} />
          <StatCard label="ส่งต่อแอดมิน" value={pct(stats.byAction.handoff || 0, stats.total)} sub={`${stats.byAction.handoff || 0} ครั้ง`} />
          <StatCard
            label="คะแนนจากคุณ"
            value={rated ? pct(stats.byRating.good || 0, rated) : "-"}
            sub={rated ? `ใช้ได้ ${stats.byRating.good || 0} · พอใช้ ${stats.byRating.partial || 0} · ผิด ${stats.byRating.bad || 0}` : "ยังไม่ได้ให้คะแนน"}
          />
          <StatCard label="เวลาคิดเฉลี่ย" value={`${(stats.avgLatencyMs / 1000).toFixed(1)} วิ`} sub={`tokens เข้า ${(stats.tokens.input / 1000).toFixed(0)}k · ออก ${(stats.tokens.output / 1000).toFixed(0)}k`} />
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Select value={channel} onChange={(v) => { setChannel(v); setPage(1); }} options={[["", "ทุกช่องทาง"], ...allChannels.map((c) => [c, c] as [string, string])]} />
        <Select value={action} onChange={(v) => { setAction(v); setPage(1); }} options={[["", "ทุกประเภท"], ["reply", "AI ตอบเองได้"], ["handoff", "ส่งต่อแอดมิน"], ["no_reply", "ไม่ต้องตอบ"], ["error", "ผิดพลาด"]]} />
        <Select value={rating} onChange={(v) => { setRating(v); setPage(1); }} options={[["", "ทุกคะแนน"], ["unrated", "ยังไม่ให้คะแนน"], ["good", "ใช้ได้"], ["partial", "พอใช้"], ["bad", "ผิด"]]} />
        {data && <span className="self-center text-slate-500">{data.total.toLocaleString()} รายการ</span>}
      </div>

      {/* list */}
      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center text-slate-500 py-16 bg-white rounded-xl border border-slate-200">
          ยังไม่มีข้อมูล — เมื่อมีลูกค้าทักเข้ามาในช่องทางที่เปิดทดสอบ AI จะร่างคำตอบภายในประมาณ 30 วินาที
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((it) => <ShadowCard key={it.id} it={it} onRate={rate} />)}
        </div>
      )}

      {data && pages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">ก่อนหน้า</button>
          <span>หน้า {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">ถัดไป</button>
        </div>
      )}

      {/* context drawer */}
      {showContext && (
        <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={() => setShowContext(false)}>
          <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <div className="font-semibold text-slate-800">ข้อมูลที่ AI ใช้ตอบ</div>
                <div className="text-xs text-slate-500">ราคาดึงสดจาก flowaccount · ข้อมูลที่คุณคอนเฟิร์มในหน้าจอง · ฐานความรู้ (หน้า "ฐานความรู้") · ประวัติแชทและการจองของลูกค้าคนนั้น</div>
              </div>
              <button onClick={() => setShowContext(false)} className="p-1.5 rounded hover:bg-slate-100" aria-label="ปิด"><X className="w-5 h-5" /></button>
            </div>
            <pre className="flex-1 overflow-auto p-5 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
              {context ?? "กำลังโหลด…"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-0.5">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function ShadowCard({ it, onRate }: { it: ShadowItem; onRate: (it: ShadowItem, r: ShadowItem["rating"], note?: string | null) => void }) {
  const [note, setNote] = useState(it.ratingNote || "");
  const a = ACTION_LABEL[it.action] || ACTION_LABEL.reply;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* customer turn */}
      <div className="px-4 py-3 border-b border-slate-100 flex gap-3">
        {it.pictureUrl ? (
          <img src={it.pictureUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center flex-none"><UserRound className="w-4 h-4 text-slate-400" /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <Link to={`/dashboard/users/${encodeURIComponent(it.customerId)}`} className="font-medium text-slate-700 hover:underline">{it.customerName}</Link>
            <span>· {it.channel}</span>
            <span>· {fmtTime(it.triggerAt)}</span>
            {it.intent && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{it.intent}</span>}
          </div>
          <div className="mt-1.5 inline-block max-w-full bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap break-words">
            {it.question}
          </div>
        </div>
      </div>

      {/* AI vs admin */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-violet-700">🤖 AI จะตอบ</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ring-1 ${a.cls}`}>{a.label}</span>
            {it.confidence != null && <span className="text-[11px] text-slate-500">มั่นใจ {Math.round(it.confidence * 100)}%</span>}
          </div>
          {it.action === "error" ? (
            <div className="text-sm text-red-600">{it.error}</div>
          ) : it.action === "no_reply" ? (
            <div className="text-sm text-slate-500 italic">ไม่ส่งข้อความ</div>
          ) : (
            <div className="bg-violet-50 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap break-words">{it.aiReply}</div>
          )}
          {it.handoffReason && <div className="text-xs text-amber-700 mt-2">เหตุผลส่งต่อ: {it.handoffReason}</div>}
          {it.sources?.length > 0 && <div className="text-[11px] text-slate-400 mt-2">อ้างอิง: {it.sources.join(" · ")}</div>}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-sky-700">👤 แอดมินตอบจริง</span>
            {it.adminDelaySec != null && <span className="text-[11px] text-slate-500">หลังลูกค้าถาม {fmtDelay(it.adminDelaySec)}</span>}
          </div>
          {it.adminReplies.length === 0 ? (
            <div className="text-sm text-slate-400 italic">ยังไม่มีคำตอบจากแอดมินในระบบ (หรือตอบผ่าน LINE OA Manager ซึ่ง CRM มองไม่เห็น)</div>
          ) : (
            <div className="space-y-1.5">
              {it.adminReplies.map((m, i) => (
                <div key={i} className="bg-sky-50 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap break-words">
                  {m.text || (m.mediaType ? `[${m.mediaType}]` : "")}
                  <div className="text-[11px] text-slate-400 mt-0.5">{m.adminName || "แอดมิน"} · {fmtTime(m.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* rating */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">คำตอบ AI:</span>
        {RATINGS.map((r) => (
          <button
            key={r.id}
            onClick={() => onRate(it, it.rating === r.id ? null : r.id, note || null)}
            className={`text-xs px-3 py-1.5 rounded-full border ${it.rating === r.id ? r.on : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}
          >
            {r.label}
          </button>
        ))}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (it.ratingNote || "") && onRate(it, it.rating, note || null)}
          placeholder="หมายเหตุ เช่น ราคาผิด / ควรถามจำนวนแขกก่อน"
          className="flex-1 min-w-[200px] text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white"
        />
        {it.ratedBy && <span className="text-[11px] text-slate-400">โดย {it.ratedBy}</span>}
      </div>
    </div>
  );
}
