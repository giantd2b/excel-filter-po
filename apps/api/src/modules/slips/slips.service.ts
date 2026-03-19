import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';

@Injectable()
export class SlipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSlipsByDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const bangkokOffset = 7 * 60 * 60 * 1000;

    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - bangkokOffset);
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - bangkokOffset);

    const slips = await this.prisma.slip.findMany({
      where: {
        detectedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { detectedAt: 'desc' },
    });

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

    // Map to API response format matching frontend expectations
    const mappedSlips = slips.map((s) => ({
      id: s.id,
      link: s.imageUrl,
      bank_name: s.bankName,
      amount: s.amount ? Number(s.amount) : undefined,
      date_time: s.dateTime,
      sender_name: s.senderName,
      receiver_name: s.receiverName,
      reference_number: s.referenceNumber,
      detected_at: s.detectedAt,
    }));

    return {
      date: dateStr,
      total: slips.length,
      totalAmount,
      banks: bankMap,
      slips: mappedSlips,
    };
  }

  async getSlipsByCustomer(customerId: string) {
    return this.prisma.slip.findMany({
      where: { customerId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getSlipsSummary(startDate: string, endDate: string) {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const bangkokOffset = 7 * 60 * 60 * 1000;

    const start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0) - bangkokOffset);
    const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999) - bangkokOffset);

    const result = await this.prisma.slip.aggregate({
      where: { detectedAt: { gte: start, lte: end } },
      _count: true,
      _sum: { amount: true },
    });

    const byBank = await this.prisma.slip.groupBy({
      by: ['bankName'],
      where: { detectedAt: { gte: start, lte: end } },
      _count: true,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return {
      startDate,
      endDate,
      totalSlips: result._count,
      totalAmount: result._sum.amount ? Number(result._sum.amount) : 0,
      banks: byBank.map((b) => ({
        bankName: b.bankName || 'ไม่ระบุ',
        count: b._count,
        amount: b._sum.amount ? Number(b._sum.amount) : 0,
      })),
    };
  }
}
