import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Clock, MessageSquare, ArrowDownUp, Users, BarChart3, Timer, Zap, TrendingUp, UserPlus, Phone, Tag, Hash } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface ResponseTimeSummary {
  avgMinutes: number;
  medianMinutes: number;
  fastestMinutes: number;
  slowestMinutes: number;
  totalConversations: number;
}

interface HourData {
  hour: number;
  avgMinutes: number;
  count: number;
}

interface ChannelRT {
  channel: string;
  avgMinutes: number;
  count: number;
}

interface AdminRT {
  adminName: string;
  avgMinutes: number;
  count: number;
}

interface ResponseTimeData {
  summary: ResponseTimeSummary;
  byHour: HourData[];
  byDayOfWeek: { day: number; dayName: string; avgMinutes: number; count: number }[];
  byChannel: ChannelRT[];
  byAdmin: AdminRT[];
}

interface DailyVolume {
  date: string;
  incoming: number;
  outgoing: number;
}

interface HourlyVolume {
  hour: number;
  incoming: number;
  outgoing: number;
}

interface ChannelVolume {
  channel: string;
  incoming: number;
  outgoing: number;
}

interface VolumeData {
  daily: DailyVolume[];
  hourly: HourlyVolume[];
  byChannel: ChannelVolume[];
  totalIncoming: number;
  totalOutgoing: number;
}

interface AdminPerf {
  adminName: string;
  totalReplies: number;
  avgResponseMinutes: number;
  conversationsHandled: number;
}

interface AdminPerfData {
  admins: AdminPerf[];
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMinutes(mins: number): string {
  if (mins < 1) return `${Math.round(mins * 60)} วินาที`;
  if (mins < 60) return `${Math.round(mins)} นาที`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// ── Component ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return d;
  }, [today]);

  const [startDate, setStartDate] = useState(formatDate(weekAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [channel, setChannel] = useState("");

  const [activeTab, setActiveTab] = useState<"performance" | "customers">("performance");
  const [rtData, setRtData] = useState<ResponseTimeData | null>(null);
  const [volData, setVolData] = useState<VolumeData | null>(null);
  const [adminData, setAdminData] = useState<AdminPerfData | null>(null);
  const [custData, setCustData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Channels list from volume data
  const channels = useMemo(() => {
    if (!volData) return [];
    return volData.byChannel.map((c) => c.channel);
  }, [volData]);

  useEffect(() => {
    fetchAll();
  }, [startDate, endDate, channel]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : "";
      const [rt, vol, admin, cust] = await Promise.all([
        api.get<ResponseTimeData>(
          `/analytics/response-time?startDate=${startDate}&endDate=${endDate}${channelParam}`
        ),
        api.get<VolumeData>(
          `/analytics/volume?startDate=${startDate}&endDate=${endDate}`
        ),
        api.get<AdminPerfData>(
          `/analytics/admin-performance?startDate=${startDate}&endDate=${endDate}`
        ),
        api.get<any>(
          `/analytics/customers?startDate=${startDate}&endDate=${endDate}`
        ),
      ]);
      setRtData(rt);
      setVolData(vol);
      setAdminData(admin);
      setCustData(cust);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">วิเคราะห์ประสิทธิภาพ</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">ตั้งแต่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">ถึง</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุกช่องทาง</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
            activeTab === "performance"
              ? "bg-brand-500 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          ประสิทธิภาพ
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
            activeTab === "customers"
              ? "bg-brand-500 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          ลูกค้า
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "customers" ? (
        <CustomerAnalytics data={custData} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={<Clock className="w-5 h-5" />}
              label="เวลาตอบเฉลี่ย"
              value={formatMinutes(rtData?.summary.avgMinutes ?? 0)}
              color="indigo"
            />
            <SummaryCard
              icon={<MessageSquare className="w-5 h-5" />}
              label="ข้อความทั้งหมด"
              value={`${((volData?.totalIncoming ?? 0) + (volData?.totalOutgoing ?? 0)).toLocaleString("th-TH")}`}
              color="blue"
            />
            <SummaryCard
              icon={<ArrowDownUp className="w-5 h-5" />}
              label="เข้า / ออก"
              value={`${(volData?.totalIncoming ?? 0).toLocaleString("th-TH")} / ${(volData?.totalOutgoing ?? 0).toLocaleString("th-TH")}`}
              color="emerald"
            />
            <SummaryCard
              icon={<Users className="w-5 h-5" />}
              label="การสนทนา"
              value={`${(rtData?.summary.totalConversations ?? 0).toLocaleString("th-TH")}`}
              color="amber"
            />
          </div>

          {/* Extra summary: Median, Fastest, Slowest */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MiniStat
              icon={<BarChart3 className="w-4 h-4 text-slate-500" />}
              label="มัธยฐาน"
              value={formatMinutes(rtData?.summary.medianMinutes ?? 0)}
            />
            <MiniStat
              icon={<Zap className="w-4 h-4 text-green-500" />}
              label="เร็วที่สุด"
              value={formatMinutes(rtData?.summary.fastestMinutes ?? 0)}
            />
            <MiniStat
              icon={<Timer className="w-4 h-4 text-red-500" />}
              label="ช้าที่สุด"
              value={formatMinutes(rtData?.summary.slowestMinutes ?? 0)}
            />
          </div>

          {/* Response Time by Hour */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              เวลาตอบกลับตามชั่วโมง
            </h2>
            <HourlyBarChart data={rtData?.byHour ?? []} />
          </div>

          {/* Message Volume Daily */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              ปริมาณข้อความรายวัน
            </h2>
            <DailyVolumeTable data={volData?.daily ?? []} />
          </div>

          {/* Admin Performance */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              ประสิทธิภาพผู้ดูแล
            </h2>
            <AdminTable data={adminData?.admins ?? []} />
          </div>

          {/* Channel Comparison */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              เปรียบเทียบช่องทาง
            </h2>
            <ChannelTable
              volumeData={volData?.byChannel ?? []}
              rtData={rtData?.byChannel ?? []}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgMap[color]}`}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-700">{value}</p>
      </div>
    </div>
  );
}

function HourlyBarChart({ data }: { data: HourData[] }) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">ไม่มีข้อมูล</p>;
  }

  const maxAvg = Math.max(...data.map((d) => d.avgMinutes), 1);
  // Top 3 hours are "peak"
  const sorted = [...data].filter((d) => d.count > 0).sort((a, b) => b.avgMinutes - a.avgMinutes);
  const peakHours = new Set(sorted.slice(0, 3).map((d) => d.hour));

  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((d) => {
        const height = d.avgMinutes > 0 ? Math.max((d.avgMinutes / maxAvg) * 100, 4) : 2;
        const isPeak = peakHours.has(d.hour);
        return (
          <div
            key={d.hour}
            className="flex-1 flex flex-col items-center justify-end group relative"
          >
            {/* Tooltip */}
            <div className="hidden group-hover:block absolute -top-14 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {String(d.hour).padStart(2, "0")}:00 - {formatMinutes(d.avgMinutes)}
              <br />({d.count} สนทนา)
            </div>
            <div
              className={`w-full rounded-t transition-all ${
                isPeak ? "bg-red-400" : "bg-indigo-400"
              } hover:opacity-80`}
              style={{ height: `${height}%` }}
            />
            <span className="text-[10px] text-gray-400 mt-1">
              {String(d.hour).padStart(2, "0")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DailyVolumeTable({ data }: { data: DailyVolume[] }) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">ไม่มีข้อมูล</p>;
  }

  const maxTotal = Math.max(...data.map((d) => d.incoming + d.outgoing), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => {
        const total = d.incoming + d.outgoing;
        const inPct = total > 0 ? (d.incoming / maxTotal) * 100 : 0;
        const outPct = total > 0 ? (d.outgoing / maxTotal) * 100 : 0;
        return (
          <div key={d.date} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 shrink-0">
              {formatThaiDate(d.date)}
            </span>
            <div className="flex-1 flex h-5 rounded overflow-hidden bg-gray-100">
              <div
                className="bg-blue-400 transition-all"
                style={{ width: `${inPct}%` }}
                title={`เข้า: ${d.incoming.toLocaleString("th-TH")}`}
              />
              <div
                className="bg-indigo-400 transition-all"
                style={{ width: `${outPct}%` }}
                title={`ออก: ${d.outgoing.toLocaleString("th-TH")}`}
              />
            </div>
            <span className="text-xs text-gray-500 w-28 text-right shrink-0">
              {d.incoming.toLocaleString("th-TH")} / {d.outgoing.toLocaleString("th-TH")}
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> ขาเข้า
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-400 inline-block" /> ขาออก
        </span>
      </div>
    </div>
  );
}

function AdminTable({ data }: { data: AdminPerf[] }) {
  const [sortKey, setSortKey] = useState<"avgResponseMinutes" | "totalReplies">(
    "avgResponseMinutes"
  );

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === "avgResponseMinutes") return a.avgResponseMinutes - b.avgResponseMinutes;
      return b.totalReplies - a.totalReplies;
    });
  }, [data, sortKey]);

  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">ไม่มีข้อมูล</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              ผู้ดูแล
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-indigo-600"
              onClick={() => setSortKey("totalReplies")}
            >
              ตอบกลับ {sortKey === "totalReplies" ? "▼" : ""}
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-indigo-600"
              onClick={() => setSortKey("avgResponseMinutes")}
            >
              เวลาตอบเฉลี่ย {sortKey === "avgResponseMinutes" ? "▲" : ""}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              สนทนา
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((a, i) => (
            <tr key={a.adminName} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {a.adminName}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">
                {a.totalReplies.toLocaleString("th-TH")}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span
                  className={`font-mono ${
                    a.avgResponseMinutes <= 5
                      ? "text-green-600"
                      : a.avgResponseMinutes <= 30
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {formatMinutes(a.avgResponseMinutes)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">
                {a.conversationsHandled.toLocaleString("th-TH")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChannelTable({
  volumeData,
  rtData,
}: {
  volumeData: ChannelVolume[];
  rtData: ChannelRT[];
}) {
  if (volumeData.length === 0) {
    return <p className="text-gray-400 text-sm">ไม่มีข้อมูล</p>;
  }

  const rtMap = new Map(rtData.map((r) => [r.channel, r]));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              ช่องทาง
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              ข้อความเข้า
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              ข้อความออก
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              รวม
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              เวลาตอบเฉลี่ย
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {volumeData.map((ch) => {
            const rt = rtMap.get(ch.channel);
            return (
              <tr key={ch.channel} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                  {ch.channel}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">
                  {ch.incoming.toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">
                  {ch.outgoing.toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono font-semibold">
                  {(ch.incoming + ch.outgoing).toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {rt ? (
                    <span className="font-mono text-indigo-600">
                      {formatMinutes(rt.avgMinutes)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-5">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-6 bg-gray-300 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="flex items-end gap-1 h-48">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex space-x-4 mb-3">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer Analytics Component ──────────────────────────────────

function CustomerAnalytics({ data }: { data: any }) {
  if (!data) return <p className="text-slate-400 text-center py-10">ไม่มีข้อมูล</p>;

  const { summary, newCustomersDaily, byChannelType, byChannel, topCustomers, byStatus, tagStats } = data;
  const maxDaily = Math.max(...(newCustomersDaily || []).map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard icon={<Users className="w-5 h-5" />} label="ลูกค้าที่แชท" value={summary.active.toLocaleString()} color="blue" />
        <SummaryCard icon={<UserPlus className="w-5 h-5" />} label="ลูกค้าใหม่" value={summary.new.toLocaleString()} color="green" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="ลูกค้าเก่ากลับมา" value={summary.returning.toLocaleString()} color="purple" />
        <SummaryCard icon={<Phone className="w-5 h-5" />} label="มีเบอร์โทร" value={`${summary.withPhone} (${summary.phoneRate}%)`} color="indigo" />
        <SummaryCard icon={<Hash className="w-5 h-5" />} label="LINE / Facebook" value={`${byChannelType?.find((c: any) => c.type === 'LINE')?.count || 0} / ${byChannelType?.find((c: any) => c.type === 'FACEBOOK')?.count || 0}`} color="blue" />
      </div>

      {/* New Customers Chart */}
      {newCustomersDaily?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">ลูกค้าใหม่รายวัน</h3>
          <div className="flex items-end gap-[2px] h-40">
            {newCustomersDaily.map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <div className="absolute -top-6 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {formatThaiDate(d.date)}: {d.count} คน
                </div>
                <div
                  className="w-full bg-brand-400 rounded-t hover:bg-brand-500 transition-colors"
                  style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-400">{newCustomersDaily[0]?.date ? formatThaiDate(newCustomersDaily[0].date) : ''}</span>
            <span className="text-[10px] text-slate-400">{newCustomersDaily.length > 0 ? formatThaiDate(newCustomersDaily[newCustomersDaily.length - 1].date) : ''}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Channel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">ลูกค้าใหม่ตามช่องทาง</h3>
          <div className="space-y-2">
            {byChannel?.map((c: any) => {
              const maxCount = Math.max(...byChannel.map((x: any) => x.count), 1);
              return (
                <div key={c.channel} className="flex items-center gap-3">
                  <span className="text-[12px] text-slate-600 w-32 truncate">{c.channel.replace('Line_', '').replace('FB_', '')}</span>
                  <div className="flex-1 h-5 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.channel.startsWith('Line_') ? 'bg-emerald-400' : 'bg-blue-400'}`}
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700 w-12 text-right tabular-nums">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">แท็กลูกค้า</h3>
          {tagStats?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tagStats.map((t: any) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    color: t.color,
                    backgroundColor: `${t.color}15`,
                    border: `1px solid ${t.color}30`,
                  }}
                >
                  {t.name}
                  <span className="text-[10px] opacity-70">({t.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-slate-300">ไม่มีแท็ก</p>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      {byStatus?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">สถานะลูกค้า</h3>
          <div className="flex gap-4">
            {byStatus.map((s: any) => {
              const statusColors: Record<string, string> = {
                OPEN: 'bg-blue-100 text-blue-700',
                FOLLOW_UP: 'bg-amber-100 text-amber-700',
                RESOLVED: 'bg-emerald-100 text-emerald-700',
              };
              const statusLabels: Record<string, string> = {
                OPEN: 'เปิด',
                FOLLOW_UP: 'ติดตาม',
                RESOLVED: 'แก้ไขแล้ว',
              };
              return (
                <div key={s.status} className={`flex-1 rounded-xl px-4 py-3 text-center ${statusColors[s.status] || 'bg-slate-100 text-slate-600'}`}>
                  <p className="text-2xl font-bold tabular-nums">{s.count.toLocaleString()}</p>
                  <p className="text-[11px] font-medium mt-1">{statusLabels[s.status] || s.status}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
        <h3 className="text-[14px] font-bold text-slate-800 mb-4">ลูกค้าที่แชทมากสุด (Top 20)</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase">#</th>
              <th className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase">ลูกค้า</th>
              <th className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase">ช่องทาง</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase">ข้อความ</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers?.map((c: any, i: number) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-2.5 px-3 text-[12px] text-slate-400 font-semibold">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                      {c.pictureUrl ? (
                        <img src={c.pictureUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          {c.displayName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-slate-700">{c.displayName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    c.channelType === 'line' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {c.channelType === 'line' ? 'LINE' : 'FB'}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1.5">{c.channel?.replace('Line_', '').replace('FB_', '')}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-[13px] font-bold text-slate-700 tabular-nums">{c.messageCount.toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
