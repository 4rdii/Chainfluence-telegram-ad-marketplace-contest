import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class RegisterDealDto {
  @IsInt()
  dealId: number;

  @IsNumber()
  verificationChatId: number;

  @IsInt()
  publisherId: number;

  @IsInt()
  advertiserId: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  // ── Escrow fields (stored for later TEE call) ──

  @IsOptional()
  @IsString()
  escrowAddress?: string;

  /** nanoTON as string */
  @IsOptional()
  @IsString()
  amount?: string;

  /** Duration in seconds */
  @IsOptional()
  @IsInt()
  duration?: number;

  /** SHA-256 content hash as BigInt-compatible string */
  @IsOptional()
  @IsString()
  contentHash?: string;

  /** Publisher's connected TON wallet address */
  @IsOptional()
  @IsString()
  publisherWallet?: string;

  /** Advertiser's connected TON wallet address */
  @IsOptional()
  @IsString()
  advertiserWallet?: string;

  // ── Creative data ──

  @IsOptional()
  @IsString()
  creativeText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  creativeImages?: string[];
}
