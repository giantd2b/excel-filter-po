import {
  ADDONS,
  FIVE_MONKS_DISCOUNT,
  SELF_TRANSPORT_DISCOUNT,
  baht,
  pkgById,
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
  name: string;
  phone: string;
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
  note: '',
};

export function addressLine(f: BookingForm): string {
  const bkk = f.province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (f.venue) p.push(f.venue);
  if (f.tambon) p.push((bkk ? 'แขวง' : 'ต.') + f.tambon);
  if (f.amphoe) p.push(bkk ? f.amphoe : 'อ.' + f.amphoe);
  if (f.province) p.push('จ.' + f.province);
  if (f.zip) p.push(f.zip);
  return p.join(' ') || 'ยังไม่ระบุ';
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

export interface CalcResult {
  pkg: Pkg;
  total: number;
  rows: { k: string; v: string }[];
}

export function calc(f: BookingForm): CalcResult {
  const pkg = pkgById(f.pkg);
  const t = tierPrice(pkg, f);
  const rows: { k: string; v: string }[] = [{ k: t.label, v: baht(t.base) }];
  let total = t.base;
  for (const a of ADDONS) {
    if (f.addons.includes(a.id)) {
      total += a.price;
      rows.push({ k: a.label, v: '+' + baht(a.price) });
    }
  }
  if (f.selfTransport) {
    total -= SELF_TRANSPORT_DISCOUNT;
    rows.push({ k: 'นิมนต์รับ-ส่งพระเอง', v: '−1,000' });
  }
  if (pkg.kind === 'ceremony' && f.monks === 5) {
    total -= FIVE_MONKS_DISCOUNT;
    rows.push({ k: 'พระ 5 รูป', v: '−1,500' });
  }
  return { pkg, total, rows };
}

export function summary(f: BookingForm): { k: string; v: string }[] {
  const c = calc(f);
  const rows = [
    { k: 'ประเภทงาน', v: f.occasion },
    { k: 'วันเวลา', v: (f.date || 'ยังไม่ระบุ') + ' · ' + f.time },
    { k: 'สถานที่', v: addressLine(f) },
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
