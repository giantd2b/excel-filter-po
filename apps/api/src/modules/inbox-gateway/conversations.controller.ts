import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('inbox/conversations')
@UseGuards(FirebaseAuthGuard)
export class ConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConversations(
    @Query('channel') channel?: string,
    @Query('channelType') channelType?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limitCount = limitStr ? parseInt(limitStr, 10) : 50;
    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { phoneClean: { contains: search } },
      ];
    }

    if (channel) {
      where.channel = channel;
    } else if (channelType === 'line') {
      where.channelType = 'LINE';
    } else if (channelType === 'facebook') {
      where.channelType = 'FACEBOOK';
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    // Filter: upcoming jobs — customers with nextJobDate >= today
    if (filter === 'upcoming_jobs') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.nextJobDate = { gte: today };
    }

    const orderBy = filter === 'upcoming_jobs'
      ? [{ isPinned: 'desc' as const }, { nextJobDate: 'asc' as const }]
      : [{ isPinned: 'desc' as const }, { lastMessageAt: 'desc' as const }];

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy,
      take: limitCount,
      include: {
        tags: { include: { tag: true } },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      oduserId: c.platformUserId,
      displayName: c.nickname || c.displayName,
      nickname: c.nickname || null,
      platformName: c.displayName,
      pictureUrl: c.pictureUrl || '',
      channel: c.channel,
      channelType: c.channelType === 'LINE' ? 'line' : 'facebook',
      lastmessagetime: c.lastMessageAt ? c.lastMessageAt.getTime() : 0,
      unreadCount: c.unreadCount,
      lastMessagePreview: c.lastMessagePreview || '',
      isPinned: c.isPinned,
      status: c.status,
      assignedToId: c.assignedToId,
      assignedToName: c.assignedToName,
      nextJobDate: c.nextJobDate ? c.nextJobDate.toISOString().split('T')[0] : null,
      nextJobTitle: c.nextJobTitle || null,
      tags: c.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    }));
  }
}
