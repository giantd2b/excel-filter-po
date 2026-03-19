import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { InboxGateway } from './inbox-gateway.gateway';

export interface InboxStats {
  totalUnread: number;
  channelUnread: Record<string, number>;
}

@Injectable()
export class InboxStatsService {
  private readonly logger = new Logger(InboxStatsService.name);
  private cachedStats: InboxStats = { totalUnread: 0, channelUnread: {} };
  private lastRefresh = 0;
  private readonly CACHE_TTL = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: InboxGateway,
  ) {
    this.refreshStats();
  }

  async getStats(): Promise<InboxStats> {
    if (Date.now() - this.lastRefresh > this.CACHE_TTL) {
      await this.refreshStats();
    }
    return this.cachedStats;
  }

  async refreshAndBroadcast() {
    await this.refreshStats();
    this.gateway.emitUnreadUpdate(this.cachedStats);
  }

  private async refreshStats() {
    try {
      const result = await this.prisma.customer.groupBy({
        by: ['channel'],
        where: { unreadCount: { gt: 0 } },
        _sum: { unreadCount: true },
      });

      let totalUnread = 0;
      const channelUnread: Record<string, number> = {};

      result.forEach((r) => {
        const count = r._sum.unreadCount || 0;
        totalUnread += count;
        channelUnread[r.channel] = count;
      });

      this.cachedStats = { totalUnread, channelUnread };
      this.lastRefresh = Date.now();
    } catch (error: any) {
      this.logger.error('Failed to refresh inbox stats:', error.message);
    }
  }
}
