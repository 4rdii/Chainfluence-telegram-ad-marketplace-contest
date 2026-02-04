import { Address } from '@ton/core';

// Deal parameters that both parties sign
export interface DealParams {
  dealId: number;
  channelId: number;
  postId: number;
  contentHash: bigint; // SHA256 hash of ad content
  duration: number; // Seconds the ad must stay up
  publisher: Address;
  advertiser: Address;
  amount: bigint; // Amount in nanoTON
  postedAt: number; // Unix timestamp when ad was posted
}

// Input for verifyAndRegisterDeal
export interface VerifyAndRegisterInput {
  params: DealParams;
  publisherSignature: Buffer; // Publisher's ed25519 signature of params
  publisherPublicKey: Buffer; // Publisher's public key (to verify address match)
  advertiserSignature: Buffer; // Advertiser's ed25519 signature of params
  advertiserPublicKey: Buffer; // Advertiser's public key (to verify address match)
  verificationChatId: number; // Telegram chat ID for content verification
}

// Result of checkDeal
export type CheckDealResult =
  | { action: 'released'; txHash: string }
  | { action: 'refunded'; txHash: string }
  | { action: 'pending'; reason: string };

// Derived wallet info
export interface TonWallet {
  address: string;
  addressRaw: Address;
  publicKey: Buffer;
  secretKey: Buffer;
  path: string;
}

// Deal stored in registry (matches contract structure)
export interface StoredDeal {
  channelId: number;
  postId: number;
  contentHash: bigint;
  duration: number;
  publisher: Address;
  advertiser: Address;
  amount: bigint;
  postedAt: number;
  createdAt: number;
}

// Bot API message verification result
export interface ContentVerification {
  exists: boolean;
  contentHash?: bigint;
  edited?: boolean;
}
