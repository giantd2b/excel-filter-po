import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { MessagesService } from '../messages/messages.service';

/**
 * Follow-up for the FAQ buttons customers tap on our Facebook pages.
 *
 * Meta Business Suite already answers each FAQ instantly (price, minimum tables, areas…). We send
 * one extra message a few seconds later that moves the chat forward — the booking page for that
 * line — so the customer can see live prices and book without waiting for an admin.
 *
 * Questions are matched exactly (they are button texts, not typed messages). Each follow-up goes
 * to a customer at most once per DEDUPE_MS.
 */

const SITE = 'https://crm.iristermboon.com';
/** let Business Suite's own answer (arrives after 2–6s) land first */
const DELAY_MS = 9000;
const DEDUPE_MS = 24 * 60 * 60 * 1000;
export const FAQ_FOLLOWUP_ADMIN = 'ตอบอัตโนมัติ';

const MERIT = `ดูแพ็กเกจงานบุญทั้งหมด เลือกจำนวนพระ/แขก แล้วเห็นราคาและใบเสนอราคาทันที 👇\n${SITE}/booking\n\nหรือแจ้งวันที่และสถานที่จัดงานไว้ในแชทนี้ได้เลยค่ะ แอดมินจะรีบตอบกลับนะคะ 🙏`;
const MERIT_AREA = `แจ้งอำเภอ/สถานที่จัดงานไว้ได้เลยค่ะ แอดมินจะเช็คคิวให้นะคะ\n\nดูแพ็กเกจและราคาพร้อมจองออนไลน์ได้ที่ 👇\n${SITE}/booking`;
const BUFFET = `ดูเมนูและราคาบุฟเฟต์ เลือกจำนวนแขก/จำนวนอาหาร แล้วเห็นราคาทันที 👇\n${SITE}/buffet\n\nหรือแจ้งวันที่ จำนวนแขก และสถานที่จัดงานไว้ในแชทนี้ได้เลยค่ะ`;
const CHINESE = `ดูเมนูและราคาโต๊ะจีน พร้อมจองออนไลน์ได้ที่ 👇\n${SITE}/chinese\n\nหรือแจ้งวันที่ จำนวนโต๊ะ และสถานที่จัดงานไว้ในแชทนี้ได้เลยค่ะ`;
const ALL = `ดูราคาและจองออนไลน์ได้เลยค่ะ 👇\n🙏 งานบุญ/พิธีสงฆ์: ${SITE}/booking\n🍛 บุฟเฟต์: ${SITE}/buffet\n🥢 โต๊ะจีน: ${SITE}/chinese\n\nหรือแจ้งประเภทงาน วันที่ และสถานที่ไว้ในแชทนี้ได้เลยค่ะ`;

/** channel → exact FAQ text → follow-up */
const RULES: Record<string, Record<string, string>> = {
  'FB_เติมบุญ': {
    'แพคเกจเริ่มต้นราคาเท่าไหร่ครับ': MERIT,
    'รับจัดงานบุญที่ไหนบ้างครับ': MERIT_AREA,
  },
  FB_IRIS: {
    'บุฟเฟ่ต์เริ่มต้นเท่าไหร่': BUFFET,
    'โต๊ะจีนขั้นต่ำกี่โต๊ะ': CHINESE,
    'ค่าเดินทางโต๊ะจีนคือเท่าไร': CHINESE,
    'มีบริการด้านใดบ้าง': ALL,
  },
  'FB_ชล': {
    'เริ่มต้น': ALL,
    'get started': ALL,
  },
};

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

@Injectable()
export class FaqFollowupService {
  private readonly logger = new Logger(FaqFollowupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
  ) {}

  /** Fire-and-forget: schedule the follow-up if `text` is one of this page's FAQ buttons. */
  maybeFollowUp(channel: string, oduserId: string, customerId: string, text: string) {
    const reply = RULES[channel]?.[normalize(text)];
    if (!reply) return;
    setTimeout(() => {
      this.send(channel, oduserId, customerId, reply).catch((err: any) =>
        this.logger.error(`FAQ follow-up failed for ${customerId}: ${err?.message || err}`),
      );
    }, DELAY_MS);
  }

  private async send(channel: string, oduserId: string, customerId: string, reply: string) {
    const recent = await this.prisma.message.findFirst({
      where: {
        customerId,
        type: 'OUTGOING',
        adminName: FAQ_FOLLOWUP_ADMIN,
        text: reply,
        timestamp: { gte: BigInt(Date.now() - DEDUPE_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    await this.messages.sendMessage({
      oduserId,
      docId: customerId,
      channel,
      text: reply,
      adminName: FAQ_FOLLOWUP_ADMIN,
    });
    this.logger.log(`FAQ follow-up sent to ${customerId}`);
  }
}
