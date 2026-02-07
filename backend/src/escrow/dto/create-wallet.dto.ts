import { IsInt } from 'class-validator';

export class CreateWalletDto {
  @IsInt()
  dealId: number;
}
