import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../common/providers/prisma.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { BookingsService } from '../bookings/bookings.service';
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
/** admin messages that are not a human answer */
export const NON_HUMAN_ADMINS = ['ตอบอัตโนมัติ'];

const RULES = `คุณคือแอดมินแชทของธุรกิจจัดงานบุญและจัดเลี้ยงในชลบุรี/ระยอง ชื่อ "เติมบุญ บาย ไอริส" (งานบุญ พิธีสงฆ์) และ "IRIS Catering" (บุฟเฟต์ โต๊ะจีน จัดเลี้ยง)
หน้าที่: ร่างข้อความตอบลูกค้า 1 ข้อความ สำหรับเทิร์นล่าสุดของลูกค้าในบทสนทนา

กติกา:
1. ใช้เฉพาะข้อมูลใน "ข้อมูลธุรกิจ" ด้านล่าง ห้ามเดาราคา เมนู หรือนโยบายที่ไม่มีในข้อมูล
2. ราคาให้ยึด "ตารางราคาปัจจุบัน" เป็นหลัก ถ้า "ฐานความรู้เดิม" ขัดกับตารางราคาหรือข้อมูลที่เจ้าของยืนยัน ให้เชื่อตารางราคา/ข้อมูลที่ยืนยัน
3. ห้ามยืนยันว่าวันไหนคิวว่าง ห้ามรับจองแทน ห้ามให้ส่วนลดหรือของแถมนอกเหนือจากที่ระบุ
4. ต้องส่งต่อแอดมิน (action = handoff) เมื่อ: ถามคิว/ยืนยันวันงาน, ต่อรองราคา/ขอส่วนลดพิเศษ, ส่งสลิปหรือเรื่องชำระเงิน, ขอเลื่อน/ยกเลิกงาน, ร้องเรียน, ขอแพ็กเกจหรือเมนูพิเศษที่ไม่มีในข้อมูล, นอกพื้นที่บริการ, คำถามที่ข้อมูลไม่พอ — ในกรณีนี้ให้ reply เป็นข้อความสั้นที่สุภาพบอกว่าแอดมินจะตรวจสอบให้ และถามข้อมูลที่ยังขาด (เช่น วันที่ สถานที่ จำนวนแขก) ถ้ามี
5. ถ้าลูกค้าแค่ขอบคุณ/ส่งสติกเกอร์/ตอบรับ และไม่ต้องตอบอะไร ให้ action = no_reply
6. เขียนแบบแอดมินจริงในแชท: ภาษาไทยสุภาพ ลงท้าย "ค่ะ/นะคะ" กระชับ ไม่เกินประมาณ 6 บรรทัด ไม่ใช้ markdown (ไม่มี ** หรือ #) ใช้อีโมจิได้เล็กน้อย
7. ถ้าเหมาะสม แนบลิงก์หน้าจองที่ตรงกับงาน เพื่อให้ลูกค้าดูราคาและขอใบเสนอราคาเองได้ และถามข้อมูลที่ต้องใช้คำนวณราคา (วันที่ ช่วงเวลา อำเภอ จำนวนแขก/โต๊ะ)
8. ถ้าลูกค้ามีการจองหรือใบเสนอราคาอยู่แล้ว (ดู "ข้อมูลลูกค้า") ให้ตอบโดยอ้างอิงงานนั้น
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly bookings: BookingsService,
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
    return this.prisma.aiShadowReply.count({ where: { createdAt: { gte: start } } });
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
    const recent = await this.prisma.message.findMany({ where: { customerId }, orderBy: { timestamp: 'desc' }, take: HISTORY });
    if (!recent.length) return;
    // the turn ends at the newest customer message (an admin may already have answered — ignore that)
    const lastIn = recent.find((m) => m.type === 'INCOMING');
    if (!lastIn) return;
    const exists = await this.prisma.aiShadowReply.findFirst({ where: { customerId, triggerMessageId: lastIn.id }, select: { id: true } });
    if (exists) return;
    const history = recent.filter((m) => m.timestamp <= lastIn.timestamp).reverse();
    const turn: string[] = [];
    for (let i = history.length - 1; i >= 0 && history[i].type === 'INCOMING'; i--) {
      turn.unshift(this.render(history[i]));
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    const bookings = await this.prisma.booking.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { code: true, packageName: true, eventDate: true, timeSlot: true, guests: true, tables: true, foodMode: true, estimatedTotal: true, quotationDocNo: true, quotationPublicUrl: true, status: true },
    });
    const customerInfo = [
      `ชื่อในแชท: ${customer?.nickname || customer?.displayName || '-'}`,
      `ช่องทาง: ${channel} (${/เติมบุญ/.test(channel) ? 'เพจ/LINE เติมบุญ — ลูกค้าส่วนใหญ่ถามงานบุญ' : 'IRIS — ลูกค้าส่วนใหญ่ถามจัดเลี้ยง บุฟเฟต์ โต๊ะจีน'})`,
      ...bookings.map(
        (b) =>
          `การจอง ${b.code}: ${b.packageName} วันที่ ${b.eventDate} ${b.timeSlot} ${b.foodMode === 'table' ? `${b.tables} โต๊ะ` : b.foodMode === 'buffet' ? `${b.guests} ท่าน` : ''} ราคาประเมิน ${baht(b.estimatedTotal)} สถานะ ${b.status}${b.quotationPublicUrl ? ` ใบเสนอราคา ${b.quotationPublicUrl}` : ''}`,
      ),
    ].join('\n');
    const now = new Date(Number(lastIn.timestamp)).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    const conversation = history.map((m) => `${m.type === 'INCOMING' ? 'ลูกค้า' : `แอดมิน${m.adminName ? ` (${m.adminName})` : ''}`}: ${this.render(m)}`).join('\n');
    const userContent = `ข้อมูลลูกค้า:\n${customerInfo}\n\nเวลาข้อความล่าสุด: ${now}\n\nบทสนทนา (เก่า → ใหม่):\n${conversation}\n\nร่างคำตอบสำหรับข้อความล่าสุดของลูกค้า:\n${turn.join('\n')}`;

    const knowledge = await this.knowledgeText();
    const started = Date.now();
    const base = {
      customerId,
      channel,
      triggerMessageId: lastIn.id,
      triggerAt: lastIn.timestamp,
      question: turn.join('\n').slice(0, 4000),
      model: settings.model,
    };
    try {
      const anthropic = new Anthropic();
      const res = await anthropic.messages.create({
        model: settings.model,
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

  private render(m: { text: string | null; mediaType: string | null }): string {
    if (m.text && m.text.trim()) return m.text.trim().slice(0, 1500);
    return m.mediaType ? `[${m.mediaType === 'IMAGE' ? 'รูปภาพ' : m.mediaType === 'VIDEO' ? 'วิดีโอ' : m.mediaType === 'STICKER' ? 'สติกเกอร์' : 'ไฟล์'}]` : '[ข้อความว่าง]';
  }

  // ── dashboard ──

  async list(q: { channel?: string; action?: string; rating?: string; page?: number; pageSize?: number }) {
    const where: any = {};
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
    const items = await Promise.all(
      rows.map(async (r) => {
        // admin's real answer = outgoing messages after the trigger, until the customer's next shadowed turn (max 12h)
        const next = await this.prisma.aiShadowReply.findFirst({
          where: { customerId: r.customerId, triggerAt: { gt: r.triggerAt } },
          orderBy: { triggerAt: 'asc' },
          select: { triggerAt: true },
        });
        const end = next ? next.triggerAt : r.triggerAt + BigInt(12 * 3600_000);
        const admin = await this.prisma.message.findMany({
          where: { customerId: r.customerId, type: 'OUTGOING', timestamp: { gt: r.triggerAt, lte: end }, NOT: { adminName: { in: NON_HUMAN_ADMINS } } },
          orderBy: { timestamp: 'asc' },
          take: 6,
          select: { text: true, adminName: true, timestamp: true, mediaType: true },
        });
        const c = byId.get(r.customerId);
        return {
          ...r,
          triggerAt: Number(r.triggerAt),
          customerName: c?.nickname || c?.displayName || r.customerId,
          pictureUrl: c?.pictureUrl || null,
          adminReplies: admin.map((m) => ({ text: m.text, adminName: m.adminName, timestamp: Number(m.timestamp), mediaType: m.mediaType })),
          adminDelaySec: admin.length ? Math.round((Number(admin[0].timestamp) - Number(r.triggerAt)) / 1000) : null,
        };
      }),
    );
    return { total, page, pageSize, items };
  }

  async stats(channel?: string) {
    const where: any = channel ? { channel } : {};
    const [byAction, byRating, agg] = await Promise.all([
      this.prisma.aiShadowReply.groupBy({ by: ['action'], where, _count: { _all: true } }),
      this.prisma.aiShadowReply.groupBy({ by: ['rating'], where, _count: { _all: true } }),
      this.prisma.aiShadowReply.aggregate({ where, _avg: { latencyMs: true, confidence: true }, _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true }, _count: { _all: true } }),
    ]);
    return {
      total: agg._count._all,
      byAction: Object.fromEntries(byAction.map((x) => [x.action, x._count._all])),
      byRating: Object.fromEntries(byRating.map((x) => [x.rating ?? 'unrated', x._count._all])),
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
