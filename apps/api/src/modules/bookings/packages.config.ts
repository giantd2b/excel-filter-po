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
  const expr3 = (): number => {
    let v = expr2();
    for (;;) {
      skip();
      const op = peek();
      if (op === '+' || op === '-') { i++; const r = expr2(); v = op === '+' ? v + r : v - r; } else return v;
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
  usedCodes: Record<string, { buffet: Record<number, string>; table: Record<number, string>; base?: string }>;
}

/**
 * Derive the booking-page price tiers from the catalog:
 *   tier total = ceremony product (per monkTiers) at 9 monks + food (buffet formula at that guest count,
 *   or Chinese-table product × tables); extra per unit = food(count + 1) − food(count).
 * Discounts come from the products too (transport component price, 9-monk vs 5-monk price).
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
  let monksDiscount: number | null = null;

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
      const p9 = productPrice(main, { monks: 9 });
      const p5 = productPrice(main, { monks: 5 });
      if (monksDiscount === null && p9 !== null && p5 !== null && p9 > p5) monksDiscount = p9 - p5;
    }

    if (pkg.kind === 'ceremony') {
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
    fiveMonksDiscount: monksDiscount ?? FIVE_MONKS_DISCOUNT,
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
      displayTiers: { buffet: [20, 30, 40, 50], table: [8, 10, 20] },
      transportCode: 'item8',
      buffetCode: 'BUFFET_STANDARD_MONK',
      chineseTableCode: 'CHINESE_TABLE',
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
      transportCode: 'transport',
      buffetCode: 'BUFFET_PRIME_MONK',
      chineseTableCode: 'CHINESE_TABLE_PRIME',
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
      chineseTableCode: 'CHINESE_TABLE_PRIME',
      vatRate: 7,
    },
  },
  addons: { stage: 'STAGE', tent: 'TENT512', drape: 'DRAPE' },
};

/** Merge a saved (possibly partial / older) config over the defaults and normalise codes. */
/** Product codes that were removed from the catalog → their replacement (keeps saved settings valid). */
const RETIRED_CODES: Record<string, string> = {
  MONK_PLUS: 'MONK_PLUS_2030',
  MONK_PRIME: 'MONK_PRIME_2040',
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

  // Lines that reference a catalog product carry NO unitPrice: flowaccount-app prices them
  // (price table by monks, priceFormula by guests, transport/5-monk discounts). Only the
  // plain-text fallback lines (no product mapped) send a price, taken from the derived pricing.
  if (pkg.kind === 'ceremony') {
    items.push({
      productCode: pickMonkCode(recipe, 'any', 0),
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
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
    items.push(
      monkCode
        ? { productCode: monkCode, quantity: 1, variables: { monks: input.monks }, exclude }
        : { description: `${pkg.name} — พิธีสงฆ์ ${input.monks} รูป`, quantity: 1, unit: 'ชุด', unitPrice: monkPriceFallback },
    );

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

  for (const a of BOOKING_ADDONS) {
    if (!input.addons.includes(a.id)) continue;
    const code = config.addons[a.id];
    items.push(
      code
        ? { productCode: code, quantity: 1 }
        : { description: a.label, quantity: 1, unit: 'ชุด', unitPrice: pricing.addons[a.id] ?? a.price },
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
