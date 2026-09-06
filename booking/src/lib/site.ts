import type { PkgLine } from '../data/packages';

/**
 * One bundle, several storefronts. The API serves the same build at
 *   /booking  — IRIS เติมบุญ (งานบุญ)
 *   /buffet   — IRIS Catering, บุฟเฟต์อาหารไทย only
 *   /chinese  — IRIS Catering, โต๊ะจีน only
 *   /catering — IRIS Catering, both catering lines
 * Which one we are is decided by the path, and everything brand-specific (lines shown, colours,
 * copy, contact) hangs off SITE / BRAND.
 */
export type Site = 'merit' | 'buffet' | 'chinese' | 'catering';
/** colour theme: merit = cream/brown, catering = navy/gold (shared by the three catering sites) */
export type SiteFamily = 'merit' | 'catering';

function detectSite(): Site {
  if (typeof window === 'undefined') return 'merit';
  const p = window.location.pathname;
  if (/^\/buffet(\/|$)/.test(p)) return 'buffet';
  if (/^\/chinese(\/|$)/.test(p)) return 'chinese';
  if (/^\/catering(\/|$)/.test(p)) return 'catering';
  return 'merit';
}

export const SITE: Site = detectSite();
export const SITE_FAMILY: SiteFamily = SITE === 'merit' ? 'merit' : 'catering';

/** package lines sold on this storefront */
export const SITE_LINES: PkgLine[] = SITE === 'merit' ? ['merit'] : SITE === 'buffet' ? ['buffet'] : SITE === 'chinese' ? ['chinese'] : ['buffet', 'chinese'];

export const isSiteLine = (line: PkgLine) => SITE_LINES.includes(line);

export interface Brand {
  name: string;
  tagline: string;
  /** glyph in the round logo */
  mark: string;
  docTitle: string;
  lineUrl: string;
  lineLabel: string;
  phone: string;
  phoneLabel: string;
  heroTitle: [string, string];
  heroSub: string;
  stats: [string, string][];
  work: { file: string; label: string }[];
  /** default package when the wizard is entered without picking one */
  defaultPkg: string;
  defaultLine: PkgLine;
}

const MERIT: Brand = {
  name: 'IRIS เติมบุญ',
  tagline: 'รับจัดงานบุญ พิธีสงฆ์ครบวงจร',
  mark: 'บ',
  docTitle: 'IRIS เติมบุญ — จองแพ็กเกจงานบุญ',
  lineUrl: 'https://line.me/R/ti/p/@temboon',
  lineLabel: 'LINE @temboon',
  phone: '0805838383',
  phoneLabel: '080-583-8383 ต่อ 2',
  heroTitle: ['จัดงานบุญให้เรียบร้อย', 'ตั้งแต่ต้นจนจบ'],
  heroSub: 'เลือกแพ็กเกจ กรอกรายละเอียดงาน รับใบเสนอราคาเบื้องต้นได้ทันที ทีมงานจะยืนยันคิววันงานและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดงาน'],
    ['10,000+', 'งานบุญที่ดูแลแล้ว'],
    ['ครบชุด', 'พระ · อาหาร · อุปกรณ์'],
  ],
  work: [
    { file: 'work1.jpg', label: 'รูปพิธีสงฆ์' },
    { file: 'work2.jpg', label: 'รูปโต๊ะหมู่บูชา' },
    { file: 'work3.jpg', label: 'รูปอาหารเลี้ยงพระ' },
    { file: 'work4.jpg', label: 'รูปไลน์อาหาร' },
  ],
  defaultPkg: 'ceremony-prime',
  defaultLine: 'merit',
};

/** shared IRIS Catering identity; the three catering storefronts only differ in copy and default package */
const CATERING_BASE = {
  name: 'IRIS Catering',
  mark: 'IR',
  lineUrl: 'https://line.me/R/ti/p/@iriscatering',
  lineLabel: 'LINE @Iriscatering',
  phone: '0805838383',
  phoneLabel: '080-583-8383 กด 1',
  work: [
    { file: 'catering1.jpg', label: 'รูปไลน์บุฟเฟต์' },
    { file: 'catering2.jpg', label: 'รูปโต๊ะจีน' },
    { file: 'catering3.jpg', label: 'รูปอาหารหน้างาน' },
    { file: 'catering4.jpg', label: 'รูปทีมบริการ' },
  ],
};

const CATERING: Brand = {
  ...CATERING_BASE,
  tagline: 'บุฟเฟต์อาหารไทย · โต๊ะจีน · จัดเลี้ยงนอกสถานที่',
  docTitle: 'IRIS Catering — จองบุฟเฟต์อาหารไทย โต๊ะจีน',
  heroTitle: ['จัดเลี้ยงให้ประทับใจ', 'ตั้งแต่จานแรกถึงจานสุดท้าย'],
  heroSub: 'เลือกบุฟเฟต์อาหารไทยหรือโต๊ะจีน ระบุจำนวนแขก รับใบเสนอราคาเบื้องต้นได้ทันที ทีมงานจะยืนยันคิววันงานและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดเลี้ยง'],
    ['100+ เมนู', 'อาหารไทย · โต๊ะจีน ทำสดหน้างาน'],
    ['ครบชุด', 'อาหาร · โต๊ะเก้าอี้ · ทีมบริการ'],
  ],
  defaultPkg: 'chinese-2300',
  defaultLine: 'chinese',
};

const BUFFET: Brand = {
  ...CATERING_BASE,
  tagline: 'บุฟเฟต์อาหารไทย จัดเลี้ยงนอกสถานที่',
  docTitle: 'IRIS Catering — จองบุฟเฟต์อาหารไทย',
  heroTitle: ['บุฟเฟต์อาหารไทย', 'เลือกได้ 5-8 อย่าง ทำสดหน้างาน'],
  heroSub: 'เลือกระดับแพ็กเกจ จำนวนอย่าง และจำนวนแขก รับใบเสนอราคาเบื้องต้นได้ทันที ฟรีข้าว น้ำดื่ม ขนมหวาน โต๊ะเก้าอี้ และทีมบริการ ทีมงานจะยืนยันคิวและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดเลี้ยง'],
    ['100+ เมนู', 'อาหารไทยทำสดหน้างาน'],
    ['250.-', 'เริ่มต้นต่อท่าน (5 อย่าง)'],
  ],
  work: [
    { file: 'catering1.jpg', label: 'รูปไลน์บุฟเฟต์' },
    { file: 'catering3.jpg', label: 'รูปอาหารหน้างาน' },
    { file: 'buffet3.jpg', label: 'รูปโต๊ะ-เก้าอี้แขก' },
    { file: 'catering4.jpg', label: 'รูปทีมบริการ' },
  ],
  defaultPkg: 'buffet-standard',
  defaultLine: 'buffet',
};

const CHINESE: Brand = {
  ...CATERING_BASE,
  tagline: 'โต๊ะจีน จัดเลี้ยงนอกสถานที่',
  docTitle: 'IRIS Catering — จองโต๊ะจีน',
  heroTitle: ['โต๊ะจีน 8-10 อย่าง', 'เลือกเมนูได้จานละ 1 อย่าง'],
  heroSub: 'เลือกชุดราคา 2,000 / 2,300 / 2,600 บาทต่อโต๊ะ ระบุจำนวนโต๊ะ รับใบเสนอราคาเบื้องต้นได้ทันที รวมโต๊ะ เก้าอี้ ผ้าคลุม และทีมบริการ 4 ชั่วโมง ทีมงานจะยืนยันคิวและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดเลี้ยง'],
    ['8 ท่าน', 'ต่อโต๊ะ ขั้นต่ำ 10 โต๊ะ'],
    ['2,000.-', 'เริ่มต้นต่อโต๊ะ (8 อย่าง)'],
  ],
  work: [
    { file: 'catering2.jpg', label: 'รูปโต๊ะจีน' },
    { file: 'chinese2.jpg', label: 'รูปอาหารโต๊ะจีน' },
    { file: 'chinese3.jpg', label: 'รูปจัดโต๊ะ-ผ้าคลุม' },
    { file: 'catering4.jpg', label: 'รูปทีมบริการ' },
  ],
  defaultPkg: 'chinese-2300',
  defaultLine: 'chinese',
};

export const BRAND: Brand = SITE === 'merit' ? MERIT : SITE === 'buffet' ? BUFFET : SITE === 'chinese' ? CHINESE : CATERING;
