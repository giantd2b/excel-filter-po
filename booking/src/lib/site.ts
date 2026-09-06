import type { PkgLine } from '../data/packages';

/**
 * One bundle, two storefronts. The API serves the same build at /booking (IRIS เติมบุญ — งานบุญ)
 * and /catering (IRIS Catering — บุฟเฟต์ / โต๊ะจีน). Which one we are is decided by the path, and
 * everything brand-specific (lines shown, colours, copy, contact) hangs off SITE.
 */
export type Site = 'merit' | 'catering';

export const SITE: Site = typeof window !== 'undefined' && /^\/catering(\/|$)/.test(window.location.pathname) ? 'catering' : 'merit';

/** package lines sold on this storefront */
export const SITE_LINES: PkgLine[] = SITE === 'catering' ? ['buffet', 'chinese'] : ['merit'];

export const isSiteLine = (line: PkgLine) => SITE_LINES.includes(line);

/** URL prefix of this storefront (assets always come from /booking/, the Vite base) */
export const SITE_PATH = SITE === 'catering' ? '/catering/' : '/booking/';

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

const CATERING: Brand = {
  name: 'IRIS Catering',
  tagline: 'บุฟเฟต์อาหารไทย · โต๊ะจีน · จัดเลี้ยงนอกสถานที่',
  mark: 'IR',
  docTitle: 'IRIS Catering — จองบุฟเฟต์อาหารไทย โต๊ะจีน',
  lineUrl: 'https://line.me/R/ti/p/@iriscatering',
  lineLabel: 'LINE @Iriscatering',
  phone: '0805838383',
  phoneLabel: '080-583-8383 กด 1',
  heroTitle: ['จัดเลี้ยงให้ประทับใจ', 'ตั้งแต่จานแรกถึงจานสุดท้าย'],
  heroSub: 'เลือกบุฟเฟต์อาหารไทยหรือโต๊ะจีน ระบุจำนวนแขก รับใบเสนอราคาเบื้องต้นได้ทันที ทีมงานจะยืนยันคิววันงานและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดเลี้ยง'],
    ['100+ เมนู', 'อาหารไทย · โต๊ะจีน ทำสดหน้างาน'],
    ['ครบชุด', 'อาหาร · โต๊ะเก้าอี้ · ทีมบริการ'],
  ],
  work: [
    { file: 'catering1.jpg', label: 'รูปไลน์บุฟเฟต์' },
    { file: 'catering2.jpg', label: 'รูปโต๊ะจีน' },
    { file: 'catering3.jpg', label: 'รูปอาหารหน้างาน' },
    { file: 'catering4.jpg', label: 'รูปทีมบริการ' },
  ],
  defaultPkg: 'chinese-2300',
  defaultLine: 'chinese',
};

export const BRAND: Brand = SITE === 'catering' ? CATERING : MERIT;
