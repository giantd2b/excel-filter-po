import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { BookingStatus, Prisma } from '@prisma/client';
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
  estimateBooking,
  pickRemarkCode,
  DEFAULT_PRICING,
  type FaRecipeConfig,
  type FaCatalog,
  type DerivedPricing,
} from './packages.config';

const CATALOG_CACHE_KEY = 'fa_catalog_cache';
const CATALOG_TTL_MS = 5 * 60 * 1000;
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingPresetDto } from './dto/booking-preset.dto';
import { FlowAccountClient } from '../quotations/flowaccount.client';

const CHANNEL_LABELS: Record<string, string> = { LINE: 'LINE', FACEBOOK: 'Facebook' };
function channelLabel(channel: string, channelType?: string | null) {
  const pretty = channel.replace(/^(Line|FB)_/i, '').replace(/_/g, ' ');
  const type = CHANNEL_LABELS[String(channelType || '').toUpperCase()];
  return type ? `${type} ${pretty}` : pretty;
}

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

    const attributed = !!b.customerId;
    const notes = [
      b.note ? `หมายเหตุลูกค้า: ${b.note}` : '',
      b.budget ? `งบประมาณ: ${b.budget}` : '',
      `${b.source === 'chat_link' ? 'จองผ่านลิงก์จากแชต' : 'จองผ่านหน้าเว็บ'} ${b.code} · ราคาประเมิน ${b.estimatedTotal.toLocaleString('th-TH')} บาท`,
      `สถานที่จัดงาน: ${bookingAddress(b) || '-'}${b.floor ? ` · ${b.floor}` : ''}`,
      b.billingName ? `ผู้ติดต่อ: ${b.customerName} ${b.phone}` : '',
      attributed
        ? `ช่องทาง: ${b.channel || '-'} · ลูกค้าแชต: ${b.chatCustomerName || '-'} (${b.customerId})${b.salesName ? ` · เซลล์: ${b.salesName}` : ''}`
        : '',
    ].filter(Boolean);

    const res = await this.flowAccount.createQuotation({
      externalRef: b.code,
      customer: {
        name: b.billingName || b.customerName,
        phone: b.phone,
        address: b.customerAddress || bookingAddress(b),
        taxId: b.taxId && b.taxId.length === 13 ? b.taxId : undefined,
        // company quotation → the booker is the contact; else the chat name when it differs
        contactPerson: b.billingName
          ? b.customerName
          : b.chatCustomerName && b.chatCustomerName !== b.customerName
            ? b.chatCustomerName
            : undefined,
      },
      salesName: b.salesName || undefined,
      project: `${b.occasion} · ${b.eventDate} · ${b.timeSlot}${b.venue ? ` · ${b.venue}` : ''}${b.floor ? ` (${b.floor})` : ''}`,
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
    const attribution = await this.resolveAttribution(dto.ref, phoneDigits);

    const booking = await this.prisma.booking.create({
      data: {
        code,
        ...attribution,
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
        billingName: dto.billingName?.trim() && dto.billingName.trim() !== dto.name.trim() ? dto.billingName.trim() : null,
        taxId: dto.taxId?.replace(/[^0-9]/g, '') || null,
        billingLine: dto.billingLine?.trim() || null,
        billingTambon: dto.billingTambon || null,
        billingAmphoe: dto.billingAmphoe || null,
        billingProvince: dto.billingProvince || null,
        billingZip: dto.billingZip || null,
        customerAddress:
          bookingAddress({
            venue: dto.billingLine?.trim() || null,
            tambon: dto.billingTambon || null,
            amphoe: dto.billingAmphoe || null,
            province: dto.billingProvince || null,
            zip: dto.billingZip || null,
          }) || null,
        floor: dto.floor?.trim() || null,
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

  /**
   * Who is this booking from? A valid `ref` token wins (chat customer + channel + sales admin
   * who sent the link); otherwise fall back to matching a chat customer by phone number.
   */
  private async resolveAttribution(ref: string | undefined, phoneDigits: string) {
    if (ref) {
      const link = await this.prisma.bookingLink.findUnique({ where: { token: ref }, include: { customer: true } });
      if (link) {
        return {
          source: 'chat_link',
          customerId: link.customerId,
          linkId: link.id,
          channel: channelLabel(link.customer.channel, link.customer.channelType),
          chatCustomerName: link.customer.nickname || link.customer.displayName || link.customerName,
          salesId: link.createdById,
          salesName: link.createdByName,
        };
      }
      console.warn(`[Bookings] unknown booking link token ${ref}`);
    }
    const customer = await this.findCustomerByPhone(phoneDigits);
    if (customer) {
      return {
        source: 'web',
        customerId: customer.id,
        channel: channelLabel(customer.channel, customer.channelType),
        chatCustomerName: customer.nickname || customer.displayName,
      };
    }
    return { source: 'web' };
  }

  private async findCustomerByPhone(phoneDigits: string) {
    if (!phoneDigits) return null;
    return this.prisma.customer.findFirst({
      where: { OR: [{ phoneClean: phoneDigits }, { additionalPhones: { has: phoneDigits } }] },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  private bookingPublicUrl(token: string) {
    const base = (process.env.BOOKING_PUBLIC_URL || 'https://crm.iristermboon.com').replace(/\/$/, '');
    return `${base}/booking/?ref=${token}`;
  }

  private shapeLink(
    link: {
      token: string;
      customerName: string;
      channel: string;
      channelType: string;
      packageId: string | null;
      createdAt: Date;
      createdByName: string | null;
      openCount: number;
      lastOpenedAt: Date | null;
      preset?: any;
      packageName?: string | null;
      estimatedTotal?: number | null;
    },
    bookingCount: number,
  ) {
    return {
      token: link.token,
      url: this.bookingPublicUrl(link.token),
      customerName: link.customerName,
      channel: channelLabel(link.channel, link.channelType),
      packageId: link.packageId,
      preset: link.preset ?? null,
      packageName: link.packageName ?? null,
      estimatedTotal: link.estimatedTotal ?? null,
      createdAt: link.createdAt,
      createdByName: link.createdByName,
      openCount: link.openCount,
      lastOpenedAt: link.lastOpenedAt,
      bookingCount,
    };
  }

  /** Live estimate for a preset (same numbers the booking page shows). */
  async estimate(preset: BookingPresetDto) {
    const est = estimateBooking(preset, await this.getPricing());
    if (!est) throw new BadRequestException(`ไม่พบแพ็กเกจ "${preset.packageId}"`);
    return est;
  }

  /**
   * Booking link for a chat customer. Without a preset there is one stable link per
   * customer(+package); with a preset (sales fixed the whole package) every call makes a
   * fresh link so different offers to the same customer stay distinct.
   */
  async createLink(
    customerId: string | undefined,
    packageId: string | undefined,
    preset: BookingPresetDto | undefined,
    admin: { id?: string; name?: string },
  ) {
    if (!customerId) throw new BadRequestException('customerId is required');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (preset) {
      if (preset.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(preset.eventDate)) {
        throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง');
      }
      const est = await this.estimate(preset);
      const link = await this.prisma.bookingLink.create({
        data: {
          token: randomBytes(16).toString('base64url'),
          customerId,
          channel: customer.channel,
          channelType: customer.channelType,
          customerName: customer.nickname || customer.displayName,
          phone: customer.phoneClean || null,
          packageId: preset.packageId,
          preset: { ...preset } as any,
          packageName: est.packageName,
          estimatedTotal: est.total,
          createdById: admin.id || null,
          createdByName: admin.name || null,
        },
        include: { _count: { select: { bookings: true } } },
      });
      return this.shapeLink(link, link._count.bookings);
    }
    if (packageId && !BOOKING_PACKAGES.some((p) => p.id === packageId)) {
      throw new BadRequestException(`ไม่พบแพ็กเกจ "${packageId}"`);
    }
    const pkg = packageId || null;
    let link = await this.prisma.bookingLink.findFirst({
      where: { customerId, packageId: pkg, preset: { equals: Prisma.DbNull } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bookings: true } } },
    });
    if (!link) {
      link = await this.prisma.bookingLink.create({
        data: {
          token: randomBytes(16).toString('base64url'),
          customerId,
          channel: customer.channel,
          channelType: customer.channelType,
          customerName: customer.nickname || customer.displayName,
          phone: customer.phoneClean || null,
          packageId: pkg,
          createdById: admin.id || null,
          createdByName: admin.name || null,
        },
        include: { _count: { select: { bookings: true } } },
      });
    }
    return this.shapeLink(link, link._count.bookings);
  }

  /** Public prefill for the booking page; counts the open. */
  async linkInfo(token: string) {
    const link = await this.prisma.bookingLink.findUnique({ where: { token }, include: { customer: true } });
    if (!link) throw new NotFoundException('ไม่พบลิงก์จอง');
    await this.prisma.bookingLink.update({
      where: { id: link.id },
      data: { openCount: { increment: 1 }, lastOpenedAt: new Date() },
    });
    const c = link.customer;
    return {
      customerName: c.nickname || c.displayName || link.customerName,
      phone: c.phoneClean || link.phone || null,
      channel: channelLabel(c.channel, c.channelType),
      packageId: link.packageId,
      preset: link.preset ?? null,
      packageName: link.packageName ?? null,
      estimatedTotal: link.estimatedTotal ?? null,
    };
  }

  async listForCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const phones = [customer.phoneClean, ...(customer.additionalPhones || [])].filter((p): p is string => !!p);
    const [bookings, links] = await Promise.all([
      this.prisma.booking.findMany({
        where: { OR: [{ customerId }, ...(phones.length ? [{ phone: { in: phones } }] : [])] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.bookingLink.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { bookings: true } } },
      }),
    ]);
    return { bookings, links: links.map((l) => this.shapeLink(l, l._count.bookings)) };
  }

  async list(status?: string, source?: string, q?: string) {
    const and: any[] = [];
    if (status && status !== 'ALL') and.push({ status: status as BookingStatus });
    if (source === 'chat_link') and.push({ source: 'chat_link' });
    else if (source === 'web') and.push({ source: { not: 'chat_link' } });
    const term = (q || '').trim();
    if (term) {
      and.push({
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { customerName: { contains: term, mode: 'insensitive' } },
          { chatCustomerName: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term.replace(/[^0-9]/g, '') || term } },
          { quotationDocNo: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    const where = and.length ? { AND: and } : undefined;
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
