import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('pipeline')
  async getPipeline(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('matched') matched?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.quotationsService.getPipeline({ status, search, matched, dateFrom, page, limit });
  }

  @Get('sync')
  async syncQuotations() {
    return this.quotationsService.syncFromFlowAccount();
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
