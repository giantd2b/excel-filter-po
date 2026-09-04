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
export interface FaRecipe {
  /** ceremony line product code; for tiered packages may depend on the guest count */
  monkCode: (guests: number) => string;
  /** component code of "นิมนต์รับ-ส่งพระ" inside that product (excluded when the customer handles it) */
  transportCode: string;
  /** buffet product (a package with a `guests` variable → tables/chairs lines) */
  buffetCode?: string;
  /** Chinese-table product (simple line, qty = tables) */
  chineseTableCode?: string;
  /** VAT rate for the document: booking FAQ says packages with guest catering exclude 7% VAT */
  vatRate: 0 | 7;
}

export const FA_RECIPES: Record<string, FaRecipe> = {
  ceremony: { monkCode: () => 'CEREMONY', transportCode: 'transport', vatRate: 0 },
  'ceremony-prime': { monkCode: () => 'CEREMONY_PRIME', transportCode: 'transport', vatRate: 0 },
  full: {
    monkCode: (guests) => (guests > 40 ? 'MONK_FULL50' : 'MONK_FULL203040'),
    transportCode: 'item8',
    buffetCode: 'BUFFET_STANDARD_MONK',
    chineseTableCode: 'CHINESE_TABLE',
    vatRate: 7,
  },
  'full-plus': {
    monkCode: () => 'MONK_PLUS',
    transportCode: 'transport',
    buffetCode: 'BUFFET_PRIME_MONK',
    chineseTableCode: 'CHINESE_TABLE',
    vatRate: 7,
  },
  prime: {
    monkCode: () => 'MONK_PRIME',
    transportCode: 'transport',
    buffetCode: 'BUFFET_PRIME_MONK',
    chineseTableCode: 'CHINESE_TABLE',
    vatRate: 7,
  },
};

/** Add-on id → catalog product code (price is still sent from BOOKING_ADDONS). */
export const FA_ADDON_CODES: Record<string, string> = {
  stage: 'STAGE',
  tent: 'TENT512',
  drape: 'DRAPE',
};

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
export function buildFaItems(input: {
  packageId: string;
  foodMode: string;
  guests: number;
  tables: number;
  monks: number;
  selfTransport: boolean;
  addons: string[];
}): { items: FaItem[]; vatRate: 0 | 7; pkg: BookingPackage } | null {
  const pkg = BOOKING_PACKAGES.find((p) => p.id === input.packageId);
  const recipe = FA_RECIPES[input.packageId];
  if (!pkg || !recipe) return null;

  const items: FaItem[] = [];
  const exclude = input.selfTransport ? [recipe.transportCode] : [];

  if (pkg.kind === 'ceremony') {
    // flat price; the 5-monk discount is applied here, self-transport becomes a line discount in flowaccount-app
    const price = pkg.base! - (input.monks === 5 ? FIVE_MONKS_DISCOUNT : 0);
    items.push({
      productCode: recipe.monkCode(0),
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
      productCode: recipe.monkCode(input.guests),
      quantity: 1,
      variables: { monks: input.monks },
      exclude,
      unitPrice: monkPrice,
    });

    if (isTable) {
      items.push({
        productCode: recipe.chineseTableCode,
        quantity: count,
        unit: 'โต๊ะ',
        unitPrice: cfg.extra,
      });
    } else {
      items.push({
        productCode: recipe.buffetCode,
        quantity: 1,
        variables: { guests: count },
        unitPrice: foodTotal,
      });
    }
  }

  for (const a of BOOKING_ADDONS) {
    if (!input.addons.includes(a.id)) continue;
    const code = FA_ADDON_CODES[a.id];
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
