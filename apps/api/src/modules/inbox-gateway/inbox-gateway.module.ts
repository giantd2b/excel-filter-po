import { Module } from '@nestjs/common';
import { InboxGateway } from './inbox-gateway.gateway';
import { InboxStatsService } from './inbox-stats.service';
import { InboxStatsController } from './inbox-stats.controller';
import { ConversationsController } from './conversations.controller';

@Module({
  controllers: [InboxStatsController, ConversationsController],
  providers: [InboxGateway, InboxStatsService],
  exports: [InboxGateway, InboxStatsService],
})
export class InboxGatewayModule {}
