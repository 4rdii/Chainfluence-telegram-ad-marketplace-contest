import { Address } from '@ton/core';

// Deal parameters that both parties sign
export interface DealParams {
  dealId: number;
  channelId: number;
  postId: number;
  contentHash: bigint; // SHA256 hash of ad content
  duration: number; // Seconds the ad must stay up
  publisher: Address; // User's real connected TON wallet
  advertiser: Address; // User's real connected TON wallet
  amount: bigint; // Amount in nanoTON
  postedAt: number; // Unix timestamp when ad was posted
}

// Per-party TonConnect signData metadata
export interface PartySignMeta {
  signature: Buffer; // ed25519 signature from TonConnect signData
  publicKey: Buffer; // Public key from wallet
  timestamp: number; // signData envelope timestamp
  domain: string; // signData envelope domain (dApp domain)
}

// Input for verifyAndRegisterDeal
export interface VerifyAndRegisterInput {
  params: DealParams;
  publisher: PartySignMeta;
  advertiser: PartySignMeta;
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
