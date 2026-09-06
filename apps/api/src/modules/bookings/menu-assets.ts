/**
 * Menu posters pushed into a customer's LINE/Facebook chat ("ส่งเมนูเข้าแชต").
 *
 * Mirrors the gallery map the storefront shows on the package detail page:
 *   booking/src/data/menus.ts → MENU_IMAGES / MERIT_MENU_IMAGES
 * Keep both in sync when a poster is added or renamed. Files live in booking/public/img and are
 * served as https://crm.iristermboon.com/booking/img/<file> (static build in apps/api/public/booking).
 */
import { BookingPackage, PackagePricing, packageById } from './packages.config';

/** 'buffet' = บุฟเฟต์ pages, 'table' = โต๊ะจีน poster (merit full packages have both) */
export type MenuPart = 'buffet' | 'table';
export type MenuPartChoice = MenuPart | 'all';

const pages = (prefix: string) => [1, 2, 3, 4, 5, 6].map((n) => `${prefix}-${n}.jpg`);
const BUFFET_STANDARD_PAGES = pages('menu-buffet-standard');
const BUFFET_PREMIUM_PAGES = pages('menu-buffet-premium');

export const MENU_ASSETS: Record<string, Partial<Record<MenuPart, string[]>>> = {
  'buffet-standard': { buffet: BUFFET_STANDARD_PAGES },
  'buffet-premium': { buffet: BUFFET_PREMIUM_PAGES },
  'chinese-2000': { table: ['chinese-2000.jpg'] },
  'chinese-2300': { table: ['chinese-2300.jpg'] },
  'chinese-2600': { table: ['chinese-2600.jpg'] },
  // merit packages with guests: ครบวงจร → standard buffet + 2,300 set; พลัส / PRIME → premium + 2,600 set
  full: { buffet: BUFFET_STANDARD_PAGES, table: ['menu-chinese-merit-2300.jpg'] },
  'full-plus': { buffet: BUFFET_PREMIUM_PAGES, table: ['menu-chinese-merit-2600.jpg'] },
  prime: { buffet: BUFFET_PREMIUM_PAGES, table: ['menu-chinese-merit-2600.jpg'] },
  // ceremony / ceremony-prime: no guest food → no menu
};

export const MENU_PART_LABEL: Record<MenuPart, string> = { buffet: 'บุฟเฟต์', table: 'โต๊ะจีน' };

export function publicBase(): string {
  return (process.env.BOOKING_PUBLIC_URL || 'https://crm.iristermboon.com').replace(/\/$/, '');
}

/** storefront path for a package line (shared with the booking-link URL) */
export function storefrontPath(packageId?: string | null): 'booking' | 'buffet' | 'chinese' {
  const line = packageId ? packageById(packageId)?.line : undefined;
  return line === 'buffet' ? 'buffet' : line === 'chinese' ? 'chinese' : 'booking';
}

/** /buffet/?pkg=buffet-premium … opens the storefront straight on the package detail page */
export function packageDetailUrl(packageId: string): string {
  return `${publicBase()}/${storefrontPath(packageId)}/?pkg=${encodeURIComponent(packageId)}`;
}

export function menuParts(packageId: string): MenuPart[] {
  const m = MENU_ASSETS[packageId];
  if (!m) return [];
  return (['buffet', 'table'] as MenuPart[]).filter((p) => (m[p]?.length ?? 0) > 0);
}

export function menuImageUrls(packageId: string, part: MenuPartChoice = 'all'): string[] {
  const m = MENU_ASSETS[packageId];
  if (!m) return [];
  const parts: MenuPart[] = part === 'all' ? menuParts(packageId) : [part];
  const base = `${publicBase()}/booking/img/`;
  return parts.flatMap((p) => (m[p] || []).map((f) => base + f));
}

const baht = (n: number) => `${Math.round(n).toLocaleString('th-TH')} บาท`;

/** one-line price summary of the package (live pricing when given, else catalog defaults) */
export function menuPriceLine(pkg: BookingPackage, part: MenuPartChoice, live?: PackagePricing | null): string {
  if (pkg.kind === 'catering') {
    if (pkg.unit === 'guest') {
      const perHead = live?.perHead ?? pkg.perHead ?? null;
      const dishes = perHead ? Object.keys(perHead).map(Number).sort((a, b) => a - b) : [];
      const first = dishes[0];
      const price = first != null ? Number((perHead as any)[first]) : 0;
      const parts = [price ? `เริ่มต้น ${price.toLocaleString('th-TH')} บาท/ท่าน (อาหาร ${first} อย่าง + ขนมหวาน)` : ''];
      if (pkg.minCount) parts.push(`ขั้นต่ำ ${pkg.minCount} ท่าน`);
      return parts.filter(Boolean).join(' · ');
    }
    const perTable = live?.perTable ?? pkg.perTable ?? 0;
    const parts = [perTable ? `โต๊ะละ ${perTable.toLocaleString('th-TH')} บาท${pkg.courses ? ` (${pkg.courses} อย่าง)` : ''}` : ''];
    if (pkg.minCount) parts.push(`ขั้นต่ำ ${pkg.minCount} โต๊ะ`);
    parts.push('ไม่รวมเครื่องดื่ม');
    return parts.filter(Boolean).join(' · ');
  }
  if (pkg.kind === 'full') {
    const buffet = live?.buffet ?? pkg.buffet ?? null;
    const table = live?.table ?? pkg.table ?? null;
    const lines: string[] = [];
    if (part !== 'table' && buffet?.tiers?.length) {
      const [n, price] = buffet.tiers[0];
      lines.push(`แขกบุฟเฟต์ ${n} ท่าน เริ่มต้น ${baht(price)}`);
    }
    if (part !== 'buffet' && table?.tiers?.length) {
      const [n, price] = table.tiers[0];
      lines.push(`แขกโต๊ะจีน ${n} โต๊ะ เริ่มต้น ${baht(price)}`);
    }
    return lines.join(' · ');
  }
  return '';
}

/** The text pushed after the poster images: package name, price line, and the detail link. */
export function composeMenuChatMessage(o: { pkg: BookingPackage; part: MenuPartChoice; priceLine?: string; detailUrl?: string | null }): string {
  const parts = menuParts(o.pkg.id);
  const which = o.part === 'all' || parts.length < 2 ? '' : ` (${MENU_PART_LABEL[o.part]})`;
  const head = o.pkg.kind === 'full' ? `เมนูอาหารเลี้ยงแขก แพ็กเกจ${o.pkg.name}${which}` : `เมนูอาหาร ${o.pkg.name}`;
  return [
    `${head} ตามรูปด้านบนค่ะ`,
    o.priceLine ? `ราคา${o.pkg.kind === 'full' ? 'แพ็กเกจ' : ''} ${o.priceLine} (ไม่รวม VAT)` : '',
    o.detailUrl ? `ดูรายละเอียดและขอใบเสนอราคาได้ที่\n${o.detailUrl}` : '',
    'สนใจแพ็กเกจไหน ทักบอกทีมงานในแชตนี้ได้เลยค่ะ 🙏',
  ]
    .filter(Boolean)
    .join('\n');
}
