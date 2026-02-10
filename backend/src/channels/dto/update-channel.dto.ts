import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  avgViews?: number;

  @IsOptional()
  @IsNumber()
  postsPerWeek?: number;

  @IsOptional()
  @IsArray()
  pricing?: any[];
}
