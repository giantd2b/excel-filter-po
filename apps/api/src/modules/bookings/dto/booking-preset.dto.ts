import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Package configuration a sales admin fixes for one customer (quick booking link).
 * Everything the customer must fill in themselves (name, phone, addresses) is NOT here.
 */
export class BookingPresetDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occasion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  eventDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeSlot?: string;

  @IsString()
  @MaxLength(50)
  packageId: string;

  @IsIn(['buffet', 'table'])
  foodMode: string;

  @IsInt()
  @Min(0)
  @Max(5000)
  guests: number;

  @IsInt()
  @Min(0)
  @Max(500)
  tables: number;

  @IsInt()
  @Min(1)
  @Max(99)
  monks: number;

  @IsBoolean()
  selfTransport: boolean;

  @IsArray()
  @IsString({ each: true })
  addons: string[];

  /** VAT fixed by sales (true = 7%, false = none); omit to let the customer choose. */
  @IsOptional()
  @IsBoolean()
  wantVat?: boolean;

  /** Message from sales shown to the customer above the summary. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateBookingLinkDto {
  @IsString()
  @MaxLength(200)
  customerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  packageId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPresetDto)
  preset?: BookingPresetDto;
}
