import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * Automatically merges messages from old-format customer IDs to new composite IDs.
 * Runs every 10 minutes.
 */
@Injectable()
export class MergeHelper {
  private readonly logger = new Logger(MergeHelper.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * *')
  async mergeOldMessages() {
    try {
      const newCustomers = await this.prisma.customer.findMany({
        where: { id: { contains: '__' } },
        select: { id: true, platformUserId: true },
      });

      let totalMoved = 0;
      for (const nc of newCustomers) {
        if (nc.platformUserId === nc.id) continue;

        const moved = await this.prisma.$executeRawUnsafe(
          'UPDATE messages SET customer_id = $1 WHERE customer_id = $2',
          nc.id,
          nc.platformUserId,
        );
        if (moved > 0) {
          totalMoved += moved;
        }
      }

      if (totalMoved > 0) {
        this.logger.log(`Merged ${totalMoved} messages from old IDs to composite IDs`);
      }
    } catch (err: any) {
      this.logger.error(`Merge failed: ${err.message}`);
    }
  }
}
