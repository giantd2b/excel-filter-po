import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { FbSyncService } from './fb-sync.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [MessagesController],
  providers: [MessagesService, FbSyncService],
  exports: [MessagesService, FbSyncService],
})
export class MessagesModule {}
