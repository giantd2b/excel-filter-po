// Package catalog for the booking page.
// Pricing must stay in sync with apps/api/src/modules/bookings/packages.config.ts

export type FoodMode = 'buffet' | 'table';
export type PkgKind = 'ceremony' | 'full';

export interface TierConfig {
  tiers: [number, number][];
  extra: number;
}

export interface Pkg {
  id: string;
  name: string;
  short: string; // column header in comparison table
  kind: PkgKind;
  base?: number;
  badge?: string;
  img: string;
  tagline: string;
  chips: string[];
  fit: string;
  diff: string[];
  buffet?: TierConfig;
  table?: TierConfig;
  features: [string, string][];
}

const IMG = (f: string) => `${import.meta.env.BASE_URL}img/${f}`;

export const PKGS: Pkg[] = [
  {
    id: 'ceremony',
    name: 'พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)',
    short: 'มาตรฐาน',
    kind: 'ceremony',
    base: 14990,
    img: IMG('ceremony.jpg'),
    tagline: 'พิธีสงฆ์ครบชุด พร้อมอาหารถวายพระ 9 รูป เหมาะกับงานบุญที่บ้าน',
    chips: ['พระ 9 รูป', 'ขันโตก', 'สังฆทานแบบชะลอม'],
    fit: 'งานเรียบง่ายที่บ้าน คุมงบ จัดอาหารเลี้ยงแขกเอง',
    diff: ['อุปกรณ์พิธีมาตรฐานครบชุด', 'สังฆทานแบบชะลอม', 'ไม่รวมม่าน-ฉากโยงผ้าประดับ'],
    features: [
      ['อุปกรณ์พิธีสงฆ์', 'โต๊ะหมู่บูชาครบชุด'],
      ['อาสนะ / พรมรองนั่ง', 'สีครีม-ทอง'],
      ['ขันน้ำมนต์ ที่กรวดน้ำ เทียนชนวน สายสิญจน์', 'ครบชุด'],
      ['ชุดแป้งเจิม', 'แป้งเจิม แผ่นทอง น้ำมันจันทน์'],
      ['ดอกไม้ + ธูปเทียน', 'หน้าโต๊ะบูชา และพระ 9 รูป'],
      ['ภัตตาหารถวายพระ 9 รูป', 'แบบขันโตก'],
      ['อาหารพระพุทธ / เจ้าที่', 'อย่างละ 1 ชุด'],
      ['ผลไม้ถวายเจ้าที่', '1 โตก'],
      ['ชุดสังฆทาน 9 ชุด', 'แบบชะลอม'],
      ['นิมนต์ และรับ-ส่งพระ', 'รวมในแพ็กเกจ'],
    ],
  },
  {
    id: 'ceremony-prime',
    name: 'PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)',
    short: 'PRIME',
    kind: 'ceremony',
    base: 19990,
    badge: 'ยอดนิยม',
    img: IMG('ceremony-prime.jpg'),
    tagline: 'อุปกรณ์และสังฆทานระดับพรีเมี่ยม พร้อมม่าน-ฉากโยงผ้าประดับ',
    chips: ['พระ 9 รูป', 'ขันโตกลายคราม', 'สังฆทานพรีเมี่ยม'],
    fit: 'อยากได้ภาพงานสวย อุปกรณ์พรีเมี่ยม มีฉากถ่ายรูป',
    diff: ['อุปกรณ์พรีเมี่ยม เลือกแบบได้', 'สังฆทานชะลอมพรีเมี่ยม', 'ม่าน-ฉากโยงผ้าประดับสวยงาม'],
    features: [
      ['อุปกรณ์พิธีสงฆ์', 'พรีเมี่ยม เลือกแบบได้'],
      ['อาสนะ / พรมรองนั่ง', 'สีครีม-ทอง'],
      ['ขันน้ำมนต์ ที่กรวดน้ำ เทียนชนวน สายสิญจน์', 'ครบชุด'],
      ['ชุดแป้งเจิม', 'แป้งเจิม แผ่นทอง น้ำมันจันทน์'],
      ['ดอกไม้ + ธูปเทียน', 'หน้าโต๊ะบูชา และพระ 9 รูป'],
      ['ภัตตาหารถวายพระ 9 รูป', 'แบบขันโตกลายคราม'],
      ['อาหารพระพุทธ / เจ้าที่', 'อย่างละ 1 ชุด'],
      ['ผลไม้ถวายเจ้าที่', '1 โตก'],
      ['ชุดสังฆทาน 9 ชุด', 'แบบพรีเมี่ยม'],
      ['นิมนต์ และรับ-ส่งพระ', 'รวมในแพ็กเกจ'],
      ['ม่าน - ฉากโยงผ้า', 'ระดับสวยงาม'],
    ],
  },
  {
    id: 'full',
    name: 'ครบวงจร',
    short: 'ครบวงจร',
    kind: 'full',
    img: IMG('full.jpg'),
    tagline: 'พิธีสงฆ์ + อาหารเลี้ยงแขก โต๊ะเก้าอี้และเต็นท์ฟรีในแพ็กเกจ',
    chips: ['เลี้ยงแขกได้', 'ขันโตก', 'เมนูธรรมดา'],
    fit: 'คุมงบ เลี้ยงแขกครบ เมนูมาตรฐาน',
    diff: ['อาหารบุฟเฟต์เมนูธรรมดา', 'ไม่มีคอฟฟี่เบรค', 'อุปกรณ์พิธีเลือกแบบไม่ได้'],
    buffet: { tiers: [[20, 19490], [30, 21990], [40, 24490], [50, 27990]], extra: 250 },
    table: { tiers: [[8, 33890], [10, 38490], [20, 63990]], extra: 2300 },
    features: [
      ['อุปกรณ์พิธีสงฆ์', 'เลือกแบบไม่ได้'],
      ['อาหารเลี้ยงพระ', 'ขันโตก'],
      ['ชุดไหว้กลางแจ้ง', 'รวม'],
      ['ม่าน - ฉากผ้า', 'รวม'],
      ['ชุดสังฆทาน', 'แบบชะลอม'],
      ['คอฟฟี่เบรค', 'ไม่รวม'],
      ['นิมนต์รับ-ส่งพระ', 'รวม'],
      ['สำรวจหน้างาน / จัดเตรียมก่อน 1 วัน', 'รวม'],
      ['อุปกรณ์ไลน์อาหาร', 'รวม'],
      ['โต๊ะ เก้าอี้ / เต็นท์เล็ก 3x3 ม.', 'ฟรีในแพ็กเกจ'],
      ['ดอกไม้ตกแต่งไลน์อาหาร', 'ไม่รวม'],
      ['คนนำสวด / ค่าเดินทางในพื้นที่', 'ฟรี'],
      ['อาหารบุฟเฟต์', 'เมนูธรรมดา'],
      ['เมนูโต๊ะจีน', 'โต๊ะละ 2,300 ฟรีเครื่องดื่ม'],
      ['ซองปัจจัย', 'ไม่รวม'],
    ],
  },
  {
    id: 'full-plus',
    name: 'ครบวงจร พลัส',
    short: 'พลัส',
    kind: 'full',
    badge: 'ขายดี',
    img: IMG('full-plus.jpg'),
    tagline: 'ยกระดับด้วยเมนูพรีเมี่ยม คอฟฟี่เบรค และดอกไม้ตกแต่งไลน์อาหาร',
    chips: ['เมนูพรีเมี่ยม', 'คอฟฟี่เบรค', 'เลือกสีพรมได้'],
    fit: 'งานส่วนใหญ่เลือกแบบนี้ อาหารพรีเมี่ยมในราคาคุ้มค่า',
    diff: ['อาหารบุฟเฟต์เมนูพรีเมี่ยม', 'คอฟฟี่เบรค + ดอกไม้ตกแต่งไลน์อาหาร', 'เลือกสีพรมได้'],
    buffet: { tiers: [[20, 21990], [30, 25490], [40, 28490], [50, 34490]], extra: 350 },
    table: { tiers: [[8, 37790], [10, 42990], [20, 71490]], extra: 2600 },
    features: [
      ['อุปกรณ์พิธีสงฆ์', 'เลือกสีพรมได้'],
      ['อาหารเลี้ยงพระ', 'ขันโตก ลายคราม'],
      ['ชุดไหว้กลางแจ้ง', 'รวม'],
      ['ม่าน - ฉากผ้า', 'รวม'],
      ['ชุดสังฆทาน', 'แบบชะลอม'],
      ['คอฟฟี่เบรค', 'รวม'],
      ['นิมนต์รับ-ส่งพระ', 'รวม'],
      ['สำรวจหน้างาน / จัดเตรียมก่อน 1 วัน', 'รวม'],
      ['อุปกรณ์ไลน์อาหาร', 'รวม'],
      ['โต๊ะ เก้าอี้ / เต็นท์เล็ก 3x3 ม.', 'ฟรีในแพ็กเกจ'],
      ['ดอกไม้ตกแต่งไลน์อาหาร', 'รวม'],
      ['คนนำสวด / ค่าเดินทางในพื้นที่', 'ฟรี'],
      ['อาหารบุฟเฟต์', 'เมนูพรีเมี่ยม'],
      ['เมนูโต๊ะจีน', 'โต๊ะละ 2,600 ฟรีเครื่องดื่ม'],
      ['ซองปัจจัย', 'ไม่รวม'],
    ],
  },
  {
    id: 'prime',
    name: 'PRIME ครบวงจร',
    short: 'PRIME',
    kind: 'full',
    badge: 'ครบที่สุด',
    img: IMG('prime.jpg'),
    tagline: 'อุปกรณ์พรีเมี่ยมเลือกแบบได้ เลือกอาหารบุฟเฟต์ได้ 6 อย่าง พร้อมที่ปรึกษา VIP',
    chips: ['อุปกรณ์พรีเมี่ยม', 'เลือกเมนู 6 อย่าง', 'ที่ปรึกษา VIP'],
    fit: 'งานสำคัญ ต้องการความพรีเมี่ยมทุกจุด',
    diff: ['เลือกอาหารบุฟเฟต์ได้ 6 อย่าง', 'อุปกรณ์พรีเมี่ยม เลือกแบบได้', 'ที่ปรึกษาจัดงาน VIP'],
    buffet: { tiers: [[20, 25990], [30, 29490], [40, 32990], [50, 38990]], extra: 350 },
    table: { tiers: [[8, 42290], [10, 47490], [20, 75990]], extra: 2600 },
    features: [
      ['อุปกรณ์พิธีสงฆ์', 'พรีเมี่ยม เลือกแบบได้'],
      ['อาหารเลี้ยงพระ', 'ขันโตก ลายคราม'],
      ['ชุดไหว้กลางแจ้ง', 'รวม'],
      ['ม่าน - ฉากผ้า', 'โยงประดับสวยงาม'],
      ['ชุดสังฆทาน', 'แบบชะลอมพรีเมี่ยม'],
      ['คอฟฟี่เบรค', 'เลือกขนมได้ 2 อย่าง'],
      ['นิมนต์รับ-ส่งพระ', 'รวม'],
      ['สำรวจหน้างาน / จัดเตรียมก่อน 1 วัน', 'รวม'],
      ['อุปกรณ์ไลน์อาหาร', 'รวม'],
      ['โต๊ะ เก้าอี้ / เต็นท์เล็ก 3x3 ม.', 'ฟรีในแพ็กเกจ'],
      ['ดอกไม้ตกแต่งไลน์อาหาร', 'รวม'],
      ['คนนำสวด / ค่าเดินทางในพื้นที่', 'ฟรี'],
      ['อาหารบุฟเฟต์', 'เลือกอาหารได้ 6 อย่าง'],
      ['เมนูโต๊ะจีน', 'โต๊ะละ 2,600 ฟรีเครื่องดื่ม'],
      ['ซองปัจจัย', 'ไม่รวม'],
      ['ที่ปรึกษาจัดงาน', 'VIP'],
    ],
  },
];

export const ADDONS = [
  { id: 'stage', label: 'เวทีพระ', sub: 'ขนาด 1.2 x 7.2 เมตร', price: 5000 },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', sub: 'ขนาด 5x12 เมตร', price: 3000 },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', sub: 'ตกแต่งฉากหลังพิธี', price: 1000 },
];

export const OCCASIONS = [
  'ทำบุญขึ้นบ้านใหม่',
  'ทำบุญบริษัท / เปิดกิจการ',
  'ทำบุญวันเกิด',
  'ทำบุญอุทิศส่วนกุศล',
  'ทำบุญบ้าน / ครบรอบ',
  'งานอื่น ๆ',
];

export const STEPS = [
  { t: 'รายละเอียดงานบุญ', s: 'บอกประเภทงาน วันเวลา และสถานที่จัดงาน' },
  { t: 'เลือกแพ็กเกจ', s: 'เลือกแพ็กเกจที่ตรงกับงานของท่านมากที่สุด' },
  { t: 'พระสงฆ์และอาหาร', s: 'จำนวนพระ รูปแบบอาหาร และจำนวนแขก' },
  { t: 'ออปชั่นเสริม', s: 'เพิ่มรายการที่ต้องการ หรือข้ามขั้นตอนนี้ได้' },
  { t: 'ข้อมูลผู้ติดต่อ', s: 'ใช้ออกใบเสนอราคา และทีมงานจะติดต่อกลับตามข้อมูลนี้' },
];

export const FAQS = [
  {
    q: 'ต้องจองล่วงหน้ากี่วัน?',
    a: 'จองได้ทุกช่วงเวลา ไม่มีเงื่อนไขขั้นต่ำ แต่แนะนำให้แจ้งล่วงหน้าเพื่อให้ทีมงานตรวจสอบคิวพระและคิวทีมงานในวันที่ท่านต้องการ',
  },
  {
    q: 'ราคาที่แสดงรวมทุกอย่างแล้วหรือไม่?',
    a: 'ราคาที่ระบบคำนวณเป็นราคาประเมินจากแพ็กเกจและจำนวนที่ท่านเลือก แพ็กเกจที่มีอาหารเลี้ยงแขกยังไม่รวมภาษีมูลค่าเพิ่ม 7% ทีมงานจะสรุปราคาสุทธิให้อีกครั้งทาง LINE',
  },
  {
    q: 'ให้บริการพื้นที่ใดบ้าง?',
    a: 'ชลบุรี ระยอง ฉะเชิงเทรา สมุทรปราการ และกรุงเทพฯ ค่าเดินทางในพื้นที่บริการฟรี พื้นที่นอกเหนือจากนี้สอบถามทีมงานได้',
  },
  {
    q: 'ถ้านิมนต์พระเองจะลดราคาไหม?',
    a: 'หากท่านนิมนต์และรับ-ส่งพระเองทั้งสองอย่าง ลด 1,000 บาท หากทำอย่างใดอย่างหนึ่งไม่สามารถลดราคาได้ และทุกแพ็กเกจหากใช้พระ 5 รูป ลดเพิ่มอีก 1,500 บาท',
  },
  {
    q: 'ลูกค้าต้องเตรียมอะไรบ้าง?',
    a: 'เตรียมเพียงซองปัจจัยและพระพุทธรูป ส่วนอุปกรณ์พิธี อาหาร และการจัดสถานที่ทีมงานดูแลให้ทั้งหมด',
  },
];

export const REVIEWS = [
  {
    stars: '★★★★★',
    text: 'จัดงานทำบุญขึ้นบ้านใหม่ ทีมงานมาเซ็ตให้ตั้งแต่เย็นวันก่อนงาน เช้ามาทุกอย่างเรียบร้อยมาก ไม่ต้องห่วงอะไรเลย',
    who: 'คุณอรพรรณ · ชลบุรี',
  },
  {
    stars: '★★★★★',
    text: 'ทำบุญบริษัท 10 โต๊ะจีน อาหารอร่อย พนักงานสุภาพ พระมาตรงเวลา ประทับใจการดูแลมากค่ะ',
    who: 'คุณธนกฤต · ระยอง',
  },
  {
    stars: '★★★★★',
    text: 'ปรึกษาทาง LINE ตอบไว บอกงบมาให้เลือกแพ็กเกจได้เหมาะสม ไม่มีบวกเพิ่มทีหลัง',
    who: 'คุณสุนีย์ · สมุทรปราการ',
  },
];

export const TIME_OPTS = [
  { label: 'ทำบุญเช้า', sub: '07.00 - 07.30 น.', v: 'เช้า 07.00-07.30 น.' },
  { label: 'ถวายเพล', sub: '10.00 - 10.30 น.', v: 'เพล 10.00-10.30 น.' },
];

export const PROVINCES = ['ชลบุรี', 'ระยอง', 'ฉะเชิงเทรา', 'สมุทรปราการ', 'กรุงเทพฯ'];

export const LINE_URL = 'https://line.me/R/ti/p/@temboon';
export const PHONE = '0805838383';
export const PHONE_LABEL = '080-583-8383 ต่อ 2';

// Discounts — defaults only; live values arrive from GET /api/bookings/pricing (see applyPricing)
export const DISCOUNTS = { selfTransport: 1000, fiveMonks: 1500 };

/** Deposit rule (mirror of flowaccount-app); overwritten by applyPricing. */
export const DEPOSIT_RULE: { tiers: { upTo: number; amount: number }[]; abovePercent: number } = {
  tiers: [{ upTo: 15000, amount: 3000 }, { upTo: 25000, amount: 5000 }],
  abovePercent: 20,
};

export interface PricingPayload {
  pricing: {
    packages: Record<string, { base?: number | null; buffet?: TierConfig | null; table?: TierConfig | null }>;
    addons: Record<string, number>;
    selfTransportDiscount: number;
    fiveMonksDiscount: number;
  };
  depositRule?: { tiers: { upTo: number; amount: number }[]; abovePercent: number };
}

/**
 * Overwrite the bundled default prices with the live ones from the API.
 * Mutates PKGS / ADDONS / DISCOUNTS in place; callers must re-render afterwards.
 */
export function applyPricing(payload: PricingPayload) {
  const p = payload?.pricing;
  if (!p) return;
  for (const pkg of PKGS) {
    const s = p.packages?.[pkg.id];
    if (!s) continue;
    if (pkg.kind === 'ceremony') {
      if (typeof s.base === 'number') pkg.base = s.base;
    } else {
      if (s.buffet?.tiers?.length) pkg.buffet = { tiers: s.buffet.tiers, extra: s.buffet.extra };
      if (s.table?.tiers?.length) pkg.table = { tiers: s.table.tiers, extra: s.table.extra };
    }
  }
  for (const a of ADDONS) {
    const v = p.addons?.[a.id];
    if (typeof v === 'number') a.price = v;
  }
  if (typeof p.selfTransportDiscount === 'number') DISCOUNTS.selfTransport = p.selfTransportDiscount;
  if (typeof p.fiveMonksDiscount === 'number') DISCOUNTS.fiveMonks = p.fiveMonksDiscount;
  const r = payload.depositRule;
  if (r?.tiers?.length) {
    DEPOSIT_RULE.tiers = r.tiers.map((t) => ({ upTo: Number(t.upTo), amount: Number(t.amount) }));
    DEPOSIT_RULE.abovePercent = Number(r.abovePercent) || 0;
  }
}

export function pkgById(id: string): Pkg {
  return PKGS.find((p) => p.id === id) || PKGS[1];
}

// Comparison rows for the package-pick step: price rows + every feature
// whose value differs between packages of the same kind.
export function compareRows(kind: PkgKind): { label: string; values: string[] }[] {
  const pkgs = PKGS.filter((p) => p.kind === kind);
  const rows: { label: string; values: string[] }[] = [];

  if (kind === 'full') {
    rows.push(
      { label: 'บุฟเฟต์ แขก 20 ท่าน', values: pkgs.map((p) => baht(p.buffet!.tiers[0][1]) + '.-') },
      { label: 'เพิ่มแขก / ท่าน', values: pkgs.map((p) => baht(p.buffet!.extra) + '.-') },
      { label: 'โต๊ะจีน 8 โต๊ะ', values: pkgs.map((p) => baht(p.table!.tiers[0][1]) + '.-') },
      { label: 'เพิ่มโต๊ะจีน / โต๊ะ', values: pkgs.map((p) => baht(p.table!.extra) + '.-') },
    );
  } else {
    rows.push({ label: 'ราคาแพ็กเกจ', values: pkgs.map((p) => baht(p.base!) + '.-') });
  }

  const keys: string[] = [];
  for (const p of pkgs) for (const [k] of p.features) if (!keys.includes(k)) keys.push(k);
  for (const label of keys) {
    const values = pkgs.map((p) => {
      const f = p.features.find((x) => x[0] === label);
      return f ? f[1] : '—';
    });
    if (new Set(values).size > 1) rows.push({ label, values });
  }
  return rows;
}

export function baht(n: number): string {
  return n.toLocaleString('en-US');
}
