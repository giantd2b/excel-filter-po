import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../common/providers/prisma.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { BookingsService } from '../bookings/bookings.service';
import { QuotationsService, type QuotationRecord } from '../quotations/quotations.service';
import { BOOKING_PACKAGES, BOOKING_ADDONS, DISH_COUNTS } from '../bookings/packages.config';
import { AREA_FACTS, BOOKING_LINKS, CATERING_FACTS, MERIT_FACTS } from './ai-facts';

/**
 * AI shadow mode ("ทดสอบเงียบ").
 *
 * For every customer turn on the enabled chats the AI drafts the reply it WOULD send — nothing is
 * sent to the customer. The draft is stored next to the trigger message; the dashboard pairs it
 * with what the admin actually replied (outgoing messages after the trigger) so the owner can
 * rate the AI before it is ever allowed to answer by itself.
 *
 * A turn = the customer's consecutive messages; we wait DEBOUNCE_MS after the last one so a
 * question typed over several messages is answered once.
 */

export const AI_SHADOW_SETTINGS_KEY = 'ai_shadow_settings';
export interface AiShadowSettings {
  enabled: boolean;
  /** customer.channel values to shadow */
  channels: string[];
  /** hard stop on AI calls per day (Bangkok date) */
  dailyCap: number;
  model: string;
}
export const DEFAULT_AI_SHADOW_SETTINGS: AiShadowSettings = {
  enabled: true,
  channels: ['FB_เติมบุญ', 'Line_เติมบุญ', 'Line_ไอริสเติมบุญ', 'Line_IRIS', 'FB_IRIS'],
  dailyCap: 400,
  model: 'claude-sonnet-5-5',
};

const DEBOUNCE_MS = 30_000;
const HISTORY = 30;
/** messages before the recent window, sent condensed so details agreed early in a long chat aren't lost */
const OLDER_HISTORY = 150;
const OLDER_CHARS = 6000;
const DAY_MS = 86400_000;

/** customer stage — decides how the AI should answer */
export type CustomerStage = 'new' | 'quoted' | 'booked' | 'past';
const STAGE_TH: Record<CustomerStage, string> = {
  new: 'ยังไม่จอง — ลูกค้าใหม่/กำลังสอบถาม',
  quoted: 'มีใบเสนอราคาแล้ว แต่ยังไม่มัดจำ',
  booked: 'จองแล้ว (มัดจำแล้ว) งานยังไม่ถึง',
  past: 'ลูกค้าเก่า — เคยจัดงานกับเราแล้ว ตอนนี้ไม่มีงานที่รออยู่',
};
const OPEN_QUOTE = ['DRAFT', 'PENDING', 'APPROVED'];
const DONE_QUOTE = /DEPOSIT|COMPLETE|INVOICE|PAID|BILL|RECEIPT|CLOSE/i;
const QUOTE_STATUS_TH: Record<string, string> = {
  DRAFT: 'ร่าง ยังไม่ส่ง',
  PENDING: 'ส่งให้ลูกค้าแล้ว รอลูกค้าตัดสินใจ',
  APPROVED: 'ลูกค้าตกลงแล้ว รอชำระมัดจำ',
  DEPOSITED: 'ชำระมัดจำแล้ว',
};
const bkkDate = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
/** admin messages that are not a human answer */
export const NON_HUMAN_ADMINS = ['ตอบอัตโนมัติ'];
/** a Business Suite message this soon after the customer is Meta's automated FAQ answer, not an admin */
const META_AUTO_MS = 15_000;

/** texts sent by the Facebook FAQ buttons / product cards — not typed by the customer */
export const AUTO_QUESTION_TEXTS = [
  'แพคเกจเริ่มต้นราคาเท่าไหร่ครับ',
  'รับจัดงานบุญที่ไหนบ้างครับ',
  'ขอทราบข้อมูลเพิ่มเติมเกี่ยวกับสินค้าชิ้นนี้',
  'can i make a reservation?',
  'บุฟเฟ่ต์เริ่มต้นเท่าไหร่',
  'โต๊ะจีนขั้นต่ำกี่โต๊ะ',
  'ค่าเดินทางโต๊ะจีนคือเท่าไร',
  'มีบริการด้านใดบ้าง',
  'เริ่มต้น',
  'get started',
];
const isAutoQuestion = (t: string) => AUTO_QUESTION_TEXTS.includes(t.trim().replace(/\s+/g, ' ').toLowerCase()) || AUTO_QUESTION_TEXTS.includes(t.trim());
const isPlaceholder = (t: string) => /^\[(รูปภาพ|สติกเกอร์|ไฟล์|วิดีโอ|เสียง)\]$/.test(t.trim());
/** looks like the customer is asking something (Thai question words / ?) */
const QUESTION_RE = /\?|ไหม|มั้ย|มั๊ย|ไหน|เท่าไ|กี่|อะไร|ยังไง|อย่างไร|หรือเปล่า|รึเปล่า|ป่าว|บ้าง|สอบถาม|ขอ(ทราบ|ดู|ราคา|รายละเอียด|ใบเสนอ)|คิด(ยังไง|เท่า|ราคา)|ราคา|ได้(ไหม|มั้ย|ป่าว|หรือ)|รวม|ต้อง/;

export interface ReplayJob {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  channels: string[];
  target: number;
  found: number;
  done: number;
  errors: number;
  message: string | null;
}

const RULES = `คุณคือแอดมินแชทของธุรกิจจัดงานบุญและจัดเลี้ยงในชลบุรี/ระยอง ชื่อ "เติมบุญ บาย ไอริส" (งานบุญ พิธีสงฆ์) และ "IRIS Catering" (บุฟเฟต์ โต๊ะจีน จัดเลี้ยง)
หน้าที่: ร่างข้อความตอบลูกค้า 1 ข้อความ สำหรับเทิร์นล่าสุดของลูกค้าในบทสนทนา

กติกา:
1. ใช้เฉพาะข้อมูลใน "ข้อมูลธุรกิจ" ด้านล่าง ห้ามเดาราคา เมนู หรือนโยบายที่ไม่มีในข้อมูล
2. ราคาให้ยึด "ตารางราคาปัจจุบัน" เป็นหลัก ถ้า "ฐานความรู้เดิม" ขัดกับตารางราคาหรือข้อมูลที่เจ้าของยืนยัน ให้เชื่อตารางราคา/ข้อมูลที่ยืนยัน
3. ห้ามยืนยันว่าวันไหนคิวว่าง ห้ามรับจองแทน ห้ามให้ส่วนลดหรือของแถมนอกเหนือจากที่ระบุ
4. ต้องส่งต่อแอดมิน (action = handoff) เมื่อ: ถามคิว/ยืนยันวันงาน, ต่อรองราคา/ขอส่วนลดพิเศษ, ส่งสลิปหรือเรื่องชำระเงิน, ขอเลื่อน/ยกเลิกงาน, ร้องเรียน, ขอแพ็กเกจหรือเมนูพิเศษที่ไม่มีในข้อมูล, นอกพื้นที่บริการ, คำถามที่ข้อมูลไม่พอ — ในกรณีนี้ให้ reply เป็นข้อความสั้นที่สุภาพบอกว่าแอดมินจะตรวจสอบให้ และถามข้อมูลที่ยังขาด (เช่น วันที่ สถานที่ จำนวนแขก) ถ้ามี
5. ถ้าลูกค้าแค่ขอบคุณ/ส่งสติกเกอร์/ตอบรับ และไม่ต้องตอบอะไร ให้ action = no_reply
6. เขียนแบบแอดมินจริงในแชท: ภาษาไทยสุภาพ ลงท้าย "ค่ะ/นะคะ" สั้นกระชับ (ส่วนใหญ่ 1–3 บรรทัด) ตอบเฉพาะที่ลูกค้าถาม ถามข้อมูลเพิ่มทีละ 1–2 เรื่อง ไม่สรุปราคายาวถ้าลูกค้าไม่ได้ถาม ไม่ใช้ markdown (ไม่มี ** หรือ #) ใช้อีโมจิได้เล็กน้อย
6.1 ห้ามรับปาก "ได้ค่ะ" กับคำขอที่ไม่มีในข้อมูล (เช่น เช่าอุปกรณ์แยกชิ้น เพิ่มบริการพิเศษ) ให้ส่งต่อแอดมินแทน
6.2 AI มองไม่เห็นรูปภาพ ถ้าคำถามอ้างถึงรูปที่ลูกค้าส่ง (เช่น "อันนี้ใช่ไหม" "ราคานี้ได้ไหม") และเดาจากบทสนทนาไม่ได้ ให้ส่งต่อแอดมิน
7. ถ้าเหมาะสม แนบลิงก์หน้าจองที่ตรงกับงาน เพื่อให้ลูกค้าดูราคาและขอใบเสนอราคาเองได้ และถามข้อมูลที่ต้องใช้คำนวณราคา (วันที่ ช่วงเวลา อำเภอ จำนวนแขก/โต๊ะ)
8. ดู "สถานะลูกค้า" ก่อนตอบทุกครั้ง แล้วตอบให้เข้ากับสถานะ:
   - ยังไม่จอง: ช่วยลูกค้าเลือก ถามข้อมูลที่ขาดทีละ 1–2 ข้อ (งานอะไร วันที่ อำเภอ จำนวนแขก) แนะนำแพ็กเกจที่ตรงความต้องการ ส่งลิงก์หน้าจองได้
   - มีใบเสนอราคาแล้ว ยังไม่มัดจำ: ตอบโดยอิงใบเสนอราคาที่มีอยู่ (แพ็กเกจ ยอด ยอดมัดจำ) ห้ามเสนอแพ็กเกจใหม่หรือส่งลิงก์จองซ้ำ ถ้าลูกค้าพร้อม ให้บอกว่าชำระมัดจำตามใบเสนอราคาเพื่อล็อกคิว ถ้าขอแก้ใบเสนอราคา ให้ส่งต่อแอดมิน
   - จองแล้ว: ลูกค้าคนนี้คือเจ้าภาพงานที่จองไว้ ห้ามขายแพ็กเกจ ห้ามส่งลิงก์หน้าจอง ห้ามอธิบายแพ็กเกจเหมือนลูกค้าใหม่ ให้ตอบเรื่องงานของเขา (ยืนยันรายละเอียดตามใบเสนอราคา/บทสนทนา กำหนดส่งเมนู 7 วันก่อนงาน การนัดจัดสถานที่ สิ่งที่ลูกค้าต้องเตรียม) คำขอเพิ่ม/ลด/เปลี่ยนรายการ หรือเรื่องเงิน ให้ส่งต่อแอดมิน
   - ลูกค้าเก่า: ทักทายแบบคนที่เคยใช้บริการ ถ้าถามงานใหม่ให้ตอบแบบลูกค้าที่ยังไม่จอง
   สถานะคำนวณจากระบบอาจคลาดได้ ถ้าบทสนทนาขัดกับสถานะ (เช่น แอดมินเพิ่งยืนยันคิวในแชท) ให้เชื่อบทสนทนา
9. ข้อมูลที่ตกลงกันไว้ในบทสนทนาก่อนหน้า (จำนวนแขก วันงาน เมนู สถานที่) ให้ใช้ตามนั้น ไม่ต้องถามซ้ำ
ตอบผ่านเครื่องมือ respond เท่านั้น`;

const RESPOND_TOOL: Anthropic.Tool = {
  name: 'respond',
  description: 'ส่งร่างคำตอบสำหรับเทิร์นล่าสุดของลูกค้า',
  input_schema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['reply', 'handoff', 'no_reply'], description: 'reply = AI ตอบเองได้, handoff = ต้องให้แอดมินดูแล, no_reply = ไม่ต้องตอบ' },
      reply: { type: 'string', description: 'ข้อความที่จะส่งให้ลูกค้า (handoff = ข้อความรับเรื่อง; no_reply = ว่าง)' },
      handoff_reason: { type: 'string', description: 'เหตุผลที่ต้องส่งต่อแอดมิน (เฉพาะ handoff)' },
      intent: {
        type: 'string',
        enum: ['ราคา/แพ็กเกจ', 'เมนู', 'พื้นที่/ค่าเดินทาง', 'คิว/วันว่าง', 'มัดจำ/ชำระเงิน', 'รายละเอียดงาน', 'จอง/ใบเสนอราคา', 'เปลี่ยนแปลง/ยกเลิก', 'ร้องเรียน', 'ทักทาย/ขอบคุณ', 'อื่นๆ'],
      },
      confidence: { type: 'number', description: '0–1 ความมั่นใจว่าคำตอบถูกต้องและครบตามข้อมูล' },
      sources: { type: 'array', items: { type: 'string' }, description: 'หัวข้อข้อมูลที่ใช้ตอบ เช่น "ตารางราคา: ครบวงจร", "นโยบาย: มัดจำ"' },
    },
    required: ['action', 'reply', 'intent', 'confidence'],
  },
};

const baht = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString('th-TH') : '-');

@Injectable()
export class AiShadowService {
  private readonly logger = new Logger(AiShadowService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private settingsCache: { at: number; value: AiShadowSettings } | null = null;
  private knowledgeCache: { at: number; text: string } | null = null;
  private replayJob: ReplayJob = { running: false, startedAt: null, finishedAt: null, channels: [], target: 0, found: 0, done: 0, errors: 0, message: null };

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly bookings: BookingsService,
    private readonly quotations: QuotationsService,
  ) {}

  // ── settings ──

  async getSettings(force = false): Promise<AiShadowSettings> {
    if (!force && this.settingsCache && Date.now() - this.settingsCache.at < 60_000) return this.settingsCache.value;
    let value = DEFAULT_AI_SHADOW_SETTINGS;
    try {
      const row = await this.prisma.systemSetting.findUnique({ where: { key: AI_SHADOW_SETTINGS_KEY } });
      if (row?.value) value = { ...DEFAULT_AI_SHADOW_SETTINGS, ...JSON.parse(row.value) };
    } catch {
      /* keep defaults */
    }
    this.settingsCache = { at: Date.now(), value };
    return value;
  }

  async saveSettings(patch: Partial<AiShadowSettings>): Promise<AiShadowSettings> {
    const cur = await this.getSettings(true);
    const next: AiShadowSettings = {
      enabled: typeof patch.enabled === 'boolean' ? patch.enabled : cur.enabled,
      channels: Array.isArray(patch.channels) ? patch.channels.map(String) : cur.channels,
      dailyCap: Number.isFinite(Number(patch.dailyCap)) ? Math.max(0, Math.round(Number(patch.dailyCap))) : cur.dailyCap,
      model: typeof patch.model === 'string' && patch.model.trim() ? patch.model.trim() : cur.model,
    };
    await this.prisma.systemSetting.upsert({
      where: { key: AI_SHADOW_SETTINGS_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: AI_SHADOW_SETTINGS_KEY, value: JSON.stringify(next) },
    });
    this.settingsCache = { at: Date.now(), value: next };
    return next;
  }

  // ── trigger (from the webhooks) ──

  /** Fire-and-forget: a customer text arrived on `channel`. Never throws. */
  onIncoming(customerId: string, channel: string) {
    this.getSettings()
      .then((s) => {
        if (!s.enabled || !s.channels.includes(channel) || !process.env.ANTHROPIC_API_KEY) return;
        const prev = this.timers.get(customerId);
        if (prev) clearTimeout(prev);
        this.timers.set(
          customerId,
          setTimeout(() => {
            this.timers.delete(customerId);
            this.run(customerId, channel).catch((e: any) => this.logger.error(`shadow ${customerId}: ${e?.message || e}`));
          }, DEBOUNCE_MS),
        );
      })
      .catch(() => undefined);
  }

  private async todayCount(): Promise<number> {
    // midnight Asia/Bangkok (UTC+7)
    const bkk = new Date(Date.now() + 7 * 3600_000);
    const start = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - 7 * 3600_000);
    return this.prisma.aiShadowReply.count({ where: { createdAt: { gte: start }, mode: 'live' } });
  }

  // ── knowledge ──

  /** live prices from flowaccount (same numbers as the booking pages) */
  private async livePricingText(): Promise<string> {
    const s = await this.bookings.pricingSettings();
    const p = s.pricing as any;
    const lines: string[] = ['## ตารางราคาปัจจุบัน (จากระบบ flowaccount — ใช้ตัวเลขนี้เท่านั้น)'];
    for (const pkg of BOOKING_PACKAGES) {
      const pp = p.packages?.[pkg.id];
      if (!pp) continue;
      if (pkg.kind === 'ceremony') {
        lines.push(`- ${pkg.name}: ${baht(pp.base)} บาท (พระ 9 รูป)`);
      } else if (pkg.kind === 'full') {
        const b = pp.buffet;
        const t = pp.table;
        lines.push(
          `- ${pkg.name}: บุฟเฟต์ ${b ? b.tiers.map(([n, v]: [number, number]) => `แขก ${n} ท่าน ${baht(v)}`).join(' / ') + ` เกิน ${b.tiers[b.tiers.length - 1][0]} ท่าน +${baht(b.extra)}/ท่าน` : '-'}; โต๊ะจีน ${t ? t.tiers.map(([n, v]: [number, number]) => `${n} โต๊ะ ${baht(v)}`).join(' / ') + ` เพิ่มโต๊ะละ ${baht(t.extra)}` : '-'} (ราคารวมพิธีสงฆ์พระ 9 รูป)`,
        );
      } else if (pkg.unit === 'guest') {
        const ph = pp.perHead || pkg.perHead;
        lines.push(`- ${pkg.name}: ต่อท่าน ${DISH_COUNTS.map((n) => `${n} อย่าง ${baht(ph?.[n])}`).join(' / ')} ขั้นต่ำ ${pkg.minCount} ท่าน`);
      } else {
        lines.push(`- ${pkg.name}: โต๊ะละ ${baht(pp.perTable ?? pkg.perTable)} ขั้นต่ำ ${pkg.minCount} โต๊ะ`);
      }
    }
    lines.push(`- ออปชั่นเสริม: ${BOOKING_ADDONS.map((a) => `${a.label} ${baht(p.addons?.[a.id] ?? a.price)}${a.perUnit ? '/โต๊ะ' : ''}`).join(' · ')}`);
    lines.push(`- ส่วนลดจำนวนพระ: ${(s.monkOptions || []).filter((o: any) => o.discount > 0).map((o: any) => `${o.monks} รูป ลด ${baht(o.discount)}`).join(' · ')} · นิมนต์และรับ-ส่งพระเอง ลด ${baht(p.selfTransportDiscount)}`);
    const dr = s.depositRule as any;
    if (dr?.tiers?.length) {
      lines.push(`- มัดจำ (คิดจากค่าอาหารเลี้ยงแขก): ${dr.tiers.map((t: any) => `ไม่เกิน ${baht(t.upTo)} มัดจำ ${baht(t.amount)}`).join(' / ')} / เกินกว่านั้น ${dr.abovePercent}% — แจ้งลูกค้าว่า "ตามใบเสนอราคา 3,000 บาทขึ้นไป"`);
    }
    const fees = Object.entries((s.travelFees || {}) as Record<string, number>).filter(([, v]) => v > 0);
    if (fees.length) lines.push(`- ค่าเดินทางตามอำเภอ (อำเภออื่นในพื้นที่บริการไม่มีค่าเดินทาง): ${fees.map(([k, v]) => `${k} ${baht(v)}`).join(', ')}`);
    return lines.join('\n');
  }

  /** everything the AI may answer from (cached 5 min; also shown on the dashboard) */
  async knowledgeText(force = false): Promise<string> {
    if (!force && this.knowledgeCache && Date.now() - this.knowledgeCache.at < 300_000) return this.knowledgeCache.text;
    let pricing = '';
    try {
      pricing = await this.livePricingText();
    } catch (e: any) {
      pricing = '## ตารางราคาปัจจุบัน\n(โหลดราคาไม่สำเร็จ — ห้ามบอกตัวเลขราคา ให้ส่งลิงก์หน้าจองแทน)';
      this.logger.warn(`pricing for AI unavailable: ${e?.message || e}`);
    }
    let kb = '';
    try {
      kb = await this.knowledge.getAllKnowledgeAsText();
    } catch {
      /* optional */
    }
    const text = [
      '# ข้อมูลธุรกิจ',
      pricing,
      MERIT_FACTS,
      CATERING_FACTS,
      AREA_FACTS,
      BOOKING_LINKS,
      kb ? `## ฐานความรู้เดิม (หน้า "ฐานความรู้" ในแดชบอร์ด — อาจเก่ากว่าตารางราคา)\n${kb}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    this.knowledgeCache = { at: Date.now(), text };
    return text;
  }

  // ── one turn ──

  async run(customerId: string, channel: string) {
    const settings = await this.getSettings();
    if ((await this.todayCount()) >= settings.dailyCap) {
      this.logger.warn(`AI shadow daily cap ${settings.dailyCap} reached — skipping ${customerId}`);
      return;
    }
    // the turn ends at the newest customer message (an admin may already have answered — ignore that)
    const lastIn = await this.prisma.message.findFirst({ where: { customerId, type: 'INCOMING' }, orderBy: { timestamp: 'desc' } });
    if (!lastIn) return;
    await this.generate(customerId, channel, lastIn, 'live', settings.model);
  }

  /**
   * Draft the answer to the customer turn that ends with `lastIn`, seeing the chat only up to that
   * moment (live: now; replay: a past turn). Skips a turn that already has a draft.
   */
  private async generate(
    customerId: string,
    channel: string,
    lastIn: { id: string; timestamp: bigint },
    mode: 'live' | 'replay',
    model: string,
    run = 1,
  ) {
    const exists = await this.prisma.aiShadowReply.findFirst({ where: { customerId, triggerMessageId: lastIn.id, mode, run }, select: { id: true } });
    if (exists) return;
    const at = new Date(Number(lastIn.timestamp));
    const all = (
      await this.prisma.message.findMany({
        where: { customerId, timestamp: { lte: lastIn.timestamp } },
        orderBy: { timestamp: 'desc' },
        take: HISTORY + OLDER_HISTORY,
      })
    ).reverse();
    const history = all.slice(-HISTORY);
    const older = all.slice(0, Math.max(0, all.length - HISTORY));
    // images that were detected as transfer slips (slip id = message id)
    const imageIds = all.filter((m) => m.mediaType === 'IMAGE').map((m) => m.id);
    const slipById = new Map(
      imageIds.length
        ? (await this.prisma.slip.findMany({ where: { id: { in: imageIds } }, select: { id: true, amount: true } })).map((x) => [x.id, x.amount ? Number(x.amount) : null] as const)
        : [],
    );
    const render = (m: (typeof all)[number]) => (slipById.has(m.id) ? `[รูปสลิปโอนเงิน${slipById.get(m.id) ? ` ${baht(slipById.get(m.id))} บาท` : ''}]` : this.render(m));
    const who = (m: (typeof all)[number]) => (m.type === 'INCOMING' ? 'ลูกค้า' : `แอดมิน${m.adminName ? ` (${m.adminName})` : ''}`);
    const turn: string[] = [];
    for (let i = history.length - 1; i >= 0 && history[i].type === 'INCOMING'; i--) {
      turn.unshift(render(history[i]));
    }

    const ctx = await this.customerContext(customerId, channel, at, mode);
    const now = at.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // older part: text only, shortened, newest kept when over budget
    let olderText = '';
    if (older.length) {
      const lines = older
        .filter((m) => (m.text && m.text.trim()) || slipById.has(m.id))
        .map((m) => `${who(m)}: ${render(m).replace(/\s+/g, ' ').slice(0, 200)}`);
      const kept: string[] = [];
      let size = 0;
      for (let i = lines.length - 1; i >= 0 && size + lines[i].length < OLDER_CHARS; i--) {
        kept.unshift(lines[i]);
        size += lines[i].length + 1;
      }
      const firstAt = new Date(Number(older[0].timestamp)).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
      olderText = `บทสนทนาช่วงก่อนหน้า (ย่อ ตั้งแต่ ${firstAt}${kept.length < lines.length ? ' — ตัดส่วนที่เก่ามากออก' : ''}):\n${kept.join('\n')}\n\n`;
    }
    const conversation = history.map((m) => `${who(m)}: ${render(m)}`).join('\n');
    const userContent = `${ctx.text}\n\nเวลาข้อความล่าสุด: ${now}\n\n${olderText}บทสนทนาล่าสุด (เก่า → ใหม่):\n${conversation}\n\nร่างคำตอบสำหรับข้อความล่าสุดของลูกค้า:\n${turn.join('\n')}`;

    const knowledge = await this.knowledgeText();
    const started = Date.now();
    const base = {
      customerId,
      channel,
      triggerMessageId: lastIn.id,
      triggerAt: lastIn.timestamp,
      question: turn.join('\n').slice(0, 4000),
      model,
      mode,
      run,
      stage: ctx.stage,
      customerContext: ctx.text.slice(0, 4000),
    };
    try {
      const anthropic = new Anthropic();
      const res = await anthropic.messages.create({
        model,
        max_tokens: 2500,
        system: [
          { type: 'text', text: RULES },
          { type: 'text', text: knowledge, cache_control: { type: 'ephemeral' } },
        ] as any,
        tools: [RESPOND_TOOL],
        // newer models reject a forced tool_choice; the rules require the tool and we fall back to plain text below
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: userContent }],
      });
      const tool = res.content.find((c) => c.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
      const plain = res.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as Anthropic.TextBlock).text)
        .join('\n')
        .trim();
      const out = (tool?.input || { action: 'reply', reply: plain, intent: 'อื่นๆ', confidence: null, sources: ['(ไม่ได้ใช้เครื่องมือ respond)'] }) as any;
      const usage = res.usage as any;
      await this.prisma.aiShadowReply.create({
        data: {
          ...base,
          action: ['reply', 'handoff', 'no_reply'].includes(out.action) ? out.action : 'reply',
          aiReply: typeof out.reply === 'string' ? out.reply.trim() : null,
          handoffReason: typeof out.handoff_reason === 'string' ? out.handoff_reason : null,
          intent: typeof out.intent === 'string' ? out.intent : null,
          confidence: typeof out.confidence === 'number' ? Math.max(0, Math.min(1, out.confidence)) : null,
          sources: Array.isArray(out.sources) ? out.sources.map(String).slice(0, 10) : [],
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          cacheReadTokens: usage?.cache_read_input_tokens ?? null,
          latencyMs: Date.now() - started,
          error: res.stop_reason === 'max_tokens' ? 'คำตอบยาวเกินขีดจำกัด (max_tokens)' : null,
        },
      });
    } catch (e: any) {
      await this.prisma.aiShadowReply.create({
        data: { ...base, action: 'error', error: String(e?.message || e).slice(0, 500), latencyMs: Date.now() - started },
      });
      throw e;
    }
  }

  /**
   * Who this customer is right now: quotations, deposit slips, web bookings, IRIS Jobs and tags →
   * a stage (new / quoted / booked / past) the rules answer by. For a replay only what existed at
   * `at` is used: tags and the IRIS Jobs link only show the current state, so they're live-only, and
   * a quotation that is deposited today counts as deposited then only if a slip had already come.
   */
  private async customerContext(customerId: string, channel: string, at: Date, mode: 'live' | 'replay'): Promise<{ stage: CustomerStage; text: string }> {
    const live = mode === 'live';
    const atIso = bkkDate(at);
    const [customer, slips, webBookings, tags, allQuotes] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.slip.findMany({
        where: { customerId, createdAt: { lte: at } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { amount: true, createdAt: true, matchedDocNo: true },
      }),
      this.prisma.booking.findMany({
        where: { customerId, createdAt: { lte: at } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { code: true, packageName: true, eventDate: true, timeSlot: true, guests: true, tables: true, foodMode: true, estimatedTotal: true, quotationDocNo: true, quotationPublicUrl: true, status: true },
      }),
      live ? this.prisma.customerTag.findMany({ where: { customerId }, include: { tag: true } }) : Promise.resolve([]),
      this.quotations.forCustomer(customerId).catch((): QuotationRecord[] => []),
    ]);

    const recentSlip = slips.find((x) => at.getTime() - x.createdAt.getTime() < 120 * DAY_MS);
    const quotes = allQuotes
      .filter((q) => q.date && q.date <= atIso)
      .map((q) => {
        let status = q.status;
        if (!live && DONE_QUOTE.test(status) && !slips.some((x) => x.matchedDocNo === q.docNo) && !recentSlip) status = 'PENDING';
        // documents from the booking page write the event date as YYYY-MM-DD in the project line
        const jobDate = q.jobDate || (q.project || '').match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || null;
        return { ...q, status, jobDate };
      })
      .filter((q) => OPEN_QUOTE.includes(q.status) || DONE_QUOTE.test(q.status))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 4);

    const upcoming = (q: { jobDate?: string | null; date: string }) =>
      q.jobDate ? q.jobDate >= atIso : at.getTime() - new Date(q.date).getTime() < 120 * DAY_MS;
    const depositedUpcoming = quotes.find((q) => DONE_QUOTE.test(q.status) && upcoming(q));
    const openQuote = quotes.find((q) => OPEN_QUOTE.includes(q.status) && at.getTime() - new Date(q.date).getTime() < 90 * DAY_MS);
    const webConfirmed = webBookings.find((b) => b.status === 'CONFIRMED' && b.eventDate >= atIso);
    const webOpen = webBookings.find((b) => (b.status === 'NEW' || b.status === 'CONTACTED') && b.eventDate >= atIso);
    const liveJob = live && customer?.nextJobDate && customer.nextJobDate.getTime() >= at.getTime() - DAY_MS;
    const tagNames = tags.map((t) => t.tag.name);

    let stage: CustomerStage = 'new';
    const why: string[] = [];
    if (depositedUpcoming || webConfirmed || liveJob || (recentSlip && !openQuote)) {
      stage = 'booked';
      if (depositedUpcoming) why.push(`ใบเสนอราคา ${depositedUpcoming.docNo} ชำระมัดจำแล้ว`);
      if (webConfirmed) why.push(`การจองออนไลน์ ${webConfirmed.code} ยืนยันแล้ว`);
      if (liveJob) why.push(`มีงานในระบบงาน ${customer?.nextJobNo || ''}`.trim());
      if (recentSlip && !depositedUpcoming) why.push(`ลูกค้าส่งสลิปโอนเงินมาแล้ว${recentSlip.amount ? ` ${baht(Number(recentSlip.amount))} บาท` : ''}`);
    } else if (openQuote || webOpen || (recentSlip && openQuote)) {
      stage = 'quoted';
      if (openQuote) why.push(`ใบเสนอราคา ${openQuote.docNo} ${QUOTE_STATUS_TH[openQuote.status] || openQuote.status}`);
      if (webOpen) why.push(`ขอใบเสนอราคาผ่านหน้าจอง ${webOpen.code}`);
    } else if (quotes.some((q) => DONE_QUOTE.test(q.status)) || slips.length || tagNames.includes('ลูกค้าเก่า') || tagNames.includes('ลูกค้าจองงานแล้ว')) {
      stage = 'past';
      why.push('เคยมีงาน/ชำระเงินกับเรามาก่อน');
    }
    if (recentSlip && openQuote && stage === 'quoted') why.push(`ลูกค้าส่งสลิป${recentSlip.amount ? ` ${baht(Number(recentSlip.amount))} บาท` : ''} มาแล้ว (อาจเป็นมัดจำที่แอดมินยังไม่ได้ปรับสถานะ)`);

    const lines = [
      `สถานะลูกค้า: ${STAGE_TH[stage]}${why.length ? ` (${why.join(' · ')})` : ''}`,
      `ชื่อในแชท: ${customer?.nickname || customer?.displayName || '-'}`,
      `ช่องทาง: ${channel} (${/เติมบุญ/.test(channel) ? 'เพจ/LINE เติมบุญ — ลูกค้าส่วนใหญ่ถามงานบุญ' : 'IRIS — ลูกค้าส่วนใหญ่ถามจัดเลี้ยง บุฟเฟต์ โต๊ะจีน'})`,
    ];
    for (const q of quotes) {
      lines.push(
        `ใบเสนอราคา ${q.docNo} (ออกวันที่ ${q.date}): ${q.project || '-'} · ยอดรวม ${baht(q.grandTotal)} บาท${q.depositAmount ? ` · มัดจำ ${baht(q.depositAmount)} บาท` : ''} · สถานะ ${QUOTE_STATUS_TH[q.status] || q.status}${q.jobDate ? ` · วันงาน ${q.jobDate}` : ''}${q.publicUrl ? ` · ลิงก์ ${q.publicUrl}` : ''}`,
      );
    }
    for (const b of webBookings) {
      lines.push(
        `การจองออนไลน์ ${b.code}: ${b.packageName} วันที่ ${b.eventDate} ${b.timeSlot} ${b.foodMode === 'table' ? `${b.tables} โต๊ะ` : b.foodMode === 'buffet' ? `${b.guests} ท่าน` : ''} ราคาประเมิน ${baht(b.estimatedTotal)} สถานะ ${b.status}${b.quotationPublicUrl ? ` ใบเสนอราคา ${b.quotationPublicUrl}` : ''}`,
      );
    }
    if (slips.length) {
      const counts = new Map<string, number>();
      for (const x of slips) {
        const k = `${bkkDate(x.createdAt)}${x.amount ? ` ${baht(Number(x.amount))} บาท` : ''}${x.matchedDocNo ? ` (มัดจำ ${x.matchedDocNo})` : ''}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      lines.push(`สลิปโอนเงินที่ลูกค้าเคยส่ง: ${[...counts].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(' · ')}`);
    }
    if (liveJob) lines.push(`งานในระบบงาน: ${customer?.nextJobNo || ''} ${customer?.nextJobTitle || ''} วันที่ ${customer?.nextJobDate ? bkkDate(customer.nextJobDate) : '-'}`.trim());
    if (tagNames.length) lines.push(`แท็ก: ${tagNames.join(', ')}`);
    return { stage, text: lines.join('\n') };
  }

  private render(m: { text: string | null; mediaType: string | null }): string {
    if (m.text && m.text.trim()) return m.text.trim().slice(0, 1500);
    return m.mediaType ? `[${m.mediaType === 'IMAGE' ? 'รูปภาพ' : m.mediaType === 'VIDEO' ? 'วิดีโอ' : m.mediaType === 'STICKER' ? 'สติกเกอร์' : 'ไฟล์'}]` : '[ข้อความว่าง]';
  }

  // ── dashboard ──

  async list(q: { channel?: string; action?: string; rating?: string; mode?: string; run?: number; stage?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (q.mode) where.mode = q.mode;
    if (q.run) where.run = q.run;
    if (q.stage) where.stage = q.stage;
    if (q.channel) where.channel = q.channel;
    if (q.action) where.action = q.action;
    if (q.rating === 'unrated') where.rating = null;
    else if (q.rating) where.rating = q.rating;
    const pageSize = Math.min(100, Math.max(5, Number(q.pageSize) || 30));
    const page = Math.max(1, Number(q.page) || 1);
    const [total, rows] = await Promise.all([
      this.prisma.aiShadowReply.count({ where }),
      this.prisma.aiShadowReply.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.customerId))] } },
      select: { id: true, displayName: true, nickname: true, pictureUrl: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));
    // the same question in the previous round, to see what changed
    const prevRows =
      q.mode === 'replay' && rows.some((r) => r.run > 1)
        ? await this.prisma.aiShadowReply.findMany({
            where: { mode: 'replay', triggerMessageId: { in: rows.map((r) => r.triggerMessageId) } },
            select: { triggerMessageId: true, run: true, action: true, aiReply: true, rating: true, ratingNote: true, stage: true },
          })
        : [];
    const items = await Promise.all(
      rows.map(async (r) => {
        const admin = await this.adminAnswer(r.customerId, r.triggerAt);
        const c = byId.get(r.customerId);
        return {
          ...r,
          triggerAt: Number(r.triggerAt),
          customerName: c?.nickname || c?.displayName || r.customerId,
          previous:
            prevRows
              .filter((p) => p.triggerMessageId === r.triggerMessageId && p.run < r.run)
              .sort((a, b) => b.run - a.run)[0] || null,
          pictureUrl: c?.pictureUrl || null,
          adminReplies: admin.map((m) => ({ text: m.text, adminName: m.adminName, timestamp: Number(m.timestamp), mediaType: m.mediaType })),
          adminDelaySec: admin.length ? Math.round((Number(admin[0].timestamp) - Number(r.triggerAt)) / 1000) : null,
        };
      }),
    );
    return { total, page, pageSize, items };
  }

  /**
   * The admin's real answer to a turn: outgoing messages after it until the customer writes again
   * (max 24h), minus our own auto follow-ups and Meta's instant FAQ answers.
   */
  private async adminAnswer(customerId: string, triggerAt: bigint) {
    const nextIn = await this.prisma.message.findFirst({
      where: { customerId, type: 'INCOMING', timestamp: { gt: triggerAt } },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });
    const cap = triggerAt + BigInt(24 * 3600_000);
    const end = nextIn && nextIn.timestamp < cap ? nextIn.timestamp : cap;
    const rows = await this.prisma.message.findMany({
      where: { customerId, type: 'OUTGOING', timestamp: { gt: triggerAt, lte: end }, NOT: { adminName: { in: NON_HUMAN_ADMINS } } },
      orderBy: { timestamp: 'asc' },
      take: 8,
      select: { text: true, adminName: true, timestamp: true, mediaType: true },
    });
    return rows.filter((m) => !(m.adminName === 'Business Suite' && Number(m.timestamp - triggerAt) < META_AUTO_MS)).slice(0, 6);
  }

  // ── replay: past questions from real chats ──

  getReplayJob(): ReplayJob {
    return this.replayJob;
  }

  /**
   * Pick past customer questions on `channels` (typed questions only: FB FAQ-button texts,
   * stickers/images and one-word acknowledgements are skipped) that an admin answered, and draft
   * the AI answer for each as if it were that moment. Runs in the background; one job at a time.
   */
  startReplay(opts: { channels: string[]; count: number; days: number }): ReplayJob {
    if (this.replayJob.running) return this.replayJob;
    const channels = (opts.channels || []).filter(Boolean);
    const count = Math.min(500, Math.max(1, Math.round(opts.count || 100)));
    const days = Math.min(365, Math.max(1, Math.round(opts.days || 90)));
    this.replayJob = { running: true, startedAt: Date.now(), finishedAt: null, channels, target: count, found: 0, done: 0, errors: 0, message: 'กำลังค้นหาคำถาม…' };
    this.runReplay(channels, count, days)
      .catch((e: any) => {
        this.replayJob.message = `หยุดเพราะผิดพลาด: ${e?.message || e}`;
        this.logger.error(`replay failed: ${e?.message || e}`);
      })
      .finally(() => {
        this.replayJob.running = false;
        this.replayJob.finishedAt = Date.now();
      });
    return this.replayJob;
  }

  /** replay rounds that exist, newest first */
  async replayRuns() {
    const rows = await this.prisma.aiShadowReply.groupBy({ by: ['run'], where: { mode: 'replay' }, _count: { _all: true }, _min: { createdAt: true } });
    return rows
      .map((r) => ({ run: r.run, count: r._count._all, startedAt: r._min.createdAt }))
      .sort((a, b) => b.run - a.run);
  }

  /** Answer the questions of round `fromRun` again as a new round (after changing rules or data). */
  async startRerun(fromRun?: number): Promise<ReplayJob> {
    if (this.replayJob.running) return this.replayJob;
    const runs = await this.replayRuns();
    if (!runs.length) throw new Error('ยังไม่มีชุดทดลอง');
    const source = fromRun && runs.some((r) => r.run === fromRun) ? fromRun : runs[runs.length - 1].run;
    const next = runs[0].run + 1;
    const rows = await this.prisma.aiShadowReply.findMany({
      where: { mode: 'replay', run: source },
      select: { customerId: true, channel: true, triggerMessageId: true, triggerAt: true },
    });
    this.replayJob = {
      running: true,
      startedAt: Date.now(),
      finishedAt: null,
      channels: [...new Set(rows.map((r) => r.channel))],
      target: rows.length,
      found: rows.length,
      done: 0,
      errors: 0,
      message: `รอบ ${next}: ตอบชุดคำถามเดิมของรอบ ${source} อีกครั้ง…`,
    };
    const picked = rows.map((r) => ({ customerId: r.customerId, channel: r.channel, lastIn: { id: r.triggerMessageId, timestamp: r.triggerAt } }));
    this.answerAll(picked, next)
      .catch((e: any) => {
        this.replayJob.message = `หยุดเพราะผิดพลาด: ${e?.message || e}`;
        this.logger.error(`rerun failed: ${e?.message || e}`);
      })
      .finally(() => {
        this.replayJob.running = false;
        this.replayJob.finishedAt = Date.now();
      });
    return this.replayJob;
  }

  private async answerAll(picked: { customerId: string; channel: string; lastIn: { id: string; timestamp: bigint } }[], run: number) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    const settings = await this.getSettings(true);
    // 3 at a time
    let i = 0;
    const worker = async () => {
      while (i < picked.length) {
        const job = picked[i++];
        try {
          await this.generate(job.customerId, job.channel, job.lastIn, 'replay', settings.model, run);
        } catch {
          this.replayJob.errors++;
        }
        this.replayJob.done++;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    this.replayJob.message = `เสร็จแล้ว รอบ ${run}: ${this.replayJob.done - this.replayJob.errors} คำถาม${this.replayJob.errors ? ` (ผิดพลาด ${this.replayJob.errors})` : ''}`;
  }

  private async runReplay(channels: string[], count: number, days: number) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    const since = new Date(Date.now() - days * 86400_000);
    // candidate customer messages that look like typed questions, newest customers spread out
    const candidates = await this.prisma.$queryRawUnsafe<{ id: string; customer_id: string; channel: string; timestamp: bigint; text: string }[]>(
      `select m.id, m.customer_id, cu.channel, m.timestamp, m.text
         from messages m join customers cu on cu.id = m.customer_id
        where cu.channel = any($1) and m.type = 'INCOMING' and m.created_at >= $2
          and m.text is not null and length(m.text) >= 6 and not (m.text = any($3))
        order by random() limit $4`,
      channels,
      since,
      AUTO_QUESTION_TEXTS,
      count * 6,
    );
    const usedTurns = new Set<string>();
    const perCustomer = new Map<string, number>();
    const picked: { customerId: string; channel: string; lastIn: { id: string; timestamp: bigint } }[] = [];
    for (const c of candidates) {
      if (picked.length >= count) break;
      if (!QUESTION_RE.test(c.text) || isAutoQuestion(c.text) || isPlaceholder(c.text)) continue;
      // at most 2 questions per customer so one long chat doesn't dominate
      if ((perCustomer.get(c.customer_id) || 0) >= 2) continue;
      // the turn continues while the customer keeps typing; it ends at their last message before the admin
      const after = await this.prisma.message.findMany({
        where: { customerId: c.customer_id, timestamp: { gt: c.timestamp } },
        orderBy: { timestamp: 'asc' },
        take: 10,
        select: { id: true, type: true, timestamp: true },
      });
      let lastIn = { id: c.id, timestamp: c.timestamp };
      for (const m of after) {
        if (m.type !== 'INCOMING') break;
        lastIn = { id: m.id, timestamp: m.timestamp };
      }
      if (usedTurns.has(lastIn.id)) continue;
      const admin = await this.adminAnswer(c.customer_id, lastIn.timestamp);
      if (!admin.some((m) => (m.text || '').trim().length > 0)) continue; // need a human answer to compare with
      usedTurns.add(lastIn.id);
      perCustomer.set(c.customer_id, (perCustomer.get(c.customer_id) || 0) + 1);
      picked.push({ customerId: c.customer_id, channel: c.channel, lastIn });
    }
    this.replayJob.found = picked.length;
    this.replayJob.message = picked.length ? 'AI กำลังตอบ…' : 'ไม่พบคำถามที่เข้าเงื่อนไข';
    if (!picked.length) return;
    // a fresh sample is a new round
    const runs = await this.replayRuns();
    await this.answerAll(picked, (runs[0]?.run || 0) + 1);
  }

  async stats(channel?: string, mode?: string, run?: number) {
    const where: any = channel ? { channel } : {};
    if (mode) where.mode = mode;
    if (run) where.run = run;
    const [byAction, byRating, agg, byStage] = await Promise.all([
      this.prisma.aiShadowReply.groupBy({ by: ['action'], where, _count: { _all: true } }),
      this.prisma.aiShadowReply.groupBy({ by: ['rating'], where, _count: { _all: true } }),
      this.prisma.aiShadowReply.aggregate({ where, _avg: { latencyMs: true, confidence: true }, _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true }, _count: { _all: true } }),
      this.prisma.aiShadowReply.groupBy({ by: ['stage'], where, _count: { _all: true } }),
    ]);
    return {
      total: agg._count._all,
      byAction: Object.fromEntries(byAction.map((x) => [x.action, x._count._all])),
      byRating: Object.fromEntries(byRating.map((x) => [x.rating ?? 'unrated', x._count._all])),
      byStage: Object.fromEntries(byStage.map((x) => [x.stage ?? 'unknown', x._count._all])),
      avgLatencyMs: Math.round(agg._avg.latencyMs || 0),
      avgConfidence: agg._avg.confidence,
      tokens: { input: agg._sum.inputTokens || 0, output: agg._sum.outputTokens || 0, cacheRead: agg._sum.cacheReadTokens || 0 },
      today: await this.todayCount(),
    };
  }

  async rate(id: string, rating: string | null, note: string | null, by: string) {
    const ok = rating === null || ['good', 'partial', 'bad'].includes(rating);
    if (!ok) throw new Error('invalid rating');
    return this.prisma.aiShadowReply.update({
      where: { id },
      data: { rating, ratingNote: note, ratedBy: rating ? by : null, ratedAt: rating ? new Date() : null },
      select: { id: true, rating: true, ratingNote: true, ratedBy: true, ratedAt: true },
    });
  }

  /** channels that have customers, for the settings chips */
  async channelList(): Promise<string[]> {
    const rows = await this.prisma.customer.groupBy({ by: ['channel'], _count: { _all: true } });
    return rows.filter((r) => r.channel).sort((a, b) => b._count._all - a._count._all).map((r) => r.channel);
  }
}
