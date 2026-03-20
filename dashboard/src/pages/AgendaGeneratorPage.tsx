import { useState, useRef, useCallback } from "react";
import { Download, Plus, Trash2, Loader2, Sparkles, X } from "lucide-react";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api-client";

/* ─── Types ──────────────────────────────────────────────── */

interface ScheduleItem {
  id: string;
  time: string;
  description: string;
}

interface FormData {
  customerName: string;
  eventTitle: string;
  customEventTitle: string;
  eventDate: string;
  address: string;
  scheduleTemplate: ScheduleTemplate;
  schedule: ScheduleItem[];
  contactPhone: string;
  mapUrl: string;
  theme: "rose" | "sage" | "cream";
  footerNote: string;
}

/* ─── Theme Palettes ─────────────────────────────────────── */

const THEMES = {
  rose: {
    label: "กุหลาบ (Rose)",
    bg: "#fdf2f0",
    accent: "#b5725a",
    accentLight: "#d4a08f",
    text: "#6b3a2a",
    textLight: "#9c6b5a",
    border: "#e8c4b8",
    floralColor: "#d4a08f",
    titleColor: "#7a4a2a",
    dateAccent: "#b5725a",
    scheduleIcon: "#c48872",
    cardBg: "linear-gradient(145deg, #fdf6f4 0%, #fceee9 50%, #fdf6f4 100%)",
  },
  sage: {
    label: "เขียวเสจ (Sage)",
    bg: "#f4f7f2",
    accent: "#6b8a5e",
    accentLight: "#a3b898",
    text: "#3a4d32",
    textLight: "#6b7d62",
    border: "#c4d4b8",
    floralColor: "#8fa882",
    titleColor: "#4a6340",
    dateAccent: "#6b8a5e",
    scheduleIcon: "#7d9a6e",
    cardBg: "linear-gradient(145deg, #f7faf5 0%, #eef4ea 50%, #f7faf5 100%)",
  },
  cream: {
    label: "ทองครีม (Gold)",
    bg: "#faf6ef",
    accent: "#b89a5a",
    accentLight: "#d4c08a",
    text: "#5a4a2a",
    textLight: "#8a7a5a",
    border: "#dcd0a8",
    floralColor: "#c4b078",
    titleColor: "#6a5a2a",
    dateAccent: "#b89a5a",
    scheduleIcon: "#c4a860",
    cardBg: "linear-gradient(145deg, #fdf9f0 0%, #f8f0e0 50%, #fdf9f0 100%)",
  },
};

const EVENT_TITLES = [
  "พิธีทำบุญขึ้นบ้านใหม่",
  "งานทำบุญบ้าน",
  "งานทำบุญบริษัท",
  "พิธีทำบุญเปิดร้านใหม่",
  "พิธีทำบุญเปิดออฟฟิศ",
  "งานทำบุญครบรอบ",
  "อื่นๆ (กำหนดเอง)",
];

type ScheduleTemplate = "เลี้ยงเพล" | "เลี้ยงเช้า";

const SCHEDULE_TEMPLATES: Record<ScheduleTemplate, ScheduleItem[]> = {
  "เลี้ยงเพล": [
    { id: "1", time: "10.00 น. - 10.30 น.", description: "พระสงฆ์ถึงที่งาน" },
    { id: "2", time: "10.30 น. - 11.00 น.", description: "สวดเจริญพระพุทธมนต์" },
    { id: "3", time: "11.15 น. - 11.30 น.", description: "ถวายภัตตาหารเพล" },
    { id: "4", time: "11.45 น. - 12.00 น.", description: "ถวายสังฆทาน กรวดน้ำรับพร\nและร่วมรับประทานอาหาร" },
  ],
  "เลี้ยงเช้า": [
    { id: "1", time: "07.00 น. - 07.30 น.", description: "พระสงฆ์ถึงที่งาน" },
    { id: "2", time: "07.30 น. - 08.00 น.", description: "สวดเจริญพระพุทธมนต์" },
    { id: "3", time: "08.15 น. - 08.30 น.", description: "ถวายภัตตาหารเพล" },
    { id: "4", time: "08.45 น. - 09.00 น.", description: "ถวายสังฆทาน กรวดน้ำรับพร\nและร่วมรับประทานอาหาร" },
  ],
};

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

function formatThaiDate(dateStr: string) {
  if (!dateStr) return { day: "--", month: "---", year: "----", weekday: "---" };
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()),
    month: THAI_MONTHS[d.getMonth()],
    year: String(d.getFullYear() + 543),
    weekday: "วัน" + THAI_DAYS[d.getDay()],
  };
}

/* ─── Floral SVG Decorations ────────────────────────────── */

function FloralCornerTopLeft({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute top-0 left-0 w-36 h-36 opacity-30" style={{ transform: "rotate(0deg)" }}>
      <g fill="none" stroke={color} strokeWidth="1.2">
        {/* Leaves cluster */}
        <path d="M10 80 Q30 40 70 20 Q50 50 30 70Z" fill={color} fillOpacity="0.15" />
        <path d="M20 100 Q50 50 90 30 Q60 70 40 90Z" fill={color} fillOpacity="0.1" />
        <path d="M5 60 Q20 30 50 10 Q35 40 15 55Z" fill={color} fillOpacity="0.2" />
        {/* Flower */}
        <circle cx="55" cy="55" r="8" fill={color} fillOpacity="0.15" />
        <ellipse cx="55" cy="42" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(-15 55 42)" />
        <ellipse cx="65" cy="48" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(30 65 48)" />
        <ellipse cx="45" cy="48" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(-30 45 48)" />
        {/* Stems */}
        <path d="M30 70 Q15 90 10 120" strokeWidth="0.8" />
        <path d="M50 60 Q30 85 20 115" strokeWidth="0.8" />
        {/* Small buds */}
        <circle cx="25" cy="35" r="3" fill={color} fillOpacity="0.2" />
        <circle cx="75" cy="15" r="2.5" fill={color} fillOpacity="0.15" />
      </g>
    </svg>
  );
}

function FloralCornerTopRight({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute top-0 right-0 w-36 h-36 opacity-30" style={{ transform: "scaleX(-1)" }}>
      <g fill="none" stroke={color} strokeWidth="1.2">
        <path d="M10 80 Q30 40 70 20 Q50 50 30 70Z" fill={color} fillOpacity="0.15" />
        <path d="M20 100 Q50 50 90 30 Q60 70 40 90Z" fill={color} fillOpacity="0.1" />
        <path d="M5 60 Q20 30 50 10 Q35 40 15 55Z" fill={color} fillOpacity="0.2" />
        <circle cx="55" cy="55" r="8" fill={color} fillOpacity="0.15" />
        <ellipse cx="55" cy="42" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(-15 55 42)" />
        <ellipse cx="65" cy="48" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(30 65 48)" />
        <ellipse cx="45" cy="48" rx="5" ry="10" fill={color} fillOpacity="0.12" transform="rotate(-30 45 48)" />
        <path d="M30 70 Q15 90 10 120" strokeWidth="0.8" />
        <circle cx="25" cy="35" r="3" fill={color} fillOpacity="0.2" />
      </g>
    </svg>
  );
}

function FloralCornerBottom({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 400 120" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-24 opacity-25">
      <g fill="none" stroke={color} strokeWidth="1">
        {/* Central flower */}
        <circle cx="200" cy="80" r="10" fill={color} fillOpacity="0.15" />
        <ellipse cx="200" cy="65" rx="6" ry="12" fill={color} fillOpacity="0.1" />
        <ellipse cx="212" cy="72" rx="6" ry="12" fill={color} fillOpacity="0.1" transform="rotate(35 212 72)" />
        <ellipse cx="188" cy="72" rx="6" ry="12" fill={color} fillOpacity="0.1" transform="rotate(-35 188 72)" />
        {/* Spreading branches */}
        <path d="M200 90 Q150 85 100 95" strokeWidth="0.8" />
        <path d="M200 90 Q250 85 300 95" strokeWidth="0.8" />
        {/* Leaves along branches */}
        <path d="M140 90 Q130 75 120 85 Q135 82 140 90Z" fill={color} fillOpacity="0.15" />
        <path d="M260 90 Q270 75 280 85 Q265 82 260 90Z" fill={color} fillOpacity="0.15" />
        <path d="M160 88 Q155 72 145 80 Q157 78 160 88Z" fill={color} fillOpacity="0.12" />
        <path d="M240 88 Q245 72 255 80 Q243 78 240 88Z" fill={color} fillOpacity="0.12" />
        {/* Small buds */}
        <circle cx="110" cy="92" r="3" fill={color} fillOpacity="0.18" />
        <circle cx="290" cy="92" r="3" fill={color} fillOpacity="0.18" />
      </g>
    </svg>
  );
}

/* ─── Schedule Icon ──────────────────────────────────────── */

function ScheduleIcon({ index }: { index: number }) {
  const icons = ["🙏", "📿", "🍱", "🪷", "🎊", "🕐"];
  return <span className="text-lg">{icons[index % icons.length]}</span>;
}

/* ─── Main Component ─────────────────────────────────────── */

export default function AgendaGeneratorPage() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [aiBackground, setAiBackground] = useState<string | null>(null);
  const [generatingBg, setGeneratingBg] = useState(false);

  const [form, setForm] = useState<FormData>({
    customerName: "คุณนฤมล มิตรภาพ",
    eventTitle: "พิธีทำบุญขึ้นบ้านใหม่",
    customEventTitle: "",
    eventDate: new Date().toISOString().split("T")[0],
    address: "หมู่บ้าน เพื่องฟ้า 11 เฟส 9\nบ้านเลขที่ 549/312 ซอยมังกร\nตำบล แพรกษาใหม่ อำเภอเมือง\nจังหวัดสมุทรปราการ",
    scheduleTemplate: "เลี้ยงเพล" as ScheduleTemplate,
    schedule: [...SCHEDULE_TEMPLATES["เลี้ยงเพล"]],
    contactPhone: "093-542-3086",
    mapUrl: "https://maps.app.goo.gl/example",
    theme: "sage",
    footerNote: "ขออภัยหากมิได้มาเรียนเชิญด้วยตัวเอง",
  });

  const update = (key: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addScheduleItem = () => {
    update("schedule", [
      ...form.schedule,
      { id: String(Date.now()), time: "", description: "" },
    ]);
  };

  const updateScheduleItem = (id: string, field: "time" | "description", value: string) => {
    update(
      "schedule",
      form.schedule.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeScheduleItem = (id: string) => {
    update("schedule", form.schedule.filter((s) => s.id !== id));
  };

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `invitation-${form.customerName.replace(/\s/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  }, [form.customerName]);

  const handleGenerateBackground = useCallback(async () => {
    setGeneratingBg(true);
    try {
      const result = await api.post<{ image?: string; error?: string }>("/agenda/generate-background", {
        theme: form.theme,
        eventType: form.eventTitle,
      });
      if (result.image) {
        setAiBackground(result.image);
      } else {
        alert(result.error || "ไม่สามารถสร้างพื้นหลังได้");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "ลองใหม่อีกครั้ง"));
    }
    setGeneratingBg(false);
  }, [form.theme, form.eventTitle]);

  const theme = THEMES[form.theme];
  const thaiDate = formatThaiDate(form.eventDate);
  const displayTitle = form.eventTitle === "อื่นๆ (กำหนดเอง)" ? form.customEventTitle : form.eventTitle;

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">
      {/* ─── LEFT: Form ─────────────────────────────────── */}
      <div className="w-[380px] shrink-0 overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-800">สร้างการ์ดเชิญ</h1>
            <p className="text-xs text-slate-400 mt-0.5">งานบุญ / พิธีสงฆ์</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ดาวน์โหลด
          </button>
        </div>

        <div className="space-y-4">
          {/* Theme */}
          <Field label="ธีมสี">
            <div className="flex gap-2">
              {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((k) => (
                <button
                  key={k}
                  onClick={() => update("theme", k)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                    form.theme === k
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: THEMES[k].accent }}
                  />
                  {THEMES[k].label}
                </button>
              ))}
            </div>
          </Field>

          {/* AI Background */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI พื้นหลัง
              </span>
              {aiBackground && (
                <button
                  onClick={() => setAiBackground(null)}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> ลบ
                </button>
              )}
            </div>
            <button
              onClick={handleGenerateBackground}
              disabled={generatingBg}
              className="w-full py-2 px-3 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generatingBg ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {aiBackground ? "สร้างใหม่" : "สร้างพื้นหลัง AI"}
                </>
              )}
            </button>
            {aiBackground && (
              <img src={aiBackground} alt="AI Background" className="mt-2 w-full rounded-lg border border-indigo-100" />
            )}
          </div>

          {/* Customer name */}
          <Field label="ชื่อเจ้าภาพ">
            <textarea
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="คุณชื่อ นามสกุล"
            />
          </Field>

          {/* Event title */}
          <Field label="ชื่องาน">
            <select
              value={form.eventTitle}
              onChange={(e) => update("eventTitle", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {EVENT_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {form.eventTitle === "อื่นๆ (กำหนดเอง)" && (
              <input
                value={form.customEventTitle}
                onChange={(e) => update("customEventTitle", e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="ระบุชื่องาน"
              />
            )}
          </Field>

          {/* Date */}
          <Field label="วันที่จัดงาน">
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => update("eventDate", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </Field>

          {/* Address */}
          <Field label="ที่อยู่สถานที่">
            <textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="บ้านเลขที่ ซอย ถนน&#10;ตำบล อำเภอ&#10;จังหวัด"
            />
          </Field>

          {/* Schedule */}
          <Field label="กำหนดการ">
            <div className="flex gap-2 mb-3">
              {(Object.keys(SCHEDULE_TEMPLATES) as ScheduleTemplate[]).map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => {
                    update("scheduleTemplate", tmpl);
                    update("schedule", [...SCHEDULE_TEMPLATES[tmpl]]);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                    form.scheduleTemplate === tmpl
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  {tmpl}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {form.schedule.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <input
                    value={item.time}
                    onChange={(e) => updateScheduleItem(item.id, "time", e.target.value)}
                    className="w-[140px] shrink-0 px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="07.00 - 07.30 น."
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => updateScheduleItem(item.id, "description", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    placeholder="รายละเอียด"
                    rows={1}
                  />
                  <button
                    onClick={() => removeScheduleItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addScheduleItem}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
              >
                <Plus className="w-3 h-3" /> เพิ่มกำหนดการ
              </button>
            </div>
          </Field>

          {/* Contact */}
          <Field label="เบอร์ติดต่อ">
            <input
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="093-542-3086"
            />
          </Field>

          {/* Map URL */}
          <Field label="ลิงก์แผนที่ (สำหรับ QR Code)">
            <input
              value={form.mapUrl}
              onChange={(e) => update("mapUrl", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="https://maps.app.goo.gl/..."
            />
          </Field>

          {/* Footer note */}
          <Field label="ข้อความท้ายการ์ด">
            <input
              value={form.footerNote}
              onChange={(e) => update("footerNote", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="ขออภัยหากมิได้มาเรียนเชิญด้วยตัวเอง"
            />
          </Field>
        </div>
      </div>

      {/* ─── RIGHT: Preview ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex justify-center py-4">
        <div className="sticky top-4">
          <div
            ref={previewRef}
            className="relative w-[480px] min-h-[680px] rounded-sm overflow-hidden shadow-2xl"
            style={{
              background: aiBackground ? `url(${aiBackground}) center/cover no-repeat` : theme.cardBg,
              fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
              color: theme.text,
            }}
          >
            {/* Semi-transparent overlay when AI background is used */}
            {aiBackground && (
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
            )}

            {/* Floral decorations (hidden when AI background) */}
            {!aiBackground && (
              <>
                <FloralCornerTopLeft color={theme.floralColor} />
                <FloralCornerTopRight color={theme.floralColor} />
                <FloralCornerBottom color={theme.floralColor} />
              </>
            )}

            {/* Subtle border */}
            <div
              className="absolute inset-3 border rounded-sm pointer-events-none"
              style={{ borderColor: theme.border, opacity: 0.4 }}
            />

            {/* Content */}
            <div className="relative z-10 px-12 py-10 text-center">
              {/* Customer name */}
              <p
                className="text-lg font-semibold leading-relaxed whitespace-pre-line"
                style={{ color: theme.titleColor }}
              >
                {form.customerName || "ชื่อเจ้าภาพ"}
              </p>

              {/* Invitation text */}
              <p
                className="text-sm mt-3 leading-relaxed"
                style={{ color: theme.textLight }}
              >
                มีความยินดีขอเรียนเชิญท่านร่วม
                <br />
                เป็นเกียรติเนื่องในงาน
              </p>

              {/* Event title — decorative */}
              <div className="my-5">
                <p
                  className="text-3xl font-bold leading-snug"
                  style={{
                    color: theme.titleColor,
                    textShadow: `0 1px 2px ${theme.accentLight}40`,
                  }}
                >
                  {displayTitle || "ชื่องาน"}
                </p>
              </div>

              {/* Address */}
              <p
                className="text-xs leading-relaxed whitespace-pre-line mt-2"
                style={{ color: theme.textLight }}
              >
                {form.address || "ที่อยู่สถานที่จัดงาน"}
              </p>

              {/* Date display */}
              <div className="my-6 flex items-center justify-center gap-3">
                <div>
                  <p className="text-xs" style={{ color: theme.textLight }}>
                    {thaiDate.weekday}
                  </p>
                  <p
                    className="text-5xl font-bold leading-none"
                    style={{ color: theme.dateAccent }}
                  >
                    {thaiDate.day}
                  </p>
                </div>
                <div
                  className="w-px h-14"
                  style={{ backgroundColor: theme.border }}
                />
                <div className="text-left">
                  <p
                    className="text-xl font-semibold"
                    style={{ color: theme.dateAccent }}
                  >
                    {thaiDate.month}
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{ color: theme.dateAccent }}
                  >
                    {thaiDate.year}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                <span style={{ color: theme.accentLight }}>✦</span>
                <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
              </div>

              {/* Schedule + QR side by side */}
              <div className="flex gap-4 mt-4 text-left">
                {/* Schedule */}
                <div className="flex-1">
                  {form.schedule.map((item, idx) => (
                    <div key={item.id} className="flex gap-2.5 mb-3 items-start">
                      <div className="mt-0.5 shrink-0">
                        <ScheduleIcon index={idx} />
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: theme.accent }}
                        >
                          {item.time}
                        </p>
                        <p
                          className="text-xs whitespace-pre-line leading-relaxed"
                          style={{ color: theme.textLight }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* QR Code + map label */}
                {form.mapUrl && (
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-red-500 text-sm">📍</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: theme.accent }}
                      >
                        สแกนแผนที่
                      </span>
                    </div>
                    <div
                      className="p-1.5 bg-white rounded"
                      style={{ border: `1px solid ${theme.border}` }}
                    >
                      <QRCodeSVG
                        value={form.mapUrl}
                        size={72}
                        level="M"
                        fgColor={theme.text}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-4 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                <span style={{ color: theme.accentLight }}>✦</span>
                <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
              </div>

              {/* Contact */}
              {form.contactPhone && (
                <p className="text-sm font-semibold" style={{ color: theme.text }}>
                  ติดต่อ : {form.contactPhone}
                </p>
              )}

              {/* Footer */}
              {form.footerNote && (
                <p
                  className="text-xs mt-3 italic"
                  style={{ color: theme.textLight }}
                >
                  {form.footerNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Field wrapper ──────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
