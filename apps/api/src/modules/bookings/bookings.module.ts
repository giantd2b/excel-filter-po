import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [QuotationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
