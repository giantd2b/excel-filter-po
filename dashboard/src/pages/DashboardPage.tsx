import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import {
  Users,
  MessageSquare,
  UserPlus,
  Bell,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<any>("/analytics/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-slate-400 py-20">ไม่สามารถโหลดข้อมูลได้</p>;

  const o = data.overview;
  const maxMsg = Math.max(...(data.dailyMessages || []).map((d: any) => d.incoming + d.outgoing), 1);
  const maxNew = Math.max(...(data.dailyNewCustomers || []).map((d: any) => d.count), 1);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-slate-400 mt-1">ภาพรวมระบบ IRIS CRM</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="ลูกค้าทั้งหมด"
          value={o.totalCustomers.toLocaleString()}
          sub={`+${o.newCustomersMonth} เดือนนี้`}
          trend={o.custGrowth}
          color="blue"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="ข้อความเดือนนี้"
          value={o.monthMessages.toLocaleString()}
          sub={`วันนี้ ${o.todayMessages.toLocaleString()}`}
          trend={o.msgGrowth}
          color="emerald"
        />
        <StatCard
          icon={<UserPlus className="w-5 h-5" />}
          label="ลูกค้าใหม่วันนี้"
          value={o.newCustomersToday.toString()}
          sub={`สัปดาห์นี้ ${o.newCustomersWeek}`}
          color="violet"
        />
        <StatCard
          icon={<CalendarClock className="w-5 h-5" />}
          label="งานที่จะถึง"
          value={o.pendingQuotes.toString()}
          sub={`ติดตาม ${o.followUpCount}`}
          color="amber"
        />
      </div>

      {/* Alert: Unread */}
      {o.unreadCount > 0 && (
        <button
          onClick={() => navigate("/dashboard/inbox")}
          className="w-full mb-6 flex items-center gap-3 px-5 py-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold text-red-700">
              {o.unreadCount} แชทที่ยังไม่ได้อ่าน
            </p>
            <p className="text-[11px] text-red-400">คลิกเพื่อไปที่ Inbox</p>
          </div>
          <ArrowRight className="w-4 h-4 text-red-300" />
        </button>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Messages */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3">ข้อความรายวัน (14 วัน)</h3>
          <div className="flex items-end gap-[3px] h-32">
            {(data.dailyMessages || []).map((d: any, i: number) => {
              const total = d.incoming + d.outgoing;
              const inPct = total > 0 ? (d.incoming / total) * 100 : 50;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div className="absolute -top-8 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {formatThaiDate(d.date)}: {d.incoming}↓ {d.outgoing}↑
                  </div>
                  <div
                    className="w-full rounded-t overflow-hidden hover:opacity-80 transition-opacity"
                    style={{ height: `${(total / maxMsg) * 100}%`, minHeight: total > 0 ? '4px' : '0' }}
                  >
                    <div className="bg-blue-400 w-full" style={{ height: `${inPct}%` }} />
                    <div className="bg-brand-400 w-full" style={{ height: `${100 - inPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-300">{data.dailyMessages?.[0]?.date ? formatThaiDate(data.dailyMessages[0].date) : ''}</span>
            <div className="flex gap-3">
              <span className="text-[10px] text-blue-400 flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm" />รับ</span>
              <span className="text-[10px] text-brand-400 flex items-center gap-1"><span className="w-2 h-2 bg-brand-400 rounded-sm" />ส่ง</span>
            </div>
            <span className="text-[10px] text-slate-300">{data.dailyMessages?.length > 0 ? formatThaiDate(data.dailyMessages[data.dailyMessages.length - 1].date) : ''}</span>
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3">ลูกค้าใหม่รายวัน (14 วัน)</h3>
          <div className="flex items-end gap-[3px] h-32">
            {(data.dailyNewCustomers || []).map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                <div className="absolute -top-8 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {formatThaiDate(d.date)}: {d.count} คน
                </div>
                <div
                  className="w-full bg-violet-400 rounded-t hover:bg-violet-500 transition-colors"
                  style={{ height: `${(d.count / maxNew) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-300">{data.dailyNewCustomers?.[0]?.date ? formatThaiDate(data.dailyNewCustomers[0].date) : ''}</span>
            <span className="text-[10px] text-slate-300">{data.dailyNewCustomers?.length > 0 ? formatThaiDate(data.dailyNewCustomers[data.dailyNewCustomers.length - 1].date) : ''}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Channel Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3">ช่องทาง (30 วัน)</h3>
          <div className="space-y-2">
            {(data.channelActivity || []).slice(0, 8).map((c: any) => {
              const maxMsgs = Math.max(...data.channelActivity.map((x: any) => x.messages), 1);
              return (
                <div key={c.channel} className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1 py-[1px] rounded w-6 text-center ${
                    c.channelType === 'line' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {c.channelType === 'line' ? 'L' : 'F'}
                  </span>
                  <span className="text-[11px] text-slate-600 w-20 truncate">{c.channel.replace('Line_', '').replace('FB_', '')}</span>
                  <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.channelType === 'line' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                      style={{ width: `${(c.messages / maxMsgs) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 w-10 text-right tabular-nums">{c.messages.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" /> รอตอบ
            </h3>
            <button
              onClick={() => navigate("/dashboard/inbox")}
              className="text-[11px] text-brand-500 font-medium hover:text-brand-600"
            >
              ดูทั้งหมด →
            </button>
          </div>
          {(data.needsAttention || []).length === 0 ? (
            <p className="text-[12px] text-slate-300 text-center py-6">ไม่มีแชทรอตอบ</p>
          ) : (
            <div className="space-y-2">
              {(data.needsAttention || []).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => navigate("/dashboard/inbox")}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                    {c.pictureUrl ? (
                      <img src={c.pictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        {c.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-700 truncate">{c.displayName}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(c.lastMessageAt)}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{c.unreadCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-amber-500" /> งานสัปดาห์นี้
            </h3>
          </div>
          {(data.upcomingJobs || []).length === 0 ? (
            <p className="text-[12px] text-slate-300 text-center py-6">ไม่มีงานสัปดาห์นี้</p>
          ) : (
            <div className="space-y-2">
              {(data.upcomingJobs || []).map((j: any) => (
                <div key={j.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-amber-50/40 border border-amber-100/50">
                  <div className="text-center flex-shrink-0">
                    <p className="text-[16px] font-bold text-amber-600 leading-none">
                      {new Date(j.jobDate).getDate()}
                    </p>
                    <p className="text-[9px] text-amber-400 font-medium">
                      {new Date(j.jobDate).toLocaleDateString('th-TH', { month: 'short' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-700 truncate">{j.displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{j.jobTitle}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1 py-[1px] rounded ${
                    j.channelType === 'line' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {j.channelType === 'line' ? 'LINE' : 'FB'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    violet: 'bg-violet-50 text-violet-500',
    amber: 'bg-amber-50 text-amber-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-3 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-300 mt-1">{sub}</p>}
    </div>
  );
}
