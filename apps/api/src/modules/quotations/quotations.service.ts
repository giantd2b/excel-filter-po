import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/providers/prisma.service';
import axios from 'axios';

// Thai month name → month number (0-based)
const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 0, 'มค': 0, 'มกราคม': 0, 'มกรา': 0,
  'ก.พ.': 1, 'กพ': 1, 'กุมภาพันธ์': 1, 'กุมภา': 1,
  'มี.ค.': 2, 'มีค': 2, 'มีนาคม': 2, 'มีนา': 2,
  'เม.ย.': 3, 'เมย': 3, 'เมษายน': 3, 'เมษา': 3,
  'พ.ค.': 4, 'พค': 4, 'พฤษภาคม': 4, 'พฤษภา': 4,
  'มิ.ย.': 5, 'มิย': 5, 'มิถุนายน': 5, 'มิถุนา': 5,
  'ก.ค.': 6, 'กค': 6, 'กรกฎาคม': 6, 'กรกฎา': 6,
  'ส.ค.': 7, 'สค': 7, 'สิงหาคม': 7, 'สิงหา': 7,
  'ก.ย.': 8, 'กย': 8, 'กันยายน': 8, 'กันยา': 8,
  'ต.ค.': 9, 'ตค': 9, 'ตุลาคม': 9, 'ตุลา': 9,
  'พ.ย.': 10, 'พย': 10, 'พฤศจิกายน': 10, 'พฤศจิกา': 10,
  'ธ.ค.': 11, 'ธค': 11, 'ธันวาคม': 11, 'ธันวา': 11,
};

function parseThaiJobDate(text: string): string | null {
  if (!text) return null;

  // Build month pattern from keys (sorted longest first to match "เมษายน" before "เมษา")
  const monthNames = Object.keys(THAI_MONTHS).sort((a, b) => b.length - a.length);
  const monthPattern = monthNames.map((m) => m.replace(/\./g, '\\.')).join('|');

  // Pattern: "วันที่ DD month YY" or just "DD month YY" or "DD/MM/YY"
  const regex = new RegExp(
    `(?:วันที่\\s*)?(?:ที่\\s*)?(\\d{1,2})\\s*(${monthPattern})\\.?\\s*(\\d{2,4})`,
    'i',
  );
  const match = text.match(regex);

  if (match) {
    const day = parseInt(match[1], 10);
    const monthKey = Object.keys(THAI_MONTHS).find(
      (k) => match[2].replace(/\.$/, '') === k.replace(/\.$/, '') || match[2] === k,
    );
    if (!monthKey) return null;
    const month = THAI_MONTHS[monthKey];
    let year = parseInt(match[3], 10);

    // Convert Thai Buddhist year
    if (year > 2500) year -= 543;        // Full BE year like 2569
    else if (year >= 60 && year <= 99) year += 1957; // Short BE like 69 → 2026
    else if (year < 60) year += 2000;    // Short CE like 26 → 2026

    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // "2026-04-28"
    }
  }

  return null;
}

interface QuotationRecord {
  docNo: string;
  date: string;
  customer: string;
  project: string;
  grandTotal: number;
  salesName: string;
  status: string;
  editUrl: string;
  // CRM match
  crmCustomerId?: string;
  crmDisplayName?: string;
  crmChannel?: string;
  crmChannelType?: string;
  phone?: string;
  daysSinceQuote?: number;
  jobDate?: string | null;
  daysUntilJob?: number | null;
  internalNotes?: string;
  contactPhone?: string;
}

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);
  private cache: { data: QuotationRecord[]; updatedAt: number } | null = null;
  private syncing = false;
  private manuallyLinked = new Set<string>(); // docNos linked via match page
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getPipeline(opts: {
    status?: string;
    search?: string;
    matched?: string;
    dateFrom?: string;
    page: number;
    limit: number;
  }) {
    // Serve stale cache immediately, trigger background sync if expired
    if (!this.cache) {
      // First load — must wait
      await this.syncFromFlowAccount();
    } else if (Date.now() - this.cache.updatedAt > this.CACHE_TTL && !this.syncing) {
      // Stale — sync in background, serve old data now
      this.syncFromFlowAccount().catch(() => {});
    }

    let data = this.cache?.data || [];

    // Filter by status
    if (opts.status && opts.status !== 'ทั้งหมด') {
      data = data.filter((q) => q.status === opts.status);
    }

    // Filter by CRM match
    if (opts.matched === 'yes') {
      data = data.filter((q) => q.crmCustomerId);
    } else if (opts.matched === 'no') {
      data = data.filter((q) => !q.crmCustomerId);
    }

    // Filter by date range
    if (opts.dateFrom) {
      data = data.filter((q) => q.date && q.date >= opts.dateFrom!);
    }

    // Search
    if (opts.search) {
      const query = opts.search.toLowerCase();
      data = data.filter(
        (q) =>
          q.customer?.toLowerCase().includes(query) ||
          q.project?.toLowerCase().includes(query) ||
          q.docNo?.toLowerCase().includes(query) ||
          q.salesName?.toLowerCase().includes(query) ||
          q.crmDisplayName?.toLowerCase().includes(query),
      );
    }

    const total = data.length;
    const totalPages = Math.ceil(total / opts.limit);
    const start = (opts.page - 1) * opts.limit;
    const paged = data.slice(start, start + opts.limit);

    return {
      data: paged,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages,
      updatedAt: this.cache?.updatedAt || 0,
    };
  }

  async getStats() {
    if (!this.cache || Date.now() - this.cache.updatedAt > this.CACHE_TTL) {
      await this.syncFromFlowAccount();
    }

    const data = this.cache?.data || [];
    const statusCounts: Record<string, number> = {};
    let totalValue = 0;
    let pendingValue = 0;

    data.forEach((q) => {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
      const amount = parseFloat(q.grandTotal) || 0;
      totalValue += amount;
      if (q.status === 'รออนุมัติ') {
        pendingValue += amount;
      }
    });

    return {
      total: data.length,
      statusCounts,
      totalValue,
      pendingValue,
      matchedToCrm: data.filter((q) => q.crmCustomerId).length,
    };
  }

  async debugUnmatched() {
    const data = this.cache?.data || [];
    const unmatched = data.filter((q) => !q.crmCustomerId && q.phone);

    const results: any[] = [];
    for (const q of unmatched.slice(0, 20)) {
      const phone = q.phone!.replace(/[^0-9]/g, '');
      // Check CRM for this phone
      const customers = await this.prisma.customer.findMany({
        where: {
          OR: [
            { phoneNumber: { contains: phone.slice(-9) } },
            { phoneClean: { contains: phone.slice(-9) } },
          ],
        },
        select: { id: true, displayName: true, phoneNumber: true, phoneClean: true, channel: true },
        take: 3,
      });

      results.push({
        docNo: q.docNo,
        faCustomer: q.customer,
        faPhone: q.phone,
        crmMatches: customers.map((c) => ({
          id: c.id,
          name: c.displayName,
          phone: c.phoneNumber,
          phoneClean: c.phoneClean,
          channel: c.channel,
        })),
        reason: customers.length === 0
          ? 'NO_CRM_CUSTOMER_WITH_THIS_PHONE'
          : `FOUND_${customers.length}_BUT_PHONE_FORMAT_MISMATCH`,
      });
    }

    return { total: unmatched.length, results };
  }

  analyzeUnmatched() {
    const data = this.cache?.data || [];
    const matched = data.filter((q) => q.crmCustomerId);
    const unmatched = data.filter((q) => !q.crmCustomerId);

    // Group by year-month
    const byMonth: Record<string, { matched: number; unmatched: number; total: number }> = {};
    data.forEach((q) => {
      const month = q.date ? q.date.substring(0, 7) : 'unknown';
      if (!byMonth[month]) byMonth[month] = { matched: 0, unmatched: 0, total: 0 };
      byMonth[month].total++;
      if (q.crmCustomerId) byMonth[month].matched++;
      else byMonth[month].unmatched++;
    });

    // Group unmatched by: has phone vs no phone
    const unmatchedWithPhone = unmatched.filter((q) => q.phone && q.phone.length >= 9).length;
    const unmatchedNoPhone = unmatched.length - unmatchedWithPhone;

    // Status breakdown of unmatched
    const unmatchedStatuses: Record<string, number> = {};
    unmatched.forEach((q) => {
      unmatchedStatuses[q.status] = (unmatchedStatuses[q.status] || 0) + 1;
    });

    // Sort months
    const sortedMonths = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, counts]) => ({
        month,
        ...counts,
        matchRate: Math.round((counts.matched / counts.total) * 100) + '%',
      }));

    return {
      summary: {
        total: data.length,
        matched: matched.length,
        unmatched: unmatched.length,
        matchRate: Math.round((matched.length / data.length) * 100) + '%',
        unmatchedWithPhone,
        unmatchedNoPhone,
      },
      unmatchedStatuses,
      byMonth: sortedMonths,
    };
  }

  getDebugStatuses() {
    const data = this.cache?.data || [];
    const statuses: Record<string, number> = {};
    data.forEach((q) => {
      statuses[q.status] = (statuses[q.status] || 0) + 1;
    });
    const matched = data.filter((q) => q.crmCustomerId).length;
    const unmatched = data.filter((q) => !q.crmCustomerId && !this.manuallyLinked.has(q.docNo));
    return {
      statuses,
      total: data.length,
      matched,
      unmatchedCount: unmatched.length,
      unmatchedSample: unmatched.slice(0, 20),
      manuallyLinkedCount: this.manuallyLinked.size,
    };
  }

  async syncFromFlowAccount() {
    if (this.syncing) return this.cache ? { total: this.cache.data.length, matched: 0, updatedAt: this.cache.updatedAt } : null;
    this.syncing = true;

    try {
    // Same base URL / key as FlowAccountClient (flowaccount.client.ts); no hardcoded fallback key
    const FA_URL = (process.env.FA_API_URL || 'https://honest-mindfulness-production.up.railway.app/api/v1').replace(/\/+$/, '');
    const FA_KEY = process.env.FA_API_KEY;
    if (!FA_KEY) {
      this.logger.warn('FA_API_KEY is not set — skipping FlowAccount sync');
      this.syncing = false;
      return null;
    }
    const headers = { 'X-Api-Key': FA_KEY };

    this.logger.log('Syncing all quotations from FlowAccount...');

    // Step 1: Fetch ALL quotations from FA API (paginated)
    const allFaQuotes: any[] = [];
    let page = 1;
    const limit = 100;
    let totalPages = 1;

    while (page <= totalPages) {
      try {
        const res = await axios.get(
          `${FA_URL}/quotations?page=${page}&limit=${limit}`,
          { headers, timeout: 15000 },
        );
        const body = res.data;
        if (body.data?.length > 0) {
          allFaQuotes.push(...body.data);
        }
        totalPages = body.totalPages || 1;
        page++;
      } catch (err: any) {
        this.logger.warn(`FA API page ${page} failed: ${err.message}`);
        break;
      }
    }

    this.logger.log(`Fetched ${allFaQuotes.length} quotations from FA API`);

    // Step 2: Build phone → CRM customer lookup map (primary + additional phones)
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { phoneNumber: { not: null } },
          { additionalPhones: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        phoneNumber: true,
        phoneClean: true,
        additionalPhones: true,
        channel: true,
        channelType: true,
      },
    });

    const phoneMap = new Map<string, typeof customers[0]>();
    for (const c of customers) {
      // Primary phone
      const phone = (c.phoneClean || c.phoneNumber || '').replace(/[-\s]/g, '');
      if (phone.length >= 9) {
        phoneMap.set(phone, c);
        if (phone.length === 10) phoneMap.set(phone.slice(1), c);
      }
      // Additional phones
      for (const ap of c.additionalPhones || []) {
        const clean = ap.replace(/[^0-9]/g, '');
        if (clean.length >= 9) {
          phoneMap.set(clean, c);
          if (clean.length === 10) phoneMap.set(clean.slice(1), c);
        }
      }
    }

    // Step 3: Map FA quotes to QuotationRecords, try CRM match
    const allQuotations: QuotationRecord[] = allFaQuotes.map((q) => {
      const daysSince = q.date
        ? Math.floor((Date.now() - new Date(q.date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Try to match to CRM by contact phone
      // Clean: strip "โทร.", "ต่อXXX", split on "/" for multi-phone
      const rawPhone = (q.contactPhone || '')
        .replace(/โทร\.?/g, '')
        .replace(/ต่อ\s*\d+/g, '')
        .trim();
      const phoneList = rawPhone.split(/[/,]/).map((p: string) => p.replace(/[^0-9]/g, '')).filter((p: string) => p.length >= 9);
      let crmMatch: typeof customers[0] | undefined;
      for (const ph of phoneList) {
        crmMatch = phoneMap.get(ph) || phoneMap.get(ph.slice(1));
        if (crmMatch) break;
      }
      const qPhone = phoneList[0] || rawPhone.replace(/[^0-9]/g, '');

      const jobDate = parseThaiJobDate(q.project || '');
      const daysUntilJob = jobDate
        ? Math.floor((new Date(jobDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        docNo: q.docNo,
        date: q.date,
        customer: q.customer,
        project: q.project,
        grandTotal: parseFloat(q.grandTotal) || 0,
        salesName: q.salesName || '',
        status: q.status || 'รออนุมัติ',
        editUrl: q.editUrl || '',
        crmCustomerId: crmMatch?.id,
        crmDisplayName: crmMatch ? (crmMatch.nickname || crmMatch.displayName) : undefined,
        crmChannel: crmMatch?.channel,
        crmChannelType: crmMatch ? (crmMatch.channelType === 'LINE' ? 'line' : 'facebook') : undefined,
        phone: qPhone || undefined,
        daysSinceQuote: daysSince,
        jobDate,
        daysUntilJob,
        internalNotes: q.internalNotes || '',
        contactPhone: q.contactPhone || '',
      };
    });

    // Sort by date descending
    allQuotations.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    this.cache = { data: allQuotations, updatedAt: Date.now() };

    const matched = allQuotations.filter((q) => q.crmCustomerId).length;
    this.logger.log(
      `Synced ${allQuotations.length} quotations, ${matched} matched to CRM`,
    );

    return {
      total: allQuotations.length,
      matched,
      updatedAt: this.cache.updatedAt,
    };
    } finally {
      this.syncing = false;
    }
  }

  async getUnmatchedWithCandidates(page: number, limit: number) {
    if (!this.cache) await this.syncFromFlowAccount();
    const data = this.cache?.data || [];

    // Get unmatched 2025+ quotations, exclude manually linked
    const unmatched = data.filter(
      (q) => !q.crmCustomerId && q.date >= '2025-01-01' && (q.internalNotes || q.contactPhone) && !this.manuallyLinked.has(q.docNo),
    );

    const total = unmatched.length;
    const paged = unmatched.slice((page - 1) * limit, page * limit);

    // For each, extract name hints from internalNotes and search CRM
    const results: any[] = [];

    for (const q of paged) {
      // Extract name from internalNotes patterns like "เพจ เติมบุญ / Pang'Puii Na" or "ไลน์ไอริส Nattakan"
      const channelNames = ['ไอริส', 'เติมบุญ', 'ชล', 'โต๊ะจีน', 'ไอริสเติมบุญ', 'ทดสอบระบบ', 'IRIS', 'Chon'];
      const stripChannel = (name: string) => {
        let cleaned = name;
        for (const ch of channelNames) {
          cleaned = cleaned.replace(new RegExp(ch, 'gi'), '').trim();
        }
        return cleaned.replace(/^[\s/]+|[\s/]+$/g, '').trim();
      };

      const nameHints: string[] = [];
      if (q.internalNotes) {
        // Pattern: "/ Name" at end
        const slashMatch = q.internalNotes.match(/\/\s*(.+?)(?:\n|$)/);
        if (slashMatch) nameHints.push(slashMatch[1].trim());

        // Pattern: "ไลน์[channel] Name" or "เพจ[channel] / Name"
        const lineMatch = q.internalNotes.match(/(?:ไลน์|line|เพจ|fb|facebook)\s*\S*\s+(.+?)(?:\n|$)/i);
        if (lineMatch) {
          const extracted = stripChannel(lineMatch[1].trim());
          if (extracted.length >= 2) nameHints.push(extracted);
        }

        // Pattern: "ไลน์ChannelName Name" (no space between ไลน์ and channel)
        const noSpaceMatch = q.internalNotes.match(/(?:ไลน์|เพจ)(?:ไอริส|เติมบุญ|ชล|โต๊ะจีน|ไอริสเติมบุญ)\s+(.+?)(?:\n|$)/i);
        if (noSpaceMatch) nameHints.push(noSpaceMatch[1].trim());

        // Fallback: first line, stripped of channel/platform prefixes
        const firstLine = q.internalNotes.split('\n')[0].trim();
        const cleanedFirst = stripChannel(
          firstLine.replace(/^(ไลน์|line|เพจ|fb|facebook)\s*/i, ''),
        );
        if (cleanedFirst.length >= 3) nameHints.push(cleanedFirst);
      }

      // Also use customer name from FA
      if (q.customer) {
        const cleanName = q.customer.replace(/^(คุณ|บริษัท|ห้างหุ้นส่วน|นาย|นาง|น\.ส\.)\s*/g, '').trim();
        if (cleanName.length >= 3) nameHints.push(cleanName);
      }

      // Deduplicate hints
      const uniqueHints = [...new Set(nameHints.filter(h => h.length >= 2))];

      // Search CRM for candidates
      const candidates: any[] = [];
      const seenIds = new Set<string>();

      for (const hint of uniqueHints.slice(0, 5)) {
        if (!hint || hint.length < 3) continue;
        try {
          const found = await this.prisma.customer.findMany({
            where: {
              OR: [
                { displayName: { contains: hint, mode: 'insensitive' } },
                { nickname: { contains: hint, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              displayName: true,
              nickname: true,
              phoneNumber: true,
              channel: true,
              channelType: true,
              pictureUrl: true,
              lastMessageAt: true,
            },
            take: 5,
          });

          for (const c of found) {
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              candidates.push({
                ...c,
                channelType: c.channelType === 'LINE' ? 'line' : 'facebook',
                matchedBy: hint,
              });
            }
          }
        } catch {
          // skip
        }
      }

      results.push({
        docNo: q.docNo,
        date: q.date,
        customer: q.customer,
        project: q.project,
        grandTotal: q.grandTotal,
        salesName: q.salesName,
        status: q.status,
        editUrl: q.editUrl,
        contactPhone: q.contactPhone,
        internalNotes: q.internalNotes,
        jobDate: q.jobDate,
        candidates,
      });
    }

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async linkPhoneToCustomer(phone: string, customerId: string, docNo?: string) {
    // Always mark as linked first, even if phone is invalid
    if (docNo) this.manuallyLinked.add(docNo);

    // Strip extension (ต่อ, ext) before cleaning
    const stripped = (phone || '').replace(/ต่อ\s*\d+/g, '').replace(/ext\.?\s*\d+/gi, '').trim();
    const clean = stripped.replace(/[^0-9]/g, '');
    if (clean.length < 9) {
      this.logger.log(`linkPhoneToCustomer: no valid phone, but marked docNo=${docNo} as linked`);
      return { success: true, phone: clean, customerId, note: 'linked without phone' };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, displayName: true, nickname: true, phoneNumber: true, phoneClean: true, additionalPhones: true, channel: true, channelType: true },
    });
    if (!customer) return { error: 'Customer not found' };

    // If no primary phone, set it
    if (!customer.phoneNumber) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { phoneNumber: clean, phoneClean: clean },
      });
    } else {
      // Add to additional phones if not already there
      const existing = new Set([
        customer.phoneClean || '',
        customer.phoneNumber?.replace(/[^0-9]/g, '') || '',
        ...(customer.additionalPhones || []),
      ]);
      if (!existing.has(clean)) {
        await this.prisma.customer.update({
          where: { id: customerId },
          data: { additionalPhones: [...(customer.additionalPhones || []), clean] },
        });
      }
    }

    this.logger.log(`linkPhoneToCustomer: phone=${clean} customer=${customerId} docNo=${docNo || 'NONE'} manuallyLinked=${this.manuallyLinked.size}`);

    return { success: true, phone: clean, customerId };
  }

  markAsLinked(docNo: string) {
    this.manuallyLinked.add(docNo);
  }

  // Auto-sync every 30 minutes
  @Cron('0 */30 * * * *')
  async handleCron() {
    try {
      await this.syncFromFlowAccount();
    } catch (err: any) {
      this.logger.error(`Quotation sync failed: ${err.message}`);
    }
  }
}
