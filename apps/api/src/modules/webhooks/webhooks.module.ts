import { Module } from '@nestjs/common';
import { LineWebhookController } from './line-webhook.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';
import { WebhookService } from './webhook.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [InboxGatewayModule, MessagesModule],
  controllers: [LineWebhookController, FacebookWebhookController],
  providers: [WebhookService],
})
export class WebhooksModule {}
