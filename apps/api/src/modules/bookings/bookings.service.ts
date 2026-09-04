import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/providers/prisma.service';
import { buildFaItems, calcEstimatedTotal } from './packages.config';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FlowAccountClient } from '../quotations/flowaccount.client';

function bookingAddress(b: { venue?: string | null; tambon?: string | null; amphoe?: string | null; province?: string | null; zip?: string | null }) {
  const bkk = b.province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (b.venue) p.push(b.venue);
  if (b.tambon) p.push((bkk ? 'แขวง' : 'ต.') + b.tambon);
  if (b.amphoe) p.push(bkk ? b.amphoe : 'อ.' + b.amphoe);
  if (b.province) p.push('จ.' + b.province);
  if (b.zip) p.push(b.zip);
  return p.join(' ');
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flowAccount: FlowAccountClient,
  ) {}

  /**
   * Create (or fetch the already-created) quotation for a booking in flowaccount-app.
   * The booking code is used as externalRef, so calling twice never duplicates.
   */
  async createQuotation(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');

    const built = buildFaItems({
      packageId: b.packageId,
      foodMode: b.foodMode,
      guests: b.guests,
      tables: b.tables,
      monks: b.monks,
      selfTransport: b.selfTransport,
      addons: b.addons,
    });
    if (!built) throw new BadRequestException(`ไม่มีสูตรใบเสนอราคาสำหรับแพ็กเกจ "${b.packageId}"`);

    const notes = [
      b.note ? `หมายเหตุลูกค้า: ${b.note}` : '',
      b.budget ? `งบประมาณ: ${b.budget}` : '',
      `จองผ่านหน้าเว็บ ${b.code} · ราคาประเมิน ${b.estimatedTotal.toLocaleString('th-TH')} บาท`,
    ].filter(Boolean);

    const res = await this.flowAccount.createQuotation({
      externalRef: b.code,
      customer: { name: b.customerName, phone: b.phone, address: bookingAddress(b) },
      project: `${b.occasion} · ${b.eventDate} · ${b.timeSlot}`,
      vatRate: built.vatRate,
      internalNotes: notes.join('\n'),
      items: built.items,
    });

    const docNo: string = res.data.docNo;
    const quotationUrl = `${this.flowAccount.appUrl}${res.data.url || `/quotations/${encodeURIComponent(docNo)}`}`;
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { quotationDocNo: docNo, quotationUrl, quotationCreatedAt: new Date() },
    });
    return {
      booking: updated,
      docNo,
      quotationUrl,
      reused: !!res.reused,
      grandTotal: res.data.grandTotal,
      warnings: res.warnings || [],
    };
  }

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
