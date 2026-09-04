import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { FlowAccountClient } from './flowaccount.client';

@Module({
  controllers: [QuotationsController],
  providers: [QuotationsService, FlowAccountClient],
  exports: [FlowAccountClient],
})
export class QuotationsModule {}
