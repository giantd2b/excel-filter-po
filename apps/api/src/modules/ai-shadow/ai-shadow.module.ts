import { Module } from '@nestjs/common';
import { AiShadowController } from './ai-shadow.controller';
import { AiShadowService } from './ai-shadow.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { BookingsModule } from '../bookings/bookings.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [KnowledgeModule, BookingsModule, QuotationsModule],
  controllers: [AiShadowController],
  providers: [AiShadowService],
  exports: [AiShadowService],
})
export class AiShadowModule {}
