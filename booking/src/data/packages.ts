// Package catalog for the booking page.
// Pricing must stay in sync with apps/api/src/modules/bookings/packages.config.ts

export type FoodMode = 'buffet' | 'table';
/** ceremony = monk package only · full = monk package + guest food · catering = food only (no monks) */
export type PkgKind = 'ceremony' | 'full' | 'catering';
/** product line = the tab the package lives under */
export type PkgLine = 'merit' | 'buffet' | 'chinese';
export type DishCount = 5 | 6 | 7 | 8;
export const DISH_COUNTS: DishCount[] = [5, 6, 7, 8];

export const LINES: { id: PkgLine; label: string; short: string; sub: string }[] = [
  { id: 'merit', label: 'งานบุญ', short: 'งานบุญ', sub: 'พิธีสงฆ์ครบวงจร' },
  { id: 'buffet', label: 'บุฟเฟต์อาหารไทย', short: 'บุฟเฟต์', sub: 'คิดต่อท่าน ตามจำนวนอย่าง' },
  { id: 'chinese', label: 'โต๊ะจีน', short: 'โต๊ะจีน', sub: 'คิดต่อโต๊ะ 8 ท่าน' },
];

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
  /** add-on ids already covered by the package (shown as "รวมในแพ็กเกจแล้ว", never charged) */
  includedAddons?: string[];
  line: PkgLine;
  /** catering only */
  unit?: 'guest' | 'table';
  minCount?: number;
  perHead?: Record<DishCount, number>;
  perTable?: number;
  courses?: number;
  /** catering: terms shown on the detail page (ขั้นต่ำ, เครื่องดื่ม, ชั้น 2 …) */
  notes?: string[];
}

const IMG = (f: string) => `${import.meta.env.BASE_URL}img/${f}`;

export const PKGS: Pkg[] = [
  {
    id: 'ceremony',
    name: 'พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)',
    short: 'มาตรฐาน',
    kind: 'ceremony',
    line: 'merit',
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
    line: 'merit',
    base: 19990,
    includedAddons: ['drape'],
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
    line: 'merit',
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
    line: 'merit',
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
    line: 'merit',
    includedAddons: ['drape'],
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
  // ── IRIS Catering — บุฟเฟต์อาหารไทย (ราคาต่อท่าน ตามจำนวนอย่าง, ขั้นต่ำ 40 ท่าน) ──
  {
    id: 'buffet-standard',
    name: 'บุฟเฟต์อาหารไทย แพคเกจเริ่มต้น',
    short: 'เริ่มต้น',
    kind: 'catering',
    line: 'buffet',
    unit: 'guest',
    minCount: 40,
    perHead: { 5: 250, 6: 280, 7: 310, 8: 340 },
    img: IMG('buffet-standard.jpg'),
    tagline: 'อาหารไทยบุฟเฟต์เลือกได้ 5-8 อย่าง พร้อมข้าว น้ำดื่ม ขนมหวาน และทีมบริการ',
    chips: ['5-8 อย่าง', 'ขั้นต่ำ 40 ท่าน', 'ฟรีโต๊ะ-เก้าอี้'],
    fit: 'งานเลี้ยงทั่วไป งานบริษัท งานครอบครัว คุมงบต่อหัว',
    diff: ['เมนูอาหารไทยยอดนิยม 60+ รายการ', 'ฟรี ข้าวหอมมะลิ น้ำดื่ม ขนมหวาน 1 อย่าง', 'ฟรี บริการ อุปกรณ์ โต๊ะ-เก้าอี้ ค่าขนส่งในพื้นที่'],
    notes: ['ขั้นต่ำ 40 ท่าน เพิ่มจำนวนแขกคิดราคาต่อท่าน × จำนวนที่เพิ่ม', 'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%', 'ยืนยันรายการอาหารกับทีมงานหลังจอง'],
    features: [
      ['อาหารคาว', 'เลือก 5-8 อย่าง'],
      ['ข้าวหอมมะลิ + น้ำดื่ม', 'ฟรี'],
      ['ขนมหวาน', 'ฟรี 1 อย่าง'],
      ['บริการพร้อมอุปกรณ์จัดเลี้ยง', 'ฟรี'],
      ['โต๊ะ เก้าอี้ ตามจำนวนแขก', 'ฟรี'],
      ['ค่าขนส่งในพื้นที่บริการ', 'ฟรี'],
    ],
  },
  {
    id: 'buffet-premium',
    name: 'บุฟเฟต์อาหารไทย แพคเกจพรีเมียม',
    short: 'พรีเมียม',
    kind: 'catering',
    line: 'buffet',
    unit: 'guest',
    minCount: 40,
    perHead: { 5: 350, 6: 385, 7: 420, 8: 455 },
    badge: 'แนะนำ',
    img: IMG('buffet-premium.jpg'),
    tagline: 'วัตถุดิบระดับพรีเมียม ทะเล เนื้อ ปลากะพง พร้อมน้ำสมุนไพรและผลไม้ตามฤดูกาล',
    chips: ['5-8 อย่าง', 'เมนูทะเล-เนื้อ', 'น้ำสมุนไพร + ผลไม้'],
    fit: 'งานแต่ง งานเลี้ยงรับรอง งานที่อยากให้อาหารเป็นจุดเด่น',
    diff: ['เมนูพรีเมียม 100+ รายการ มีทะเล เนื้อ ปลากะพง น้ำพริก ยำ', 'พิเศษ น้ำสมุนไพรและผลไม้ตามฤดูกาล', 'ฟรีทุกอย่างเหมือนแพคเกจเริ่มต้น'],
    notes: ['ขั้นต่ำ 40 ท่าน เพิ่มจำนวนแขกคิดราคาต่อท่าน × จำนวนที่เพิ่ม', 'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%', 'ยืนยันรายการอาหารกับทีมงานหลังจอง'],
    features: [
      ['อาหารคาว', 'เลือก 5-8 อย่าง (พรีเมียม)'],
      ['น้ำสมุนไพร + ผลไม้ตามฤดูกาล', 'พิเศษ'],
      ['ข้าวหอมมะลิ + น้ำดื่ม', 'ฟรี'],
      ['ขนมหวาน', 'ฟรี 1 อย่าง'],
      ['บริการพร้อมอุปกรณ์จัดเลี้ยง', 'ฟรี'],
      ['โต๊ะ เก้าอี้ ตามจำนวนแขก', 'ฟรี'],
      ['ค่าขนส่งในพื้นที่บริการ', 'ฟรี'],
    ],
  },
  // ── IRIS Catering — โต๊ะจีน (ราคาต่อโต๊ะ 8 ท่าน, ขั้นต่ำ 10 โต๊ะ, ไม่รวมเครื่องดื่ม) ──
  {
    id: 'chinese-2000',
    name: 'โต๊ะจีน 2,000',
    short: '2,000',
    kind: 'catering',
    line: 'chinese',
    unit: 'table',
    minCount: 10,
    perTable: 2000,
    courses: 8,
    img: IMG('chinese-2000.jpg'),
    tagline: 'โต๊ะจีน 8 อย่าง เลือกได้จานละ 1 เมนู พร้อมโต๊ะ เก้าอี้ ผ้าคลุม และทีมบริการ',
    chips: ['8 อย่าง', 'โต๊ะละ 8 ท่าน', 'ขั้นต่ำ 10 โต๊ะ'],
    fit: 'งานเลี้ยงคุมงบ งานบวช งานศพ งานชุมชน',
    diff: ['8 อย่าง: ออเดิร์ฟ กระเพาะปลา ไก่ หมู ปลาทับทิม ต้ม/แกง ข้าวผัด ของหวาน', 'รวมโต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'บริการ 4 ชั่วโมงนับจากอาหารจานแรก'],
    notes: [
      'ขั้นต่ำ 10 โต๊ะ โต๊ะละ 8 ท่าน (โต๊ะ 120 cm)',
      'ราคาไม่รวมเครื่องดื่ม เพิ่มได้ 250 บาท/โต๊ะ',
      'ระยะเวลาบริการ 4 ชั่วโมงนับจากอาหารจานแรก',
      'จัดงานชั้น 2 มีค่าบริการเพิ่มเติม',
      'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%',
    ],
    features: [
      ['อาหาร', '8 อย่าง เลือกจานละ 1 เมนู'],
      ['โต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'รวม'],
      ['ทีมบริการ 4 ชั่วโมง', 'รวม'],
      ['เครื่องดื่ม', 'ไม่รวม (+250/โต๊ะ)'],
    ],
  },
  {
    id: 'chinese-2300',
    name: 'โต๊ะจีน 2,300',
    short: '2,300',
    kind: 'catering',
    line: 'chinese',
    unit: 'table',
    minCount: 10,
    perTable: 2300,
    courses: 9,
    badge: 'ยอดนิยม',
    img: IMG('chinese-2300.jpg'),
    tagline: 'โต๊ะจีน 9 อย่าง เพิ่มของทานเล่น ปลากะพง และเมนูอบน้ำแดง เลือกได้จานละ 1 เมนู',
    chips: ['9 อย่าง', 'โต๊ะละ 8 ท่าน', 'ขั้นต่ำ 10 โต๊ะ'],
    fit: 'งานแต่ง งานเลี้ยงบริษัท งานที่อยากได้เมนูหลากหลาย',
    diff: ['9 อย่าง: เพิ่มของทานเล่น + ปลากะพง + ขาหมู/เป็ดอบ', 'รวมโต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'บริการ 4 ชั่วโมงนับจากอาหารจานแรก'],
    notes: [
      'ขั้นต่ำ 10 โต๊ะ โต๊ะละ 8 ท่าน (โต๊ะ 120 cm)',
      'ราคาไม่รวมเครื่องดื่ม เพิ่มได้ 250 บาท/โต๊ะ',
      'ระยะเวลาบริการ 4 ชั่วโมงนับจากอาหารจานแรก',
      'จัดงานชั้น 2 มีค่าบริการเพิ่มเติม',
      'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%',
    ],
    features: [
      ['อาหาร', '9 อย่าง เลือกจานละ 1 เมนู'],
      ['โต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'รวม'],
      ['ทีมบริการ 4 ชั่วโมง', 'รวม'],
      ['เครื่องดื่ม', 'ไม่รวม (+250/โต๊ะ)'],
    ],
  },
  {
    id: 'chinese-2600',
    name: 'โต๊ะจีน 2,600',
    short: '2,600',
    kind: 'catering',
    line: 'chinese',
    unit: 'table',
    minCount: 10,
    perTable: 2600,
    courses: 10,
    badge: 'ครบที่สุด',
    img: IMG('chinese-2600.jpg'),
    tagline: 'โต๊ะจีน 10 อย่าง ออเดิร์ฟทะเล กระเพาะปลาเนื้อปู และจานกุ้งพิเศษ เลือกได้จานละ 1 เมนู',
    chips: ['10 อย่าง', 'ออเดิร์ฟทะเล', 'จานกุ้งพิเศษ'],
    fit: 'งานแต่ง งานเลี้ยงรับรองแขกผู้ใหญ่ งานที่อยากได้ความพรีเมียม',
    diff: ['10 อย่าง: เพิ่มออเดิร์ฟทะเล ฮ่อยจ๊อปู กระเพาะปลาเนื้อปู และจานกุ้ง', 'รวมโต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'บริการ 4 ชั่วโมงนับจากอาหารจานแรก'],
    notes: [
      'ขั้นต่ำ 10 โต๊ะ โต๊ะละ 8 ท่าน (โต๊ะ 120 cm)',
      'ราคาไม่รวมเครื่องดื่ม เพิ่มได้ 250 บาท/โต๊ะ',
      'ระยะเวลาบริการ 4 ชั่วโมงนับจากอาหารจานแรก',
      'จัดงานชั้น 2 มีค่าบริการเพิ่มเติม',
      'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%',
    ],
    features: [
      ['อาหาร', '10 อย่าง เลือกจานละ 1 เมนู'],
      ['โต๊ะ เก้าอี้ ผ้าคลุมสีขาว', 'รวม'],
      ['ทีมบริการ 4 ชั่วโมง', 'รวม'],
      ['เครื่องดื่ม', 'ไม่รวม (+250/โต๊ะ)'],
    ],
  },
];

export interface Addon {
  id: string;
  label: string;
  sub: string;
  price: number;
  /** 'table' = price × number of tables (เครื่องดื่มโต๊ะจีน) */
  perUnit?: 'table';
  /** package lines that offer this add-on */
  lines: PkgLine[];
}

export const ADDONS: Addon[] = [
  { id: 'stage', label: 'เวทีพระ', sub: 'ขนาด 1.2 x 7.2 เมตร', price: 5000, lines: ['merit'] },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', sub: 'ขนาด 5x12 เมตร', price: 3000, lines: ['merit'] },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', sub: 'ตกแต่งฉากหลังพิธี', price: 1000, lines: ['merit'] },
  {
    id: 'drinks',
    label: 'เครื่องดื่ม',
    sub: 'ต่อโต๊ะ: น้ำเปล่า 2 น้ำอัดลม 2 โซดา 4 (หรือน้ำอัดลม 3 ไม่มีโซดา) + น้ำแข็งตลอดงาน',
    price: 250,
    perUnit: 'table',
    lines: ['chinese'],
  },
];

export const OCCASIONS = [
  'ทำบุญขึ้นบ้านใหม่',
  'ทำบุญบริษัท / เปิดกิจการ',
  'ทำบุญวันเกิด',
  'ทำบุญอุทิศส่วนกุศล',
  'ทำบุญบ้าน / ครบรอบ',
  'งานอื่น ๆ',
];

export const CATERING_OCCASIONS = ['งานเลี้ยงบริษัท / สัมมนา', 'งานแต่งงาน', 'งานบวช', 'งานศพ', 'งานเลี้ยงรุ่น / ครอบครัว', 'งานอื่น ๆ'];

export function occasionsFor(line: PkgLine): string[] {
  return line === 'merit' ? OCCASIONS : CATERING_OCCASIONS;
}

export const STEPS = [
  { t: 'รายละเอียดงานบุญ', s: 'บอกประเภทงาน วันเวลา และสถานที่จัดงาน' },
  { t: 'เลือกแพ็กเกจ', s: 'เลือกแพ็กเกจที่ตรงกับงานของท่านมากที่สุด' },
  { t: 'พระสงฆ์และอาหาร', s: 'จำนวนพระ รูปแบบอาหาร และจำนวนแขก' },
  { t: 'ออปชั่นเสริม', s: 'เพิ่มรายการที่ต้องการ หรือข้ามขั้นตอนนี้ได้' },
  { t: 'ข้อมูลผู้ติดต่อ', s: 'ใช้ออกใบเสนอราคา และทีมงานจะติดต่อกลับตามข้อมูลนี้' },
];

const CATERING_STEPS = [
  { t: 'รายละเอียดงาน', s: 'บอกประเภทงาน วันเวลา และสถานที่จัดงาน' },
  { t: 'เลือกแพ็กเกจ', s: 'เลือกระดับอาหารที่ตรงกับงานของท่านมากที่สุด' },
  { t: 'เมนูและจำนวนแขก', s: 'จำนวนอย่าง จำนวนแขกหรือจำนวนโต๊ะ' },
  { t: 'ออปชั่นเสริม', s: 'เพิ่มรายการที่ต้องการ หรือข้ามขั้นตอนนี้ได้' },
  { t: 'ข้อมูลผู้ติดต่อ', s: 'ใช้ออกใบเสนอราคา และทีมงานจะติดต่อกลับตามข้อมูลนี้' },
];

/** wizard step titles per line (same 5 steps everywhere — only the wording changes) */
export function stepsFor(line: PkgLine) {
  return line === 'merit' ? STEPS : CATERING_STEPS;
}

/** site: which storefront shows the entry (absent = both /booking and /catering) */
export const FAQS: { q: string; a: string; site?: 'merit' | 'catering' }[] = [
  {
    q: 'ต้องจองล่วงหน้ากี่วัน?',
    a: 'จองได้ทุกช่วงเวลา ไม่มีเงื่อนไขขั้นต่ำ แต่แนะนำให้แจ้งล่วงหน้าเพื่อให้ทีมงานตรวจสอบคิวพระและคิวทีมงานในวันที่ท่านต้องการ',
    site: 'merit',
  },
  {
    q: 'ต้องจองล่วงหน้ากี่วัน?',
    a: 'แนะนำให้แจ้งล่วงหน้าอย่างน้อย 3-5 วันเพื่อให้ทีมงานตรวจสอบคิว จัดเตรียมวัตถุดิบ และยืนยันรายการอาหารกับท่าน งานด่วนสอบถามทีมงานได้',
    site: 'catering',
  },
  {
    q: 'ราคาที่แสดงรวมทุกอย่างแล้วหรือไม่?',
    a: 'ราคาที่ระบบคำนวณเป็นราคาประเมินจากแพ็กเกจและจำนวนที่ท่านเลือก แพ็กเกจที่มีอาหารเลี้ยงแขกยังไม่รวมภาษีมูลค่าเพิ่ม 7% ทีมงานจะสรุปราคาสุทธิให้อีกครั้งทาง LINE',
    site: 'merit',
  },
  {
    q: 'ให้บริการพื้นที่ใดบ้าง?',
    a: 'ชลบุรี ระยอง ฉะเชิงเทรา สมุทรปราการ และกรุงเทพฯ ค่าเดินทางในพื้นที่บริการฟรี พื้นที่นอกเหนือจากนี้สอบถามทีมงานได้',
  },
  {
    q: 'ถ้านิมนต์พระเองจะลดราคาไหม?',
    a: 'หากท่านนิมนต์และรับ-ส่งพระเองทั้งสองอย่าง ลด 1,000 บาท หากทำอย่างใดอย่างหนึ่งไม่สามารถลดราคาได้ และทุกแพ็กเกจหากใช้พระ 5 รูป ลดเพิ่มอีก 1,500 บาท',
    site: 'merit',
  },
  {
    q: 'ลูกค้าต้องเตรียมอะไรบ้าง?',
    a: 'เตรียมเพียงซองปัจจัยและพระพุทธรูป ส่วนอุปกรณ์พิธี อาหาร และการจัดสถานที่ทีมงานดูแลให้ทั้งหมด',
    site: 'merit',
  },
  {
    q: 'บุฟเฟต์และโต๊ะจีนมีขั้นต่ำไหม?',
    a: 'บุฟเฟต์อาหารไทยรับขั้นต่ำ 40 ท่าน คิดราคาต่อท่านตามจำนวนอย่างที่เลือก ส่วนโต๊ะจีนรับขั้นต่ำ 10 โต๊ะ (โต๊ะละ 8 ท่าน) เลือกเมนูได้จานละ 1 อย่าง',
    site: 'catering',
  },
  {
    q: 'ราคาบุฟเฟต์และโต๊ะจีนรวมอะไรบ้าง?',
    a: 'บุฟเฟต์รวมข้าว น้ำดื่ม ขนมหวาน 1 อย่าง บริการพร้อมอุปกรณ์ โต๊ะเก้าอี้ตามจำนวนแขก และค่าขนส่งในพื้นที่บริการ โต๊ะจีนรวมโต๊ะ เก้าอี้ ผ้าคลุม และบริการ 4 ชั่วโมง แต่ไม่รวมเครื่องดื่ม (เพิ่มได้ 250 บาท/โต๊ะ) ทุกราคายังไม่รวม VAT 7%',
    site: 'catering',
  },
  {
    q: 'เลือกเมนูตอนไหน?',
    a: 'ตอนจองเลือกเพียงระดับแพ็กเกจ จำนวนอย่าง และจำนวนแขกหรือโต๊ะ หลังจากนั้นทีมงานจะติดต่อกลับเพื่อยืนยันรายการอาหารจากเมนูทั้งหมดในหน้ารายละเอียดแพ็กเกจ',
    site: 'catering',
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

export const CATERING_TIME_OPTS = [
  { label: 'มื้อเที่ยง', sub: '11.00 - 13.00 น.', v: 'เที่ยง 11.00-13.00 น.' },
  { label: 'มื้อเย็น', sub: '17.00 - 19.00 น.', v: 'เย็น 17.00-19.00 น.' },
];

export function timeOptsFor(line: PkgLine) {
  return line === 'merit' ? TIME_OPTS : CATERING_TIME_OPTS;
}

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

/** Provinces we serve — the event venue must be in one of these (mirror of apps/api packages.config.ts). */
export const SERVICE_PROVINCES = ['ชลบุรี', 'ระยอง', 'สมุทรปราการ', 'ฉะเชิงเทรา', 'กรุงเทพฯ'];
export const SERVICE_AREA_TEXT = 'ชลบุรี ระยอง สมุทรปราการ ฉะเชิงเทรา และกรุงเทพมหานคร';
export function isServiceProvince(p: string | null | undefined): boolean {
  const v = String(p || '').trim().replace(/^จ\./, '').replace(/^กรุงเทพมหานคร$/, 'กรุงเทพฯ');
  return SERVICE_PROVINCES.includes(v);
}

/** Travel fee by อำเภอ/เขต of the EVENT VENUE (mirror of apps/api packages.config.ts DEFAULT_TRAVEL_FEES; overwritten by applyPricing). */
export const TRAVEL_FEES: Record<string, number> = {
  วังจันทร์: 1000, เขาชะเมา: 2000, แกลง: 1000,
  เกาะจันทร์: 1000, บ่อทอง: 1500, หนองใหญ่: 1000,
  บางน้ำเปรี้ยว: 1000, พนมสารคาม: 2000, สนามชัยเขต: 2000, แปลงยาว: 1500, ท่าตะเกียบ: 2000, คลองเขื่อน: 1500,
  ทุ่งครุ: 500, ตลิ่งชัน: 500, ธนบุรี: 500, ทวีวัฒนา: 500, บางพลัด: 500, บางกอกน้อย: 500, บางบอน: 500,
  หนองแขม: 500, บางแค: 500, ภาษีเจริญ: 500, บางกอกใหญ่: 500, บางขุนเทียน: 500, ราษฎร์บูรณะ: 500, จอมทอง: 500,
};

/** 'เขตทุ่งครุ' / 'อ.แกลง' → 'ทุ่งครุ' / 'แกลง' */
export function normalizeAmphoe(s: string | null | undefined): string {
  return String(s || '').trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, '').trim();
}

export function travelFeeFor(amphoe: string | null | undefined): number {
  const v = TRAVEL_FEES[normalizeAmphoe(amphoe)];
  return typeof v === 'number' && v > 0 ? v : 0;
}

/** 'แกลง' + 'ระยอง' → 'อ.แกลง'; Bangkok rows already carry 'เขต…' */
export function travelAreaLabel(amphoe: string | null | undefined, province?: string | null): string {
  const raw = String(amphoe || '').trim();
  if (!raw) return '';
  if (province === 'กรุงเทพฯ' || raw.startsWith('เขต')) return raw.startsWith('เขต') ? raw : `เขต${raw}`;
  return `อ.${normalizeAmphoe(raw)}`;
}

export interface PricingPayload {
  pricing: {
    packages: Record<
      string,
      { base?: number | null; buffet?: TierConfig | null; table?: TierConfig | null; perHead?: Record<string, number> | null; perTable?: number | null }
    >;
    addons: Record<string, number>;
    selfTransportDiscount: number;
    fiveMonksDiscount: number;
  };
  depositRule?: { tiers: { upTo: number; amount: number }[]; abovePercent: number };
  travelFees?: Record<string, number>;
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
    if (pkg.kind === 'catering') {
      if (pkg.unit === 'table' && typeof s.perTable === 'number' && s.perTable > 0) pkg.perTable = s.perTable;
      if (pkg.unit === 'guest' && s.perHead && pkg.perHead) {
        for (const n of DISH_COUNTS) {
          const v = s.perHead[String(n)];
          if (typeof v === 'number' && v > 0) pkg.perHead[n] = v;
        }
      }
    } else if (pkg.kind === 'ceremony') {
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
  if (payload.travelFees && typeof payload.travelFees === 'object') {
    for (const k of Object.keys(TRAVEL_FEES)) delete TRAVEL_FEES[k];
    for (const [k, v] of Object.entries(payload.travelFees)) {
      const key = normalizeAmphoe(k);
      if (key && typeof v === 'number' && v >= 0) TRAVEL_FEES[key] = v;
    }
  }
}

/** package by id, falling back to PRIME พิธีสงฆ์ (form paths always need *a* package) */
export function pkgById(id: string): Pkg {
  return PKGS.find((p) => p.id === id) || PKGS[1];
}

/** package by id without the fallback — for links/presets where an unknown id must not become PRIME */
export function findPkg(id: string | null | undefined): Pkg | undefined {
  return id ? PKGS.find((p) => p.id === id) : undefined;
}

/** true when the package already covers this add-on (e.g. PRIME includes the drape) */
export function addonIncluded(pkgId: string, addonId: string): boolean {
  return (pkgById(pkgId).includedAddons || []).includes(addonId);
}

/** add-ons the package can be sold with (its line's add-ons, minus the included ones) */
export function applicableAddons(pkgId: string): Addon[] {
  const pkg = pkgById(pkgId);
  return ADDONS.filter((a) => a.lines.includes(pkg.line) && !(pkg.includedAddons || []).includes(a.id));
}

/** quantity an add-on is charged for (drinks are per table) */
export function addonQuantity(a: Addon, f: { tables: number }): number {
  return a.perUnit === 'table' ? Math.max(0, f.tables) : 1;
}

/** keep only add-ons the package can be sold with — used when the package changes or a preset arrives */
export function stripIncludedAddons(pkgId: string, addons: string[]): string[] {
  const ok = new Set(applicableAddons(pkgId).map((a) => a.id));
  return addons.filter((a) => ok.has(a));
}

/** the headline price of a package card ("เริ่มต้น" for tiered, per unit for catering) */
export function startPrice(p: Pkg): number {
  if (p.kind === 'catering') return p.unit === 'table' ? p.perTable ?? 0 : p.perHead?.[5] ?? 0;
  if (p.kind === 'full') return p.buffet!.tiers[0][1];
  return p.base!;
}

/** prefix + suffix around startPrice: ["เริ่มต้น", "บาท"] / ["", "บาท/ท่าน"] / ["", "บาท/โต๊ะ"] */
export function priceUnitLabel(p: Pkg): { prefix: string; suffix: string } {
  if (p.kind === 'catering') return { prefix: p.unit === 'guest' ? 'เริ่มต้น' : '', suffix: p.unit === 'table' ? 'บาท/โต๊ะ' : 'บาท/ท่าน' };
  return { prefix: p.kind === 'full' ? 'เริ่มต้น' : '', suffix: 'บาท' };
}

// Comparison rows for the package-pick step: price rows + every feature
// whose value differs between packages of the same kind.
export function compareRows(kind: PkgKind): { label: string; values: string[] }[] {
  const pkgs = PKGS.filter((p) => p.kind === kind);
  const rows: { label: string; values: string[] }[] = [];

  if (kind === 'catering') {
    rows.push({ label: 'ราคาเริ่มต้น', values: pkgs.map((p) => `${baht(startPrice(p))}.- /${p.unit === 'table' ? 'โต๊ะ' : 'ท่าน'}`) });
  } else if (kind === 'full') {
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
