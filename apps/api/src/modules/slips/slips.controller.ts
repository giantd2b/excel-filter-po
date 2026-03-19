import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { SlipsService } from './slips.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('slips')
@UseGuards(FirebaseAuthGuard)
export class SlipsController {
  constructor(private readonly slipsService: SlipsService) {}

  @Get()
  getSlipsByDate(@Query('date') date: string) {
    if (!date) {
      const now = new Date();
      const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      date = bangkokTime.toISOString().split('T')[0];
    }
    return this.slipsService.getSlipsByDate(date);
  }

  @Get('summary')
  getSlipsSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      const now = new Date();
      const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const today = bangkokTime.toISOString().split('T')[0];
      startDate = startDate || today;
      endDate = endDate || today;
    }
    return this.slipsService.getSlipsSummary(startDate, endDate);
  }

  @Get('customer/:customerId')
  getSlipsByCustomer(@Param('customerId') customerId: string) {
    return this.slipsService.getSlipsByCustomer(customerId);
  }
}
