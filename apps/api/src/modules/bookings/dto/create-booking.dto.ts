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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
