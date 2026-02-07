import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class DealParamsDto {
  @IsInt()
  dealId: number;

  @IsInt()
  publisherId: number;

  @IsInt()
  advertiserId: number;

  @IsNumber()
  amount: number;

  @IsInt()
  duration: number;

  @IsInt()
  postId: number;

  @IsString()
  contentHash: string;
}

export class VerifyAndRegisterDealDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => DealParamsDto)
  params: DealParamsDto;

  @IsNumber()
  verificationChatId: number;

  @IsInt()
  publisherId: number;

  @IsInt()
  advertiserId: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsString()
  publisherSignature: string;

  @IsString()
  advertiserSignature: string;
}
