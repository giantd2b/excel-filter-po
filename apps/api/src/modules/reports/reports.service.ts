import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/providers/prisma.service';
import { pushGroupMessage } from '../../common/utils/line-notify.utils';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily slip report - runs at midnight Bangkok time (17:00 UTC)
   */
  @Cron('0 17 * * *')
  async dailySlipReport() {
    this.logger.log('Running daily slip report...');

    const bangkokOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    const reportDate = new Date(bangkokNow);
    reportDate.setDate(reportDate.getDate() - 1);

    const year = reportDate.getUTCFullYear();
    const month = reportDate.getUTCMonth();
    const day = reportDate.getUTCDate();

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0) - bangkokOffset);
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - bangkokOffset);

    const slips = await this.prisma.slip.findMany({
      where: { detectedAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { detectedAt: 'desc' },
    });

    if (slips.length === 0) {
      this.logger.log('No slips found for the report day.');
      return;
    }

    let totalAmount = 0;
    const bankMap: Record<string, { count: number; amount: number }> = {};

    slips.forEach((slip) => {
      const amount = slip.amount ? Number(slip.amount) : 0;
      totalAmount += amount;
      const bank = slip.bankName || 'ไม่ระบุ';
      if (!bankMap[bank]) bankMap[bank] = { count: 0, amount: 0 };
      bankMap[bank].count++;
      bankMap[bank].amount += amount;
    });

    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');
    const buddhistYear = year + 543;

    const formatNum = (n: number) =>
      n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const lines = [
      `สรุปสลิปประจำวัน ${dd}/${mm}/${buddhistYear}`,
      '===========================',
      `สลิปทั้งหมด: ${slips.length} รายการ`,
      `ยอดรวม: ${formatNum(totalAmount)} บาท`,
      '===========================',
    ];

    const sortedBanks = Object.entries(bankMap).sort((a, b) => b[1].amount - a[1].amount);
    for (const [bank, stats] of sortedBanks) {
      lines.push(`${bank}: ${stats.count} รายการ (${formatNum(stats.amount)})`);
    }

    const message = lines.join('\n');
    this.logger.log(`Daily slip report:\n${message}`);

    await pushGroupMessage(message);
  }
}
