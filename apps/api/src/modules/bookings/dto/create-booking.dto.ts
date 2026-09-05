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
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @MaxLength(100)
  occasion: string;

  @IsString()
  @MaxLength(10)
  eventDate: string; // YYYY-MM-DD

  @IsString()
  @MaxLength(60)
  timeSlot: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tambon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  amphoe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  venue?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  budget?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  /** Name the quotation is issued to (company or person); defaults to `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  billingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  /** Billing address (full); defaults to the event address when absent. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  billingLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingTambon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingAmphoe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingProvince?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  billingZip?: string;

  /** Customer wants a tax invoice (VAT 7% on the quotation). */
  @IsOptional()
  @IsBoolean()
  wantVat?: boolean;

  /** Floor of the venue, e.g. "ชั้น 2" (affects the estimate). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Token from a /booking/?ref=<token> link created in the inbox (attributes the booking to a chat customer). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ref?: string;
}
