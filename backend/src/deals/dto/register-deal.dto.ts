import { IsInt, IsNumber, IsOptional } from 'class-validator';

export class RegisterDealDto {
  @IsInt()
  dealId: number;

  @IsNumber()
  verificationChatId: number;

  @IsInt()
  publisherId: number;

  @IsInt()
  advertiserId: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;
}
