import { Module } from '@nestjs/common';
import { ExternalController } from './external.controller';

@Module({
  controllers: [ExternalController],
})
export class ExternalModule {}
