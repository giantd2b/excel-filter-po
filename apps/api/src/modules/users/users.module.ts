import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { BackfillController } from './backfill.controller';
import { UsersService } from './users.service';
import { CustomerTagAutomation } from './customer-tag-automation';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [InboxGatewayModule, QuotationsModule],
  controllers: [UsersController, BackfillController],
  providers: [UsersService, CustomerTagAutomation],
  exports: [UsersService],
})
export class UsersModule {}
