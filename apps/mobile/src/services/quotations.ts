import api from './api';

// ─── Quotations of a chat customer (IRIS Quotation is the source of truth) ─────
// Mirrors dashboard/src/lib/api-service.ts + lib/faStatus.ts. Fields are optional so
// backend additions never break the OTA build.

/** chat = started from the chat panel (CQ-), booking = from a merit booking (TB-), attached = made by hand then attached, manual = made by hand */
export type QuotationOrigin = 'chat' | 'booking' | 'attached' | 'manual';

export interface CrmQuotation {
  docNo: string;
  date?: string;
  customer?: string;
  project?: string;
  grandTotal?: number;
  status?: string;
  salesName?: string;
  itemCount?: number;
  editUrl?: string;
  publicUrl?: string | null;
  externalRef?: string | null;
  createdVia?: string | null;
  crmCustomerId?: string | null;
  crmChannel?: string | null;
  crmChatName?: string | null;
  crmSalesName?: string | null;
  origin?: QuotationOrigin | string;
  /** true when IRIS Quotation stores THIS customer's id on the document */
  attached?: boolean;
  matchedBy?: 'crm' | 'phone' | 'name' | string;
}

export interface FaSearchHit {
  docNo: string;
  date?: string;
  customer?: string;
  project?: string;
  grandTotal?: number;
  status?: string;
  salesName?: string;
  crmCustomerId?: string | null;
  crmChatName?: string | null;
  origin?: QuotationOrigin | string;
  editUrl?: string;
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function getCustomerQuotations(customerId: string): Promise<CrmQuotation[]> {
  const { data } = await api.get(`/users/${encodeURIComponent(customerId)}/quotations`);
  return arr<CrmQuotation>(data?.data);
}

/** Empty DRAFT in IRIS Quotation attributed to the chat customer + the logged-in admin; returns the edit link. */
export async function createQuotationFromChat(customerId: string): Promise<{ docNo: string; status?: string; editUrl: string; publicUrl?: string | null; reused?: boolean }> {
  const { data } = await api.post('/quotations/from-chat', { customerId }, { timeout: 45000 });
  return data;
}

export async function searchFaQuotations(q: string): Promise<FaSearchHit[]> {
  const { data } = await api.get(`/quotations/search?q=${encodeURIComponent(q)}`, { timeout: 30000 });
  return arr<FaSearchHit>(data?.data);
}

export async function attachQuotationToCustomer(docNo: string, customerId: string): Promise<{ docNo: string; attached: boolean; publicUrl?: string | null }> {
  const { data } = await api.post(`/quotations/${encodeURIComponent(docNo)}/attach`, { customerId }, { timeout: 30000 });
  return data;
}

export async function shareQuotationLink(docNo: string): Promise<{ publicUrl: string }> {
  const { data } = await api.post(`/quotations/${encodeURIComponent(docNo)}/share-link`, {}, { timeout: 30000 });
  return data;
}

export async function sendQuotationToChat(docNo: string): Promise<{ sent: boolean; messageId?: string | null; sentAt?: string; publicUrl?: string }> {
  const { data } = await api.post(`/quotations/${encodeURIComponent(docNo)}/send-to-chat`, {}, { timeout: 30000 });
  return data;
}

// ─── Labels (mirror dashboard/src/lib/faStatus.ts + CustomerInfoPanel origin chips) ──

const FA_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง', PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติ', DEPOSITED: 'มัดจำแล้ว', REJECTED: 'ไม่อนุมัติ',
  ISSUED: 'วางบิลแล้ว', PAID: 'ชำระแล้ว', VOID: 'ยกเลิก',
};
export const faStatusLabel = (s?: string | null) => (s ? FA_STATUS_LABEL[s] || s : '');

const FA_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: '#f1f5f9', fg: '#475569' },
  PENDING: { bg: '#fffbeb', fg: '#d97706' },
  APPROVED: { bg: '#ecfdf5', fg: '#059669' },
  DEPOSITED: { bg: '#eff6ff', fg: '#2563eb' },
  REJECTED: { bg: '#fef2f2', fg: '#ef4444' },
  // legacy Thai values still cached from older syncs
  'รออนุมัติ': { bg: '#fffbeb', fg: '#d97706' },
  'อนุมัติ': { bg: '#ecfdf5', fg: '#059669' },
  'ดำเนินการแล้ว': { bg: '#ecfdf5', fg: '#059669' },
  'มัดจำแล้ว': { bg: '#eff6ff', fg: '#2563eb' },
  'ไม่อนุมัติ': { bg: '#fef2f2', fg: '#ef4444' },
};
export const faStatusStyle = (s?: string | null) => (s && FA_STATUS_STYLE[s]) || { bg: '#fffbeb', fg: '#d97706' };

export const ORIGIN_STYLE: Record<string, { bg: string; fg: string }> = {
  chat: { bg: '#d1fae5', fg: '#047857' },
  booking: { bg: '#ede9fe', fg: '#6d28d9' },
  attached: { bg: '#dbeafe', fg: '#1d4ed8' },
  manual: { bg: '#f1f5f9', fg: '#64748b' },
};

export function originLabel(q: CrmQuotation) {
  if (q.origin === 'chat') return 'จากแชต';
  if (q.origin === 'booking') return 'จองงานบุญ';
  if (q.origin === 'attached') return 'ผูกภายหลัง';
  return q.matchedBy === 'crm' ? 'สร้างเอง' : 'จับคู่จากเบอร์/ชื่อ';
}

/** Origin wording used in the attach-search list (documents may belong to another chat). */
export const SEARCH_ORIGIN_LABEL: Record<string, string> = { chat: 'จากแชต', booking: 'จองงานบุญ', attached: 'ผูกกับแชตอื่น', manual: 'สร้างเอง' };
