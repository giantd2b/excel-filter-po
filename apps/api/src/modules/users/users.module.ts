import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { InboxGatewayModule } from '../inbox-gateway/inbox-gateway.module';

@Module({
  imports: [InboxGatewayModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
