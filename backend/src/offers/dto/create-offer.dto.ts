import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOfferDto {
  @IsNumber()
  channelId: number;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  format?: string;
}
