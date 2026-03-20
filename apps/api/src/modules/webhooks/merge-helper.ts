import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * Automatically merges messages from old-format customer IDs to new composite IDs.
 * Only merges when old customer has the SAME channel as new customer.
 * Never merges across different channels/platforms.
 * Runs every 10 minutes.
 */
@Injectable()
export class MergeHelper {
  private readonly logger = new Logger(MergeHelper.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * *')
  async mergeOldMessages() {
    try {
      // Find new-format customers (with __) that have an old-format duplicate
      // ONLY match when both have the same channel
      const result = await this.prisma.$executeRaw`
        UPDATE messages SET customer_id = new_c.id
        FROM customers old_c
        JOIN customers new_c
          ON new_c.platform_user_id = old_c.platform_user_id
          AND new_c.channel = old_c.channel
          AND new_c.id LIKE '%\_\_%'
          AND old_c.id NOT LIKE '%\_\_%'
          AND new_c.id != old_c.id
        WHERE messages.customer_id = old_c.id
      `;

      if (result > 0) {
        this.logger.log(`Merged ${result} messages (same channel only)`);
      }
    } catch (err: any) {
      this.logger.error(`Merge failed: ${err.message}`);
    }
  }
}
