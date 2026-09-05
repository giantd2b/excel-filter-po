import type { BookingLink, BookingPreset, MeritBooking, PricingAddon, PricingPackage } from '../../services/bookings';

// ─── Status ────────────────────────────────────────────────────────────

export const STATUSES = ['NEW', 'CONTACTED', 'CONFIRMED', 'DONE'] as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'ใหม่',
  CONTACTED: 'ติดต่อแล้ว',
  CONFIRMED: 'ยืนยันแล้ว',
  DONE: 'เสร็จสิ้น',
};

export const NEXT_STATUS: Record<string, string> = {
  NEW: 'CONTACTED',
  CONTACTED: 'CONFIRMED',
  CONFIRMED: 'DONE',
  DONE: 'NEW',
};

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  NEW: { bg: '#fffbeb', fg: '#d97706' },
  CONTACTED: { bg: '#eff6ff', fg: '#2563eb' },
  CONFIRMED: { bg: '#ecfdf5', fg: '#059669' },
  DONE: { bg: '#f1f5f9', fg: '#64748b' },
};

export function statusStyle(status?: string) {
  return STATUS_STYLES[status || ''] || STATUS_STYLES.DONE;
}

export function statusLabel(status?: string) {
  return STATUS_LABELS[status || ''] || status || '-';
}

// ─── Formatting ────────────────────────────────────────────────────────

export function formatBaht(n?: number | null) {
  return `${Number(n ?? 0).toLocaleString('th-TH')} บาท`;
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** "2026-09-30" → "พุธ 30 ก.ย. 2569" (parsed as plain y-m-d, never via the Date timezone path). */
export function fmtThaiDate(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dow = days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${dow} ${d} ${months[mo - 1]} ${y + 543}`;
}

export function addressLine(b: MeritBooking) {
  const bkk = b.province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (b.venue) p.push(b.venue);
  if (b.tambon) p.push((bkk ? 'แขวง' : 'ต.') + b.tambon);
  if (b.amphoe) p.push(bkk ? b.amphoe : 'อ.' + b.amphoe);
  if (b.province) p.push('จ.' + b.province);
  return p.join(' ') || '-';
}

export function foodLine(b: MeritBooking) {
  if (b.foodMode === 'table') return `โต๊ะจีน ${b.tables ?? 0} โต๊ะ`;
  if (b.foodMode === 'buffet') return `บุฟเฟต์ ${b.guests ?? 0} ท่าน`;
  return 'ไม่รวมอาหารเลี้ยงแขก';
}

/** Big-tent rule: 50+ guests / 8+ tables include one 5x12 tent (≈64 guests = 8 tables); 20 tables include two. */
export function tentAdvice(b: MeritBooking): string | null {
  const guests = b.guests ?? 0;
  const tables = b.tables ?? 0;
  if (b.foodMode === 'buffet' && guests > 64) return `แขก ${guests} ท่าน เกินความจุเต้นท์ใหญ่ 1 หลัง (64 ท่าน)`;
  if (b.foodMode === 'table' && tables > 8 && tables < 20) return `โต๊ะจีน ${tables} โต๊ะ เกินความจุเต้นท์ใหญ่ 1 หลัง (8 โต๊ะ)`;
  return null;
}

export const isGroundFloor = (floor?: string | null) => !floor || /ชั้น\s*1(\D|$)/.test(floor);

// ─── Date stepper (local calendar, never toISOString) ─────────────────

const pad = (n: number) => String(n).padStart(2, '0');

export function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromYmd(s?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Shift a y-m-d string by `days`; an empty value starts from tomorrow. */
export function addDays(ymd: string | undefined, days: number) {
  const base = fromYmd(ymd) || new Date();
  if (!fromYmd(ymd)) base.setDate(base.getDate() + 1);
  base.setDate(base.getDate() + days);
  return toYmd(base);
}

// ─── Preset form data (mirrors dashboard BookingLinkModal) ────────────

export const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** Days in a month, computed in UTC so no local-timezone surprises. */
export function daysInMonth(y: number, mo: number) {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

export const FALLBACK_PACKAGES: PricingPackage[] = [
  { id: 'ceremony', name: 'พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)', kind: 'ceremony' },
  { id: 'ceremony-prime', name: 'PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)', kind: 'ceremony' },
  { id: 'full', name: 'ครบวงจร', kind: 'full' },
  { id: 'full-plus', name: 'ครบวงจร พลัส', kind: 'full' },
  { id: 'prime', name: 'PRIME ครบวงจร', kind: 'full' },
];

export const FALLBACK_ADDONS: PricingAddon[] = [
  { id: 'stage', label: 'เวทีพระ' },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง' },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม' },
];

export const OCCASIONS = [
  'ทำบุญขึ้นบ้านใหม่',
  'ทำบุญบริษัท / เปิดกิจการ',
  'ทำบุญวันเกิด',
  'ทำบุญอุทิศส่วนกุศล',
  'ทำบุญบ้าน / ครบรอบ',
  'งานอื่น ๆ',
];

export const TIME_SLOTS = [
  { v: '', label: 'ให้ลูกค้าเลือก' },
  { v: 'เช้า 07.00-07.30 น.', label: 'ทำบุญเช้า' },
  { v: 'เพล 10.00-10.30 น.', label: 'ถวายเพล' },
];

export const DEFAULT_PRESET: BookingPreset = {
  occasion: 'ทำบุญขึ้นบ้านใหม่',
  eventDate: '',
  timeSlot: '',
  packageId: 'full',
  foodMode: 'buffet',
  guests: 30,
  tables: 10,
  monks: 9,
  selfTransport: false,
  addons: [],
  note: '',
  wantVat: null,
  depositAmount: null,
};

/** Thai chat message that accompanies a booking link (same wording as the dashboard). */
export function buildLinkChatText(link: BookingLink, mode: 'preset' | 'free', hasFood: boolean): string {
  if (mode === 'preset' && link.preset) {
    const p = link.preset;
    const food = hasFood
      ? p.foodMode === 'table' ? `โต๊ะจีน ${p.tables} โต๊ะ` : `บุฟเฟต์ ${p.guests} ท่าน`
      : 'อาหารถวายพระ';
    const price =
      link.estimatedTotal != null
        ? p.wantVat
          ? `ราคาประเมิน ${Math.round(link.estimatedTotal * 1.07).toLocaleString('th-TH')} บาท (รวม VAT 7%)`
          : `ราคาประเมิน ${link.estimatedTotal.toLocaleString('th-TH')} บาท${p.wantVat === false ? ' (ไม่รวม VAT)' : ''}`
        : '';
    return [
      `สรุปแพ็กเกจที่คุยกันไว้ค่ะ: ${link.packageName} · พระ ${p.monks} รูป · ${food}${p.eventDate ? ` · วันที่ ${fmtThaiDate(p.eventDate)}` : ''}${p.timeSlot ? ` (${p.timeSlot})` : ''}`,
      price,
      link.depositAmount != null ? `มัดจำ ${link.depositAmount.toLocaleString('th-TH')} บาท เพื่อยืนยันคิว` : '',
      'กรอกชื่อ เบอร์ และสถานที่จัดงานที่ลิงก์นี้ ระบบจะออกใบเสนอราคาให้ทันทีค่ะ',
      link.url,
    ].filter(Boolean).join('\n');
  }
  return `จองงานบุญกับ IRIS เติมบุญ ได้ที่ลิงก์นี้เลยค่ะ\n${link.url}\nกรอกรายละเอียดงานแล้วระบบจะออกใบเสนอราคาให้ทันทีค่ะ`;
}
