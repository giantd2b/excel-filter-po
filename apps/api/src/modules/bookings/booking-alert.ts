import { pushLineMessages } from '../../common/utils/line-notify.utils';

/**
 * "จองงานบุญใหม่" team alert → the IRIS BOT LINE group (the same bot/group iris-job
 * uses for new-job alerts). Flex layout follows iris-job's house style
 * (backend/src/common/line-new-job-alert.ts): brown label/value rows, amber header,
 * primary uri button.
 *
 * Pure functions, no Nest wiring. sendNewBookingAlert() never throws.
 */

const DEFAULT_GROUP_ID = 'C38f6000e5944ef97a36ca4aac736253a';

/** Loose view of a Booking row — every field optional so schema changes can't break the alert. */
export interface BookingAlertInput {
  code?: string | null;
  status?: string | null;
  occasion?: string | null;
  eventDate?: string | null;
  timeSlot?: string | null;
  venue?: string | null;
  tambon?: string | null;
  amphoe?: string | null;
  province?: string | null;
  zip?: string | null;
  floor?: string | null;
  packageName?: string | null;
  packageId?: string | null;
  foodMode?: string | null;
  guests?: number | null;
  tables?: number | null;
  monks?: number | null;
  selfTransport?: boolean | null;
  addons?: string[] | null;
  customerName?: string | null;
  billingName?: string | null;
  taxId?: string | null;
  wantVat?: boolean | null;
  phone?: string | null;
  note?: string | null;
  estimatedTotal?: number | null;
  source?: string | null;
  customerId?: string | null;
  channel?: string | null;
  chatCustomerName?: string | null;
  salesName?: string | null;
  quotationDocNo?: string | null;
  quotationPublicUrl?: string | null;
}

// ─── Helpers (duplicated from bookings.service.ts, which keeps them module-private) ──

/** "2026-09-30" → "พ. 30 ก.ย. 2569" without going through Date timezone maths. */
function fmtThaiDate(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '-';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${months[mo - 1]} ${y + 543}`;
}

function bookingAddress(b: BookingAlertInput): string {
  const bkk = b.province === 'กรุงเทพฯ';
  const p: string[] = [];
  if (b.venue) p.push(b.venue);
  if (b.tambon) p.push((bkk ? 'แขวง' : 'ต.') + b.tambon);
  if (b.amphoe) p.push(bkk ? b.amphoe : 'อ.' + b.amphoe);
  if (b.province) p.push('จ.' + b.province);
  if (b.zip) p.push(b.zip);
  return p.join(' ');
}

function channelLabel(channel?: string | null): string {
  if (!channel) return 'แชต';
  const type = /^line/i.test(channel) ? 'LINE' : /^fb/i.test(channel) ? 'Facebook' : '';
  const pretty = channel.replace(/^(Line|FB)_/i, '').replace(/_/g, ' ');
  return type ? `${type} ${pretty}` : pretty;
}

const ADDON_LABELS: Record<string, string> = {
  stage: 'เวทีพระ',
  tent: 'เต็นท์เพิ่ม 1 หลัง',
  drape: 'โยงผ้าประดับเพิ่ม',
};

const thb = (n?: number | null) => `${Number(n ?? 0).toLocaleString('th-TH')} บาท`;
const nonEmpty = (s?: string | null) => (s && s.trim() ? s.trim() : '-');

// ─── Flex ──────────────────────────────────────────────────────────────────

function row(label: string, value: string) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#8a7a66', size: 'sm', flex: 3 },
      { type: 'text', text: nonEmpty(value), wrap: true, color: '#3d3225', size: 'sm', flex: 7 },
    ],
  };
}

function foodLine(b: BookingAlertInput): string {
  if (b.foodMode === 'table') return `โต๊ะจีน ${b.tables ?? 0} โต๊ะ`;
  if (b.foodMode === 'buffet') return `บุฟเฟต์ ${b.guests ?? 0} ท่าน`;
  return 'ไม่รวมอาหารเลี้ยงแขก';
}

function sourceLine(b: BookingAlertInput): string {
  if (b.source === 'chat_link') {
    return [channelLabel(b.channel), b.chatCustomerName, b.salesName ? `เซลล์ ${b.salesName}` : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (b.customerId) return `เว็บ · จับคู่ลูกค้าแชตด้วยเบอร์ (${channelLabel(b.channel)})`;
  return 'เว็บ · ไม่พบในแชต';
}

export function buildNewBookingFlex(b: BookingAlertInput, opts: { crmUrl: string }) {
  const title = nonEmpty(b.billingName || b.customerName);
  const rows: unknown[] = [];

  if (b.billingName && b.customerName) {
    rows.push(row('👤 ผู้ติดต่อ', `${b.customerName}${b.taxId ? ` · เลขผู้เสียภาษี ${b.taxId}` : ''}`));
  }
  rows.push(row('📅 วันงาน', [fmtThaiDate(b.eventDate), b.timeSlot].filter(Boolean).join(' · ')));
  if (b.occasion) rows.push(row('🎉 งาน', b.occasion));
  rows.push(row('📦 แพ็กเกจ', `${b.packageName || b.packageId || '-'} · พระ ${b.monks ?? '-'} รูป · ${foodLine(b)}`));

  const extras = (b.addons || []).map((a) => ADDON_LABELS[a] || a);
  if (b.selfTransport) extras.push('นิมนต์รับ-ส่งพระเอง (ลด 1,000)');
  if (extras.length) rows.push(row('➕ เสริม', extras.join(', ')));

  const addr = bookingAddress(b);
  const groundFloor = !b.floor || /ชั้น\s*1(\D|$)/.test(b.floor);
  const place = [addr || null, b.floor ? `${b.floor}${groundFloor ? '' : ' ⚠️ ตรวจสอบราคา'}` : null].filter(Boolean).join(' · ');
  if (place) rows.push(row('📍 สถานที่', place));

  if (b.phone) rows.push(row('📞 เบอร์', b.phone));
  rows.push(row('💬 ที่มา', sourceLine(b)));
  rows.push(row('💰 ราคาประเมิน', `${thb(b.estimatedTotal)}${b.wantVat ? ' · ขอใบกำกับภาษี (VAT 7%)' : ''}`));
  if (b.note) rows.push(row('📝 หมายเหตุ', b.note.length > 200 ? `${b.note.slice(0, 200)}…` : b.note));

  const buttons: unknown[] = [
    {
      type: 'button',
      style: 'primary',
      color: '#B45309',
      height: 'sm',
      // Bounce page: opens the IRIS CRM app when installed (iriscrm://bookings), else the web
      // dashboard. openExternalBrowser=1 makes LINE use the system browser, which can hand
      // off to the app; LINE's in-app browser cannot.
      action: { type: 'uri', label: 'เปิดใน CRM', uri: `${opts.crmUrl}/open/bookings/?openExternalBrowser=1` },
    },
  ];
  if (b.quotationPublicUrl) {
    buttons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: { type: 'uri', label: `ใบเสนอราคา ${b.quotationDocNo || ''}`.trim().slice(0, 40), uri: b.quotationPublicUrl },
    });
  }

  const altText = `🙏 จองงานบุญใหม่ ${b.code || ''} · ${nonEmpty(b.customerName)} · ${fmtThaiDate(b.eventDate)} · ${thb(b.estimatedTotal)}`.slice(0, 400);

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#B45309',
        paddingAll: 'md',
        contents: [
          { type: 'text', text: `🙏 จองงานบุญใหม่ · ${b.code || '-'}`, color: '#ffffff', weight: 'bold', size: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: title, weight: 'bold', size: 'md', wrap: true, color: '#3d3225' },
          { type: 'separator', color: '#eee4d6' },
          { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows },
        ],
      },
      footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: buttons },
    },
  };
}

// ─── Send ──────────────────────────────────────────────────────────────────

/** Fire-and-forget: push the new-booking card into the IRIS BOT group. Never throws. */
export async function sendNewBookingAlert(b: BookingAlertInput): Promise<void> {
  try {
    // IRIS BOT is the same channel that posts slip alerts (LINE_GROUP_ACCESS_TOKEN);
    // IRIS_BOT_ACCESS_TOKEN only overrides it. trim() guards against a pasted space.
    const token = (process.env.IRIS_BOT_ACCESS_TOKEN || process.env.LINE_GROUP_ACCESS_TOKEN || '').trim();
    if (!token) {
      console.warn(`[Bookings] no LINE bot token (IRIS_BOT_ACCESS_TOKEN / LINE_GROUP_ACCESS_TOKEN) — skip group alert for ${b.code || 'booking'}`);
      return;
    }
    const groupId = process.env.BOOKING_ALERT_LINE_GROUP_ID || DEFAULT_GROUP_ID;
    const crmUrl = (process.env.BOOKING_PUBLIC_URL || 'https://crm.iristermboon.com').replace(/\/$/, '');
    await pushLineMessages(groupId, [buildNewBookingFlex(b, { crmUrl })], token);
  } catch (e: any) {
    console.warn(`[Bookings] LINE group alert failed for ${b.code || 'booking'}: ${e?.message || e}`);
  }
}
