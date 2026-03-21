import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { BackfillController } from './backfill.controller';
import { UsersService } from './users.service';
import { CustomerTagAutomation } from './customer-tag-automation';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [UsersController, BackfillController],
  providers: [UsersService, CustomerTagAutomation],
  exports: [UsersService],
})
export class UsersModule {}
