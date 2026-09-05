import { IsNotEmpty, IsString } from 'class-validator';

/** Body of POST /quotations/from-chat and POST /quotations/:docNo/attach */
export class ChatCustomerDto {
  @IsString() @IsNotEmpty({ message: 'ต้องระบุ customerId ของลูกค้าแชต' }) customerId: string;
}
