import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
