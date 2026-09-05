import api from './api';

// ─── Types ─────────────────────────────────────────────────────────────
// The bookings API is developed in parallel with this app, so every field
// except `id` is optional and consumers must tolerate missing values.

export type BookingStatus = 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'DONE';

export interface MeritBooking {
  id: string;
  code?: string;
  status?: BookingStatus | string;
  occasion?: string;
  eventDate?: string;
  timeSlot?: string;
  tambon?: string | null;
  amphoe?: string | null;
  province?: string | null;
  zip?: string | null;
  venue?: string | null;
  packageId?: string;
  packageName?: string;
  foodMode?: string;
  guests?: number;
  tables?: number;
  monks?: number;
  selfTransport?: boolean;
  addons?: string[];
  budget?: string | null;
  customerName?: string;
  phone?: string;
  note?: string | null;
  estimatedTotal?: number;
  source?: string; // web | chat_link
  customerId?: string | null;
  channel?: string | null;
  chatCustomerName?: string | null;
  salesName?: string | null;
  customerAddress?: string | null;
  billingName?: string | null;
  taxId?: string | null;
  floor?: string | null;
  quotationDocNo?: string | null;
  quotationUrl?: string | null;
  quotationPublicUrl?: string | null;
  quotationCreatedAt?: string | null;
  quotationSentAt?: string | null;
  quotationSendStatus?: 'sent' | 'sending' | 'failed' | null;
  createdAt?: string;
}

export interface BookingPreset {
  occasion?: string;
  eventDate?: string;
  timeSlot?: string;
  packageId: string;
  foodMode: 'buffet' | 'table';
  guests: number;
  tables: number;
  monks: number;
  selfTransport: boolean;
  addons: string[];
  note?: string;
}

export interface BookingEstimate {
  total: number;
  packageName?: string;
  rows: { k: string; v: string }[];
}

export interface BookingLink {
  token?: string;
  url: string;
  customerName?: string;
  channel?: string;
  packageId?: string | null;
  preset?: BookingPreset | null;
  packageName?: string | null;
  estimatedTotal?: number | null;
  createdAt?: string;
  createdByName?: string | null;
  openCount?: number;
  lastOpenedAt?: string | null;
  bookingCount?: number;
}

export interface BookingsListResponse {
  bookings: MeritBooking[];
  statusCounts: Record<string, number>;
  total: number;
}

export interface CustomerBookingsResponse {
  bookings: MeritBooking[];
  links: BookingLink[];
}

export interface PricingPackage {
  id: string;
  name: string;
  kind?: 'ceremony' | 'full' | string;
}

export interface PricingAddon {
  id: string;
  label: string;
}

export interface PricingResponse {
  packages: PricingPackage[];
  addons: PricingAddon[];
}

export interface BookingQuotationResult {
  booking?: MeritBooking;
  docNo?: string;
  quotationUrl?: string | null;
  publicUrl?: string | null;
  reused?: boolean;
  warnings?: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Nest returns `message` as a string or string[]; axios wraps it under response.data. */
export function apiErrorMessage(err: any, fallback = 'ทำรายการไม่สำเร็จ'): string {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string' && m) return m;
  return err?.message || fallback;
}

/** Drop empty optional strings so the API validators see undefined, not "". */
export function cleanPreset(p: BookingPreset): BookingPreset {
  return {
    ...p,
    occasion: p.occasion?.trim() || undefined,
    eventDate: p.eventDate || undefined,
    timeSlot: p.timeSlot || undefined,
    note: p.note?.trim() || undefined,
  };
}

// ─── API ───────────────────────────────────────────────────────────────

export async function listBookings(opts: { status?: string; source?: string; q?: string } = {}): Promise<BookingsListResponse> {
  const params: Record<string, string> = {};
  if (opts.status && opts.status !== 'ALL') params.status = opts.status;
  if (opts.source && opts.source !== 'ALL') params.source = opts.source;
  if (opts.q?.trim()) params.q = opts.q.trim();
  const { data } = await api.get('/bookings', { params });
  return {
    bookings: arr<MeritBooking>(data?.bookings),
    statusCounts: data?.statusCounts || {},
    total: Number(data?.total ?? 0),
  };
}

export async function updateBookingStatus(id: string, status: string): Promise<MeritBooking> {
  const { data } = await api.patch(`/bookings/${id}/status`, { status });
  return data;
}

export async function deleteBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}

/** Create (idempotently) the flowaccount-app quotation. Slow round-trip → long timeout. */
export async function createBookingQuotation(id: string): Promise<BookingQuotationResult> {
  const { data } = await api.post(`/bookings/${id}/quotation`, {}, { timeout: 45000 });
  return data || {};
}

/** Push the quotation's public link into the customer's LINE/FB chat. */
export async function sendBookingQuotationToChat(id: string): Promise<void> {
  await api.post(`/bookings/${id}/send-quotation`, {}, { timeout: 30000 });
}

export async function estimateBooking(preset: BookingPreset): Promise<BookingEstimate> {
  const { data } = await api.post('/bookings/estimate', preset, { timeout: 30000 });
  return { total: Number(data?.total ?? 0), packageName: data?.packageName, rows: arr(data?.rows) };
}

export async function createBookingLink(
  customerId: string,
  opts: { packageId?: string; preset?: BookingPreset } = {},
): Promise<BookingLink> {
  const { data } = await api.post('/bookings/link', { customerId, ...opts }, { timeout: 30000 });
  return data;
}

export async function getCustomerBookings(customerId: string): Promise<CustomerBookingsResponse> {
  const { data } = await api.get(`/bookings/by-customer/${customerId}`);
  return { bookings: arr(data?.bookings), links: arr(data?.links) };
}

export async function getBookingPricing(): Promise<PricingResponse> {
  const { data } = await api.get('/bookings/pricing');
  return { packages: arr(data?.packages), addons: arr(data?.addons) };
}

export async function sendChatMessage(body: { oduserId: string; docId: string; text: string; channel: string }) {
  await api.post('/messages/send', body, { timeout: 15000 });
}
