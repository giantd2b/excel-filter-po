import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public: submitted from the /booking page (no auth)
  @Post()
  async create(@Body() dto: CreateBookingDto) {
    const booking = await this.bookingsService.create(dto);
    return {
      code: booking.code,
      estimatedTotal: booking.estimatedTotal,
      packageName: booking.packageName,
    };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(@Query('status') status?: string) {
    return this.bookingsService.list(status);
  }

  /** Public: live package prices for the /booking page (no auth). */
  @Get('pricing')
  async pricing() {
    return this.bookingsService.pricingSettings();
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('pricing')
  async savePricing(@Body() body: any) {
    const pricing = await this.bookingsService.savePricing(body || {});
    return { pricing };
  }

  /** Package → flowaccount-app product mapping used when creating quotations. */
  @UseGuards(FirebaseAuthGuard)
  @Get('recipes')
  async recipes() {
    return this.bookingsService.recipeSettings();
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('recipes')
  async saveRecipes(@Body() body: any) {
    const config = await this.bookingsService.saveRecipeConfig(body || {});
    return { config };
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.bookingsService.updateStatus(id, status);
  }

  /** Create (idempotently) the flowaccount-app quotation for a booking. */
  @UseGuards(FirebaseAuthGuard)
  @Post(':id/quotation')
  async createQuotation(@Param('id') id: string) {
    return this.bookingsService.createQuotation(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}
