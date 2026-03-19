import { Module } from '@nestjs/common';
import { LineWebhookController } from './line-webhook.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';
import { WebhookService } from './webhook.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [LineWebhookController, FacebookWebhookController],
  providers: [WebhookService],
})
export class WebhooksModule {}
