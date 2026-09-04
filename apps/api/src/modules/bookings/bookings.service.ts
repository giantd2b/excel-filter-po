import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/providers/prisma.service';
import { calcEstimatedTotal } from './packages.config';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto) {
    const phoneDigits = dto.phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 9) {
      throw new BadRequestException('กรุณากรอกเบอร์โทรให้ถูกต้อง');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.eventDate)) {
      throw new BadRequestException('กรุณาเลือกวันที่จัดงาน');
    }

    const calc = calcEstimatedTotal({
      packageId: dto.packageId,
      foodMode: dto.foodMode,
      guests: dto.guests,
      tables: dto.tables,
      monks: dto.monks,
      selfTransport: dto.selfTransport,
      addons: dto.addons,
    });
    if (!calc) throw new BadRequestException('ไม่พบแพ็กเกจที่เลือก');

    const code = await this.nextCode();

    return this.prisma.booking.create({
      data: {
        code,
        occasion: dto.occasion,
        eventDate: dto.eventDate,
        timeSlot: dto.timeSlot,
        tambon: dto.tambon || null,
        amphoe: dto.amphoe || null,
        province: dto.province || null,
        zip: dto.zip || null,
        venue: dto.venue || null,
        packageId: dto.packageId,
        packageName: calc.pkg.name,
        foodMode: calc.pkg.kind === 'ceremony' ? 'none' : dto.foodMode,
        guests: dto.guests,
        tables: dto.tables,
        monks: dto.monks,
        selfTransport: dto.selfTransport,
        addons: dto.addons,
        budget: dto.budget || null,
        customerName: dto.name.trim(),
        phone: phoneDigits,
        note: dto.note || null,
        estimatedTotal: calc.total,
      },
    });
  }

  private async nextCode(): Promise<string> {
    const now = new Date();
    // Thai local date for the code prefix
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const yy = String(th.getUTCFullYear()).slice(2);
    const mm = String(th.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(th.getUTCDate()).padStart(2, '0');
    const prefix = `TB-${yy}${mm}${dd}-`;
    const todayCount = await this.prisma.booking.count({
      where: { code: { startsWith: prefix } },
    });
    return `${prefix}${String(todayCount + 1).padStart(3, '0')}`;
  }

  async list(status?: string) {
    const where =
      status && status !== 'ALL'
        ? { status: status as BookingStatus }
        : undefined;
    const [bookings, counts] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.booking.groupBy({ by: ['status'], _count: true }),
    ]);
    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const c of counts) {
      statusCounts[c.status] = c._count;
      total += c._count;
    }
    return { bookings, statusCounts, total };
  }

  async updateStatus(id: string, status: string) {
    if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    try {
      return await this.prisma.booking.update({
        where: { id },
        data: { status: status as BookingStatus },
      });
    } catch {
      throw new NotFoundException('Booking not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.booking.delete({ where: { id } });
      return { success: true };
    } catch {
      throw new NotFoundException('Booking not found');
    }
  }
}
