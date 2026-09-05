import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { FlowAccountClient } from './flowaccount.client';
import { QuotationAlertsService } from './quotation-alerts.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, FlowAccountClient, QuotationAlertsService],
  exports: [FlowAccountClient, QuotationsService],
})
export class QuotationsModule {}
