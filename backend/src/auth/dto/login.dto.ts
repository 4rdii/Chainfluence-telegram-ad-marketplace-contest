import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  initData: string;
}
