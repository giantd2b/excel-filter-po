import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ListQuotationsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  source?: string;
  createdVia?: string;
  externalRef?: string;
  crmCustomerId?: string;
}

export interface CrmAttributionPatch {
  clear?: boolean;
  crmCustomerId?: string;
  crmChannel?: string;
  crmChatName?: string;
  crmSalesId?: string;
  crmSalesName?: string;
}

/**
 * HTTP client for the IRIS Quotation (flowaccount-app) external API (/api/v1).
 * Configure with FA_API_URL (default: production) and FA_API_KEY (required).
 */
@Injectable()
export class FlowAccountClient {
  private readonly logger = new Logger(FlowAccountClient.name);
  private http: AxiosInstance | null = null;

  get baseUrl(): string {
    return (process.env.FA_API_URL || 'https://honest-mindfulness-production.up.railway.app/api/v1').replace(/\/+$/, '');
  }

  /** Public app URL (without /api/v1) for building links to documents. */
  get appUrl(): string {
    return this.baseUrl.replace(/\/api\/v1$/, '');
  }

  get isConfigured(): boolean {
    return !!process.env.FA_API_KEY;
  }

  /** Staff edit/view page of a document in IRIS Quotation. */
  editUrlFor(docNo: string): string {
    return `${this.appUrl}/quotations/${encodeURIComponent(docNo)}`;
  }

  /** Public read-only page of a document, or null when it has no share token yet. */
  publicUrlFor(q: { shareToken?: string | null; publicUrl?: string | null }): string | null {
    if (q.publicUrl) return q.publicUrl;
    return q.shareToken ? `${this.appUrl}/q/${q.shareToken}` : null;
  }

  private client(): AxiosInstance {
    if (!process.env.FA_API_KEY) {
      throw new ServiceUnavailableException('ยังไม่ได้ตั้งค่า FA_API_KEY สำหรับเชื่อมต่อ IRIS Quotation');
    }
    if (!this.http) {
      this.http = axios.create({
        baseURL: this.baseUrl,
        headers: { 'X-Api-Key': process.env.FA_API_KEY },
        timeout: 20000,
      });
    }
    return this.http;
  }

  /** Turn an axios failure into a 503 carrying IRIS Quotation's own error text. */
  private fail(action: string, err: any): never {
    const body = err?.response?.data;
    const msg =
      body?.error ||
      (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ||
      err?.message ||
      'IRIS Quotation error';
    this.logger.warn(`${action} failed: ${msg}`);
    throw new ServiceUnavailableException(`${action}: ${msg}`);
  }

  /** Catalog (code, name, kind, variables, components) for the recipe settings UI. */
  async listProducts(): Promise<any[]> {
    const res = await this.client().get('/products');
    return res.data?.data || [];
  }

  /** Remark (หมายเหตุ) templates: { id, code, name, text, isDefault }. */
  async listRemarkTemplates(): Promise<any[]> {
    const res = await this.client().get('/remark-templates');
    return res.data?.data || [];
  }

  /** Deposit rule (stepped by food cost) — { tiers: [{ upTo, amount }], abovePercent }. */
  async getDepositRule(): Promise<any> {
    const res = await this.client().get('/deposit-rule');
    return res.data?.data || null;
  }

  /** Paged list; every row carries crm*, externalRef, createdVia, shareToken and publicUrl. */
  async listQuotations(params: ListQuotationsParams = {}): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const res = await this.client().get(`/quotations?${qs.toString()}`);
    return res.data;
  }

  /** One document with its items, or null when it does not exist. */
  async getQuotation(docNo: string): Promise<any | null> {
    try {
      const res = await this.client().get(`/quotations/${encodeURIComponent(docNo)}`);
      return res.data?.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      this.fail('อ่านใบเสนอราคาไม่สำเร็จ', err);
    }
  }

  /** Quotations whose contact phone matches (digits compared). */
  async matchPhone(phone: string): Promise<any[]> {
    const res = await this.client().get(`/match/phone/${encodeURIComponent(phone)}`);
    return res.data?.data || [];
  }

  /** Quotations whose customer name contains the text. */
  async matchName(name: string): Promise<any[]> {
    const res = await this.client().get(`/match/name/${encodeURIComponent(name)}`);
    return res.data?.data || [];
  }

  /**
   * Create a quotation. `externalRef` makes the call idempotent: re-posting the
   * same ref returns the existing document with `reused: true`.
   */
  async createQuotation(payload: Record<string, unknown>): Promise<{ data: any; reused: boolean; warnings?: string[] }> {
    try {
      const res = await this.client().post('/quotations', payload);
      return res.data;
    } catch (err: any) {
      this.fail('สร้างใบเสนอราคาไม่สำเร็จ', err);
    }
  }

  /** Attach a document to a chat customer / channel / sales, or detach it with { clear: true }. */
  async patchCrm(docNo: string, body: CrmAttributionPatch): Promise<any> {
    try {
      const res = await this.client().patch(`/quotations/${encodeURIComponent(docNo)}/crm`, body);
      return res.data?.data;
    } catch (err: any) {
      if (err?.response?.status === 404) throw new ServiceUnavailableException(`ไม่พบใบเสนอราคา ${docNo} ใน IRIS Quotation`);
      this.fail('ผูกใบเสนอราคากับลูกค้าไม่สำเร็จ', err);
    }
  }

  /** Create (or reuse) the public read-only link of any document. */
  async shareQuotation(docNo: string): Promise<{ docNo: string; token: string; publicUrl: string }> {
    try {
      const res = await this.client().post(`/quotations/${encodeURIComponent(docNo)}/share`, {});
      return res.data?.data;
    } catch (err: any) {
      this.fail('สร้างลิงก์สาธารณะไม่สำเร็จ', err);
    }
  }
}
