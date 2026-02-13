import { IsInt } from 'class-validator';

export class CheckDealDto {
  @IsInt()
  dealId: number;
}
