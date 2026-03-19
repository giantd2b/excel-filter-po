import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { InboxGateway } from '../inbox-gateway/inbox-gateway.gateway';
import { InboxStatsService } from '../inbox-gateway/inbox-stats.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly inboxStats: InboxStatsService,
  ) {}

  async findAll(limit = 50, startAfter?: string, channel?: string) {
    const where: any = {};
    if (channel) where.channel = channel;

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

  async getStats() {
    const [total, line, facebook] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { channelType: 'LINE' } }),
      this.prisma.customer.count({ where: { channelType: 'FACEBOOK' } }),
    ]);

    const channelCounts = await this.prisma.customer.groupBy({
      by: ['channel'],
      _count: true,
    });

    const channels: Record<string, number> = {};
    channelCounts.forEach((c) => {
      channels[c.channel] = c._count;
    });

    return { total, line, facebook, channels };
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

    return { success: true };
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

  async setStatus(customerId: string, status: 'OPEN' | 'FOLLOW_UP' | 'RESOLVED') {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { status },
    });
  }
}
