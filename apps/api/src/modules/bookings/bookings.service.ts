import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/providers/prisma.service';
import {
  buildFaItems,
  calcEstimatedTotal,
  mergeFaRecipes,
  DEFAULT_FA_RECIPES,
  FA_RECIPES_SETTING_KEY,
  BOOKING_PACKAGES,
  BOOKING_ADDONS,
  derivePricing,
  pickRemarkCode,
  DEFAULT_PRICING,
  type FaRecipeConfig,
  type FaCatalog,
  type DerivedPricing,
} from './packages.config';

const CATALOG_CACHE_KEY = 'fa_catalog_cache';
const CATALOG_TTL_MS = 5 * 60 * 1000;
import { CreateBookingDto } from './dto/create-booking.dto';
import { FlowAccountClient } from '../quotations/flowaccount.client';

function bookingAddress(b: { venue?: string | null; tambon?: string | null; amphoe?: string | null; province?: string | null; zip?: string | null }) {
  const bkk = b.province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (b.venue) p.push(b.venue);
  if (b.tambon) p.push((bkk ? 'แขวง' : 'ต.') + b.tambon);
  if (b.amphoe) p.push(bkk ? b.amphoe : 'อ.' + b.amphoe);
  if (b.province) p.push('จ.' + b.province);
  if (b.zip) p.push(b.zip);
  return p.join(' ');
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flowAccount: FlowAccountClient,
  ) {}

  // ── Pricing derived from the flowaccount-app catalog (single source of prices) ──

  private catalogMem: { catalog: FaCatalog; fetchedAt: string; source: 'flowaccount' | 'cache' } | null = null;

  /**
   * Catalog keyed by product code. Fresh from flowaccount-app (5-minute memory cache);
   * the last good copy is kept in SystemSetting so pricing survives a flowaccount outage.
   */
  async getCatalog(force = false): Promise<{ catalog: FaCatalog; fetchedAt: string; source: 'flowaccount' | 'cache'; error?: string }> {
    if (!force && this.catalogMem && Date.now() - Date.parse(this.catalogMem.fetchedAt) < CATALOG_TTL_MS) {
      return this.catalogMem;
    }
    let error: string | undefined;
    try {
      if (!this.flowAccount.isConfigured) throw new Error('ยังไม่ได้ตั้งค่า FA_API_KEY');
      const products = await this.flowAccount.listProducts();
      const catalog: FaCatalog = {};
      for (const p of products) if (p.code) catalog[String(p.code).toUpperCase()] = p;
      const fetchedAt = new Date().toISOString();
      await this.prisma.systemSetting.upsert({
        where: { key: CATALOG_CACHE_KEY },
        update: { value: JSON.stringify({ fetchedAt, catalog }) },
        create: { key: CATALOG_CACHE_KEY, value: JSON.stringify({ fetchedAt, catalog }) },
      });
      this.catalogMem = { catalog, fetchedAt, source: 'flowaccount' };
      return this.catalogMem;
    } catch (e: any) {
      error = e?.message || 'โหลดสินค้าจาก flowaccount-app ไม่สำเร็จ';
    }
    const row = await this.prisma.systemSetting.findUnique({ where: { key: CATALOG_CACHE_KEY } });
    if (row?.value) {
      try {
        const saved = JSON.parse(row.value);
        this.catalogMem = { catalog: saved.catalog || {}, fetchedAt: saved.fetchedAt || '', source: 'cache' };
        return { ...this.catalogMem, error };
      } catch {
        /* fall through */
      }
    }
    return { catalog: {}, fetchedAt: '', source: 'cache', error };
  }

  async getPricing(force = false): Promise<DerivedPricing> {
    const [config, { catalog }] = await Promise.all([this.getRecipeConfig(), this.getCatalog(force)]);
    return derivePricing(config, catalog);
  }

  /** Public payload for the /booking page and the read-only pricing view in the dashboard. */
  async pricingSettings(force = false) {
    const [config, cat] = await Promise.all([this.getRecipeConfig(), this.getCatalog(force)]);
    const derived = derivePricing(config, cat.catalog);
    const { missingCodes, usedCodes, ...pricing } = derived;
    return {
      pricing,
      defaults: DEFAULT_PRICING,
      packages: BOOKING_PACKAGES.map((p) => ({ id: p.id, name: p.name, kind: p.kind })),
      addons: BOOKING_ADDONS.map((a) => ({ id: a.id, label: a.label, code: config.addons[a.id] || null })),
      source: cat.source,
      fetchedAt: cat.fetchedAt,
      catalogError: cat.error || null,
      missingCodes,
      usedCodes,
      appUrl: this.flowAccount.appUrl,
    };
  }

  // ── Package → flowaccount-app product mapping (editable from the dashboard) ──

  async getRecipeConfig(): Promise<FaRecipeConfig> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: FA_RECIPES_SETTING_KEY } });
    let saved: Partial<FaRecipeConfig> | null = null;
    if (row?.value) {
      try {
        saved = JSON.parse(row.value);
      } catch {
        saved = null;
      }
    }
    return mergeFaRecipes(saved);
  }

  async saveRecipeConfig(input: Partial<FaRecipeConfig>): Promise<FaRecipeConfig> {
    const merged = mergeFaRecipes(input);
    await this.prisma.systemSetting.upsert({
      where: { key: FA_RECIPES_SETTING_KEY },
      update: { value: JSON.stringify(merged) },
      create: { key: FA_RECIPES_SETTING_KEY, value: JSON.stringify(merged) },
    });
    return merged;
  }

  /** Everything the settings UI needs: current mapping, defaults, package/add-on lists and the FA catalog. */
  async recipeSettings() {
    const config = await this.getRecipeConfig();
    let products: any[] = [];
    let remarkTemplates: any[] = [];
    let catalogError: string | null = null;
    try {
      if (!this.flowAccount.isConfigured) throw new Error('ยังไม่ได้ตั้งค่า FA_API_KEY');
      [products, remarkTemplates] = await Promise.all([
        this.flowAccount.listProducts(),
        this.flowAccount.listRemarkTemplates().catch(() => []),
      ]);
    } catch (e: any) {
      catalogError = e?.message || 'โหลดรายการสินค้าจาก flowaccount-app ไม่สำเร็จ';
    }
    return {
      config,
      defaults: DEFAULT_FA_RECIPES,
      packages: BOOKING_PACKAGES.map((p) => ({ id: p.id, name: p.name, kind: p.kind })),
      addons: BOOKING_ADDONS,
      products: products.map((p) => ({
        code: p.code,
        name: p.name,
        kind: p.kind,
        unitPrice: p.unitPrice,
        variables: (p.variables || []).map((v: any) => v.key),
        components: (p.components || []).map((c: any) => ({ code: c.code, title: c.title, optional: !!c.optional })),
      })),
      remarkTemplates: remarkTemplates.map((t: any) => ({ id: t.id, code: t.code || null, name: t.name, isDefault: !!t.isDefault })),
      catalogError,
      appUrl: this.flowAccount.appUrl,
    };
  }

  /**
   * Create (or fetch the already-created) quotation for a booking in flowaccount-app.
   * The booking code is used as externalRef, so calling twice never duplicates.
   */
  async createQuotation(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');

    const [config, pricing] = await Promise.all([this.getRecipeConfig(), this.getPricing()]);
    const built = buildFaItems(
      {
        packageId: b.packageId,
        foodMode: b.foodMode,
        guests: b.guests,
        tables: b.tables,
        monks: b.monks,
        selfTransport: b.selfTransport,
        addons: b.addons,
      },
      config,
      pricing,
    );
    if (!built) throw new BadRequestException(`ไม่มีสูตรใบเสนอราคาสำหรับแพ็กเกจ "${b.packageId}"`);

    // Products are edited freely in flowaccount-app: if the configured transport component code
    // no longer exists on the product, fall back to the component whose title mentions นิมนต์.
    const { catalog } = await this.getCatalog();
    for (const item of built.items) {
      if (!item.productCode || !item.exclude?.length) continue;
      const comps = catalog[item.productCode]?.components || [];
      item.exclude = item.exclude.map((code) => {
        if (comps.some((c) => c.code === code)) return code;
        const alt = comps.find((c) => c.optional && /นิมนต์|รับ.?ส่งพระ/.test(c.title));
        return alt ? alt.code : code;
      });
    }

    const notes = [
      b.note ? `หมายเหตุลูกค้า: ${b.note}` : '',
      b.budget ? `งบประมาณ: ${b.budget}` : '',
      `จองผ่านหน้าเว็บ ${b.code} · ราคาประเมิน ${b.estimatedTotal.toLocaleString('th-TH')} บาท`,
    ].filter(Boolean);

    const res = await this.flowAccount.createQuotation({
      externalRef: b.code,
      customer: { name: b.customerName, phone: b.phone, address: bookingAddress(b) },
      project: `${b.occasion} · ${b.eventDate} · ${b.timeSlot}`,
      vatRate: built.vatRate,
      // printed หมายเหตุ: the matched tier's remark template, else the package's (FA falls back to its default)
      remarkCode:
        (config.packages[b.packageId] &&
          pickRemarkCode(
            config.packages[b.packageId],
            b.foodMode === 'table' ? 'table' : b.foodMode === 'buffet' ? 'buffet' : 'any',
            b.foodMode === 'table' ? b.tables : b.guests,
          )) || undefined,
      internalNotes: notes.join('\n'),
      items: built.items,
    });

    const docNo: string = res.data.docNo;
    const quotationUrl = `${this.flowAccount.appUrl}${res.data.url || `/quotations/${encodeURIComponent(docNo)}`}`;
    const publicUrl: string | null = res.data.publicUrl || null;
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { quotationDocNo: docNo, quotationUrl, quotationPublicUrl: publicUrl, quotationCreatedAt: new Date() },
    });
    return {
      booking: updated,
      docNo,
      quotationUrl,
      publicUrl,
      reused: !!res.reused,
      grandTotal: res.data.grandTotal,
      warnings: res.warnings || [],
    };
  }

  async create(dto: CreateBookingDto) {
    const phoneDigits = dto.phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 9) {
      throw new BadRequestException('กรุณากรอกเบอร์โทรให้ถูกต้อง');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.eventDate)) {
      throw new BadRequestException('กรุณาเลือกวันที่จัดงาน');
    }

    const calc = calcEstimatedTotal(
      {
        packageId: dto.packageId,
        foodMode: dto.foodMode,
        guests: dto.guests,
        tables: dto.tables,
        monks: dto.monks,
        selfTransport: dto.selfTransport,
        addons: dto.addons,
      },
      await this.getPricing(),
    );
    if (!calc) throw new BadRequestException('ไม่พบแพ็กเกจที่เลือก');

    const code = await this.nextCode();

    const booking = await this.prisma.booking.create({
      data: {
        code,
        occasion: dto.occasion,
        eventDate: dto.eventDate,
        timeSlot: dto.timeSlot,
        tambon: dto.tambon || null,
        amphoe: dto.amphoe || null,
        province: dto.province || null,
        zip: dto.zip || null,
        venue: dto.venue || null,
        packageId: dto.packageId,
        packageName: calc.pkg.name,
        foodMode: calc.pkg.kind === 'ceremony' ? 'none' : dto.foodMode,
        guests: dto.guests,
        tables: dto.tables,
        monks: dto.monks,
        selfTransport: dto.selfTransport,
        addons: dto.addons,
        budget: dto.budget || null,
        customerName: dto.name.trim(),
        phone: phoneDigits,
        note: dto.note || null,
        estimatedTotal: calc.total,
      },
    });

    // Create the real quotation in flowaccount-app right away so the customer gets a
    // public link on the final step. A failure must never break the booking itself —
    // sales can still create it later from the dashboard.
    try {
      const q = await this.createQuotation(booking.id);
      return { ...q.booking, quotationPublicUrl: q.publicUrl || q.booking.quotationPublicUrl };
    } catch (e: any) {
      console.warn(`[Bookings] auto quotation failed for ${booking.code}: ${e?.message || e}`);
      return booking;
    }
  }

  private async nextCode(): Promise<string> {
    const now = new Date();
    // Thai local date for the code prefix
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const yy = String(th.getUTCFullYear()).slice(2);
    const mm = String(th.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(th.getUTCDate()).padStart(2, '0');
    const prefix = `TB-${yy}${mm}${dd}-`;
    const todayCount = await this.prisma.booking.count({
      where: { code: { startsWith: prefix } },
    });
    return `${prefix}${String(todayCount + 1).padStart(3, '0')}`;
  }

  async list(status?: string) {
    const where =
      status && status !== 'ALL'
        ? { status: status as BookingStatus }
        : undefined;
    const [bookings, counts] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.booking.groupBy({ by: ['status'], _count: true }),
    ]);
    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const c of counts) {
      statusCounts[c.status] = c._count;
      total += c._count;
    }
    return { bookings, statusCounts, total };
  }

  async updateStatus(id: string, status: string) {
    if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    try {
      return await this.prisma.booking.update({
        where: { id },
        data: { status: status as BookingStatus },
      });
    } catch {
      throw new NotFoundException('Booking not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.booking.delete({ where: { id } });
      return { success: true };
    } catch {
      throw new NotFoundException('Booking not found');
    }
  }
}
