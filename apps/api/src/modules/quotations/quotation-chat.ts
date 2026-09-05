/**
 * Where a quotation in IRIS Quotation came from, derived from the fields the CRM controls:
 *  - externalRef "CQ-…"  → general quotation an admin started from the chat panel
 *  - externalRef "TB-…"  → merit-booking quotation created from a booking
 *  - no externalRef but crmCustomerId → made by hand in IRIS Quotation and attached to a chat later
 *  - otherwise            → made by hand, not attributed
 */
export type QuotationOrigin = 'chat' | 'booking' | 'attached' | 'manual';

export function quotationOrigin(q: { externalRef?: string | null; crmCustomerId?: string | null }): QuotationOrigin {
  const ref = q.externalRef || '';
  if (ref.startsWith('CQ-')) return 'chat';
  if (ref.startsWith('TB-')) return 'booking';
  if (q.crmCustomerId) return 'attached';
  return 'manual';
}

/** The LINE / Facebook message that hands the public quotation link to the customer. */
export function composeQuotationChatMessage(o: {
  docNo: string;
  publicUrl: string;
  /** e.g. " สำหรับงานทำบุญบ้าน วันที่ พ. 30 ก.ย. 2569" (leading space, no trailing punctuation) */
  headline?: string;
  totalLine?: string;
  depositLine?: string;
}): string {
  return [
    `ใบเสนอราคา ${o.docNo}${o.headline || ''} พร้อมแล้วค่ะ`,
    'เปิดดูหรือบันทึกเป็น PDF ได้ที่ลิงก์นี้ (เก็บไว้ในแชตนี้ได้เลย)',
    o.publicUrl,
    o.totalLine || '',
    o.depositLine || '',
  ]
    .filter(Boolean)
    .join('\n');
}
