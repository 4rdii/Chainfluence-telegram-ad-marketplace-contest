import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * Matches TEE's DealParams structure (serialized for JSON transport).
 *
 * The TEE HTTP handler parses:
 *   publisher/advertiser → Address.parse(string)
 *   amount/contentHash   → BigInt(string)
 */
class TeeParamsDto {
  @IsInt()
  dealId: number;

  @IsInt()
  channelId: number;

  @IsInt()
  postId: number;

  /** SHA-256 content hash as a BigInt-compatible string (e.g. "0xabc..." or decimal) */
  @IsString()
  contentHash: string;

  /** Duration in seconds the ad must stay up */
  @IsInt()
  duration: number;

  /** Publisher's real TON wallet address (e.g. "EQ..." or "UQ...") */
  @IsString()
  publisher: string;

  /** Advertiser's real TON wallet address */
  @IsString()
  advertiser: string;

  /** Amount in nanoTON as a string to preserve BigInt precision */
  @IsString()
  amount: string;

  /** Unix timestamp when the ad was posted */
  @IsInt()
  postedAt: number;
}

/** TonConnect signData metadata from each party */
class PartySignMetaDto {
  /** Hex-encoded ed25519 signature */
  @IsString()
  signature: string;

  /** Hex-encoded ed25519 public key */
  @IsString()
  publicKey: string;

  /** signData envelope timestamp (unix seconds) */
  @IsInt()
  timestamp: number;

  /** signData envelope domain (dApp domain) */
  @IsString()
  domain: string;
}

/**
 * Full payload for POST /escrow/verify-and-register.
 *
 * Fields split into two groups:
 *   1. TEE fields – forwarded as-is to the TEE service
 *   2. Backend-only fields – used to register the deal in the database
 */
export class VerifyAndRegisterDealDto {
  // ── TEE fields ──

  @IsDefined()
  @ValidateNested()
  @Type(() => TeeParamsDto)
  params: TeeParamsDto;

  @IsNumber()
  verificationChatId: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => PartySignMetaDto)
  publisher: PartySignMetaDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => PartySignMetaDto)
  advertiser: PartySignMetaDto;

  // ── Backend-only fields (not forwarded to TEE) ──

  /** Telegram user ID of the publisher */
  @IsInt()
  publisherId: number;

  /** Telegram user ID of the advertiser */
  @IsInt()
  advertiserId: number;
}
