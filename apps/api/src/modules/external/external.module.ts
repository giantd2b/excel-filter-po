import { Module } from '@nestjs/common';
import { ExternalController } from './external.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [ExternalController],
})
export class ExternalModule {}
