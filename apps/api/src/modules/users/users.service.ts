import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/providers/prisma.service';
import { InboxGateway } from '../inbox-gateway/inbox-gateway.gateway';
import { InboxStatsService } from '../inbox-gateway/inbox-stats.service';
import { getLineAccessToken, getFacebookPageToken } from '../../common/utils/channel-tokens';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly inboxStats: InboxStatsService,
  ) {}

  async findAll(limit = 50, startAfter?: string, channel?: string, search?: string) {
    const where: any = {};
    if (channel) where.channel = channel;
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { phoneClean: { contains: search } },
        { platformUserId: { contains: search } },
      ];
    }

    const cursor = startAfter ? { id: startAfter } : undefined;
    const skip = startAfter ? 1 : 0;

    return this.prisma.customer.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip,
      cursor,
    });
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async getStats(month?: string) {
    // month format: "2026-03" — if provided, filter by firstContactAt in that month
    let dateFilter: any = undefined;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      dateFilter = { firstContactAt: { gte: start, lt: end } };
    }

    const where = dateFilter || {};

    const [total, line, facebook] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.count({ where: { ...where, channelType: 'LINE' } }),
      this.prisma.customer.count({ where: { ...where, channelType: 'FACEBOOK' } }),
    ]);

    const channelCounts = await this.prisma.customer.groupBy({
      by: ['channel'],
      where,
      _count: true,
    });

    const channels: Record<string, number> = {};
    channelCounts.forEach((c) => {
      channels[c.channel] = c._count;
    });

    // Message counts for the period
    let messageFilter: any = undefined;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      const startMs = new Date(y, m - 1, 1).getTime();
      const endMs = new Date(y, m, 1).getTime();
      messageFilter = { timestamp: { gte: BigInt(startMs), lt: BigInt(endMs) } };
    }
    const msgWhere = messageFilter || {};
    const [totalMessages, incomingMessages, outgoingMessages] = await Promise.all([
      this.prisma.message.count({ where: msgWhere }),
      this.prisma.message.count({ where: { ...msgWhere, type: 'INCOMING' } }),
      this.prisma.message.count({ where: { ...msgWhere, type: 'OUTGOING' } }),
    ]);

    return { total, line, facebook, channels, totalMessages, incomingMessages, outgoingMessages };
  }

  async getNewCustomers(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.customer.findMany({
      where: { firstContactAt: { gte: cutoff } },
      orderBy: { firstContactAt: 'desc' },
    });
  }

  async getCustomerDetails(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) return null;

    const [totalMessages, recentSlips] = await Promise.all([
      this.prisma.message.count({ where: { customerId: id } }),
      this.prisma.slip.findMany({
        where: { customerId: id },
        orderBy: { detectedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          imageUrl: true,
          amount: true,
          bankName: true,
          dateTime: true,
          senderName: true,
          detectedAt: true,
        },
      }),
    ]);

    return {
      ...customer,
      totalMessages,
      recentSlips: recentSlips.map((s) => ({
        ...s,
        amount: s.amount ? Number(s.amount) : null,
      })),
    };
  }

  async markAsRead(userId: string) {
    const customer = await this.prisma.customer.update({
      where: { id: userId },
      data: { unreadCount: 0 },
    });

    // Broadcast updated conversation to all dashboard clients
    this.inboxGateway.emitConversationUpdated({
      id: customer.id,
      oduserId: customer.platformUserId,
      displayName: customer.displayName,
      pictureUrl: customer.pictureUrl || '',
      channel: customer.channel,
      lastmessagetime: customer.lastMessageAt?.getTime() || 0,
      lastMessagePreview: customer.lastMessagePreview || '',
      unreadCount: 0,
    });
    this.inboxStats.refreshAndBroadcast();

    // Mark as read on platform (fire-and-forget)
    this.markAsReadOnPlatform(customer).catch(() => {});

    return { success: true };
  }

  /**
   * Mark messages as read on LINE / Facebook platforms.
   */
  private async markAsReadOnPlatform(customer: any) {
    const channel = customer.channel || '';

    if (channel.startsWith('Line_') && customer.markAsReadToken) {
      // LINE: Mark as Read API
      try {
        const accessToken = getLineAccessToken(channel);
        await axios.post(
          'https://api.line.me/v2/bot/chat/markAsRead',
          { markAsReadToken: customer.markAsReadToken },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        this.logger.log(`Marked as read on LINE for ${customer.id}`);
      } catch (err: any) {
        this.logger.warn(`LINE markAsRead failed: ${err.response?.data?.message || err.message}`);
      }
    } else if (channel.startsWith('FB_')) {
      // Facebook: Send mark_seen action
      try {
        const pageToken = getFacebookPageToken(channel);
        await axios.post(
          'https://graph.facebook.com/v18.0/me/messages',
          {
            recipient: { id: customer.platformUserId },
            sender_action: 'mark_seen',
          },
          { params: { access_token: pageToken } },
        );
        this.logger.log(`Marked as seen on Facebook for ${customer.id}`);
      } catch (err: any) {
        this.logger.warn(`FB mark_seen failed: ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }

  // ─── CRM: Tags ────────────────────────────────────────────────

  async addTag(customerId: string, tagName: string, color = '#6366f1') {
    const tag = await this.prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName, color },
    });

    await this.prisma.customerTag.upsert({
      where: { customerId_tagId: { customerId, tagId: tag.id } },
      update: {},
      create: { customerId, tagId: tag.id },
    });

    return tag;
  }

  async removeTag(customerId: string, tagId: string) {
    await this.prisma.customerTag.deleteMany({
      where: { customerId, tagId },
    });
    return { success: true };
  }

  async getAllTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  // ─── CRM: Notes ───────────────────────────────────────────────

  async addNote(customerId: string, text: string, authorId: string, authorName: string) {
    return this.prisma.note.create({
      data: { customerId, text, authorId, authorName },
    });
  }

  async getNotes(customerId: string) {
    return this.prisma.note.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteNote(noteId: string) {
    await this.prisma.note.delete({ where: { id: noteId } });
    return { success: true };
  }

  // ─── CRM: Assignment & Status ─────────────────────────────────

  async assignTo(customerId: string, adminId: string, adminName: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { assignedToId: adminId, assignedToName: adminName, assignedAt: new Date() },
    });
  }

  async unassign(customerId: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { assignedToId: null, assignedToName: null, assignedAt: null },
    });
  }

  async getCustomerQuotations(customerId: string) {
    const FA_URL = 'https://honest-mindfulness-production.up.railway.app/api/v1';
    const FA_KEY = process.env.FA_API_KEY || 'iris-fa-2026-secret';

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { phoneNumber: true, phoneClean: true, displayName: true, nickname: true },
    });
    if (!customer) return { data: [], total: 0 };

    const headers = { 'X-Api-Key': FA_KEY };
    const results: any[] = [];

    try {
      // Try phone match first
      const phone = customer.phoneClean || customer.phoneNumber?.replace(/[-\s]/g, '');
      if (phone) {
        const res = await axios.get(`${FA_URL}/match/phone/${phone}`, { headers, timeout: 10000 });
        if (res.data?.data?.length > 0) {
          results.push(...res.data.data);
        }
      }

      // Also try name match if few results
      if (results.length < 3) {
        const name = customer.nickname || customer.displayName;
        if (name && name.length >= 3) {
          const res = await axios.get(`${FA_URL}/match/name/${encodeURIComponent(name)}`, { headers, timeout: 10000 });
          const nameResults = res.data?.data || [];
          // Deduplicate by docNo
          const existingDocs = new Set(results.map((r: any) => r.docNo));
          nameResults.forEach((q: any) => {
            if (!existingDocs.has(q.docNo)) results.push(q);
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`FlowAccount lookup failed: ${err.message}`);
    }

    return {
      data: results.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')),
      total: results.length,
    };
  }

  async markAllAsRead(where: any) {
    const result = await this.prisma.customer.updateMany({
      where,
      data: { unreadCount: 0 },
    });
    this.inboxStats.refreshAndBroadcast();
    return result.count;
  }

  async setNickname(customerId: string, nickname: string | null) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { nickname: nickname?.trim() || null },
    });
  }

  async setStatus(customerId: string, status: 'OPEN' | 'FOLLOW_UP' | 'RESOLVED') {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { status },
    });
  }

  async togglePin(customerId: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { isPinned: true },
    });
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { isPinned: !customer.isPinned },
    });
  }

  /** IRIS Jobs API key — env only. The old hardcoded fallback key leaked into
   *  git history and has been rotated; a missing env now fails loudly. */
  private getJobsApiKey(): string {
    const key = process.env.IRIS_JOBS_API_KEY;
    if (!key) throw new Error('IRIS_JOBS_API_KEY not configured');
    return key;
  }

  /**
   * Re-pull job info for every customer matching a phone number and refresh
   * the chat-list fields (tag + nextJobDate/nextJobTitle). Used by the
   * iris-job webhook: a single job event can't compute "next job" (that's a
   * min over ALL of the phone's jobs), so we just re-run the proven lookup.
   */
  async refreshJobInfoForPhone(phone: string) {
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length < 9) return { refreshed: 0, reason: 'phone too short' };

    const customers = await this.prisma.customer.findMany({
      where: { OR: [{ phoneClean: clean }, { phoneNumber: clean }] },
      select: { id: true },
    });

    let refreshed = 0;
    for (const c of customers) {
      try {
        const result = await this.getCustomerJobs(c.id);
        // Lookup only ever sets nextJobDate — clear it when no jobs remain
        // (e.g. the job that produced it was deleted in iris-job)
        if (!result.matched) {
          await this.prisma.customer
            .update({ where: { id: c.id }, data: { nextJobDate: null, nextJobTitle: null, nextJobNo: null } })
            .catch(() => {});
        }
        refreshed++;
      } catch {
        // per-customer failure shouldn't kill the webhook
      }
    }
    return { refreshed, customers: customers.length };
  }

  /**
   * Look up customer's jobs from IRIS Jobs API by phone number.
   * Auto-tags customer with "ลูกค้าจองงานแล้ว" if jobs found.
   */
  async getCustomerJobs(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { phoneNumber: true },
    });

    if (!customer?.phoneNumber) {
      return { jobs: [], matched: false, reason: 'No phone number' };
    }

    const cleanPhone = customer.phoneNumber.replace(/[-\s]/g, '');

    try {
      const JOBS_API = 'https://iris-job.vercel.app/api/external/lookup';
      const JOBS_KEY = this.getJobsApiKey();

      const resp = await axios.get(`${JOBS_API}?phone=${cleanPhone}`, {
        headers: { 'X-API-Key': JOBS_KEY },
        timeout: 5000,
      });

      const jobs = resp.data?.data || [];

      if (jobs.length > 0) {
        // Auto-tag with "ลูกค้าจองงานแล้ว"
        await this.addTag(customerId, 'ลูกค้าจองงานแล้ว', '#884929').catch(() => {});

        // Save next upcoming job date on customer for chat list display
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingJobs = jobs
          .filter((j: any) => j.due && new Date(j.due) >= today)
          .sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime());

        const nextJob = upcomingJobs[0] || jobs[0]; // fallback to most recent if all past
        if (nextJob?.due) {
          await this.prisma.customer.update({
            where: { id: customerId },
            data: {
              nextJobDate: new Date(nextJob.due),
              nextJobTitle: (nextJob.job || '').substring(0, 100),
              nextJobNo: nextJob.jobNo ?? null,
            },
          }).catch(() => {});
        }
      }

      return {
        jobs,
        matched: jobs.length > 0,
        phone: customer.phoneNumber,
      };
    } catch (err: any) {
      this.logger.warn(`IRIS Jobs lookup failed: ${err.message}`);
      return { jobs: [], matched: false, reason: 'API error' };
    }
  }

  /**
   * Create a job card in IRIS Jobs from this chat customer. The customer's
   * name/picture/channel/id are linked onto the new job so it shows up in
   * the app with a chat profile attached.
   */
  async createJobCard(customerId: string, body: any) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, displayName: true, pictureUrl: true, channel: true, phoneNumber: true },
    });
    if (!customer) return { success: false, error: 'Customer not found' };
    if (!body?.name || !body?.due) return { success: false, error: 'name and due are required' };

    const JOBS_API = 'https://iris-job.vercel.app/api/external/jobs';
    const JOBS_KEY = this.getJobsApiKey();

    const telno = String(body.telno || customer.phoneNumber || '').replace(/[-\s]/g, '');
    const payload = {
      name: body.name,
      due: body.due,
      eventTime: body.eventTime || undefined,
      deposit: Number(body.deposit) || 0,
      balance: Number(body.balance) || 0,
      telno,
      desc: body.desc || '',
      listKey: 'deposit-new',
      customerId: customer.id,
      customerDisplayName: customer.displayName,
      customerPictureUrl: customer.pictureUrl,
      customerChannel: customer.channel,
      ...(body.slipUrl ? { slipUrl: body.slipUrl } : {}),
      ...(body.slipTime ? { slipTime: body.slipTime } : {}),
    };

    try {
      const resp = await axios.post(JOBS_API, payload, {
        headers: { 'X-API-Key': JOBS_KEY },
        timeout: 15000,
      });

      // Same bookkeeping the job lookup does: tag + next-job info on the chat row
      await this.addTag(customerId, 'ลูกค้าจองงานแล้ว', '#884929').catch(() => {});
      await this.prisma.customer
        .update({
          where: { id: customerId },
          data: {
            nextJobDate: new Date(body.due),
            nextJobTitle: String(body.name).substring(0, 100),
            nextJobNo: resp.data?.jobNo ?? null,
          },
        })
        .catch(() => {});

      return { success: true, ...resp.data };
    } catch (err: any) {
      this.logger.warn(`IRIS Jobs create failed: ${err.message}`);
      return { success: false, error: err?.response?.data?.message || err.message };
    }
  }

  async backfillJobDates() {
    const customers = await this.prisma.customer.findMany({
      where: {
        phoneNumber: { not: null },
        nextJobDate: null,
        tags: {
          some: { tag: { name: 'ลูกค้าจองงานแล้ว' } },
        },
      },
      select: { id: true, phoneNumber: true, displayName: true },
    });

    this.logger.log(`Backfilling job dates for ${customers.length} customers`);
    let updated = 0;
    let failed = 0;

    const JOBS_API = 'https://iris-job.vercel.app/api/external/lookup';
    const JOBS_KEY = this.getJobsApiKey();

    for (const c of customers) {
      const phone = c.phoneNumber!.replace(/\D/g, '');
      if (phone.length < 9) continue;

      try {
        const resp = await axios.get(`${JOBS_API}?phone=${phone}`, {
          headers: { 'X-API-Key': JOBS_KEY },
          timeout: 5000,
        });

        const jobs = resp.data?.data || [];
        if (jobs.length === 0) continue;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingJobs = jobs
          .filter((j: any) => j.due && new Date(j.due) >= today)
          .sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime());

        const nextJob = upcomingJobs[0] || jobs[0];
        if (nextJob?.due) {
          await this.prisma.customer.update({
            where: { id: c.id },
            data: {
              nextJobDate: new Date(nextJob.due),
              nextJobTitle: (nextJob.job || '').substring(0, 100),
              nextJobNo: nextJob.jobNo ?? null,
            },
          });
          updated++;
        }
      } catch {
        failed++;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    this.logger.log(`Backfill done: ${updated} updated, ${failed} failed`);
    return { total: customers.length, updated, failed };
  }
}
