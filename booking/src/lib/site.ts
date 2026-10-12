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

const WEB = 'https://iristermboon.com';
const IMG = 'https://pub-ecd6581f672741a9a8ca94b35f64aae6.r2.dev/legacy';
/** portfolio page on the main website — every job with all its photos */
export const WORK_URL = `${WEB}/ผลงานที่ผ่านมา/`;
/** privacy policy on the main website (linked from the contact step) */
export const PRIVACY_URL = `${WEB}/นโยบายความเป็นส่วนตัว/`;

export interface Work {
  title: string;
  href: string;
  img: string;
}
const work = (title: string, slug: string, img: string): Work => ({ title, href: `${WEB}/${slug}/`, img: `${IMG}/${img}.webp` });

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
  /** jobs from the portfolio on iristermboon.com (image + link to the job page) */
  work: Work[];
  /** Facebook page whose reviews tab holds the real customer reviews */
  reviewsUrl: string;
  /** "ขอใบเสนอราคาง่าย ๆ 3 ขั้นตอน" — [title, detail] */
  steps: [string, string][];
  /** default package when the wizard is entered without picking one */
  defaultPkg: string;
  defaultLine: PkgLine;
}

const MERIT_STEPS: [string, string][] = [
  ['เลือกแพ็กเกจและกรอกรายละเอียด', 'วันจัดงาน จำนวนแขก จำนวนพระ และสถานที่'],
  ['ทีมงานยืนยันทาง LINE', 'ตรวจสอบคิววันงาน สรุปราคาสุทธิ และนัดสำรวจหน้างาน'],
  ['ทีมงานจัดเตรียมและดูแลหน้างาน', 'เข้าจัดเตรียมก่อน 1 วัน นิมนต์และรับ-ส่งพระ ดูแลจนจบพิธี'],
];
const CATERING_STEPS: [string, string][] = [
  ['เลือกแพ็กเกจและกรอกรายละเอียด', 'วันจัดงาน จำนวนแขกหรือโต๊ะ และสถานที่'],
  ['ทีมงานยืนยันทาง LINE', 'ตรวจสอบคิววันงาน ยืนยันรายการอาหาร สรุปราคาสุทธิ และมัดจำ'],
  ['ทีมงานจัดเตรียมและดูแลหน้างาน', 'เข้าจัดโต๊ะ-ไลน์อาหารก่อนเวลา เสิร์ฟตรงเวลา ดูแลจนจบงาน'],
];

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
    work('PRIME งานพิธีสงฆ์บางปะกง', 'primeงานพิธีสงฆ์บางปะกง', '9a82c26d60c180c72018'),
    work('PRIME งานบุญสัตหีบ', 'prime-งานบุญสัตหีบ', 'e57b101e616eba27394e'),
    work('งานพิธีสงฆ์พัทยาเหนือ', 'งานพิธีสงฆ์พัทยาเหนือ', 'a048e2bf2d02cda8476f'),
    work('PRIME งานแกลงระยอง', 'prime-งานแกลงระยอง', '0a85688e28da3ca8ac6b'),
  ],
  reviewsUrl: 'https://www.facebook.com/temboon2020/reviews',
  steps: MERIT_STEPS,
  defaultPkg: 'ceremony-prime',
  defaultLine: 'merit',
};

/** shared IRIS Catering identity; the three catering storefronts only differ in copy and default package */
const CATERING_BASE = {
  name: 'IRIS Catering',
  steps: CATERING_STEPS,
  reviewsUrl: 'https://www.facebook.com/iriscateringpattaya/reviews',
  mark: 'IR',
  lineUrl: 'https://line.me/R/ti/p/@iriscatering',
  lineLabel: 'LINE @Iriscatering',
  phone: '0805838383',
  phoneLabel: '080-583-8383 กด 1',
  work: [
    work('โต๊ะจีน 70 โต๊ะ', 'โต๊ะจีน-70-โต๊ะ', '286b971d06cdafa22aa9'),
    work('โต๊ะจีน 35 โต๊ะ โรงโป๊ะ', 'โต๊ะจีน-โรงโป๊ะ', '7d4caa85c1bccec981f9'),
    work('งานโคมัตสุ', 'งานโคมัตสุ', '6662a77fb5b95dcf1837'),
    work('งานแต่งนอกสถานที่ ระยอง', 'งานแต่งนอกสถานที่-ระยอง', 'd35ad50627bae6a7414e'),
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
    ['100+ เมนู', 'อาหารไทย · โต๊ะจีน ให้เลือก'],
    ['ครบชุด', 'อาหาร · โต๊ะเก้าอี้ · ทีมบริการ'],
  ],
  defaultPkg: 'chinese-2300',
  defaultLine: 'chinese',
};

const BUFFET: Brand = {
  ...CATERING_BASE,
  tagline: 'บุฟเฟต์อาหารไทย จัดเลี้ยงนอกสถานที่',
  docTitle: 'IRIS Catering — จองบุฟเฟต์อาหารไทย',
  heroTitle: ['บุฟเฟต์อาหารไทย', 'เลือกได้ 5-8 อย่าง จาก 100+ เมนู'],
  heroSub: 'เลือกระดับแพ็กเกจ จำนวนอย่าง และจำนวนแขก รับใบเสนอราคาเบื้องต้นได้ทันที ฟรีข้าว น้ำดื่ม ขนมหวาน โต๊ะเก้าอี้ และทีมบริการ ทีมงานจะยืนยันคิวและแจ้งขั้นตอนมัดจำกลับภายในวันเดียวกัน',
  stats: [
    ['7 ปี', 'ประสบการณ์จัดเลี้ยง'],
    ['100+ เมนู', 'อาหารไทยให้เลือกครบทุกหมวด'],
    ['250.-', 'เริ่มต้นต่อท่าน (5 อย่าง)'],
  ],
  work: [
    work('งานโคมัตสุ', 'งานโคมัตสุ', '6662a77fb5b95dcf1837'),
    work('งานไทยหมิง', 'งานไทยหมิง', '99638b57e5bd116ca0af'),
    work('งานนิคมพัฒนา 30 ท่าน', 'งานนิคมพัฒนา-30-ท่าน', 'b7b9bc92eba50aa6fd29'),
    work('อาหารนานาชาติ', 'อาหารนานาชาติ', '1f9ece0cc01c3dcddfbd'),
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
    work('โต๊ะจีน 70 โต๊ะ', 'โต๊ะจีน-70-โต๊ะ', '286b971d06cdafa22aa9'),
    work('โต๊ะจีน 35 โต๊ะ โรงโป๊ะ', 'โต๊ะจีน-โรงโป๊ะ', '7d4caa85c1bccec981f9'),
    work('โต๊ะจีนบางปะกง', 'โต๊ะจีนบางปะกง', 'e6a6baa0f26a8ae7a29c'),
    work('โต๊ะจีนสวนไทย', 'โต๊ะจีนสวนไทย', '514aa33348e35fa9f24f'),
  ],
  defaultPkg: 'chinese-2300',
  defaultLine: 'chinese',
};

export const BRAND: Brand = SITE === 'merit' ? MERIT : SITE === 'buffet' ? BUFFET : SITE === 'chinese' ? CHINESE : CATERING;
