import { IsIn, IsInt, IsString } from 'class-validator';

/**
 * Submitted by each party after signing deal params via TonConnect signData.
 *
 * The frontend prompts the user's TON wallet to sign a Cell containing
 * the finalised deal params. The resulting signature + metadata are
 * submitted here for storage, and later forwarded to the TEE.
 */
export class SignDealDto {
  @IsInt()
  dealId: number;

  /** Which role is signing */
  @IsIn(['publisher', 'advertiser'])
  role: 'publisher' | 'advertiser';

  /** Hex-encoded ed25519 signature from TonConnect signData */
  @IsString()
  signature: string;

  /** Hex-encoded ed25519 public key from the wallet */
  @IsString()
  publicKey: string;

  /** User's TON wallet address (signer) */
  @IsString()
  walletAddress: string;

  /** Timestamp from the signData envelope (unix seconds) */
  @IsInt()
  timestamp: number;

  /** Domain from the signData envelope (dApp domain) */
  @IsString()
  domain: string;
}
