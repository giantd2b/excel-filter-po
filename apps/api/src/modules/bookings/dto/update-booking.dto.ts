import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Fields sales may correct on a booking from the dashboard. Package / guests / price inputs are
 * deliberately NOT here — a different package is a new booking. Address changes re-derive the travel
 * fee and the estimate; open quotations get the new details through IRIS Quotation's external API.
 */
export class UpdateBookingDto {
  @IsOptional() @IsString() @MaxLength(100) customerName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) occasion?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'eventDate ต้องเป็นรูปแบบ YYYY-MM-DD' }) eventDate?: string;
  @IsOptional() @IsString() @MaxLength(60) timeSlot?: string;

  // event venue
  @IsOptional() @IsString() @MaxLength(300) venue?: string;
  @IsOptional() @IsString() @MaxLength(100) tambon?: string;
  @IsOptional() @IsString() @MaxLength(100) amphoe?: string;
  @IsOptional() @IsString() @MaxLength(50) province?: string;
  @IsOptional() @IsString() @MaxLength(10) zip?: string;
  @IsOptional() @IsString() @MaxLength(40) floor?: string;

  // billing
  @IsOptional() @IsString() @MaxLength(200) billingName?: string;
  @IsOptional() @IsString() @MaxLength(20) taxId?: string;
  @IsOptional() @IsString() @MaxLength(300) billingLine?: string;
  @IsOptional() @IsString() @MaxLength(100) billingTambon?: string;
  @IsOptional() @IsString() @MaxLength(100) billingAmphoe?: string;
  @IsOptional() @IsString() @MaxLength(50) billingProvince?: string;
  @IsOptional() @IsString() @MaxLength(10) billingZip?: string;

  @IsOptional() @IsBoolean() wantVat?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
