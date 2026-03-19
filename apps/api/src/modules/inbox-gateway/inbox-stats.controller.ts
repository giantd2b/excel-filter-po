import { Controller, Get, UseGuards } from '@nestjs/common';
import { InboxStatsService } from './inbox-stats.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('inbox')
@UseGuards(FirebaseAuthGuard)
export class InboxStatsController {
  constructor(private readonly inboxStatsService: InboxStatsService) {}

  @Get('stats')
  getStats() {
    return this.inboxStatsService.getStats();
  }
}
