import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateChannelDto {
  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsOptional()
  @IsString()
  username?: string;
}
