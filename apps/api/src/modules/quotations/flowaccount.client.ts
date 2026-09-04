import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * HTTP client for the flowaccount-app external API (/api/v1).
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

  private client(): AxiosInstance {
    if (!process.env.FA_API_KEY) {
      throw new ServiceUnavailableException('ยังไม่ได้ตั้งค่า FA_API_KEY สำหรับเชื่อมต่อ flowaccount-app');
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

  async listQuotations(page: number, limit: number): Promise<any> {
    const res = await this.client().get(`/quotations?page=${page}&limit=${limit}`);
    return res.data;
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
      const body = err?.response?.data;
      const msg =
        body?.error ||
        (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ||
        err?.message ||
        'flowaccount-app error';
      this.logger.warn(`createQuotation failed: ${msg}`);
      throw new ServiceUnavailableException(`สร้างใบเสนอราคาไม่สำเร็จ: ${msg}`);
    }
  }
}
