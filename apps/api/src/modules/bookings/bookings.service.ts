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
  VAT_RATE,
  DEFAULT_DEPOSIT_RULE,
  type DepositRule,
  TRAVEL_FEES_SETTING_KEY,
  DEFAULT_TRAVEL_FEES,
  type TravelFeeConfig,
  mergeTravelFees,
  travelFeeFor,
  travelAreaLabel,
  isServiceProvince,
  SERVICE_AREA_TEXT,
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
import { UpdateBookingDto } from './dto/update-booking.dto';
import { FlowAccountClient } from '../quotations/flowaccount.client';
import { MessagesService } from '../messages/messages.service';
import { sendNewBookingAlert } from './booking-alert';
import { channelLabel } from '../../common/utils/channel-label';
import { composeQuotationChatMessage } from '../quotations/quotation-chat';

/** "2026-09-30" → "พ. 30 ก.ย. 2569" without going through Date timezone maths. */
function fmtThaiDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${months[mo - 1]} ${y + 543}`;
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
    private readonly messages: MessagesService,
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
      depositRule: await this.getDepositRule(force),
      travelFees: (await this.getTravelFees()).fees,
    };
  }

  // ── Travel fee by district of the event venue (editable from the dashboard) ──

  async getTravelFees(): Promise<TravelFeeConfig> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: TRAVEL_FEES_SETTING_KEY } });
    if (!row?.value) return { fees: { ...DEFAULT_TRAVEL_FEES.fees } };
    try {
      return mergeTravelFees(JSON.parse(row.value));
    } catch {
      return { fees: { ...DEFAULT_TRAVEL_FEES.fees } };
    }
  }

  async saveTravelFees(input: Partial<TravelFeeConfig>): Promise<TravelFeeConfig> {
    const merged = mergeTravelFees(input);
    await this.prisma.systemSetting.upsert({
      where: { key: TRAVEL_FEES_SETTING_KEY },
      update: { value: JSON.stringify(merged) },
      create: { key: TRAVEL_FEES_SETTING_KEY, value: JSON.stringify(merged) },
    });
    return merged;
  }

  async travelFeeSettings() {
    return { config: await this.getTravelFees(), defaults: DEFAULT_TRAVEL_FEES };
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
        travelFee: b.travelFee || 0,
        travelArea: b.travelArea || travelAreaLabel(b.amphoe, b.province) || undefined,
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
      b.travelFee ? `ค่าเดินทาง: ${b.travelArea || '-'} ${b.travelFee.toLocaleString('th-TH')} บาท (รวมในราคาประเมินแล้ว)` : '',
      typeof b.wantVat === 'boolean' ? (b.wantVat ? 'ลูกค้าต้องการใบกำกับภาษี (VAT 7%)' : 'ลูกค้าไม่รับ VAT') : '',
      b.depositAmount != null ? `มัดจำ: ${b.depositAmount.toLocaleString('th-TH')} บาท (${b.depositManual ? 'แอดมินระบุเอง' : 'ตามกติกาค่าอาหาร'})` : '',
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
      // company quotation → company bank account template on the document; else the personal one
      customerType: b.billingName || (b.taxId && b.taxId.startsWith('0') && b.taxId.length === 13) ? 'COMPANY' : 'PERSON',
      salesName: b.salesName || undefined,
      // structured attribution stored on the document (the CRM reads it back to track every quotation)
      ...(attributed
        ? {
            crmCustomerId: b.customerId,
            crmChannel: b.channel || undefined,
            crmChatName: b.chatCustomerName || undefined,
            crmSalesId: b.salesId || undefined,
            crmSalesName: b.salesName || undefined,
          }
        : {}),
      ...(b.depositManual && b.depositAmount != null ? { depositAmount: b.depositAmount } : {}),
      project: `${b.occasion} · ${b.eventDate} · ${b.timeSlot}${b.venue ? ` · ${b.venue}` : ''}${b.floor ? ` (${b.floor})` : ''}`,
      // printed prominently on the document
      eventDate: b.eventDate,
      eventTime: b.timeSlot,
      // the customer's tax-invoice choice wins over the recipe default
      vatRate: typeof b.wantVat === 'boolean' ? (b.wantVat ? 7 : 0) : built.vatRate,
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
    // documents created before attribution existed: backfill it when the booking is re-opened
    if (res.reused && attributed && !res.data.crmCustomerId) {
      try {
        await this.flowAccount.patchCrm(docNo, {
          crmCustomerId: b.customerId!,
          crmChannel: b.channel || undefined,
          crmChatName: b.chatCustomerName || undefined,
          crmSalesId: b.salesId || undefined,
          crmSalesName: b.salesName || undefined,
        });
      } catch (e: any) {
        console.warn(`[Bookings] crm backfill failed for ${docNo}: ${e?.message || e}`);
      }
    }
    const quotationUrl = `${this.flowAccount.appUrl}${res.data.url || `/quotations/${encodeURIComponent(docNo)}`}`;
    const publicUrl: string | null = res.data.publicUrl || null;
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { quotationDocNo: docNo, quotationUrl, quotationPublicUrl: publicUrl, quotationCreatedAt: new Date() },
    });

    // Bookings made through a chat link: drop the public link straight into that chat so the
    // customer keeps it (they usually opened the form in the LINE/FB in-app browser).
    if (updated.source === 'chat_link' && publicUrl && !updated.quotationSentAt) {
      try {
        await this.sendQuotationToChat(id);
      } catch (e: any) {
        console.warn(`[Bookings] chat push failed for ${updated.code}: ${e?.message || e}`);
      }
    }
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
    // the address printed on the quotation must carry ตำบล/อำเภอ/จังหวัด — typing a house number
    // without picking an area from the search list produced quotations with only "23 หมู่ 1"
    if (!(dto.billingTambon || dto.tambon) || !(dto.billingProvince || dto.province)) {
      throw new BadRequestException('กรุณาเลือกตำบล/อำเภอ/จังหวัดจากรายการค้นหา ที่อยู่ในใบเสนอราคาต้องมีตำบล อำเภอ และจังหวัด');
    }
    // the EVENT VENUE must be inside the service area (dto.province = venue; quick form copies billing → venue)
    if (!isServiceProvince(dto.province || dto.billingProvince)) {
      throw new BadRequestException(`สถานที่จัดงานอยู่นอกพื้นที่บริการ — เรารับจัดงานใน ${SERVICE_AREA_TEXT} กรุณาติดต่อทีมงานทาง LINE`);
    }

    // travel fee follows the EVENT VENUE district (dto.amphoe); the quick form copies the billing
    // address onto the venue when "same address" is ticked, so dto.amphoe is always the venue
    const travelFee = travelFeeFor(dto.amphoe, await this.getTravelFees());
    const travelArea = travelFee > 0 ? travelAreaLabel(dto.amphoe, dto.province) : null;
    const calc = calcEstimatedTotal(
      {
        packageId: dto.packageId,
        foodMode: dto.foodMode,
        guests: dto.guests,
        tables: dto.tables,
        monks: dto.monks,
        selfTransport: dto.selfTransport,
        addons: dto.addons,
        travelFee,
        travelArea: travelArea || undefined,
      },
      await this.getPricing(),
    );
    if (!calc) throw new BadRequestException('ไม่พบแพ็กเกจที่เลือก');

    const code = await this.nextCode();
    const attribution = await this.resolveAttribution(dto.ref, phoneDigits);
    const preset = attribution.linkId ? ((await this.prisma.bookingLink.findUnique({ where: { id: attribution.linkId } }))?.preset as any) : null;
    const est = estimateBooking(
      { packageId: dto.packageId, foodMode: dto.foodMode, guests: dto.guests, tables: dto.tables, monks: dto.monks, selfTransport: dto.selfTransport, addons: dto.addons, travelFee, travelArea: travelArea || undefined, depositAmount: typeof preset?.depositAmount === 'number' ? preset.depositAmount : undefined },
      await this.getPricing(),
      await this.getDepositRule(),
    );

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
        wantVat: typeof dto.wantVat === 'boolean' ? dto.wantVat : null,
        depositAmount: est?.depositAmount ?? null,
        depositManual: !!est?.depositManual,
        note: dto.note || null,
        estimatedTotal: calc.total,
        travelFee,
        travelArea,
      },
    });

    // Create the real quotation in flowaccount-app right away so the customer gets a
    // public link on the final step. A failure must never break the booking itself —
    // sales can still create it later from the dashboard.
    let result: any = booking;
    try {
      const q = await this.createQuotation(booking.id);
      result = { ...q.booking, quotationPublicUrl: q.publicUrl || q.booking.quotationPublicUrl };
    } catch (e: any) {
      console.warn(`[Bookings] auto quotation failed for ${booking.code}: ${e?.message || e}`);
    }
    // Team alert into the IRIS BOT LINE group — detached, never fails the booking
    sendNewBookingAlert(result).catch(() => {});
    return result;
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
      depositAmount?: number | null;
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
      depositAmount: link.depositAmount ?? null,
      createdAt: link.createdAt,
      createdByName: link.createdByName,
      openCount: link.openCount,
      lastOpenedAt: link.lastOpenedAt,
      bookingCount,
    };
  }

  private depositRuleCache: { rule: DepositRule; at: number } | null = null;

  /** flowaccount-app's deposit rule (5-minute cache; defaults when FA is unreachable). */
  async getDepositRule(force = false): Promise<DepositRule> {
    if (!force && this.depositRuleCache && Date.now() - this.depositRuleCache.at < CATALOG_TTL_MS) return this.depositRuleCache.rule;
    try {
      const rule = await this.flowAccount.getDepositRule();
      if (rule?.tiers?.length) {
        this.depositRuleCache = { rule, at: Date.now() };
        return rule;
      }
    } catch (e: any) {
      console.warn(`[Bookings] deposit rule unavailable: ${e?.message || e}`);
    }
    return this.depositRuleCache?.rule || DEFAULT_DEPOSIT_RULE;
  }

  /** Live estimate for a preset (same numbers the booking page shows). */
  async estimate(preset: BookingPresetDto) {
    const travelFee = travelFeeFor(preset.amphoe, await this.getTravelFees());
    const est = estimateBooking(
      { ...preset, travelFee, travelArea: travelFee > 0 ? travelAreaLabel(preset.amphoe, preset.province) : undefined },
      await this.getPricing(),
      await this.getDepositRule(),
    );
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
          depositAmount: est.depositAmount,
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
      depositAmount: link.depositAmount ?? null,
    };
  }

  /**
   * Push the public quotation link into the customer's LINE/Facebook chat via the same
   * pipeline sales use from the inbox. Delivery is asynchronous: the returned Message row's
   * status becomes sent/failed and is surfaced as `quotationSendStatus` in the lists.
   */
  async sendQuotationToChat(id: string, opts: { force?: boolean } = {}) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!b.quotationPublicUrl) throw new BadRequestException('ยังไม่มีใบเสนอราคาสำหรับการจองนี้');
    if (!b.customerId) throw new BadRequestException('การจองนี้ไม่ได้ผูกกับลูกค้าในแชต');
    if (b.quotationSentAt && !opts.force) {
      return { sent: true, messageId: b.quotationMessageId, sentAt: b.quotationSentAt, reused: true };
    }
    const c = await this.prisma.customer.findUnique({ where: { id: b.customerId } });
    if (!c) throw new NotFoundException('ไม่พบลูกค้าในแชต');

    const text = composeQuotationChatMessage({
      docNo: b.quotationDocNo || '',
      publicUrl: b.quotationPublicUrl,
      headline: ` สำหรับ${b.occasion} วันที่ ${fmtThaiDate(b.eventDate)}`,
      totalLine: b.wantVat
        ? `ยอดประเมิน ${Math.round(b.estimatedTotal * (1 + VAT_RATE)).toLocaleString('th-TH')} บาท (รวม VAT 7%)`
        : `ยอดประเมิน ${b.estimatedTotal.toLocaleString('th-TH')} บาท (ไม่รวม VAT)`,
      depositLine: b.depositAmount != null
        ? `มัดจำ ${b.depositAmount.toLocaleString('th-TH')} บาท เพื่อยืนยันคิว · การจองจะสมบูรณ์เมื่อชำระมัดจำ ทีมงานจะแจ้งขั้นตอนต่อไปค่ะ`
        : 'การจองจะสมบูรณ์เมื่อชำระมัดจำ ทีมงานจะแจ้งขั้นตอนต่อไปค่ะ',
    });

    const res = await this.messages.sendMessage({
      oduserId: c.platformUserId,
      docId: c.id,
      channel: c.channel,
      text,
      adminId: b.salesId || undefined,
      adminName: b.salesName || 'IRIS เติมบุญ (อัตโนมัติ)',
      tag: 'CONFIRMED_EVENT_UPDATE',
    });
    const sentAt = new Date();
    await this.prisma.booking.update({
      where: { id },
      data: { quotationSentAt: sentAt, quotationMessageId: res.messageId },
    });
    return { sent: true, messageId: res.messageId, sentAt, reused: false };
  }

  /** Attach the delivery status of the pushed quotation link (from the Message row). */
  private async withSendStatus<T extends { quotationMessageId: string | null }>(bookings: T[]) {
    const ids = bookings.map((b) => b.quotationMessageId).filter((x): x is string => !!x);
    if (!ids.length) return bookings.map((b) => ({ ...b, quotationSendStatus: null as string | null }));
    const rows = await this.prisma.message.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    const byId = new Map(rows.map((r) => [r.id, r.status]));
    return bookings.map((b) => ({
      ...b,
      quotationSendStatus: b.quotationMessageId ? byId.get(b.quotationMessageId) || 'sending' : null,
    }));
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
    return { bookings: await this.withSendStatus(bookings), links: links.map((l) => this.shapeLink(l, l._count.bookings)) };
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
    return { bookings: await this.withSendStatus(bookings), statusCounts, total };
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

  /**
   * Sales corrects contact / date / venue / billing details. Re-derives the travel fee and the
   * estimate, and pushes date / time / address / phone into the linked quotation while it is still
   * open. Returns warnings the dashboard shows (e.g. quotation already approved, travel fee changed).
   */
  async update(id: string, dto: UpdateBookingDto) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    const warnings: string[] = [];
    const str = (v: string | undefined) => (typeof v === 'string' ? v.trim() : undefined);

    const next = {
      customerName: str(dto.customerName) || b.customerName,
      phone: str(dto.phone) || b.phone,
      occasion: str(dto.occasion) || b.occasion,
      eventDate: dto.eventDate || b.eventDate,
      timeSlot: str(dto.timeSlot) || b.timeSlot,
      venue: dto.venue !== undefined ? str(dto.venue) || null : b.venue,
      tambon: dto.tambon !== undefined ? str(dto.tambon) || null : b.tambon,
      amphoe: dto.amphoe !== undefined ? str(dto.amphoe) || null : b.amphoe,
      province: dto.province !== undefined ? str(dto.province) || null : b.province,
      zip: dto.zip !== undefined ? str(dto.zip) || null : b.zip,
      floor: dto.floor !== undefined ? str(dto.floor) || null : b.floor,
      billingName: dto.billingName !== undefined ? str(dto.billingName) || null : b.billingName,
      taxId: dto.taxId !== undefined ? (dto.taxId.replace(/[^0-9]/g, '') || null) : b.taxId,
      billingLine: dto.billingLine !== undefined ? str(dto.billingLine) || null : b.billingLine,
      billingTambon: dto.billingTambon !== undefined ? str(dto.billingTambon) || null : b.billingTambon,
      billingAmphoe: dto.billingAmphoe !== undefined ? str(dto.billingAmphoe) || null : b.billingAmphoe,
      billingProvince: dto.billingProvince !== undefined ? str(dto.billingProvince) || null : b.billingProvince,
      billingZip: dto.billingZip !== undefined ? str(dto.billingZip) || null : b.billingZip,
      wantVat: dto.wantVat !== undefined ? dto.wantVat : b.wantVat,
      note: dto.note !== undefined ? str(dto.note) || null : b.note,
    };
    if (next.billingName && next.billingName === next.customerName) next.billingName = null;
    if (next.phone.replace(/[^0-9]/g, '').length < 9) throw new BadRequestException('เบอร์โทรไม่ถูกต้อง');
    if (!isServiceProvince(next.province || next.billingProvince)) {
      throw new BadRequestException(`สถานที่จัดงานอยู่นอกพื้นที่บริการ — เรารับจัดงานใน ${SERVICE_AREA_TEXT}`);
    }

    // travel fee + estimate follow the (possibly new) venue district
    const travelFee = travelFeeFor(next.amphoe, await this.getTravelFees());
    const travelArea = travelFee > 0 ? travelAreaLabel(next.amphoe, next.province) : null;
    const calc = calcEstimatedTotal(
      { packageId: b.packageId, foodMode: b.foodMode, guests: b.guests, tables: b.tables, monks: b.monks, selfTransport: b.selfTransport, addons: b.addons, travelFee, travelArea: travelArea || undefined },
      await this.getPricing(),
    );
    const estimatedTotal = calc?.total ?? b.estimatedTotal;
    if ((b.travelFee || 0) !== travelFee) warnings.push(`ค่าเดินทางเปลี่ยนจาก ${(b.travelFee || 0).toLocaleString('th-TH')} เป็น ${travelFee.toLocaleString('th-TH')} บาท — รายการในใบเสนอราคาไม่ได้แก้อัตโนมัติ กรุณาแก้บรรทัดค่าเดินทางใน IRIS Quotation`);

    const customerAddress = bookingAddress({ venue: next.billingLine, tambon: next.billingTambon, amphoe: next.billingAmphoe, province: next.billingProvince, zip: next.billingZip }) || null;
    const updated = await this.prisma.booking.update({ where: { id }, data: { ...next, customerAddress, travelFee, travelArea, estimatedTotal } });

    // keep the open quotation in step (date / time / address / phone / project line)
    if (updated.quotationDocNo && this.flowAccount.isConfigured) {
      try {
        await this.flowAccount.updateDetails(updated.quotationDocNo, {
          eventDate: updated.eventDate,
          eventTime: updated.timeSlot,
          contactPhone: updated.phone,
          contactAddress: updated.customerAddress || bookingAddress(updated),
          project: `${updated.occasion} · ${updated.eventDate} · ${updated.timeSlot}${updated.venue ? ` · ${updated.venue}` : ''}${updated.floor ? ` (${updated.floor})` : ''}`,
          internalNotesAppend: `แก้จาก CRM ${new Date().toISOString().slice(0, 10)}: สถานที่จัดงาน ${bookingAddress(updated) || '-'}${updated.floor ? ` · ${updated.floor}` : ''}`,
        });
      } catch (e: any) {
        warnings.push(`ใบเสนอราคา ${updated.quotationDocNo} ไม่ได้อัปเดต: ${e?.message || e}`);
      }
    }
    return { booking: (await this.withSendStatus([updated]))[0], warnings };
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
