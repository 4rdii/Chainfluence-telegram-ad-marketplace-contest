import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  creativeText?: string;

  @IsOptional()
  @IsString()
  contentGuidelines?: string;

  @IsOptional()
  @IsArray()
  creativeImages?: string[];

  @IsOptional()
  @IsArray()
  preferredFormats?: string[];

  @IsOptional()
  @IsNumber()
  minSubscribers?: number;

  @IsOptional()
  @IsNumber()
  minEngagement?: number;

  @IsOptional()
  @IsArray()
  preferredCategories?: string[];

  @IsOptional()
  @IsString()
  deadline?: string;
}
