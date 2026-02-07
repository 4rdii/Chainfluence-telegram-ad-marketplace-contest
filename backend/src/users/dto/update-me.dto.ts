import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsBoolean()
  isPublisher?: boolean;

  @IsOptional()
  @IsBoolean()
  isAdvertiser?: boolean;
}
