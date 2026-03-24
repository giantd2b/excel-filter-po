import { Controller, Get, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/providers/prisma.service';
import * as admin from 'firebase-admin';

/**
 * Internal backfill endpoints — no auth guard (temporary admin tools).
 * Protected by secret query param.
 */
@Controller('internal')
export class BackfillController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('find-dupes')
  async findDupes(@Query('key') key?: string) {
    if (key !== 'iris-backfill-2026') return { error: 'Invalid key' };
    const dupes = await this.prisma.$queryRaw`
      SELECT c1.id as id1, c2.id as id2, c1.display_name, c1.channel, c1.platform_user_id,
             (SELECT COUNT(*) FROM messages WHERE customer_id = c1.id) as msgs1,
             (SELECT COUNT(*) FROM messages WHERE customer_id = c2.id) as msgs2
      FROM customers c1
      JOIN customers c2 ON c1.platform_user_id = c2.platform_user_id
        AND c1.channel = c2.channel AND c1.id < c2.id
      LIMIT 20
    `;
    return dupes;
  }

  @Post('backfill-job-dates')
  async backfillJobDates(@Query('key') key?: string) {
    if (key !== 'iris-backfill-2026') {
      return { error: 'Invalid key' };
    }
    return this.usersService.backfillJobDates();
  }

  @Post('fix-stickers')
  async fixStickers(@Query('key') key?: string) {
    if (key !== 'iris-backfill-2026') {
      return { error: 'Invalid key' };
    }
    const result = await this.prisma.$executeRaw`
      UPDATE messages SET media_type = 'STICKER'
      WHERE media_type = 'IMAGE'
      AND text = '[สติกเกอร์]'
      AND media_url LIKE '%stickershop.line-scdn.net%'
    `;
    return { updated: result };
  }

  @Get('firestore-search')
  async firestoreSearch(@Query('key') key?: string, @Query('name') name?: string, @Query('collection') collection?: string) {
    if (key !== 'iris-backfill-2026' || !name) return { error: 'Invalid' };
    const db = admin.firestore();
    const col = collection || 'users';

    // Search in Firestore users collection
    const snapshot = await db.collection(col).get();
    const results: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const displayName = (data.displayName || data.first_name || '').toLowerCase();
      if (displayName.includes(name!.toLowerCase())) {
        results.push({
          id: doc.id,
          displayName: data.displayName || data.first_name,
          channel: data.channel,
          phoneNumber: data.phoneNumber,
          lastmessagetime: data.lastmessagetime,
        });
      }
    });

    return { query: name, collection: col, found: results.length, results: results.slice(0, 10) };
  }

  @Post('test-link')
  async testLink(@Query('key') key?: string, @Query('docNo') docNo?: string) {
    if (key !== 'iris-backfill-2026' || !docNo) return { error: 'Invalid' };
    // Import the quotations service to test manuallyLinked
    return { note: 'Use /api/quotations/link-customer instead', docNo };
  }

  @Post('fix-phone')
  async fixPhone(@Query('key') key?: string, @Query('id') id?: string, @Query('phone') phone?: string) {
    if (key !== 'iris-backfill-2026' || !id || !phone) return { error: 'Invalid' };
    const clean = phone.replace(/[^0-9]/g, '');
    await this.prisma.customer.update({
      where: { id },
      data: { phoneNumber: clean, phoneClean: clean },
    });
    return { success: true, id, phone: clean };
  }

  @Get('find-phone')
  async findPhone(@Query('key') key?: string, @Query('phone') phone?: string) {
    if (key !== 'iris-backfill-2026' || !phone) return { error: 'Invalid' };
    const clean = phone.replace(/[^0-9]/g, '');
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { phoneNumber: { contains: clean } },
          { phoneClean: { contains: clean } },
          { additionalPhones: { has: clean } },
        ],
      },
      select: { id: true, displayName: true, phoneNumber: true, phoneClean: true, additionalPhones: true, channel: true },
    });
    return { phone: clean, found: customers.length, customers };
  }

  @Get('customer-messages')
  async customerMessages(@Query('key') key?: string, @Query('id') id?: string) {
    if (key !== 'iris-backfill-2026' || !id) return { error: 'Invalid' };

    const messages = await this.prisma.message.findMany({
      where: { customerId: id, type: 'INCOMING', text: { not: null } },
      select: { text: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Also check the old ID (without __channel suffix)
    const oldId = id.split('__')[0];
    let oldMessages: any[] = [];
    if (oldId !== id) {
      oldMessages = await this.prisma.message.findMany({
        where: { customerId: oldId, type: 'INCOMING', text: { not: null } },
        select: { text: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });
    }

    const allMsgs = [...oldMessages, ...messages].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // Find any number-like patterns (broader than phone regex)
    const numberPattern = /\d{3,}/g;
    const withNumbers = allMsgs.filter(m => m.text && numberPattern.test(m.text));

    return {
      totalMessages: allMsgs.length,
      messagesWithNumbers: withNumbers.map(m => ({
        text: m.text,
        date: new Date(Number(m.timestamp)).toISOString().split('T')[0],
      })),
    };
  }

  @Post('scan-phones')
  async scanPhones(@Query('key') key?: string) {
    if (key !== 'iris-backfill-2026') {
      return { error: 'Invalid key' };
    }

    // Get 2025+ active customers, but scan ALL their messages (including old ones)
    const since = new Date('2025-01-01');
    const customers = await this.prisma.customer.findMany({
      where: { lastMessageAt: { gte: since } },
      select: { id: true, phoneNumber: true, phoneClean: true, additionalPhones: true },
    });

    // Match Thai phone: 0x-xxxx-xxxx with optional dashes/spaces
    const phoneRegex = /0[689]\d[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
    let updated = 0;
    let totalNew = 0;

    for (const c of customers) {
      // Get ALL incoming messages (no date filter)
      const messages = await this.prisma.message.findMany({
        where: {
          customerId: c.id,
          type: 'INCOMING',
          text: { not: null },
        },
        select: { text: true },
        take: 500,
      });

      const existingPhones = new Set<string>();
      if (c.phoneClean) existingPhones.add(c.phoneClean);
      if (c.phoneNumber) existingPhones.add(c.phoneNumber.replace(/[^0-9]/g, ''));
      (c.additionalPhones || []).forEach((p) => existingPhones.add(p));

      const newPhones = new Set<string>();
      for (const m of messages) {
        if (!m.text) continue;
        const matches = m.text.match(phoneRegex);
        if (!matches) continue;
        for (const rawPh of matches) {
          const ph = rawPh.replace(/[^0-9]/g, '');
          if (ph.length >= 9 && !existingPhones.has(ph) && !newPhones.has(ph)) {
            newPhones.add(ph);
          }
        }
      }

      if (newPhones.size > 0) {
        const merged = [...(c.additionalPhones || []), ...newPhones];
        await this.prisma.customer.update({
          where: { id: c.id },
          data: { additionalPhones: merged },
        });
        updated++;
        totalNew += newPhones.size;
      }
    }

    return { customersChecked: customers.length, customersUpdated: updated, newPhonesFound: totalNew };
  }
}
