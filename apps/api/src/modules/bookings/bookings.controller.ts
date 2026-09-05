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
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingPresetDto, CreateBookingLinkDto } from './dto/booking-preset.dto';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public: submitted from the /booking page (no auth)
  @Post()
  async create(@Body() dto: CreateBookingDto) {
    const booking = await this.bookingsService.create(dto);
    const vatAmount = booking.wantVat ? Math.round(booking.estimatedTotal * 0.07) : 0;
    return {
      code: booking.code,
      estimatedTotal: booking.estimatedTotal,
      vatAmount,
      grandTotal: booking.estimatedTotal + vatAmount,
      packageName: booking.packageName,
      // public read-only quotation link (null when flowaccount-app was unreachable)
      quotationUrl: booking.quotationPublicUrl || null,
      quotationDocNo: booking.quotationDocNo || null,
    };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
  ) {
    return this.bookingsService.list(status, source, q);
  }

  /** Public: identity behind a /booking/?ref=<token> link (name/phone prefill + channel label). */
  @Get('link/:token')
  async linkInfo(@Param('token') token: string) {
    return this.bookingsService.linkInfo(token);
  }

  /** Create the booking link for a chat customer: reused per customer, or a fresh one when sales fixed a package preset. */
  @UseGuards(FirebaseAuthGuard)
  @Post('link')
  async createLink(@Body() body: CreateBookingLinkDto, @Req() req: any) {
    return this.bookingsService.createLink(body.customerId, body.packageId, body.preset, {
      id: req.admin?.id || req.user?.uid,
      name: req.admin?.name || req.user?.name || req.admin?.email || req.user?.email,
    });
  }

  /** Live price for a package preset while sales configures a quick booking link. */
  @UseGuards(FirebaseAuthGuard)
  @Post('estimate')
  async estimate(@Body() preset: BookingPresetDto) {
    return this.bookingsService.estimate(preset);
  }

  /** Bookings attributed to one chat customer (by link/customerId or by phone). */
  @UseGuards(FirebaseAuthGuard)
  @Get('by-customer/:customerId')
  async byCustomer(@Param('customerId') customerId: string) {
    return this.bookingsService.listForCustomer(customerId);
  }

  /** Public: package prices for the /booking page, derived from the flowaccount-app catalog (no auth). */
  @Get('pricing')
  async pricing() {
    return this.bookingsService.pricingSettings();
  }

  /** Re-fetch the flowaccount-app catalog now (bypasses the 5-minute cache). */
  @UseGuards(FirebaseAuthGuard)
  @Post('pricing/refresh')
  async refreshPricing() {
    return this.bookingsService.pricingSettings(true);
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

  /** Push (or re-push) the public quotation link into the customer's LINE/Facebook chat. */
  @UseGuards(FirebaseAuthGuard)
  @Post(':id/send-quotation')
  async sendQuotation(@Param('id') id: string) {
    return this.bookingsService.sendQuotationToChat(id, { force: true });
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
