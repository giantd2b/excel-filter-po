import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('analytics')
@UseGuards(FirebaseAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('response-time')
  getResponseTime(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('channel') channel?: string,
  ) {
    return this.analyticsService.getResponseTimeStats(startDate, endDate, channel);
  }

  @Get('volume')
  getVolume(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getMessageVolumeStats(startDate, endDate);
  }

  @Get('admin-performance')
  getAdminPerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getAdminPerformanceStats(startDate, endDate);
  }

  @Get('customers')
  getCustomerAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getCustomerAnalytics(startDate, endDate);
  }

  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }
}
