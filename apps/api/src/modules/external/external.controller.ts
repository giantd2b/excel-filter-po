import { Controller, Get, Param, Query, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * External API — for third-party apps to query customer data.
 * Authenticated via API key (X-API-Key header) instead of Firebase Auth.
 */
@Controller('external')
export class ExternalController {
  constructor(private readonly prisma: PrismaService) {}

  private validateApiKey(apiKey: string | undefined) {
    const validKey = process.env.EXTERNAL_API_KEY;
    if (!validKey || apiKey !== validKey) {
      throw new UnauthorizedException('Invalid or missing API key. Use X-API-Key header.');
    }
  }

  /**
   * GET /api/external/customers
   * Query customers by channel, search, or platform user ID.
   */
  @Get('customers')
  async getCustomers(
    @Headers('x-api-key') apiKey: string,
    @Query('channel') channel?: string,
    @Query('channelType') channelType?: string,
    @Query('search') search?: string,
    @Query('platformUserId') platformUserId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    this.validateApiKey(apiKey);

    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    const where: any = {};

    if (channel) where.channel = channel;
    if (channelType) where.channelType = channelType.toUpperCase();
    if (platformUserId) where.platformUserId = platformUserId;
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { nickname: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          platformUserId: true,
          displayName: true,
          nickname: true,
          pictureUrl: true,
          channel: true,
          channelType: true,
          phoneNumber: true,
          status: true,
          unreadCount: true,
          lastMessageAt: true,
          lastMessagePreview: true,
          assignedToName: true,
          firstContactAt: true,
          tags: { include: { tag: { select: { name: true, color: true } } } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => ({
        id: c.id,
        platformUserId: c.platformUserId,
        displayName: c.nickname || c.displayName,
        originalName: c.displayName,
        nickname: c.nickname,
        pictureUrl: c.pictureUrl,
        channel: c.channel,
        channelType: c.channelType,
        phoneNumber: c.phoneNumber,
        status: c.status,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        assignedTo: c.assignedToName,
        firstContactAt: c.firstContactAt,
        tags: c.tags.map((t) => ({ name: t.tag.name, color: t.tag.color })),
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * GET /api/external/customers/:id
   * Get single customer profile with message stats.
   */
  @Get('customers/:id')
  async getCustomer(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    this.validateApiKey(apiKey);

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: { select: { name: true, color: true } } } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, text: true, authorName: true, createdAt: true } },
      },
    });

    if (!customer) return { error: 'Customer not found' };

    const totalMessages = await this.prisma.message.count({ where: { customerId: id } });

    return {
      id: customer.id,
      platformUserId: customer.platformUserId,
      displayName: customer.nickname || customer.displayName,
      originalName: customer.displayName,
      nickname: customer.nickname,
      pictureUrl: customer.pictureUrl,
      channel: customer.channel,
      channelType: customer.channelType,
      phoneNumber: customer.phoneNumber,
      status: customer.status,
      unreadCount: customer.unreadCount,
      lastMessageAt: customer.lastMessageAt,
      assignedToId: customer.assignedToId,
      assignedToName: customer.assignedToName,
      firstContactAt: customer.firstContactAt,
      totalMessages,
      tags: customer.tags.map((t) => ({ name: t.tag.name, color: t.tag.color })),
      notes: customer.notes,
    };
  }

  /**
   * GET /api/external/customers/:id/messages
   * Get message history for a customer.
   */
  @Get('customers/:id/messages')
  async getMessages(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
  ) {
    this.validateApiKey(apiKey);

    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const where: any = { customerId: id };

    if (before) {
      where.timestamp = { lt: BigInt(before) };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        text: true,
        type: true,
        sender: true,
        timestamp: true,
        status: true,
        adminName: true,
        mediaType: true,
        mediaUrl: true,
      },
    });

    return {
      data: messages.map((m) => ({
        id: m.id,
        text: m.text,
        type: m.type === 'OUTGOING' ? 'outgoing' : 'incoming',
        sender: m.sender === 'ADMIN' ? 'admin' : 'user',
        timestamp: Number(m.timestamp),
        status: m.status,
        adminName: m.adminName,
        mediaType: m.mediaType?.toLowerCase() || null,
        mediaUrl: m.mediaUrl,
      })),
      count: messages.length,
      hasMore: messages.length === limit,
    };
  }

  /**
   * GET /api/external/channels
   * List all available channels with stats.
   */
  @Get('channels')
  async getChannels(@Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);

    const stats = await this.prisma.customer.groupBy({
      by: ['channel', 'channelType'],
      _count: true,
      _sum: { unreadCount: true },
    });

    return {
      data: stats.map((s) => ({
        channel: s.channel,
        channelType: s.channelType,
        customerCount: s._count,
        totalUnread: s._sum.unreadCount || 0,
      })),
    };
  }

  /**
   * GET /api/external/lookup
   * Look up a customer by platform user ID (LINE userId or Facebook PSID).
   */
  @Get('lookup')
  async lookup(
    @Headers('x-api-key') apiKey: string,
    @Query('platformUserId') platformUserId: string,
  ) {
    this.validateApiKey(apiKey);

    if (!platformUserId) return { error: 'platformUserId is required' };

    const customers = await this.prisma.customer.findMany({
      where: { platformUserId },
      select: {
        id: true,
        platformUserId: true,
        displayName: true,
        nickname: true,
        pictureUrl: true,
        channel: true,
        channelType: true,
        phoneNumber: true,
        status: true,
        lastMessageAt: true,
        firstContactAt: true,
      },
    });

    return {
      data: customers,
      count: customers.length,
    };
  }
}
