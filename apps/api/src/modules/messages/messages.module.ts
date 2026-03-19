import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { FbSyncService } from './fb-sync.service';
import { AiSuggestService } from './ai-suggest.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [MessagesController],
  providers: [MessagesService, FbSyncService, AiSuggestService],
  exports: [MessagesService, FbSyncService, AiSuggestService],
})
export class MessagesModule {}
