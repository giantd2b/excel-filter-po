import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';
import { ChatCustomerDto } from './dto/chat-quotation.dto';

const adminOf = (req: any) => ({ id: req.admin?.id || req.user?.uid, name: req.admin?.name || req.user?.name || req.user?.email });

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('pipeline')
  async getPipeline(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('matched') matched?: string,
    @Query('source') source?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.quotationsService.getPipeline({ status, search, matched, source, dateFrom, page, limit });
  }

  /** Empty DRAFT in IRIS Quotation attributed to a chat customer; the admin fills the lines there. */
  @UseGuards(FirebaseAuthGuard)
  @Post('from-chat')
  async createFromChat(@Body() dto: ChatCustomerDto, @Req() req: any) {
    return this.quotationsService.createFromChat(dto.customerId, adminOf(req));
  }

  /** Live search in IRIS Quotation for the attach modal. */
  @UseGuards(FirebaseAuthGuard)
  @Get('search')
  async search(@Query('q') q?: string) {
    return this.quotationsService.searchFa(q || '');
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':docNo/attach')
  async attach(@Param('docNo') docNo: string, @Body() dto: ChatCustomerDto, @Req() req: any) {
    return this.quotationsService.attachToCustomer(docNo, dto.customerId, adminOf(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':docNo/detach')
  async detach(@Param('docNo') docNo: string) {
    return this.quotationsService.detachFromCustomer(docNo);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':docNo/share-link')
  async shareLink(@Param('docNo') docNo: string) {
    return { publicUrl: await this.quotationsService.ensurePublicLink(docNo) };
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':docNo/send-to-chat')
  async sendToChat(@Param('docNo') docNo: string, @Req() req: any) {
    return this.quotationsService.sendToChat(docNo, adminOf(req));
  }

  @Get('sync')
  async syncQuotations() {
    return this.quotationsService.syncFromFlowAccount();
  }

  /** Close-rate summary per sales / channel / origin for the pipeline page. */
  @UseGuards(FirebaseAuthGuard)
  @Get('summary')
  async summary(@Query('dateFrom') dateFrom?: string) {
    return this.quotationsService.getSummary({ dateFrom: dateFrom || undefined });
  }

  /** Inbound webhook from IRIS Quotation (status / detail changes). Shared secret, no Firebase session. */
  @Post('webhook/fa')
  async faWebhook(@Headers('x-webhook-secret') secret: string | undefined, @Body() body: any) {
    const expected = process.env.FA_WEBHOOK_SECRET || '';
    if (!expected || secret !== expected) throw new ForbiddenException('invalid webhook secret');
    return this.quotationsService.onFaWebhook(body || {});
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('stats')
  async getStats() {
    return this.quotationsService.getStats();
  }

  @Get('debug-statuses')
  async debugStatuses() {
    return this.quotationsService.getDebugStatuses();
  }

  @Get('debug-unmatched')
  async debugUnmatched() {
    return this.quotationsService.debugUnmatched();
  }

  @Get('analyze-unmatched')
  async analyzeUnmatched() {
    return this.quotationsService.analyzeUnmatched();
  }

  @Post('test-link')
  async testLink(@Query('key') key?: string, @Query('docNo') docNo?: string, @Query('phone') phone?: string, @Query('customerId') customerId?: string) {
    if (key !== 'iris-backfill-2026' || !docNo) return { error: 'Invalid' };
    if (phone && customerId) {
      await this.quotationsService.linkPhoneToCustomer(phone, customerId, docNo);
    } else {
      this.quotationsService.markAsLinked(docNo);
    }
    return { success: true, docNo };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('unmatched-candidates')
  async unmatchedCandidates(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.quotationsService.getUnmatchedWithCandidates(page, limit);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('link-customer')
  async linkCustomer(
    @Query('phone') phone: string,
    @Query('customerId') customerId: string,
    @Query('docNo') docNo?: string,
  ) {
    return this.quotationsService.linkPhoneToCustomer(phone, customerId, docNo);
  }
}
