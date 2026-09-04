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
