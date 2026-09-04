// Package pricing for the public booking page (/booking).
// Must stay in sync with booking/src/data/packages.ts (frontend copy).

export type FoodMode = 'buffet' | 'table';

export interface TierConfig {
  tiers: [number, number][]; // [minCount, price]
  extra: number; // price per extra unit above tier base
}

export interface BookingPackage {
  id: string;
  name: string;
  kind: 'ceremony' | 'full';
  base?: number; // ceremony packages: flat price
  buffet?: TierConfig;
  table?: TierConfig;
}

export const BOOKING_PACKAGES: BookingPackage[] = [
  { id: 'ceremony', name: 'พิธีสงฆ์ แพ็กเกจงานบุญ', kind: 'ceremony', base: 14990 },
  { id: 'ceremony-prime', name: 'PRIME พิธีสงฆ์ครบวงจร', kind: 'ceremony', base: 19990 },
  {
    id: 'full',
    name: 'ครบวงจร',
    kind: 'full',
    buffet: { tiers: [[20, 19490], [30, 21990], [40, 24490], [50, 27990]], extra: 250 },
    table: { tiers: [[8, 33890], [10, 38490], [20, 63990]], extra: 2300 },
  },
  {
    id: 'full-plus',
    name: 'ครบวงจร พลัส',
    kind: 'full',
    buffet: { tiers: [[20, 21990], [30, 25490], [40, 28490], [50, 34490]], extra: 350 },
    table: { tiers: [[8, 37790], [10, 42990], [20, 71490]], extra: 2600 },
  },
  {
    id: 'prime',
    name: 'PRIME ครบวงจร',
    kind: 'full',
    buffet: { tiers: [[20, 25990], [30, 29490], [40, 32990], [50, 38990]], extra: 350 },
    table: { tiers: [[8, 42290], [10, 47490], [20, 75990]], extra: 2600 },
  },
];

export const BOOKING_ADDONS: { id: string; label: string; price: number }[] = [
  { id: 'stage', label: 'เวทีพระ', price: 5000 },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', price: 3000 },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', price: 1000 },
];

export const SELF_TRANSPORT_DISCOUNT = 1000;
export const FIVE_MONKS_DISCOUNT = 1500; // every package (new-package-2025 sheet)

// ── Editable pricing ──────────────────────────────────────────────────
// The numbers above are only DEFAULTS. The live prices are edited in the
// dashboard (จองงานบุญ → ตั้งค่าใบเสนอราคา → ราคา), stored in SystemSetting
// (PRICING_SETTING_KEY) and served to the public /booking page by
// GET /bookings/pricing, so there is a single source of truth.
export interface PackagePricing {
  base?: number | null; // ceremony packages
  buffet?: TierConfig | null; // full packages
  table?: TierConfig | null;
}

export interface PricingConfig {
  packages: Record<string, PackagePricing>;
  addons: Record<string, number>;
  selfTransportDiscount: number;
  fiveMonksDiscount: number;
}

export const PRICING_SETTING_KEY = 'booking_pricing';

export const DEFAULT_PRICING: PricingConfig = {
  packages: Object.fromEntries(
    BOOKING_PACKAGES.map((p) => [p.id, { base: p.base ?? null, buffet: p.buffet ?? null, table: p.table ?? null }]),
  ),
  addons: Object.fromEntries(BOOKING_ADDONS.map((a) => [a.id, a.price])),
  selfTransportDiscount: SELF_TRANSPORT_DISCOUNT,
  fiveMonksDiscount: FIVE_MONKS_DISCOUNT,
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
    packages[p.id] =
      p.kind === 'ceremony'
        ? { base: num(s.base, d.base ?? 0), buffet: null, table: null }
        : { base: null, buffet: tierCfg(s.buffet, d.buffet), table: tierCfg(s.table, d.table) };
  }
  const addons: Record<string, number> = {};
  for (const a of BOOKING_ADDONS) addons[a.id] = num(saved?.addons?.[a.id], DEFAULT_PRICING.addons[a.id]);
  return {
    packages,
    addons,
    selfTransportDiscount: num(saved?.selfTransportDiscount, SELF_TRANSPORT_DISCOUNT),
    fiveMonksDiscount: num(saved?.fiveMonksDiscount, FIVE_MONKS_DISCOUNT),
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
}

export interface FaRecipe {
  /** ceremony line product code (fallback when no tier matches) */
  monkCode: string;
  monkTiers?: MonkTier[];
  /** legacy (pre-tier) fields, migrated into monkTiers by mergeFaRecipes */
  largeGuestsAbove?: number | null;
  monkCodeLarge?: string | null;
  /** component code of "นิมนต์รับ-ส่งพระ" inside that product (excluded when the customer handles it) */
  transportCode: string;
  /** buffet product (a package with a `guests` variable → tables/chairs lines) */
  buffetCode?: string | null;
  /** Chinese-table product (simple line, qty = tables) */
  chineseTableCode?: string | null;
  /** VAT rate for the document: booking FAQ says packages with guest catering exclude 7% VAT */
  vatRate: 0 | 7;
}

export interface FaRecipeConfig {
  packages: Record<string, FaRecipe>;
  /** add-on id → catalog product code (price is still sent from BOOKING_ADDONS) */
  addons: Record<string, string>;
}

export const FA_RECIPES_SETTING_KEY = 'fa_booking_recipes';

export const DEFAULT_FA_RECIPES: FaRecipeConfig = {
  packages: {
    ceremony: { monkCode: 'CEREMONY', transportCode: 'transport', vatRate: 0 },
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
      transportCode: 'item8',
      buffetCode: 'BUFFET_STANDARD_MONK',
      chineseTableCode: 'CHINESE_TABLE',
      vatRate: 7,
    },
    'full-plus': {
      monkCode: 'MONK_PLUS',
      transportCode: 'transport',
      buffetCode: 'BUFFET_PRIME_MONK',
      chineseTableCode: 'CHINESE_TABLE',
      vatRate: 7,
    },
    prime: {
      monkCode: 'MONK_PRIME',
      transportCode: 'transport',
      buffetCode: 'BUFFET_PRIME_MONK',
      chineseTableCode: 'CHINESE_TABLE',
      vatRate: 7,
    },
  },
  addons: { stage: 'STAGE', tent: 'TENT512', drape: 'DRAPE' },
};

/** Merge a saved (possibly partial / older) config over the defaults and normalise codes. */
export function mergeFaRecipes(saved: Partial<FaRecipeConfig> | null | undefined): FaRecipeConfig {
  const code = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : null);
  // A field that is absent from the saved config falls back to the default; an explicitly
  // empty string means "no product — send that line as plain text" and is kept as null.
  const optionalCode = (v: unknown, fallback: string | null | undefined) => (v === undefined ? fallback ?? null : code(v));
  const normaliseTiers = (raw: unknown): MonkTier[] =>
    (Array.isArray(raw) ? raw : [])
      .map((t: any) => ({
        mode: t?.mode === 'buffet' || t?.mode === 'table' ? t.mode : 'any',
        from: Math.max(0, Number(t?.from) || 0),
        code: code(t?.code) || '',
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
    packages[id] = {
      monkCode: code(s.monkCode) || d.monkCode,
      monkTiers,
      transportCode: (typeof s.transportCode === 'string' && s.transportCode.trim()) || d.transportCode,
      buffetCode: optionalCode(s.buffetCode, d.buffetCode),
      chineseTableCode: optionalCode(s.chineseTableCode, d.chineseTableCode),
      vatRate: s.vatRate === 0 || s.vatRate === 7 ? s.vatRate : d.vatRate,
    };
  }
  const addons: Record<string, string> = {};
  for (const a of BOOKING_ADDONS) {
    addons[a.id] = optionalCode(saved?.addons?.[a.id], DEFAULT_FA_RECIPES.addons[a.id]) || '';
  }
  return { packages, addons };
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
}

/** Ceremony product for a food mode + size: matching mode (or 'any'), largest `from` ≤ count; else monkCode. */
export function pickMonkCode(recipe: FaRecipe, mode: 'buffet' | 'table' | 'any', count: number): string {
  let best: MonkTier | null = null;
  for (const t of recipe.monkTiers || []) {
    if (t.mode !== 'any' && mode !== 'any' && t.mode !== mode) continue;
    if (t.from > count) continue;
    if (!best || t.from >= best.from) best = t;
  }
  return best?.code || recipe.monkCode;
}

/** Build the quotation lines for a booking. Returns null when the package has no recipe. */
export function buildFaItems(
  input: {
    packageId: string;
    foodMode: string;
    guests: number;
    tables: number;
    monks: number;
    selfTransport: boolean;
    addons: string[];
  },
  config: FaRecipeConfig = DEFAULT_FA_RECIPES,
  pricing: PricingConfig = DEFAULT_PRICING,
): { items: FaItem[]; vatRate: 0 | 7; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const recipe = config.packages[input.packageId];
  const pp = pricing.packages[input.packageId];
  if (!pkg || !recipe || !pp) return null;

  const items: FaItem[] = [];
  const exclude = input.selfTransport ? [recipe.transportCode] : [];
  // 5 monks instead of 9 = discount on every package; self-transport becomes a line discount in flowaccount-app
  // (the flowaccount-app product must carry the same amount as pricing.selfTransportDiscount)
  const monksDiscount = input.monks === 5 ? pricing.fiveMonksDiscount : 0;

  if (pkg.kind === 'ceremony') {
    items.push({
      productCode: pickMonkCode(recipe, 'any', 0),
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
      unitPrice: Math.max(0, (pp.base ?? 0) - monksDiscount),
    });
  } else {
    const isTable = input.foodMode === 'table';
    const cfg = isTable ? pp.table : pp.buffet;
    if (!cfg) return null;
    const count = isTable ? input.tables : input.guests;
    const { tierTotal } = tierTotalFor(cfg, count);
    const foodTotal = cfg.extra * count;
    const monkPrice = Math.max(0, tierTotal - foodTotal - monksDiscount);

    items.push({
      productCode: pickMonkCode(recipe, isTable ? 'table' : 'buffet', count),
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
      unitPrice: monkPrice,
    });

    if (isTable) {
      items.push(
        recipe.chineseTableCode
          ? { productCode: recipe.chineseTableCode, quantity: count, unit: 'โต๊ะ', unitPrice: cfg.extra }
          : { description: 'โต๊ะจีน', quantity: count, unit: 'โต๊ะ', unitPrice: cfg.extra },
      );
    } else {
      items.push(
        recipe.buffetCode
          ? { productCode: recipe.buffetCode, quantity: 1, variables: { guests: count }, unitPrice: foodTotal }
          : { description: `อาหารบุฟเฟต์ สำหรับแขก ${count} ท่าน`, quantity: 1, unit: 'ชุด', unitPrice: foodTotal },
      );
    }
  }

  for (const a of BOOKING_ADDONS) {
    if (!input.addons.includes(a.id)) continue;
    const code = config.addons[a.id];
    const price = pricing.addons[a.id] ?? a.price;
    items.push(
      code
        ? { productCode: code, quantity: 1, unitPrice: price }
        : { description: a.label, quantity: 1, unit: 'ชุด', unitPrice: price },
    );
  }

  return { items, vatRate: recipe.vatRate, pkg };
}

export function calcEstimatedTotal(
  input: {
    packageId: string;
    foodMode: string;
    guests: number;
    tables: number;
    monks: number;
    selfTransport: boolean;
    addons: string[];
  },
  pricing: PricingConfig = DEFAULT_PRICING,
): { total: number; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const pp = pricing.packages[input.packageId];
  if (!pkg || !pp) return null;

  let total: number;
  if (pkg.kind === 'ceremony') {
    total = pp.base ?? 0;
  } else {
    const cfg = input.foodMode === 'table' ? pp.table : pp.buffet;
    if (!cfg) return null;
    const count = input.foodMode === 'table' ? input.tables : input.guests;
    total = tierTotalFor(cfg, count).tierTotal;
  }

  for (const a of BOOKING_ADDONS) {
    if (input.addons.includes(a.id)) total += pricing.addons[a.id] ?? a.price;
  }
  if (input.selfTransport) total -= pricing.selfTransportDiscount;
  if (input.monks === 5) total -= pricing.fiveMonksDiscount;

  return { total: Math.max(0, total), pkg };
}
