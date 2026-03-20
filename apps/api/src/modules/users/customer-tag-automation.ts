import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * Automatically manages customer tags based on IRIS Jobs data:
 * - "ลูกค้าจองงานแล้ว" → customer has upcoming/active jobs
 * - "ลูกค้าเก่า" → all jobs are in the past
 *
 * Runs daily at 1:00 AM Bangkok time (18:00 UTC)
 */
@Injectable()
export class CustomerTagAutomation {
  private readonly logger = new Logger(CustomerTagAutomation.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 18 * * *') // 18:00 UTC = 01:00 Bangkok
  async updateJobTags() {
    this.logger.log('Running customer tag automation...');

    const JOBS_API = 'https://iris-job.vercel.app/api/external/lookup';
    const JOBS_KEY = process.env.IRIS_JOBS_API_KEY;
    if (!JOBS_KEY) {
      this.logger.warn('IRIS_JOBS_API_KEY not set, skipping');
      return;
    }

    // Ensure both tags exist
    const [bookedTag, pastTag] = await Promise.all([
      this.prisma.tag.upsert({
        where: { name: 'ลูกค้าจองงานแล้ว' },
        update: {},
        create: { name: 'ลูกค้าจองงานแล้ว', color: '#884929' },
      }),
      this.prisma.tag.upsert({
        where: { name: 'ลูกค้าเก่า' },
        update: {},
        create: { name: 'ลูกค้าเก่า', color: '#64748b' },
      }),
    ]);

    // Get all customers tagged with "ลูกค้าจองงานแล้ว"
    const taggedCustomers = await this.prisma.customerTag.findMany({
      where: { tagId: bookedTag.id },
      include: {
        customer: { select: { id: true, phoneNumber: true, displayName: true } },
      },
    });

    this.logger.log(`Checking ${taggedCustomers.length} customers with booked jobs...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let switched = 0;
    let stillActive = 0;
    let errors = 0;

    for (const tc of taggedCustomers) {
      const phone = tc.customer.phoneNumber;
      if (!phone) continue;

      const cleanPhone = phone.replace(/[-\s]/g, '');

      try {
        const resp = await axios.get(`${JOBS_API}?phone=${cleanPhone}`, {
          headers: { 'X-API-Key': JOBS_KEY },
          timeout: 5000,
        });

        const jobs = resp.data?.data || [];

        if (jobs.length === 0) {
          // No jobs found anymore — switch to ลูกค้าเก่า
          await this.switchTag(tc.customer.id, bookedTag.id, pastTag.id);
          switched++;
          continue;
        }

        // Check if ALL jobs are in the past
        // API returns due as ISO date "2026-03-15"
        const allPast = jobs.every((job: any) => {
          if (!job.due) return false;
          const jobDate = new Date(job.due);
          return jobDate < today;
        });

        if (allPast) {
          await this.switchTag(tc.customer.id, bookedTag.id, pastTag.id);
          switched++;
          this.logger.debug(`Switched ${tc.customer.displayName} to ลูกค้าเก่า`);
        } else {
          stillActive++;
        }
      } catch {
        errors++;
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 200));
    }

    this.logger.log(
      `Tag automation done: ${switched} switched to ลูกค้าเก่า, ${stillActive} still active, ${errors} errors`,
    );
  }

  private async switchTag(customerId: string, removeTagId: string, addTagId: string) {
    await this.prisma.$transaction([
      this.prisma.customerTag.deleteMany({
        where: { customerId, tagId: removeTagId },
      }),
      this.prisma.customerTag.upsert({
        where: { customerId_tagId: { customerId, tagId: addTagId } },
        update: {},
        create: { customerId, tagId: addTagId },
      }),
    ]);
  }

}
