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

/** catering bookings (บุฟเฟต์ / โต๊ะจีน) have no monks; older API responses lack packageKind, so fall back on monks === 0 */
export const isCateringBooking = (b: MeritBooking) => b.packageKind === 'catering' || (b.packageKind == null && b.monks === 0);

export function foodLine(b: MeritBooking) {
  if (isCateringBooking(b)) {
    if (b.foodMode === 'table') return `${b.tables ?? 0} โต๊ะ${(b.addons || []).includes('drinks') ? ' + เครื่องดื่ม' : ''}`;
    return `${b.dishCount ?? '-'} อย่าง · ${b.guests ?? 0} ท่าน`;
  }
  if (b.foodMode === 'table') return `โต๊ะจีน ${b.tables ?? 0} โต๊ะ`;
  if (b.foodMode === 'buffet') return `บุฟเฟต์ ${b.guests ?? 0} ท่าน`;
  return 'ไม่รวมอาหารเลี้ยงแขก';
}

/** "แพ็กเกจ · พระ N รูป · อาหาร" for merit, "แพ็กเกจ · อาหาร" for catering (BookingCard headline) */
export function packageLine(b: MeritBooking) {
  const name = b.packageName || b.packageId || '-';
  return isCateringBooking(b) ? `${name} · ${foodLine(b)}` : `${name} · พระ ${b.monks ?? '-'} รูป · ${foodLine(b)}`;
}

/** Big-tent rule (merit packages only): 50+ guests / 8+ tables include one 5x12 tent (≈64 guests = 8 tables); 20 tables include two. */
export function tentAdvice(b: MeritBooking): string | null {
  if (isCateringBooking(b)) return null;
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
  { id: 'ceremony', name: 'พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)', kind: 'ceremony', line: 'merit' },
  { id: 'ceremony-prime', name: 'PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)', kind: 'ceremony', line: 'merit', includedAddons: ['drape'] },
  { id: 'full', name: 'ครบวงจร', kind: 'full', line: 'merit' },
  { id: 'full-plus', name: 'ครบวงจร พลัส', kind: 'full', line: 'merit' },
  { id: 'prime', name: 'PRIME ครบวงจร', kind: 'full', line: 'merit', includedAddons: ['drape'] },
  { id: 'buffet-standard', name: 'บุฟเฟต์อาหารไทย แพคเกจเริ่มต้น', kind: 'catering', line: 'buffet', unit: 'guest', minCount: 40 },
  { id: 'buffet-premium', name: 'บุฟเฟต์อาหารไทย แพคเกจพรีเมียม', kind: 'catering', line: 'buffet', unit: 'guest', minCount: 40 },
  { id: 'chinese-2000', name: 'โต๊ะจีน 2,000 (8 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, courses: 8 },
  { id: 'chinese-2300', name: 'โต๊ะจีน 2,300 (9 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, courses: 9 },
  { id: 'chinese-2600', name: 'โต๊ะจีน 2,600 (10 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, courses: 10 },
];

export const FALLBACK_ADDONS: PricingAddon[] = [
  { id: 'stage', label: 'เวทีพระ', price: 5000, lines: ['merit'] },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', price: 3000, lines: ['merit'] },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', price: 1000, lines: ['merit'] },
  { id: 'drinks', label: 'เครื่องดื่ม', price: 250, perUnit: 'table', lines: ['chinese'] },
];

export const LINES: { id: string; label: string }[] = [
  { id: 'merit', label: 'งานบุญ' },
  { id: 'buffet', label: 'บุฟเฟต์อาหารไทย' },
  { id: 'chinese', label: 'โต๊ะจีน' },
];

export const DISH_COUNTS = [5, 6, 7, 8];

export const OCCASIONS = [
  'ทำบุญขึ้นบ้านใหม่',
  'ทำบุญบริษัท / เปิดกิจการ',
  'ทำบุญวันเกิด',
  'ทำบุญอุทิศส่วนกุศล',
  'ทำบุญบ้าน / ครบรอบ',
  'งานอื่น ๆ',
];

export const CATERING_OCCASIONS = ['งานเลี้ยงบริษัท / สัมมนา', 'งานแต่งงาน', 'งานบวช', 'งานศพ', 'งานเลี้ยงรุ่น / ครอบครัว', 'งานอื่น ๆ'];

export const TIME_SLOTS = [
  { v: '', label: 'ให้ลูกค้าเลือก' },
  { v: 'เช้า 07.00-07.30 น.', label: 'ทำบุญเช้า' },
  { v: 'เพล 10.00-10.30 น.', label: 'ถวายเพล' },
];

export const CATERING_TIME_SLOTS = [
  { v: '', label: 'ให้ลูกค้าเลือก' },
  { v: 'เที่ยง 11.00-13.00 น.', label: 'มื้อเที่ยง' },
  { v: 'เย็น 17.00-19.00 น.', label: 'มื้อเย็น' },
];

export const occasionsFor = (line: string) => (line === 'merit' ? OCCASIONS : CATERING_OCCASIONS);
export const timeSlotsFor = (line: string) => (line === 'merit' ? TIME_SLOTS : CATERING_TIME_SLOTS);

export const DEFAULT_PRESET: BookingPreset = {
  occasion: 'ทำบุญขึ้นบ้านใหม่',
  eventDate: '',
  timeSlot: '',
  packageId: 'full',
  foodMode: 'buffet',
  guests: 30,
  tables: 10,
  monks: 9,
  dishCount: 6,
  selfTransport: false,
  addons: [],
  note: '',
  wantVat: null,
  depositAmount: null,
};

/**
 * Keep a preset consistent with the package it names (mirrors the dashboard modal): drop add-ons the
 * package can't have, no monks / self-transport for catering, food mode follows the catering unit,
 * counts lifted to the minimum, occasion / time reset when they belong to another line.
 */
export function normalizePresetFor(p: BookingPreset, pkg: PricingPackage | undefined, addons: PricingAddon[]): BookingPreset {
  if (!pkg) return p;
  const line = pkg.line || 'merit';
  const ok = new Set(addons.filter((a) => (!a.lines || a.lines.includes(line)) && !(pkg.includedAddons || []).includes(a.id)).map((a) => a.id));
  const next: BookingPreset = { ...p, addons: p.addons.filter((a) => ok.has(a)) };
  if (pkg.kind === 'catering') {
    next.foodMode = pkg.unit === 'table' ? 'table' : 'buffet';
    next.monks = 0;
    next.selfTransport = false;
    const min = pkg.minCount ?? 1;
    if (pkg.unit === 'table') next.tables = Math.max(min, p.tables || 0);
    else next.guests = Math.max(min, p.guests || 0);
    if (!(next.dishCount && next.dishCount >= 5 && next.dishCount <= 8)) next.dishCount = 6;
  } else if (!p.monks) {
    next.monks = 9;
  }
  const occ = occasionsFor(line);
  if (next.occasion && !occ.includes(next.occasion) && (OCCASIONS.includes(next.occasion) || CATERING_OCCASIONS.includes(next.occasion))) next.occasion = occ[0];
  if (next.timeSlot && !timeSlotsFor(line).some((s) => s.v === next.timeSlot)) next.timeSlot = '';
  return JSON.stringify(next) === JSON.stringify(p) ? p : next;
}

/** Thai chat message that accompanies a booking link (same wording as the dashboard). */
export function buildLinkChatText(link: BookingLink, mode: 'preset' | 'free', pkg: PricingPackage | undefined): string {
  if (mode === 'preset' && link.preset) {
    const p = link.preset;
    const isCatering = pkg?.kind === 'catering';
    const hasFood = pkg?.kind === 'full';
    const food = isCatering
      ? pkg?.unit === 'table'
        ? `${p.tables} โต๊ะ${pkg?.courses ? ` (${pkg.courses} อย่าง)` : ''}${p.addons.includes('drinks') ? ' + เครื่องดื่ม' : ''}`
        : `${p.dishCount ?? 6} อย่าง · ${p.guests} ท่าน`
      : hasFood
        ? p.foodMode === 'table' ? `โต๊ะจีน ${p.tables} โต๊ะ` : `บุฟเฟต์ ${p.guests} ท่าน`
        : 'อาหารถวายพระ';
    const head = isCatering ? `${link.packageName} · ${food}` : `${link.packageName} · พระ ${p.monks} รูป · ${food}`;
    const price =
      link.estimatedTotal != null
        ? p.wantVat
          ? `ราคาประเมิน ${Math.round(link.estimatedTotal * 1.07).toLocaleString('th-TH')} บาท (รวม VAT 7%)`
          : `ราคาประเมิน ${link.estimatedTotal.toLocaleString('th-TH')} บาท${p.wantVat === false ? ' (ไม่รวม VAT)' : ''}`
        : '';
    return [
      `สรุปแพ็กเกจที่คุยกันไว้ค่ะ: ${head}${p.eventDate ? ` · วันที่ ${fmtThaiDate(p.eventDate)}` : ''}${p.timeSlot ? ` (${p.timeSlot})` : ''}`,
      price,
      link.depositAmount != null ? `มัดจำ ${link.depositAmount.toLocaleString('th-TH')} บาท เพื่อยืนยันคิว` : '',
      'กรอกชื่อ เบอร์ และสถานที่จัดงานที่ลิงก์นี้ ระบบจะออกใบเสนอราคาให้ทันทีค่ะ',
      link.url,
    ].filter(Boolean).join('\n');
  }
  return `จองงานบุญ บุฟเฟต์ หรือโต๊ะจีนกับ IRIS ได้ที่ลิงก์นี้เลยค่ะ\n${link.url}\nกรอกรายละเอียดงานแล้วระบบจะออกใบเสนอราคาให้ทันทีค่ะ`;
}
