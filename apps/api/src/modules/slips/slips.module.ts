import { Module } from '@nestjs/common';
import { SlipsController } from './slips.controller';
import { SlipsService } from './slips.service';
import { SlipDetectionService } from './slip-detection.service';

@Module({
  controllers: [SlipsController],
  providers: [SlipsService, SlipDetectionService],
  exports: [SlipsService, SlipDetectionService],
})
export class SlipsModule {}
