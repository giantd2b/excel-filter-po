import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QuotationsService } from './quotations.service';
import { FlowAccountClient } from './flowaccount.client';
import { pushTeamText } from '../../common/utils/team-line';

/** Days a document may sit in a state before it is flagged. */
const PENDING_DAYS = 3;   // รออนุมัติ without an answer
const APPROVED_DAYS = 7;  // อนุมัติแล้ว but no deposit
const EXPIRY_DAYS = 3;    // validUntil within this many days (or already past)

/**
 * Daily digest of quotations that need a follow-up, pushed to the sales LINE group and the
 * IRIS Quotation mobile app. 02:00 UTC = 09:00 Bangkok.
 */
@Injectable()
export class QuotationAlertsService {
  private readonly logger = new Logger(QuotationAlertsService.name);

  constructor(private readonly quotations: QuotationsService, private readonly flowAccount: FlowAccountClient) {}

  @Cron('0 2 * * *')
  async scheduled() {
    try {
      const r = await this.runStaleDigest({ dryRun: false });
      this.logger.log(`stale digest: ${r.count} document(s)${r.sent ? ' sent' : ''}`);
    } catch (e: any) {
      this.logger.warn(`stale digest failed: ${e?.message || e}`);
    }
  }

  async runStaleDigest(opts: { dryRun?: boolean } = {}) {
    await this.quotations.syncFromFlowAccount();
    const all = (await this.quotations.getPipeline({ page: 1, limit: 1000 })).data;
    const today = new Date();
    const todayIso = new Date(today.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10); // Bangkok date
    const daysUntil = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - new Date(todayIso).getTime()) / 86400000) : null);

    type Item = { docNo: string; customer: string; total: number; sales: string; why: string; days: number };
    const items: Item[] = [];
    for (const q of all) {
      const days = q.daysSinceQuote ?? 0;
      const sales = q.crmSalesName || q.salesName || 'ไม่ระบุเซลล์';
      const exp = daysUntil(q.validUntil);
      const open = ['DRAFT', 'PENDING', 'APPROVED'].includes(q.status);
      if (q.status === 'PENDING' && days >= PENDING_DAYS) items.push({ docNo: q.docNo, customer: q.customer, total: q.grandTotal, sales, days, why: `รออนุมัติมา ${days} วัน` });
      else if (q.status === 'APPROVED' && days >= APPROVED_DAYS) items.push({ docNo: q.docNo, customer: q.customer, total: q.grandTotal, sales, days, why: `อนุมัติแล้ว ${days} วัน ยังไม่ได้มัดจำ${q.depositAmount ? ` (${q.depositAmount.toLocaleString('th-TH')} บาท)` : ''}` });
      else if (open && exp !== null && exp <= EXPIRY_DAYS) items.push({ docNo: q.docNo, customer: q.customer, total: q.grandTotal, sales, days, why: exp < 0 ? `หมดอายุแล้ว ${-exp} วัน` : exp === 0 ? 'หมดอายุวันนี้' : `หมดอายุในอีก ${exp} วัน` });
    }
    items.sort((a, b) => a.sales.localeCompare(b.sales, 'th') || b.days - a.days);

    if (!items.length) return { count: 0, sent: false, text: '' };

    const bySales = new Map<string, Item[]>();
    for (const it of items) bySales.set(it.sales, [...(bySales.get(it.sales) || []), it]);
    const lines: string[] = [`📋 ใบเสนอราคาที่ต้องตาม ${items.length} ใบ (${todayIso.split('-').reverse().join('/')})`];
    for (const [sales, list] of bySales) {
      lines.push('', `👤 ${sales} — ${list.length} ใบ`);
      for (const it of list.slice(0, 15)) lines.push(`• ${it.docNo} ${it.customer} ฿${it.total.toLocaleString('th-TH')} — ${it.why}`);
      if (list.length > 15) lines.push(`  …และอีก ${list.length - 15} ใบ`);
    }
    lines.push('', `ดูทั้งหมด: ${(process.env.BOOKING_PUBLIC_URL || 'https://crm.iristermboon.com').replace(/\/+$/, '')}/dashboard/quotations`);
    const text = lines.join('\n');

    if (!opts.dryRun) {
      await pushTeamText(text);
      await this.flowAccount.notify(`ใบเสนอราคาที่ต้องตาม ${items.length} ใบ`, items.slice(0, 3).map((i) => `${i.docNo} ${i.why}`).join(' · '), { kind: 'digest' });
    }
    return { count: items.length, sent: !opts.dryRun, text };
  }
}
