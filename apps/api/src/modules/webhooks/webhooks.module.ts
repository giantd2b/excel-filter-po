import { Module } from '@nestjs/common';
import { LineWebhookController } from './line-webhook.controller';
import { FacebookWebhookController } from './facebook-webhook.controller';
import { IrisJobWebhookController } from './iris-job-webhook.controller';
import { WebhookService } from './webhook.service';
import { MergeHelper } from './merge-helper';
import { FaqFollowupService } from './faq-followup';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [InboxGatewayModule, MessagesModule, UsersModule, QuotationsModule],
  controllers: [LineWebhookController, FacebookWebhookController, IrisJobWebhookController],
  providers: [WebhookService, MergeHelper, FaqFollowupService],
})
export class WebhooksModule {}
