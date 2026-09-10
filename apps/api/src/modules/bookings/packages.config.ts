// Package pricing for the public booking page (/booking).
// Must stay in sync with booking/src/data/packages.ts (frontend copy).

export type FoodMode = 'buffet' | 'table';

/**
 * kind drives pricing: ceremony = flat monk package, full = monk package + guest food tiers,
 * catering = food only (บุฟเฟต์อาหารไทย per guest × dish count, โต๊ะจีน per table), no monks.
 * line drives grouping in every UI (tabs on /booking, optgroups in the link modals).
 */
export type PackageKind = 'ceremony' | 'full' | 'catering';
export type PackageLine = 'merit' | 'buffet' | 'chinese';
export type DishCount = 5 | 6 | 7 | 8;
export const DISH_COUNTS: DishCount[] = [5, 6, 7, 8];
export const DEFAULT_DISH_COUNT: DishCount = 6;

export interface TierConfig {
  tiers: [number, number][]; // [minCount, price]
  extra: number; // price per extra unit above tier base
}

export interface BookingPackage {
  id: string;
  name: string;
  kind: PackageKind;
  line: PackageLine;
  base?: number; // ceremony packages: flat price
  buffet?: TierConfig;
  table?: TierConfig;
  /** add-on ids the package already covers — never charged, never on the quotation (booking/src/data/packages.ts mirrors this) */
  includedAddons?: string[];
  /** catering: what the price is per ('guest' = บุฟเฟต์, 'table' = โต๊ะจีน) and the minimum order */
  unit?: 'guest' | 'table';
  minCount?: number;
  /** catering buffet: price per guest by number of savoury dishes */
  perHead?: Record<DishCount, number>;
  /** catering Chinese table: price per table (8 seats) */
  perTable?: number;
  /** catering Chinese table: courses served (display) */
  courses?: number;
  /**
   * Stand-alone โต๊ะจีน only (NOT the Chinese-table food inside merit packages): orders below
   * `below` tables pay `fee` baht per table on top (owner rule 2026-09-06: min 10, under 15 → +200/โต๊ะ).
   */
  smallOrder?: { below: number; fee: number };
}

/** โต๊ะจีนอย่างเดียว: fewer than 15 tables → +200 บาท/โต๊ะ ค่าบริการจัดเลี้ยง (mirror: booking/src/data/packages.ts) */
export const CHINESE_SMALL_ORDER = { below: 15, fee: 200 } as const;

export const BOOKING_PACKAGES: BookingPackage[] = [
  { id: 'ceremony', name: 'พิธีสงฆ์ แพ็กเกจงานบุญ (ไม่มีแขก)', kind: 'ceremony', line: 'merit', base: 14990 },
  { id: 'ceremony-prime', name: 'PRIME พิธีสงฆ์ครบวงจร (ไม่มีแขก)', kind: 'ceremony', line: 'merit', base: 19990, includedAddons: ['drape'] },
  {
    id: 'full',
    name: 'ครบวงจร',
    kind: 'full',
    line: 'merit',
    buffet: { tiers: [[20, 19490], [30, 21990], [40, 24490], [50, 27990]], extra: 250 },
    table: { tiers: [[8, 33890], [10, 38490], [20, 63990]], extra: 2300 },
  },
  {
    id: 'full-plus',
    name: 'ครบวงจร พลัส',
    kind: 'full',
    line: 'merit',
    buffet: { tiers: [[20, 21990], [30, 25490], [40, 28490], [50, 34490]], extra: 350 },
    table: { tiers: [[8, 37790], [10, 42990], [20, 71490]], extra: 2600 },
  },
  {
    id: 'prime',
    name: 'PRIME ครบวงจร',
    kind: 'full',
    line: 'merit',
    includedAddons: ['drape'],
    buffet: { tiers: [[20, 25990], [30, 29490], [40, 32990], [50, 38990]], extra: 350 },
    table: { tiers: [[8, 42290], [10, 47490], [20, 75990]], extra: 2600 },
  },
  // ── IRIS Catering (poster prices 2026-09, excl. VAT; drinks not included in โต๊ะจีน) ──
  { id: 'buffet-standard', name: 'บุฟเฟต์อาหารไทย แพคเกจเริ่มต้น', kind: 'catering', line: 'buffet', unit: 'guest', minCount: 40, perHead: { 5: 250, 6: 280, 7: 310, 8: 340 } },
  { id: 'buffet-premium', name: 'บุฟเฟต์อาหารไทย แพคเกจพรีเมียม', kind: 'catering', line: 'buffet', unit: 'guest', minCount: 40, perHead: { 5: 350, 6: 385, 7: 420, 8: 455 } },
  { id: 'chinese-2000', name: 'โต๊ะจีน 2,000 (8 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, perTable: 2000, courses: 8, smallOrder: CHINESE_SMALL_ORDER },
  { id: 'chinese-2300', name: 'โต๊ะจีน 2,300 (9 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, perTable: 2300, courses: 9, smallOrder: CHINESE_SMALL_ORDER },
  { id: 'chinese-2600', name: 'โต๊ะจีน 2,600 (10 อย่าง)', kind: 'catering', line: 'chinese', unit: 'table', minCount: 10, perTable: 2600, courses: 10, smallOrder: CHINESE_SMALL_ORDER },
];

export interface BookingAddon {
  id: string;
  label: string;
  price: number;
  /** 'table' = price × tables (เครื่องดื่มโต๊ะจีน); absent = flat, quantity 1 */
  perUnit?: 'table';
  /** which package lines offer this add-on */
  lines: PackageLine[];
}

export const BOOKING_ADDONS: BookingAddon[] = [
  { id: 'stage', label: 'เวทีพระ', price: 5000, lines: ['merit'] },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', price: 3000, lines: ['merit'] },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', price: 1000, lines: ['merit'] },
  { id: 'almsround', label: 'ชุดตักบาตร', price: 500, lines: ['merit'] },
  { id: 'drinks', label: 'เครื่องดื่ม', price: 250, perUnit: 'table', lines: ['chinese'] },
];

export function packageById(id: string): BookingPackage | undefined {
  return BOOKING_PACKAGES.find((p) => p.id === id);
}

/** true when the package already covers the add-on (PRIME includes the drape) */
export function addonIncludedIn(packageId: string, addonId: string): boolean {
  return !!packageById(packageId)?.includedAddons?.includes(addonId);
}

/** add-ons a package can be sold with: offered for its line and not already included */
export function applicableAddons(packageId: string): BookingAddon[] {
  const pkg = packageById(packageId);
  if (!pkg) return [];
  return BOOKING_ADDONS.filter((a) => a.lines.includes(pkg.line) && !pkg.includedAddons?.includes(a.id));
}

/** how many units of an add-on a booking buys (drinks are per table) */
export function addonQuantity(a: BookingAddon, input: { tables: number }): number {
  return a.perUnit === 'table' ? Math.max(0, Math.round(input.tables || 0)) : 1;
}

/** keep only add-ons the package can actually be sold with (drops included ones and other lines') */
export function normalizeAddons(packageId: string, addons: string[] | null | undefined): string[] {
  const ok = new Set(applicableAddons(packageId).map((a) => a.id));
  return Array.from(new Set((addons || []).filter((a) => ok.has(a))));
}

/** @deprecated use normalizeAddons — kept for callers that only need the included-strip */
export const stripIncludedAddons = normalizeAddons;

/** Everything the pricing / quotation functions need about a booking (DTO, preset or stored row). */
export interface BookingCalcInput {
  packageId: string;
  foodMode: string;
  guests: number;
  tables: number;
  monks: number;
  /** catering buffet: savoury dishes 5–8; null for everything else */
  dishCount?: number | null;
  /** customer invites the monks themselves (no discount on its own — see MONK_TRANSPORT_OPTIONS) */
  selfInvite?: boolean;
  selfTransport: boolean;
  addons: string[];
  /** travel fee of the event venue's district (already resolved) — becomes its own line */
  travelFee?: number;
  travelArea?: string;
}

/**
 * Make a client-supplied booking consistent with its package before pricing or saving:
 * catering has no monks/discounts, its foodMode follows the unit, dishCount only exists for buffet.
 * Add-ons are always reduced to the ones the package can be sold with.
 */
export function normalizeBookingInput<T extends BookingCalcInput>(input: T): T {
  const pkg = packageById(input.packageId);
  const out: T = { ...input, addons: normalizeAddons(input.packageId, input.addons) };
  if (pkg?.kind === 'catering') {
    out.foodMode = pkg.unit === 'table' ? 'table' : 'buffet';
    out.monks = 0;
    out.selfTransport = false;
    out.selfInvite = false;
    out.dishCount = pkg.unit === 'guest' ? Math.min(8, Math.max(5, Math.round(Number(input.dishCount) || DEFAULT_DISH_COUNT))) : null;
  } else {
    out.dishCount = null;
    // doing both yourself implies inviting the monks yourself (old rows only carry selfTransport)
    out.selfInvite = !!input.selfInvite || !!input.selfTransport;
  }
  return out;
}

/** Validation the DTOs cannot express (depends on the package): minimum order, monks required for merit packages. */
export function bookingInputError(input: BookingCalcInput): string | null {
  const pkg = packageById(input.packageId);
  if (!pkg) return 'ไม่พบแพ็กเกจที่เลือก';
  if (pkg.kind === 'catering') {
    const count = pkg.unit === 'table' ? input.tables : input.guests;
    const min = pkg.minCount ?? 1;
    if (count < min) {
      return pkg.unit === 'table' ? `โต๊ะจีนรับขั้นต่ำ ${min} โต๊ะ` : `บุฟเฟต์อาหารไทยรับขั้นต่ำ ${min} ท่าน`;
    }
    return null;
  }
  if (!input.monks || input.monks < 1) return 'กรุณาระบุจำนวนพระ';
  return null;
}

/** catering unit price (per guest at the chosen dish count, or per table) from live pricing, else package defaults */
export function cateringUnitPrice(pkg: BookingPackage, pp: PackagePricing | undefined, dishCount?: number | null): number {
  if (pkg.unit === 'table') return pp?.perTable ?? pkg.perTable ?? 0;
  const d = String(Math.min(8, Math.max(5, Math.round(Number(dishCount) || DEFAULT_DISH_COUNT)))) as `${DishCount}`;
  return pp?.perHead?.[d] ?? pkg.perHead?.[Number(d) as DishCount] ?? 0;
}

/** ค่าบริการจัดเลี้ยงเพิ่มเติม for a small stand-alone โต๊ะจีน order (0 when the rule does not apply). */
export function smallOrderFee(pkg: BookingPackage, input: { tables: number }): { fee: number; count: number; perUnit: number; below: number } {
  const rule = pkg.kind === 'catering' && pkg.unit === 'table' ? pkg.smallOrder : undefined;
  if (!rule || input.tables >= rule.below || input.tables <= 0) return { fee: 0, count: 0, perUnit: rule?.fee ?? 0, below: rule?.below ?? 0 };
  return { fee: rule.fee * input.tables, count: input.tables, perUnit: rule.fee, below: rule.below };
}
export const smallOrderLabel = (below: number) => `ค่าบริการจัดเลี้ยงเพิ่มเติม (จัดต่ำกว่า ${below} โต๊ะ)`;

/** e.g. "บุฟเฟต์อาหารไทย แพคเกจพรีเมียม 7 อย่าง × 50 ท่าน (420 บาท/ท่าน)" / "โต๊ะจีน 2,300 (9 อย่าง) × 12 โต๊ะ" */
export function cateringLineLabel(pkg: BookingPackage, input: BookingCalcInput, unitPrice: number): string {
  if (pkg.unit === 'table') return `${pkg.name} × ${input.tables} โต๊ะ`;
  return `${pkg.name} ${input.dishCount ?? DEFAULT_DISH_COUNT} อย่าง × ${input.guests} ท่าน (${unitPrice.toLocaleString('th-TH')} บาท/ท่าน)`;
}

export const SELF_TRANSPORT_DISCOUNT = 1000;

// ── Who invites the monks and who drives them ─────────────────────────
// Two independent facts (selfInvite / selfTransport) with one policy: the 1,000 discount
// needs BOTH done by the customer. `selfTransport` alone implies selfInvite, so rows saved
// before selfInvite existed still read correctly.
export type MonkArrangement = 'team' | 'invite' | 'self';

export const MONK_TRANSPORT_OPTIONS: { id: MonkArrangement; label: string; sub: string; selfInvite: boolean; selfTransport: boolean }[] = [
  { id: 'team', label: 'ทีมงานนิมนต์และรับ-ส่งพระให้', sub: 'รวมในแพ็กเกจแล้ว', selfInvite: false, selfTransport: false },
  { id: 'invite', label: 'นิมนต์พระเอง ทีมงานรับ-ส่งพระให้', sub: 'ระยะทางวัด-สถานที่จัดงาน ไป-กลับ ไม่เกิน 20 กม.', selfInvite: true, selfTransport: false },
  { id: 'self', label: 'นิมนต์และรับ-ส่งพระเอง', sub: 'ต้องดำเนินการเองทั้งสองอย่าง', selfInvite: true, selfTransport: true },
];

export function monkArrangementOf(b: { selfInvite?: boolean | null; selfTransport?: boolean | null }): MonkArrangement {
  if (b.selfTransport) return 'self';
  return b.selfInvite ? 'invite' : 'team';
}

/** Label for a booking's monk arrangement ('team' → null: it is what the package already includes). */
export function monkArrangementLabel(b: { selfInvite?: boolean | null; selfTransport?: boolean | null }, discount = SELF_TRANSPORT_DISCOUNT): string | null {
  const id = monkArrangementOf(b);
  if (id === 'team') return null;
  if (id === 'invite') return 'นิมนต์พระเอง (ทีมงานรับ-ส่งพระให้)';
  return `นิมนต์รับ-ส่งพระเอง (ลด ${discount.toLocaleString('th-TH')})`;
}

// ── Travel fee by อำเภอ of the EVENT VENUE (not the billing address) ─────
// Editable in the dashboard (จองงานบุญ → ตั้งค่า → ค่าเดินทาง), stored in SystemSetting
// TRAVEL_FEES_SETTING_KEY, served to the /booking page in GET /bookings/pricing (travelFees)
// and added as its own line on the quotation. Keys are district names without เขต/อ.
/** Provinces we serve — the EVENT VENUE must be in one of these (mirror of booking/src/data/packages.ts). */
export const SERVICE_PROVINCES = ['ชลบุรี', 'ระยอง', 'สมุทรปราการ', 'ฉะเชิงเทรา', 'กรุงเทพฯ'];
export const SERVICE_AREA_TEXT = 'ชลบุรี ระยอง สมุทรปราการ ฉะเชิงเทรา และกรุงเทพมหานคร';
export function isServiceProvince(p: string | null | undefined): boolean {
  const v = String(p || '').trim().replace(/^จ\./, '').replace(/^กรุงเทพมหานคร$/, 'กรุงเทพฯ');
  return SERVICE_PROVINCES.includes(v);
}

export const TRAVEL_FEES_SETTING_KEY = 'booking_travel_fees';
export interface TravelFeeConfig { fees: Record<string, number> }
export const DEFAULT_TRAVEL_FEES: TravelFeeConfig = {
  fees: {
    วังจันทร์: 1000, เขาชะเมา: 2000, แกลง: 1000,
    เกาะจันทร์: 1000, บ่อทอง: 1500, หนองใหญ่: 1000,
    บางน้ำเปรี้ยว: 1000, พนมสารคาม: 2000, สนามชัยเขต: 2000, แปลงยาว: 1500, ท่าตะเกียบ: 2000, คลองเขื่อน: 1500,
    ทุ่งครุ: 500, ตลิ่งชัน: 500, ธนบุรี: 500, ทวีวัฒนา: 500, บางพลัด: 500, บางกอกน้อย: 500, บางบอน: 500,
    หนองแขม: 500, บางแค: 500, ภาษีเจริญ: 500, บางกอกใหญ่: 500, บางขุนเทียน: 500, ราษฎร์บูรณะ: 500, จอมทอง: 500,
  },
};
/** Bangkok districts are เขต, everything else อ. (used when the province is not known, e.g. link presets). */
export const BKK_DISTRICTS = new Set(['ทุ่งครุ', 'ตลิ่งชัน', 'ธนบุรี', 'ทวีวัฒนา', 'บางพลัด', 'บางกอกน้อย', 'บางบอน', 'หนองแขม', 'บางแค', 'ภาษีเจริญ', 'บางกอกใหญ่', 'บางขุนเทียน', 'ราษฎร์บูรณะ', 'จอมทอง', 'คลองสาน', 'บางรัก', 'สาทร', 'ปทุมวัน', 'พระนคร', 'ดุสิต', 'บางซื่อ', 'จตุจักร', 'ลาดพร้าว', 'ห้วยขวาง', 'ดินแดง', 'ราชเทวี', 'พญาไท', 'วัฒนา', 'คลองเตย', 'พระโขนง', 'บางนา', 'สวนหลวง', 'ประเวศ', 'บางกะปิ', 'บึงกุ่ม', 'สะพานสูง', 'มีนบุรี', 'คลองสามวา', 'หนองจอก', 'ลาดกระบัง', 'คันนายาว', 'สายไหม', 'บางเขน', 'ดอนเมือง', 'หลักสี่', 'วังทองหลาง', 'ยานนาวา', 'บางคอแหลม', 'สัมพันธวงศ์', 'ป้อมปราบศัตรูพ่าย']);

/** 'เขตทุ่งครุ' / 'อ.แกลง' / ' แกลง ' → 'ทุ่งครุ' / 'แกลง' */
export function normalizeAmphoe(s: string | null | undefined): string {
  return String(s || '').trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, '').trim();
}

export function travelFeeFor(amphoe: string | null | undefined, cfg: TravelFeeConfig = DEFAULT_TRAVEL_FEES): number {
  const key = normalizeAmphoe(amphoe);
  if (!key) return 0;
  const v = cfg.fees[key];
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

/** 'แกลง' + 'ระยอง' → 'อ.แกลง จ.ระยอง'; Bangkok → 'เขตทุ่งครุ กรุงเทพฯ' */
export function travelAreaLabel(amphoe: string | null | undefined, province?: string | null): string {
  const a = normalizeAmphoe(amphoe);
  if (!a) return '';
  const bkk = province === 'กรุงเทพฯ' || (!province && BKK_DISTRICTS.has(a));
  const head = bkk ? `เขต${a}` : `อ.${a}`;
  const prov = province ? (bkk ? province : `จ.${province}`) : bkk ? 'กรุงเทพฯ' : '';
  return [head, prov].filter(Boolean).join(' ');
}

/** Validate + normalise a config coming from the dashboard; null keeps the defaults. */
export function mergeTravelFees(saved: Partial<TravelFeeConfig> | null | undefined): TravelFeeConfig {
  if (!saved || typeof saved !== 'object' || !saved.fees || typeof saved.fees !== 'object') return { fees: { ...DEFAULT_TRAVEL_FEES.fees } };
  const fees: Record<string, number> = {};
  for (const [k, v] of Object.entries(saved.fees)) {
    const key = normalizeAmphoe(k);
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    if (key && Number.isFinite(n) && n >= 0) fees[key] = Math.round(n);
  }
  return { fees };
}
// ── จำนวนพระ ──────────────────────────────────────────────────────────
// Order here is the order the booking page and the admin picker show: 9 is the default,
// 5 the runner-up. Discounts apply to every merit package (new-package-2025 sheet + owner
// rule 2026-09-10 adding 7 and 3 monks).
export interface MonkOption {
  monks: number;
  discount: number;
  /** badge under the card (only the default option has one) */
  note?: string;
}

export const MONK_OPTIONS: MonkOption[] = [
  { monks: 9, discount: 0, note: 'นิยมที่สุด' },
  { monks: 5, discount: 1500 },
  { monks: 7, discount: 750 },
  { monks: 3, discount: 1500 },
];

export const DEFAULT_MONK_COUNT = 9;
export const DEFAULT_MONK_DISCOUNTS: Record<string, number> = Object.fromEntries(MONK_OPTIONS.map((o) => [String(o.monks), o.discount]));

/** Discount for a monk count; unknown counts (sales typed something else) simply get none. */
export function monkDiscountFor(monks: number, pricing: PricingConfig): number {
  const key = String(monks);
  const v = pricing.monkDiscounts?.[key];
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : DEFAULT_MONK_DISCOUNTS[key] ?? 0;
}

// ── Editable pricing ──────────────────────────────────────────────────
// The numbers above are only DEFAULTS. The live prices are edited in the
// dashboard (จองงานบุญ → ตั้งค่าใบเสนอราคา → ราคา), stored in SystemSetting
// (PRICING_SETTING_KEY) and served to the public /booking page by
// GET /bookings/pricing, so there is a single source of truth.
export interface PackagePricing {
  base?: number | null; // ceremony packages
  buffet?: TierConfig | null; // full packages
  table?: TierConfig | null;
  perHead?: Record<string, number> | null; // catering buffet: dish count → price per guest
  perTable?: number | null; // catering Chinese table
}

export interface PricingConfig {
  packages: Record<string, PackagePricing>;
  addons: Record<string, number>;
  selfTransportDiscount: number;
  /** monk count (as a string key) → discount off the 9-monk price */
  monkDiscounts: Record<string, number>;
}

export const PRICING_SETTING_KEY = 'booking_pricing';

export const DEFAULT_PRICING: PricingConfig = {
  packages: Object.fromEntries(
    BOOKING_PACKAGES.map((p) => [
      p.id,
      { base: p.base ?? null, buffet: p.buffet ?? null, table: p.table ?? null, perHead: p.perHead ?? null, perTable: p.perTable ?? null },
    ]),
  ),
  addons: Object.fromEntries(BOOKING_ADDONS.map((a) => [a.id, a.price])),
  selfTransportDiscount: SELF_TRANSPORT_DISCOUNT,
  monkDiscounts: { ...DEFAULT_MONK_DISCOUNTS },
};

/** Merge a saved pricing config over the defaults, dropping anything malformed. */
export function mergePricing(saved: Partial<PricingConfig> | null | undefined): PricingConfig {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const tierCfg = (v: unknown, fallback: TierConfig | null | undefined): TierConfig | null => {
    if (v === undefined) return fallback ?? null;
    if (!v || typeof v !== 'object') return null;
    const raw = v as any;
    const tiers = (Array.isArray(raw.tiers) ? raw.tiers : [])
      .map((t: any) => [num(t?.[0], NaN), num(t?.[1], NaN)] as [number, number])
      .filter((t: [number, number]) => Number.isFinite(t[0]) && Number.isFinite(t[1]) && t[0] > 0)
      .sort((a: [number, number], b: [number, number]) => a[0] - b[0]);
    if (!tiers.length) return fallback ?? null;
    return { tiers, extra: num(raw.extra, fallback?.extra ?? 0) };
  };
  const packages: Record<string, PackagePricing> = {};
  for (const p of BOOKING_PACKAGES) {
    const d = DEFAULT_PRICING.packages[p.id];
    const s = (saved?.packages?.[p.id] || {}) as Partial<PackagePricing>;
    if (p.kind === 'catering') {
      const perHead = d.perHead
        ? Object.fromEntries(DISH_COUNTS.map((n) => [String(n), num((s.perHead as any)?.[n], d.perHead?.[String(n)] ?? 0)]))
        : null;
      packages[p.id] = { base: null, buffet: null, table: null, perHead, perTable: d.perTable != null ? num(s.perTable, d.perTable) : null };
    } else {
      packages[p.id] =
        p.kind === 'ceremony'
          ? { base: num(s.base, d.base ?? 0), buffet: null, table: null }
          : { base: null, buffet: tierCfg(s.buffet, d.buffet), table: tierCfg(s.table, d.table) };
    }
  }
  const addons: Record<string, number> = {};
  for (const a of BOOKING_ADDONS) addons[a.id] = num(saved?.addons?.[a.id], DEFAULT_PRICING.addons[a.id]);
  return {
    packages,
    addons,
    selfTransportDiscount: num(saved?.selfTransportDiscount, SELF_TRANSPORT_DISCOUNT),
    // configs saved before the table existed only carry the 5-monk discount
    monkDiscounts: Object.fromEntries(
      MONK_OPTIONS.map((o) => [
        String(o.monks),
        num(saved?.monkDiscounts?.[String(o.monks)] ?? (o.monks === 5 ? (saved as any)?.fiveMonksDiscount : undefined), o.discount),
      ]),
    ),
  };
}

// ── Pricing derived from the flowaccount-app catalog ──────────────────
// flowaccount-app is the single source of prices. The CRM only knows which
// product each package/tier maps to (FaRecipe) and derives the booking-page
// tiers by pricing those products exactly the way flowaccount-app does.
export interface FaCatalogProduct {
  code: string | null;
  name: string;
  kind: 'SIMPLE' | 'PACKAGE' | string;
  unitPrice: number;
  priceFormula?: string | null;
  priceTable?: { when: Record<string, number | string>; price: number }[];
  variables?: { key: string; default?: number | string; formula?: string | null }[];
  components?: { code: string; title: string; optional?: boolean; price?: number; pricePer?: string | null }[];
}

export type FaCatalog = Record<string, FaCatalogProduct>;

/** Minimal arithmetic evaluator mirroring flowaccount-app's expression.ts (numbers, + - * / %, parens, ceil/floor/round/min/max/abs). */
export function evalFormula(expr: string, vars: Record<string, number>): number {
  const src = String(expr || '').trim();
  if (!src) throw new Error('empty formula');
  let i = 0;
  const peek = () => src[i];
  const skip = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const fns: Record<string, (...a: number[]) => number> = {
    ceil: Math.ceil, floor: Math.floor, round: Math.round, abs: Math.abs,
    min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
  };
  const primary = (): number => {
    skip();
    const ch = peek();
    if (ch === '(') { i++; const v = expr3(); skip(); if (peek() !== ')') throw new Error('paren'); i++; return v; }
    if (ch === '-') { i++; return -primary(); }
    if (ch === '+') { i++; return primary(); }
    const num = /^\d*\.?\d+/.exec(src.slice(i));
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      i += id[0].length;
      skip();
      if (peek() === '(') {
        i++;
        const args: number[] = [];
        skip();
        if (peek() !== ')') { args.push(expr3()); skip(); while (peek() === ',') { i++; args.push(expr3()); skip(); } }
        if (peek() !== ')') throw new Error('paren');
        i++;
        const fn = fns[id[0]];
        if (!fn) throw new Error(`unknown function ${id[0]}`);
        return fn(...args);
      }
      if (!(id[0] in vars)) throw new Error(`unknown variable ${id[0]}`);
      return vars[id[0]];
    }
    throw new Error('syntax');
  };
  const expr2 = (): number => {
    let v = primary();
    for (;;) {
      skip();
      const op = peek();
      if (op === '*' || op === '/' || op === '%') { i++; const r = primary(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; } else return v;
    }
  };
  const sum = (): number => {
    let v = expr2();
    for (;;) {
      skip();
      const op = peek();
      if (op === '+' || op === '-') { i++; const r = expr2(); v = op === '+' ? v + r : v - r; } else return v;
    }
  };
  // comparisons (lowest precedence) yield 1 / 0 — mirrors flowaccount-app's expression.ts
  const expr3 = (): number => {
    let v = sum();
    for (;;) {
      skip();
      const two = src.slice(i, i + 2);
      const op = ['<=', '>=', '==', '!='].includes(two) ? two : peek() === '<' || peek() === '>' ? peek() : null;
      if (!op) return v;
      i += op.length;
      const r = sum();
      const ok = op === '<' ? v < r : op === '<=' ? v <= r : op === '>' ? v > r : op === '>=' ? v >= r : op === '==' ? v === r : v !== r;
      v = ok ? 1 : 0;
    }
  };
  const v = expr3();
  skip();
  if (i < src.length) throw new Error('trailing');
  if (!Number.isFinite(v)) throw new Error('NaN');
  return v;
}

/** Resolve a product's variables (defaults + derived formulas) with the given inputs. */
function resolveVars(p: FaCatalogProduct, input: Record<string, number>): Record<string, number> {
  const vars: Record<string, number> = {};
  for (const v of p.variables || []) {
    if (v.formula) {
      try { vars[v.key] = evalFormula(v.formula, vars); } catch { /* leave unset */ }
    } else {
      const given = input[v.key];
      const n = given !== undefined ? Number(given) : Number(v.default);
      if (Number.isFinite(n)) vars[v.key] = n;
    }
  }
  return { ...vars, ...input };
}

/** Price a catalog product the way flowaccount-app does: priceFormula > priceTable match > unitPrice. */
export function productPrice(p: FaCatalogProduct | undefined, input: Record<string, number> = {}): number | null {
  if (!p) return null;
  if (p.kind !== 'PACKAGE') return Number(p.unitPrice) || 0;
  const vars = resolveVars(p, input);
  if (p.priceFormula && p.priceFormula.trim()) {
    try { return Math.round(Math.max(0, evalFormula(p.priceFormula, vars)) * 100) / 100; } catch { return null; }
  }
  const rows = (p.priceTable || [])
    .filter((r) => Object.entries(r.when || {}).every(([k, v]) => k in vars && String(vars[k]) === String(v)))
    .sort((a, b) => Object.keys(b.when).length - Object.keys(a.when).length);
  return rows.length ? Number(rows[0].price) : Number(p.unitPrice) || 0;
}

export interface DerivedPricing extends PricingConfig {
  /** product codes referenced by the recipes that are missing from the catalog */
  missingCodes: string[];
  /** which product priced each displayed tier, for the settings UI */
  usedCodes: Record<string, { buffet: Record<number, string>; table: Record<number, string>; base?: string; catering?: string }>;
}

/**
 * Derive the booking-page price tiers from the catalog:
 *   tier total = ceremony product (per monkTiers) at 9 monks + food (buffet formula at that guest count,
 *   or Chinese-table product × tables); extra per unit = food(count + 1) − food(count).
 * Discounts come from the products too (transport component price, 9-monk vs fewer-monk prices).
 */
export function derivePricing(config: FaRecipeConfig, catalog: FaCatalog): DerivedPricing {
  const missing = new Set<string>();
  const get = (code: string | null | undefined) => {
    if (!code) return undefined;
    const p = catalog[code];
    if (!p) missing.add(code);
    return p;
  };
  const packages: Record<string, PackagePricing> = {};
  const usedCodes: DerivedPricing['usedCodes'] = {};
  let transportDiscount: number | null = null;
  const derivedMonkDiscounts: Record<string, number> = {};

  for (const pkg of BOOKING_PACKAGES) {
    const r = config.packages[pkg.id];
    const d = DEFAULT_PRICING.packages[pkg.id];
    const used: DerivedPricing['usedCodes'][string] = { buffet: {}, table: {} };
    if (!r) { packages[pkg.id] = d; continue; }

    const monkProduct = (mode: 'buffet' | 'table' | 'any', count: number) => {
      const code = pickMonkCode(r, mode, count);
      return { code, product: get(code) };
    };
    // discounts: take them from the first package that defines them
    const main = get(r.monkCode);
    if (main) {
      const tc = (main.components || []).find((c) => c.code === r.transportCode);
      if (transportDiscount === null && tc && tc.price) transportDiscount = Number(tc.price);
      // one discount per offered monk count. productPrice matches the price table exactly, so a
      // product with no row for that count falls back to its unitPrice — only trust a value that
      // is genuinely cheaper than the 9-monk price, otherwise keep the sheet default.
      const p9 = productPrice(main, { monks: DEFAULT_MONK_COUNT });
      for (const o of MONK_OPTIONS) {
        const key = String(o.monks);
        if (o.monks === DEFAULT_MONK_COUNT || derivedMonkDiscounts[key] !== undefined) continue;
        const pn = productPrice(main, { monks: o.monks });
        if (p9 !== null && pn !== null && p9 > pn) derivedMonkDiscounts[key] = p9 - pn;
      }
    }

    if (pkg.kind === 'catering') {
      // Catering is priced by ONE product: buffet = a PACKAGE with `guests` (+ optional `dishes`) variables,
      // priced at the minimum order and divided back to a per-guest price; Chinese table = any product,
      // its price for 1 table. No product mapped → poster defaults.
      const cp = get(r.cateringCode);
      let perHead: Record<string, number> | null = d.perHead ?? null;
      let perTable: number | null = d.perTable ?? null;
      if (cp) {
        used.catering = r.cateringCode || undefined;
        if (pkg.unit === 'table') {
          perTable = productPrice(cp, { tables: 1 }) ?? perTable;
        } else if (cp.kind === 'PACKAGE') {
          const min = pkg.minCount || 1;
          const derived: Record<string, number> = {};
          for (const n of DISH_COUNTS) {
            const total = productPrice(cp, { guests: min, dishes: n });
            if (total !== null) derived[String(n)] = Math.round(total / min);
          }
          if (Object.keys(derived).length === DISH_COUNTS.length) perHead = derived;
        }
      }
      packages[pkg.id] = { base: null, buffet: null, table: null, perHead, perTable };
    } else if (pkg.kind === 'ceremony') {
      const { code, product } = monkProduct('any', 0);
      const price = productPrice(product, { monks: 9 });
      used.base = code;
      packages[pkg.id] = { base: price ?? d.base ?? 0, buffet: null, table: null };
    } else {
      const tiersFor = (mode: 'buffet' | 'table'): TierConfig | null => {
        const counts = r.displayTiers?.[mode] || (mode === 'buffet' ? [20, 30, 40, 50] : [8, 10, 20]);
        const foodAt = (count: number): number | null => {
          if (mode === 'buffet') {
            const bp = get(r.buffetCode);
            return bp ? productPrice(bp, { guests: count }) : null;
          }
          const tp = get(r.chineseTableCode);
          return tp ? (productPrice(tp) ?? 0) * count : null;
        };
        const tiers: [number, number][] = [];
        for (const count of counts) {
          const { code, product } = monkProduct(mode, count);
          const mp = productPrice(product, { monks: 9 });
          const fp = foodAt(count);
          if (mp === null || fp === null) continue;
          used[mode][count] = code;
          tiers.push([count, Math.round(mp + fp)]);
        }
        if (!tiers.length) return d[mode] ?? null;
        const last = counts[counts.length - 1];
        const f1 = foodAt(last);
        const f2 = foodAt(last + 1);
        const extra = f1 !== null && f2 !== null ? Math.round((f2 - f1) * 100) / 100 : d[mode]?.extra ?? 0;
        return { tiers, extra };
      };
      packages[pkg.id] = { base: null, buffet: tiersFor('buffet'), table: tiersFor('table') };
    }
    usedCodes[pkg.id] = used;
  }

  const addons: Record<string, number> = {};
  for (const a of BOOKING_ADDONS) {
    const p = get(config.addons[a.id]);
    addons[a.id] = p ? (productPrice(p) ?? a.price) : DEFAULT_PRICING.addons[a.id];
  }

  return {
    packages,
    addons,
    selfTransportDiscount: transportDiscount ?? SELF_TRANSPORT_DISCOUNT,
    monkDiscounts: Object.fromEntries(MONK_OPTIONS.map((o) => [String(o.monks), derivedMonkDiscounts[String(o.monks)] ?? o.discount])),
    missingCodes: [...missing].sort(),
    usedCodes,
  };
}

/** Price of a package tier for a count, using the given pricing. */
function tierTotalFor(cfg: TierConfig, count: number): { tierTotal: number; extra: number } {
  let tier = cfg.tiers[0];
  for (const t of cfg.tiers) if (count >= t[0]) tier = t;
  return { tierTotal: tier[1] + Math.max(0, count - tier[0]) * cfg.extra, extra: cfg.extra };
}

// ── FlowAccount-app quotation recipes ──────────────────────────────────
// How each booking package is assembled into quotation lines for
// POST /api/v1/quotations on flowaccount-app. Product codes must exist in
// that app's catalog (หน้า สินค้า/บริการ → รหัสสินค้า). Prices stay owned
// by this file: the ceremony line is priced as (tier total − food × count)
// so the document total always equals the booking's estimatedTotal.
// The mapping is plain data so it can be edited from the dashboard and stored
// in SystemSetting (key FA_RECIPES_SETTING_KEY). DEFAULT_FA_RECIPES is used
// until something is saved, and fills in any package/add-on missing from the
// saved config.
/**
 * Ceremony-line product per food mode and size. The ceremony portion of a tiered
 * package differs by tier (e.g. a big tent is included from 50 guests / 8 Chinese
 * tables, a bigger one from 20 tables), so the product — and its printed contents —
 * is picked by (mode, count): the row whose mode matches ('any' matches both) and
 * whose `from` is the largest value ≤ count. `from` = guests for buffet, tables for
 * Chinese tables. No matching row → `monkCode`.
 */
export interface MonkTier {
  mode: 'buffet' | 'table' | 'any';
  from: number;
  code: string;
  /** remark template code for quotations that use this tier (overrides the package's remarkCode) */
  remarkCode?: string | null;
}

export interface FaRecipe {
  /** ceremony line product code (fallback when no tier matches) */
  monkCode: string;
  monkTiers?: MonkTier[];
  /** guest / table counts the /booking page lists as price tiers (prices come from flowaccount-app) */
  displayTiers?: { buffet: number[]; table: number[] };
  /** legacy (pre-tier) fields, migrated into monkTiers by mergeFaRecipes */
  largeGuestsAbove?: number | null;
  monkCodeLarge?: string | null;
  /** component code of "นิมนต์รับ-ส่งพระ" inside that product (excluded when the customer handles it) */
  transportCode: string;
  /** buffet product (a package with a `guests` variable → tables/chairs lines) */
  buffetCode?: string | null;
  /** Chinese-table product (simple line, qty = tables) */
  chineseTableCode?: string | null;
  /** catering packages: the single product that prices the whole line (null = plain text line at the default price) */
  cateringCode?: string | null;
  /** VAT rate for the document: booking FAQ says packages with guest catering exclude 7% VAT */
  vatRate: 0 | 7;
  /** flowaccount-app remark template code used as the printed หมายเหตุ (null = FA's default template) */
  remarkCode?: string | null;
}

export interface FaRecipeConfig {
  packages: Record<string, FaRecipe>;
  /** add-on id → catalog product code (price is still sent from BOOKING_ADDONS) */
  addons: Record<string, string>;
  /**
   * add-on id → regular expression (as a string) matching the "ราคานี้ไม่รวม…" line of the
   * remark template that this add-on makes untrue. Empty = never drop a line for that add-on.
   * Editable in the dashboard (จองงานบุญ → ตั้งค่าใบเสนอราคา). See resolveRemarkText.
   */
  addonRemarkPatterns: Record<string, string>;
}

export const FA_RECIPES_SETTING_KEY = 'fa_booking_recipes';

export const DEFAULT_FA_RECIPES: FaRecipeConfig = {
  packages: {
    ceremony: { monkCode: 'CEREMONY', transportCode: 'item8', vatRate: 0 }, // list copied from MONK_FULL203040
    'ceremony-prime': { monkCode: 'CEREMONY_PRIME', transportCode: 'transport', vatRate: 0 },
    full: {
      monkCode: 'MONK_FULL203040',
      // sheet: buffet 20-40 → 14,490 · buffet 50+ and Chinese 8-10 tables → 15,490 (big tent) · 20 tables → 17,990
      monkTiers: [
        { mode: 'buffet', from: 0, code: 'MONK_FULL203040' },
        { mode: 'buffet', from: 50, code: 'MONK_FULL50' },
        { mode: 'table', from: 0, code: 'MONK_FULL50' },
        { mode: 'table', from: 20, code: 'MONK_FULL_T20' },
      ],
      displayTiers: { buffet: [20, 30, 40, 50], table: [8, 10, 20] },
      transportCode: 'item8',
      buffetCode: 'BUFFET_STANDARD_MONK',
      chineseTableCode: 'CHINESE_TABLE_MONK',
      vatRate: 7,
    },
    'full-plus': {
      monkCode: 'MONK_PLUS_2030',
      // sheet: buffet 20-30 → 14,990 · 40 → 14,490 · 50+ and Chinese 8-10 → 16,990 · 20 tables → 19,490
      monkTiers: [
        { mode: 'buffet', from: 0, code: 'MONK_PLUS_2030' },
        { mode: 'buffet', from: 40, code: 'MONK_PLUS_40' },
        { mode: 'buffet', from: 50, code: 'MONK_PLUS_50' },
        { mode: 'table', from: 0, code: 'MONK_PLUS_50' },
        { mode: 'table', from: 20, code: 'MONK_PLUS_T20' },
      ],
      displayTiers: { buffet: [20, 30, 40, 50], table: [8, 10, 20] },
      transportCode: 'item8', // the พลัส products copy the user-made MONG_PLUS2030 list (item1…item11)
      buffetCode: 'BUFFET_PRIME_MONK',
      chineseTableCode: 'CHINESE_TABLE_PRIME_MONK',
      vatRate: 7,
    },
    prime: {
      monkCode: 'MONK_PRIME_2040',
      // sheet: buffet 20-40 → 18,990 · 50+ and Chinese 8-10 → 21,490 · 20 tables → 23,990
      monkTiers: [
        { mode: 'buffet', from: 0, code: 'MONK_PRIME_2040' },
        { mode: 'buffet', from: 50, code: 'MONK_PRIME_50' },
        { mode: 'table', from: 0, code: 'MONK_PRIME_50' },
        { mode: 'table', from: 20, code: 'MONK_PRIME_T20' },
      ],
      displayTiers: { buffet: [20, 30, 40, 50], table: [8, 10, 20] },
      transportCode: 'transport',
      buffetCode: 'BUFFET_PRIME_MONK',
      chineseTableCode: 'CHINESE_TABLE_PRIME_MONK',
      vatRate: 7,
    },
    // Catering: no flowaccount products yet → plain-text lines at the poster prices until an admin maps cateringCode
    'buffet-standard': { monkCode: '', transportCode: '', cateringCode: null, vatRate: 7 },
    'buffet-premium': { monkCode: '', transportCode: '', cateringCode: null, vatRate: 7 },
    'chinese-2000': { monkCode: '', transportCode: '', cateringCode: null, vatRate: 7 },
    'chinese-2300': { monkCode: '', transportCode: '', cateringCode: null, vatRate: 7 },
    'chinese-2600': { monkCode: '', transportCode: '', cateringCode: null, vatRate: 7 },
  },
  addons: { stage: 'STAGE', tent: 'TENT512', drape: 'DRAPE', almsround: 'ALMS_SET' },
  // wording as it appears in the shop's remark templates — the tent line is spelled both
  // "เต็นท์" and "เต้นท์" across templates, so both are matched
  addonRemarkPatterns: {
    stage: 'เวที',
    tent: 'เต็นท์|เต้นท์',
    drape: 'โยงผ้า|ม่าน|ฉากหลัง',
    almsround: 'ชุดตักบาตร|ใส่บาตร',
    drinks: 'เครื่องดื่ม',
  },
};

/** A remark line is only dropped when it says the item is NOT included. */
const NOT_INCLUDED_RE = /ไม่รวม/;

/**
 * Remove the "ราคานี้ไม่รวม…" lines that the booking contradicts, so a document that sells
 * ชุดตักบาตร stops printing "ราคานี้ไม่รวม…ชุดตักบาตร".
 *
 * A line is dropped only when it BOTH says ไม่รวม and matches the pattern of an add-on the
 * customer actually gets — a positive line ("เพิ่มเต็นท์ ขาวทรงโดม …") is never touched.
 * `provided` must include the package's includedAddons, not just the ones ticked.
 */
export function resolveRemarkText(text: string, provided: string[], patterns: Record<string, string>): string {
  const raw = String(text || '');
  if (!raw.trim() || !provided.length) return raw;
  const regexes: RegExp[] = [];
  for (const id of new Set(provided)) {
    const src = String(patterns?.[id] || '').trim();
    if (!src) continue;
    try {
      regexes.push(new RegExp(src));
    } catch {
      /* a pattern typed in the settings UI that does not compile is ignored */
    }
  }
  if (!regexes.length) return raw;
  // keep the original line endings so the printed block stays byte-identical apart from the cuts
  const lines = raw.split(/\r?\n/);
  const kept = lines.filter((line) => !(NOT_INCLUDED_RE.test(line) && regexes.some((re) => re.test(line))));
  return kept.length === lines.length ? raw : kept.join('\n');
}

/** Merge a saved (possibly partial / older) config over the defaults and normalise codes. */
/** Product codes that were removed from the catalog → their replacement (keeps saved settings valid). */
const RETIRED_CODES: Record<string, string> = {
  MONK_PLUS: 'MONK_PLUS_2030',
  MONK_PRIME: 'MONK_PRIME_2040',
  MONG_PLUS2030: 'MONK_PLUS_2030',
  CHINESE_TABLE: 'CHINESE_TABLE_MONK',
  CHINESE_TABLE_PRIME: 'CHINESE_TABLE_PRIME_MONK',
};

export function mergeFaRecipes(saved: Partial<FaRecipeConfig> | null | undefined): FaRecipeConfig {
  const code = (v: unknown) => {
    const c = typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : null;
    return c && RETIRED_CODES[c] ? RETIRED_CODES[c] : c;
  };
  // A field that is absent from the saved config falls back to the default; an explicitly
  // empty string means "no product — send that line as plain text" and is kept as null.
  const optionalCode = (v: unknown, fallback: string | null | undefined) => (v === undefined ? fallback ?? null : code(v));
  const normaliseTiers = (raw: unknown): MonkTier[] =>
    (Array.isArray(raw) ? raw : [])
      .map((t: any) => ({
        mode: t?.mode === 'buffet' || t?.mode === 'table' ? t.mode : 'any',
        from: Math.max(0, Number(t?.from) || 0),
        code: code(t?.code) || '',
        remarkCode: typeof t?.remarkCode === 'string' && t.remarkCode.trim() ? t.remarkCode.trim().toUpperCase() : null,
      }))
      .filter((t) => t.code)
      .sort((a, b) => a.from - b.from);
  const packages: Record<string, FaRecipe> = {};
  for (const id of Object.keys(DEFAULT_FA_RECIPES.packages)) {
    const d = DEFAULT_FA_RECIPES.packages[id];
    const s = (saved?.packages?.[id] || {}) as Partial<FaRecipe>;
    let monkTiers: MonkTier[];
    if (s.monkTiers !== undefined) {
      monkTiers = normaliseTiers(s.monkTiers);
    } else if (s.largeGuestsAbove || s.monkCodeLarge) {
      // migrate a config saved before tiers existed
      const above = Number(s.largeGuestsAbove);
      const large = code(s.monkCodeLarge);
      monkTiers = large && Number.isFinite(above) && above > 0 ? [{ mode: 'buffet', from: above + 1, code: large }] : [];
    } else {
      monkTiers = normaliseTiers(d.monkTiers);
    }
    const counts = (raw: unknown, fallback: number[]) => {
      if (!Array.isArray(raw)) return fallback;
      const list = raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
      return list.length ? Array.from(new Set(list)).sort((a, b) => a - b) : fallback;
    };
    const displayTiers = d.displayTiers
      ? {
          buffet: counts(s.displayTiers?.buffet, d.displayTiers.buffet),
          table: counts(s.displayTiers?.table, d.displayTiers.table),
        }
      : undefined;
    packages[id] = {
      monkCode: code(s.monkCode) || d.monkCode,
      monkTiers,
      ...(displayTiers ? { displayTiers } : {}),
      transportCode: (typeof s.transportCode === 'string' && s.transportCode.trim()) || d.transportCode,
      buffetCode: optionalCode(s.buffetCode, d.buffetCode),
      chineseTableCode: optionalCode(s.chineseTableCode, d.chineseTableCode),
      cateringCode: optionalCode(s.cateringCode, d.cateringCode),
      vatRate: s.vatRate === 0 || s.vatRate === 7 ? s.vatRate : d.vatRate,
      remarkCode: typeof s.remarkCode === 'string' && s.remarkCode.trim() ? s.remarkCode.trim().toUpperCase() : null,
    };
  }
  const addons: Record<string, string> = {};
  const addonRemarkPatterns: Record<string, string> = {};
  for (const a of BOOKING_ADDONS) {
    addons[a.id] = optionalCode(saved?.addons?.[a.id], DEFAULT_FA_RECIPES.addons[a.id]) || '';
    const savedPattern = saved?.addonRemarkPatterns?.[a.id];
    const pattern = (savedPattern === undefined ? DEFAULT_FA_RECIPES.addonRemarkPatterns[a.id] : savedPattern) || '';
    try {
      if (pattern) new RegExp(pattern);
      addonRemarkPatterns[a.id] = String(pattern);
    } catch {
      addonRemarkPatterns[a.id] = '';
    }
  }
  return { packages, addons, addonRemarkPatterns };
}

export interface FaItem {
  productCode?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  variables?: Record<string, number | string>;
  exclude?: string[];
  detail?: string[];
  /**
   * Plain-text stand-in for a line that references a catalog product, used when that product is
   * missing from flowaccount-app (renamed/deleted, or not created yet). Only set where we know the
   * price ourselves — a package line has no safe fallback, so it must fail loudly instead.
   * Stripped before the item is sent (see bookings.service createQuotation).
   */
  fallback?: { description: string; unit: string; unitPrice: number };
}

/** Ceremony product for a food mode + size: matching mode (or 'any'), largest `from` ≤ count; else monkCode. */
export function pickMonkTier(recipe: FaRecipe, mode: 'buffet' | 'table' | 'any', count: number): MonkTier | null {
  let best: MonkTier | null = null;
  for (const t of recipe.monkTiers || []) {
    if (t.mode !== 'any' && mode !== 'any' && t.mode !== mode) continue;
    if (t.from > count) continue;
    if (!best || t.from >= best.from) best = t;
  }
  return best;
}

export function pickMonkCode(recipe: FaRecipe, mode: 'buffet' | 'table' | 'any', count: number): string {
  return pickMonkTier(recipe, mode, count)?.code || recipe.monkCode;
}

/** Remark template for a booking: the matched tier's remarkCode, else the package's. */
export function pickRemarkCode(recipe: FaRecipe, mode: 'buffet' | 'table' | 'any', count: number): string | null {
  return pickMonkTier(recipe, mode, count)?.remarkCode || recipe.remarkCode || null;
}

/** Build the quotation lines for a booking. Returns null when the package has no recipe. */
export function buildFaItems(
  input: BookingCalcInput,
  config: FaRecipeConfig = DEFAULT_FA_RECIPES,
  pricing: PricingConfig = DEFAULT_PRICING,
): { items: FaItem[]; vatRate: 0 | 7; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const recipe = config.packages[input.packageId];
  const pp = pricing.packages[input.packageId];
  if (!pkg || !recipe || !pp) return null;

  const items: FaItem[] = [];
  const exclude = input.selfTransport ? [recipe.transportCode] : [];
  // the customer invites the monks but we still drive them: no price change, but the document
  // has to say so — flowaccount-app appends caller detail under the package's own detail lines
  const arrangementDetail =
    input.selfInvite && !input.selfTransport
      ? ['ลูกค้านิมนต์พระเอง — ทีมงานรับ-ส่งพระให้ (ระยะทางวัด-สถานที่จัดงาน ไป-กลับ ไม่เกิน 20 กม.)']
      : undefined;
  // fewer monks than 9 = discount on every package; self-transport becomes a line discount in flowaccount-app
  // (the flowaccount-app product must carry the same amount as pricing.selfTransportDiscount)
  const monksDiscount = monkDiscountFor(input.monks, pricing);

  // Lines that reference a catalog product carry NO unitPrice: flowaccount-app prices them
  // (price table by monks, priceFormula by guests, transport/5-monk discounts). Only the
  // plain-text fallback lines (no product mapped) send a price, taken from the derived pricing.
  if (pkg.kind === 'catering') {
    const isTable = pkg.unit === 'table';
    const count = isTable ? input.tables : input.guests;
    const dishes = input.dishCount ?? DEFAULT_DISH_COUNT;
    const unitPrice = cateringUnitPrice(pkg, pp, dishes);
    if (recipe.cateringCode) {
      items.push(
        isTable
          ? { productCode: recipe.cateringCode, quantity: count, unit: 'โต๊ะ' }
          : { productCode: recipe.cateringCode, quantity: 1, variables: { guests: count, dishes } },
      );
    } else {
      items.push({
        description: isTable ? pkg.name : `${pkg.name} อาหาร ${dishes} อย่าง`,
        quantity: count,
        unit: isTable ? 'โต๊ะ' : 'ท่าน',
        unitPrice,
      });
    }
    const small = smallOrderFee(pkg, input);
    if (small.fee > 0) {
      items.push({ description: smallOrderLabel(small.below), quantity: small.count, unit: 'โต๊ะ', unitPrice: small.perUnit });
    }
  } else if (pkg.kind === 'ceremony') {
    items.push({
      productCode: pickMonkCode(recipe, 'any', 0),
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
      ...(arrangementDetail ? { detail: arrangementDetail } : {}),
    });
  } else {
    const isTable = input.foodMode === 'table';
    const cfg = isTable ? pp.table : pp.buffet;
    if (!cfg) return null;
    const count = isTable ? input.tables : input.guests;
    const { tierTotal } = tierTotalFor(cfg, count);
    const foodTotal = cfg.extra * count;
    const monkPriceFallback = Math.max(0, tierTotal - foodTotal - monksDiscount);

    const monkCode = pickMonkCode(recipe, isTable ? 'table' : 'buffet', count);
    items.push({
      ...(monkCode
        ? { productCode: monkCode, quantity: 1, variables: { monks: input.monks }, exclude }
        : { description: `${pkg.name} — พิธีสงฆ์ ${input.monks} รูป`, quantity: 1, unit: 'ชุด', unitPrice: monkPriceFallback }),
      ...(arrangementDetail ? { detail: arrangementDetail } : {}),
    });

    if (isTable) {
      items.push(
        recipe.chineseTableCode
          ? { productCode: recipe.chineseTableCode, quantity: count, unit: 'โต๊ะ' }
          : { description: 'โต๊ะจีน', quantity: count, unit: 'โต๊ะ', unitPrice: cfg.extra },
      );
    } else {
      items.push(
        recipe.buffetCode
          ? { productCode: recipe.buffetCode, quantity: 1, variables: { guests: count } }
          : { description: `อาหารบุฟเฟต์ สำหรับแขก ${count} ท่าน`, quantity: 1, unit: 'ชุด', unitPrice: foodTotal },
      );
    }
  }

  for (const a of applicableAddons(input.packageId)) {
    if (!input.addons.includes(a.id)) continue;
    const qty = addonQuantity(a, input);
    if (qty <= 0) continue;
    const code = config.addons[a.id];
    const plain = { description: a.label, unit: a.perUnit ? 'โต๊ะ' : 'ชุด', unitPrice: pricing.addons[a.id] ?? a.price };
    items.push(
      code
        ? { productCode: code, quantity: qty, ...(a.perUnit ? { unit: 'โต๊ะ' } : {}), fallback: plain }
        : { ...plain, quantity: qty },
    );
  }

  if (input.travelFee && input.travelFee > 0) {
    items.push({ description: `ค่าเดินทาง${input.travelArea ? ` (${input.travelArea})` : ''}`, quantity: 1, unit: 'ครั้ง', unitPrice: input.travelFee });
  }

  return { items, vatRate: recipe.vatRate, pkg };
}

/** Sum of the selected add-ons (drinks × tables, others × 1). */
export function addonsTotal(input: BookingCalcInput, pricing: PricingConfig = DEFAULT_PRICING): number {
  let total = 0;
  for (const a of applicableAddons(input.packageId)) {
    if (input.addons.includes(a.id)) total += (pricing.addons[a.id] ?? a.price) * addonQuantity(a, input);
  }
  return total;
}

export function calcEstimatedTotal(
  input: BookingCalcInput,
  pricing: PricingConfig = DEFAULT_PRICING,
): { total: number; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const pp = pricing.packages[input.packageId];
  if (!pkg || !pp) return null;

  let total: number;
  if (pkg.kind === 'catering') {
    const count = pkg.unit === 'table' ? input.tables : input.guests;
    total = cateringUnitPrice(pkg, pp, input.dishCount) * count + smallOrderFee(pkg, input).fee;
  } else if (pkg.kind === 'ceremony') {
    total = pp.base ?? 0;
  } else {
    const cfg = input.foodMode === 'table' ? pp.table : pp.buffet;
    if (!cfg) return null;
    const count = input.foodMode === 'table' ? input.tables : input.guests;
    total = tierTotalFor(cfg, count).tierTotal;
  }

  total += addonsTotal(input, pricing);
  if (pkg.kind !== 'catering') {
    if (input.selfTransport) total -= pricing.selfTransportDiscount;
    total -= monkDiscountFor(input.monks, pricing);
  }
  if (input.travelFee && input.travelFee > 0) total += input.travelFee;

  return { total: Math.max(0, total), pkg };
}

/** Estimated total plus the price lines the booking page shows (mirrors booking/src/lib/calc.ts `calc`). */
export const VAT_RATE = 0.07;

// ── Deposit (เงินมัดจำ) — mirror of flowaccount-app backend/src/common/deposit.ts ──
export interface DepositRule { tiers: { upTo: number; amount: number }[]; abovePercent: number }
export const DEFAULT_DEPOSIT_RULE: DepositRule = { tiers: [{ upTo: 15000, amount: 3000 }, { upTo: 25000, amount: 5000 }], abovePercent: 20 };

export function computeDeposit(foodAmount: number, rule: DepositRule = DEFAULT_DEPOSIT_RULE): number {
  const food = Math.max(0, Number(foodAmount) || 0);
  for (const t of rule.tiers || []) if (food <= t.upTo) return Math.round(t.amount);
  return Math.round((food * (rule.abovePercent || 0)) / 100);
}

/** Food part of a booking: per-guest/table price (tier `extra`) × count; ceremony-only packages have none. */
export function foodAmountFor(input: BookingCalcInput, pricing: PricingConfig): number {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const pp = pricing.packages[input.packageId];
  if (!pkg || !pp) return 0;
  if (pkg.kind === 'catering') {
    // owner decision (2026-09-06): the deposit for catering is based on food + drinks (not travel / VAT)
    const count = pkg.unit === 'table' ? input.tables : input.guests;
    return Math.round(cateringUnitPrice(pkg, pp, input.dishCount) * count + addonsTotal(input, pricing));
  }
  if (pkg.kind !== 'full') return 0;
  const cfg = input.foodMode === 'table' ? pp.table : pp.buffet;
  const count = input.foodMode === 'table' ? input.tables : input.guests;
  return cfg ? Math.round(cfg.extra * count) : 0;
}

export function estimateBooking(
  input: Parameters<typeof calcEstimatedTotal>[0] & { wantVat?: boolean | null; depositAmount?: number | null },
  pricing: PricingConfig = DEFAULT_PRICING,
  depositRule: DepositRule = DEFAULT_DEPOSIT_RULE,
): { total: number; vatAmount: number; grandTotal: number; foodAmount: number; depositAmount: number; depositManual: boolean; packageName: string; rows: { k: string; v: string }[] } | null {
  const calc = calcEstimatedTotal(input, pricing);
  if (!calc) return null;
  const foodAmount = foodAmountFor(input, pricing);
  const depositManual = typeof input.depositAmount === 'number' && input.depositAmount >= 0;
  const depositAmount = depositManual ? Math.round(input.depositAmount as number) : computeDeposit(foodAmount, depositRule);
  const pp = pricing.packages[input.packageId];
  const fmt = (n: number) => `${n.toLocaleString('th-TH')} บาท`;
  const rows: { k: string; v: string }[] = [];
  const isCatering = calc.pkg.kind === 'catering';
  if (isCatering) {
    const count = calc.pkg.unit === 'table' ? input.tables : input.guests;
    const unitPrice = cateringUnitPrice(calc.pkg, pp, input.dishCount);
    rows.push({ k: cateringLineLabel(calc.pkg, input, unitPrice), v: fmt(unitPrice * count) });
    const small = smallOrderFee(calc.pkg, input);
    if (small.fee > 0) rows.push({ k: `${smallOrderLabel(small.below)} ${small.perUnit} × ${small.count} โต๊ะ`, v: `+${fmt(small.fee)}` });
  } else if (calc.pkg.kind === 'ceremony') {
    rows.push({ k: 'ราคาแพ็กเกจ', v: fmt(pp.base ?? 0) });
  } else {
    const cfg = input.foodMode === 'table' ? pp.table : pp.buffet;
    const count = input.foodMode === 'table' ? input.tables : input.guests;
    const unit = input.foodMode === 'table' ? 'โต๊ะ' : 'ท่าน';
    rows.push({ k: `ราคาแพ็กเกจ (${count} ${unit})`, v: fmt(cfg ? tierTotalFor(cfg, count).tierTotal : 0) });
  }
  for (const a of applicableAddons(input.packageId)) {
    if (!input.addons.includes(a.id)) continue;
    const qty = addonQuantity(a, input);
    if (qty <= 0) continue;
    const price = pricing.addons[a.id] ?? a.price;
    rows.push({ k: a.perUnit ? `${a.label} × ${qty} โต๊ะ` : a.label, v: `+${fmt(price * qty)}` });
  }
  if (!isCatering && input.selfTransport) rows.push({ k: 'นิมนต์รับ-ส่งพระเอง', v: `−${fmt(pricing.selfTransportDiscount)}` });
  if (!isCatering) {
    const monkDiscount = monkDiscountFor(input.monks, pricing);
    if (monkDiscount > 0) rows.push({ k: `พระ ${input.monks} รูป`, v: `−${fmt(monkDiscount)}` });
  }
  if (input.travelFee && input.travelFee > 0) rows.push({ k: `ค่าเดินทาง${input.travelArea ? ` (${input.travelArea})` : ''}`, v: `+${fmt(input.travelFee)}` });
  const vatAmount = input.wantVat ? Math.round(calc.total * VAT_RATE) : 0;
  if (input.wantVat) rows.push({ k: 'ภาษีมูลค่าเพิ่ม 7%', v: `+${fmt(vatAmount)}` });
  return { total: calc.total, vatAmount, grandTotal: calc.total + vatAmount, foodAmount, depositAmount, depositManual, packageName: calc.pkg.name, rows };
}
