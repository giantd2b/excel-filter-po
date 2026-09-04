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
    table: { tiers: [[8, 42290], [10, 47490], [20, 75490]], extra: 2600 },
  },
];

export const BOOKING_ADDONS: { id: string; label: string; price: number }[] = [
  { id: 'stage', label: 'เวทีพระ', price: 5000 },
  { id: 'tent', label: 'เต็นท์เพิ่ม 1 หลัง', price: 3000 },
  { id: 'drape', label: 'โยงผ้าประดับเพิ่ม', price: 1000 },
];

export const SELF_TRANSPORT_DISCOUNT = 1000;
export const FIVE_MONKS_DISCOUNT = 1500; // ceremony packages only

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
export interface FaRecipe {
  /** ceremony line product code */
  monkCode: string;
  /** optional: use a different ceremony product when guests exceed this count (tiered packages) */
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
      largeGuestsAbove: 40,
      monkCodeLarge: 'MONK_FULL50',
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
  const packages: Record<string, FaRecipe> = {};
  for (const id of Object.keys(DEFAULT_FA_RECIPES.packages)) {
    const d = DEFAULT_FA_RECIPES.packages[id];
    const s = (saved?.packages?.[id] || {}) as Partial<FaRecipe>;
    const above = s.largeGuestsAbove === undefined ? d.largeGuestsAbove : Number(s.largeGuestsAbove);
    packages[id] = {
      monkCode: code(s.monkCode) || d.monkCode,
      largeGuestsAbove: Number.isFinite(above as number) && (above as number) > 0 ? (above as number) : null,
      monkCodeLarge: optionalCode(s.monkCodeLarge, d.monkCodeLarge),
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
): { items: FaItem[]; vatRate: 0 | 7; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const recipe = config.packages[input.packageId];
  if (!pkg || !recipe) return null;

  const items: FaItem[] = [];
  const exclude = input.selfTransport ? [recipe.transportCode] : [];
  const monkCode =
    recipe.monkCodeLarge && recipe.largeGuestsAbove && input.guests > recipe.largeGuestsAbove
      ? recipe.monkCodeLarge
      : recipe.monkCode;

  if (pkg.kind === 'ceremony') {
    // flat price; the 5-monk discount is applied here, self-transport becomes a line discount in flowaccount-app
    const price = pkg.base! - (input.monks === 5 ? FIVE_MONKS_DISCOUNT : 0);
    items.push({
      productCode: monkCode,
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
      unitPrice: price,
    });
  } else {
    const isTable = input.foodMode === 'table';
    const cfg = isTable ? pkg.table! : pkg.buffet!;
    const count = isTable ? input.tables : input.guests;
    let tier = cfg.tiers[0];
    for (const t of cfg.tiers) if (count >= t[0]) tier = t;
    const tierTotal = tier[1] + Math.max(0, count - tier[0]) * cfg.extra;
    const foodTotal = cfg.extra * count;
    const monkPrice = Math.max(0, tierTotal - foodTotal);

    items.push({
      productCode: monkCode,
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
    items.push(
      code
        ? { productCode: code, quantity: 1, unitPrice: a.price }
        : { description: a.label, quantity: 1, unit: 'ชุด', unitPrice: a.price },
    );
  }

  return { items, vatRate: recipe.vatRate, pkg };
}

export function calcEstimatedTotal(input: {
  packageId: string;
  foodMode: string;
  guests: number;
  tables: number;
  monks: number;
  selfTransport: boolean;
  addons: string[];
}): { total: number; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  if (!pkg) return null;

  let total: number;
  if (pkg.kind === 'ceremony') {
    total = pkg.base!;
  } else {
    const cfg = input.foodMode === 'table' ? pkg.table! : pkg.buffet!;
    const count = input.foodMode === 'table' ? input.tables : input.guests;
    let tier = cfg.tiers[0];
    for (const t of cfg.tiers) if (count >= t[0]) tier = t;
    const over = Math.max(0, count - tier[0]);
    total = tier[1] + over * cfg.extra;
  }

  for (const a of BOOKING_ADDONS) {
    if (input.addons.includes(a.id)) total += a.price;
  }
  if (input.selfTransport) total -= SELF_TRANSPORT_DISCOUNT;
  if (pkg.kind === 'ceremony' && input.monks === 5) total -= FIVE_MONKS_DISCOUNT;

  return { total, pkg };
}
