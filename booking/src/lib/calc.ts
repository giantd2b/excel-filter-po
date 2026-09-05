import {
  ADDONS,
  DEPOSIT_RULE,
  DISCOUNTS,
  baht,
  pkgById,
  travelAreaLabel,
  travelFeeFor,
  type FoodMode,
  type Pkg,
} from '../data/packages';

export interface BookingForm {
  occasion: string;
  date: string;
  time: string;
  areaQuery: string;
  tambon: string;
  amphoe: string;
  province: string;
  zip: string;
  venue: string;
  pkg: string;
  foodMode: FoodMode;
  guests: number;
  tables: number;
  monks: number;
  selfTransport: boolean;
  addons: string[];
  budget: string;
  /** contact person */
  name: string;
  phone: string;
  /** quotation issued to a person (billingName = name) or a company (billingName filled in) */
  sameName: boolean;
  billingName: string;
  taxId: string;
  /** customer wants a tax invoice → 7% VAT added on top of the estimate */
  wantVat: boolean;
  /** billing address (full) */
  billingLine: string;
  billingAreaQuery: string;
  billingTambon: string;
  billingAmphoe: string;
  billingProvince: string;
  billingZip: string;
  /** event address == billing address (no second entry) */
  sameAddress: boolean;
  /** floor of the venue, e.g. "ชั้น 1" */
  floor: string;
  note: string;
}

export const initialForm: BookingForm = {
  occasion: 'ทำบุญขึ้นบ้านใหม่',
  date: '',
  time: 'เพล 10.00-10.30 น.',
  areaQuery: '',
  tambon: '',
  amphoe: '',
  province: '',
  zip: '',
  venue: '',
  pkg: 'ceremony-prime',
  foodMode: 'buffet',
  guests: 30,
  tables: 10,
  monks: 9,
  selfTransport: false,
  addons: [],
  budget: '',
  name: '',
  phone: '',
  sameName: true,
  billingName: '',
  taxId: '',
  wantVat: false,
  billingLine: '',
  billingAreaQuery: '',
  billingTambon: '',
  billingAmphoe: '',
  billingProvince: '',
  billingZip: '',
  sameAddress: true,
  floor: 'ชั้น 1',
  note: '',
};

function composeAddress(line: string, tambon: string, amphoe: string, province: string, zip: string): string {
  const bkk = province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (line) p.push(line);
  if (tambon) p.push((bkk ? 'แขวง' : 'ต.') + tambon);
  if (amphoe) p.push(bkk ? amphoe : 'อ.' + amphoe);
  if (province) p.push('จ.' + province);
  if (zip) p.push(zip);
  return p.join(' ');
}

export function billingAddressLine(f: BookingForm): string {
  return composeAddress(f.billingLine, f.billingTambon, f.billingAmphoe, f.billingProvince, f.billingZip) || 'ยังไม่ระบุ';
}

/**
 * Apply the "same as" switches before submitting/summarising: copy the primary address
 * (billing on the quick screen, event in the wizard) onto the other one, and the contact
 * name onto the billing name when the quotation is issued to a person.
 */
export function finalizeForm(f: BookingForm, primary: 'billing' | 'event'): BookingForm {
  const out = { ...f };
  if (out.sameName || !out.billingName.trim()) out.billingName = out.name.trim();
  if (out.sameAddress) {
    if (primary === 'billing') {
      out.venue = out.billingLine;
      out.areaQuery = out.billingAreaQuery;
      out.tambon = out.billingTambon;
      out.amphoe = out.billingAmphoe;
      out.province = out.billingProvince;
      out.zip = out.billingZip;
    } else {
      out.billingLine = out.venue;
      out.billingAreaQuery = out.areaQuery;
      out.billingTambon = out.tambon;
      out.billingAmphoe = out.amphoe;
      out.billingProvince = out.province;
      out.billingZip = out.zip;
    }
  }
  return out;
}

export function addressLine(f: BookingForm): string {
  return composeAddress(f.venue, f.tambon, f.amphoe, f.province, f.zip) || 'ยังไม่ระบุ';
}

export function tierPrice(pkg: Pkg, f: BookingForm): { base: number; label: string } {
  if (pkg.kind === 'ceremony') return { base: pkg.base!, label: 'ราคาแพ็กเกจ' };
  const cfg = f.foodMode === 'table' ? pkg.table! : pkg.buffet!;
  const count = f.foodMode === 'table' ? f.tables : f.guests;
  let tier = cfg.tiers[0];
  for (const t of cfg.tiers) if (count >= t[0]) tier = t;
  const over = Math.max(0, count - tier[0]);
  const unit = f.foodMode === 'table' ? 'โต๊ะ' : 'ท่าน';
  return { base: tier[1] + over * cfg.extra, label: `ราคาแพ็กเกจ (${count} ${unit})` };
}

/**
 * Big-tent rule: the 50+ guest / 8+ table tiers include ONE 5x12 tent (≈64 guests or 8 Chinese
 * tables); the 20-table tier includes two. Between those sizes one more tent is recommended.
 */
export function tentRecommendation(f: BookingForm): string | null {
  const pkg = pkgById(f.pkg);
  if (pkg.kind !== 'full') return null;
  if (f.foodMode === 'buffet' && f.guests > 64) {
    return `แขก ${f.guests} ท่าน เกินความจุเต้นท์ใหญ่ 1 หลัง (ประมาณ 64 ท่าน) แนะนำเพิ่มเต้นท์ใหญ่อีก 1 หลัง`;
  }
  if (f.foodMode === 'table' && f.tables > 8 && f.tables < 20) {
    return `โต๊ะจีน ${f.tables} โต๊ะ เกินความจุเต้นท์ใหญ่ 1 หลัง (8 โต๊ะ) แนะนำเพิ่มเต้นท์ใหญ่อีก 1 หลัง`;
  }
  return null;
}

export interface CalcResult {
  pkg: Pkg;
  /** estimate before VAT */
  total: number;
  /** 7% of total when the customer wants a tax invoice, else 0 */
  vat: number;
  grandTotal: number;
  /** food part of the package (per-guest/table price × count) */
  foodAmount: number;
  /** stepped deposit from foodAmount, or the manual amount passed in */
  deposit: number;
  /** travel fee of the event venue's district (0 when none) */
  travelFee: number;
  travelArea: string;
  rows: { k: string; v: string }[];
}

export const VAT_RATE = 0.07;

export function computeDeposit(foodAmount: number): number {
  const food = Math.max(0, foodAmount || 0);
  for (const t of DEPOSIT_RULE.tiers) if (food <= t.upTo) return Math.round(t.amount);
  return Math.round((food * DEPOSIT_RULE.abovePercent) / 100);
}

export function calc(f: BookingForm, manualDeposit?: number | null): CalcResult {
  const pkg = pkgById(f.pkg);
  const t = tierPrice(pkg, f);
  const foodCfg = pkg.kind === 'full' ? (f.foodMode === 'table' ? pkg.table : pkg.buffet) : null;
  const foodAmount = foodCfg ? Math.round(foodCfg.extra * (f.foodMode === 'table' ? f.tables : f.guests)) : 0;
  const rows: { k: string; v: string }[] = [{ k: t.label, v: baht(t.base) }];
  let total = t.base;
  for (const a of ADDONS) {
    if (f.addons.includes(a.id)) {
      total += a.price;
      rows.push({ k: a.label, v: '+' + baht(a.price) });
    }
  }
  if (f.selfTransport) {
    total -= DISCOUNTS.selfTransport;
    rows.push({ k: 'นิมนต์รับ-ส่งพระเอง', v: '−' + baht(DISCOUNTS.selfTransport) });
  }
  // every package: 5 monks instead of 9 (new-package-2025 sheet)
  if (f.monks === 5) {
    total -= DISCOUNTS.fiveMonks;
    rows.push({ k: 'พระ 5 รูป', v: '−' + baht(DISCOUNTS.fiveMonks) });
  }
  // travel fee follows the EVENT VENUE district (f.amphoe) — callers on the quick screen pass
  // finalizeForm(f, 'billing') so the billing address is copied onto the venue first
  const travelFee = travelFeeFor(f.amphoe);
  const travelArea = travelFee ? travelAreaLabel(f.amphoe, f.province) : '';
  if (travelFee) {
    total += travelFee;
    rows.push({ k: `ค่าเดินทาง (${travelArea})`, v: '+' + baht(travelFee) });
  }
  const vat = f.wantVat ? Math.round(total * VAT_RATE) : 0;
  const deposit = typeof manualDeposit === 'number' ? manualDeposit : computeDeposit(foodAmount);
  return { pkg, total, vat, grandTotal: total + vat, foodAmount, deposit, travelFee, travelArea, rows };
}

export function summary(f: BookingForm): { k: string; v: string }[] {
  const c = calc(f);
  const rows = [
    { k: 'ประเภทงาน', v: f.occasion },
    { k: 'วันเวลา', v: (f.date || 'ยังไม่ระบุ') + ' · ' + f.time },
    { k: 'สถานที่', v: `${addressLine(f)}${f.floor ? ` (${f.floor})` : ''}` },
    ...(c.travelFee ? [{ k: 'ค่าเดินทาง', v: `${c.travelArea} +${baht(c.travelFee)} บาท (รวมในราคาแล้ว)` }] : []),
    ...(f.billingName && f.billingName !== f.name ? [{ k: 'ออกใบเสนอราคาในนาม', v: f.billingName }] : []),
    { k: 'ที่อยู่ออกใบเสนอราคา', v: f.sameAddress ? 'ที่อยู่เดียวกับสถานที่จัดงาน' : billingAddressLine(f) },
    { k: 'ใบกำกับภาษี', v: f.wantVat ? 'ต้องการ (คิด VAT 7%)' : 'ไม่ต้องการ (ไม่รวม VAT)' },
    { k: 'มัดจำเพื่อยืนยันคิว', v: baht(c.deposit) + ' บาท' },
    { k: 'แพ็กเกจ', v: c.pkg.name },
    { k: 'พระสงฆ์', v: f.monks + ' รูป' },
  ];
  if (c.pkg.kind === 'full') {
    rows.push({
      k: 'อาหาร',
      v: f.foodMode === 'table' ? `โต๊ะจีน ${f.tables} โต๊ะ` : `บุฟเฟต์ ${f.guests} ท่าน`,
    });
  } else {
    rows.push({ k: 'อาหาร', v: 'อาหารถวายพระ (ไม่รวมเลี้ยงแขก)' });
  }
  return rows;
}
