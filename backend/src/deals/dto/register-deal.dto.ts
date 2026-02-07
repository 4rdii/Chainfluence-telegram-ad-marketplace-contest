import { IsInt, IsNumber } from 'class-validator';

export class RegisterDealDto {
  @IsInt()
  dealId: number;

  @IsNumber()
  verificationChatId: number;
}
