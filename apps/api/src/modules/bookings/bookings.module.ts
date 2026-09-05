import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { QuotationsModule } from '../quotations/quotations.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [QuotationsModule, MessagesModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
