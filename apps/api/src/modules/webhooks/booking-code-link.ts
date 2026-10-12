import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { FlowAccountClient } from '../quotations/flowaccount.client';
import { channelLabel } from '../../common/utils/channel-label';
import { FAQ_FOLLOWUP_ADMIN } from './faq-followup';

/**
 * Customers who book on the web without a chat link (Google, the website, a shared URL) are
 * matched to a chat only by phone number — and that misses whenever the chat has no phone yet.
 * The thank-you page therefore offers "ส่งเลขที่คำขอเข้า LINE", which opens the OA with
 * "… เลขที่คำขอ TB-YYMMDD-NNN" pre-typed. When that message (or any message quoting the code)
 * arrives, the booking is attached to this chat, the quotation gets the CRM attribution, and the
 * customer gets an instant confirmation with the quotation link.
 *
 * A booking already attached to a different chat is never moved.
 */
const CODE_RE = /TB-\d{6}-\d{3}/i;

@Injectable()
export class BookingCodeLinkService {
  private readonly logger = new Logger(BookingCodeLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly flowAccount: FlowAccountClient,
  ) {}

  /** Fire-and-forget from the webhook: never throws. */
  maybeLink(channel: string, oduserId: string, customerId: string, text: string) {
    const m = CODE_RE.exec(text || '');
    if (!m) return;
    this.link(channel, oduserId, customerId, m[0].toUpperCase()).catch((err: any) =>
      this.logger.error(`Booking code link failed (${m[0]} → ${customerId}): ${err?.message || err}`),
    );
  }

  private async link(channel: string, oduserId: string, customerId: string, code: string) {
    const booking = await this.prisma.booking.findUnique({ where: { code } });
    if (!booking) return;
    if (booking.customerId && booking.customerId !== customerId) {
      this.logger.warn(`Booking ${code} is already attached to ${booking.customerId}; not moving it to ${customerId}`);
      return;
    }
    if (booking.customerId === customerId) return; // already linked (customer sent the code twice)

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return;
    const label = channelLabel(customer.channel, customer.channelType);
    const chatName = customer.nickname || customer.displayName || null;
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { customerId, channel: label, chatCustomerName: chatName },
    });
    this.logger.log(`Booking ${code} attached to chat ${customerId} (${label}) from the code in a message`);

    if (booking.quotationDocNo) {
      try {
        await this.flowAccount.patchCrm(booking.quotationDocNo, {
          crmCustomerId: customerId,
          crmChannel: label,
          crmChatName: chatName || undefined,
        });
      } catch (e: any) {
        this.logger.warn(`CRM attribution for ${booking.quotationDocNo} failed: ${e?.message || e}`);
      }
    }

    const link = booking.quotationPublicUrl || null;
    const reply = [
      `ได้รับคำขอใบเสนอราคา ${code} แล้วค่ะ 🙏`,
      link ? `ดูใบเสนอราคาได้ที่ 👇\n${link}` : '',
      'แอดมินจะตรวจสอบคิววันงาน และแจ้งขั้นตอนชำระมัดจำในแชทนี้นะคะ',
    ]
      .filter(Boolean)
      .join('\n\n');
    await this.messages.sendMessage({ oduserId, docId: customerId, channel, text: reply, adminName: FAQ_FOLLOWUP_ADMIN });
  }
}
