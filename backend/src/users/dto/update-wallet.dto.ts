import { IsString } from 'class-validator';

export class UpdateWalletDto {
  @IsString()
  walletAddress: string;
}
