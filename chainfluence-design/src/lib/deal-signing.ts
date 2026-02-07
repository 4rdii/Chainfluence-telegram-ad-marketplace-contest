/**
 * Deal signing utilities for the frontend.
 *
 * Uses TonConnect signData to sign a Cell containing deal parameters
 * with the user's real connected TON wallet. No client-side keypair
 * generation is needed — the wallet handles the private key.
 *
 * The TEE's verifyTonConnectSignature reconstructs the signData
 * envelope (prefix, schema hash, timestamp, address, domain, data Cell)
 * and verifies the ed25519 signature against the envelope hash.
 */

import { beginCell, Cell, Address } from '@ton/core';

// ── Types ──

/**
 * Deal params that are cryptographically signed by both parties.
 *
 * NOTE: postId and postedAt are intentionally excluded. They are only
 * known after the ad is posted and are verified separately by the TEE.
 * This allows both parties to sign the deal BEFORE posting (better UX).
 */
export interface DealParamsForSigning {
  dealId: number;
  channelId: number;
  contentHash: string; // BigInt-compatible hex string
  duration: number;
  publisher: string; // TON address (user's real wallet)
  advertiser: string; // TON address (user's real wallet)
  amount: string; // nanoTON as string
}

/** Result from TonConnect signData */
export interface TonConnectSignResult {
  signature: string; // hex-encoded ed25519 signature
  publicKey: string; // hex-encoded public key from wallet
  timestamp: number; // signData envelope timestamp
  domain: string; // signData envelope domain
}

// ── TL-B Schema ──

/**
 * TL-B schema for deal params cell.
 * MUST match the TEE's DEAL_PARAMS_SCHEMA exactly.
 */
export const DEAL_PARAMS_SCHEMA =
  'deal_params#_ deal_id:uint64 channel_id:int64 content_hash:uint256 duration:uint32 addresses:^[publisher:MsgAddress advertiser:MsgAddress amount:Coins] = DealParams';

// ── Core functions ──

/**
 * Build the signed deal params Cell (matching TEE's buildDealParamsCell).
 *
 * postId and postedAt are NOT included — they are verified separately.
 *
 * Cell layout:
 *   Main cell: dealId(64) | channelId(64) | contentHash(256) | duration(32)
 *     ref[0] → Addresses cell: publisher | advertiser | amount(coins)
 */
export function buildDealParamsCell(params: DealParamsForSigning): Cell {
  const addressesCell = beginCell()
    .storeAddress(Address.parse(params.publisher))
    .storeAddress(Address.parse(params.advertiser))
    .storeCoins(BigInt(params.amount))
    .endCell();

  return beginCell()
    .storeUint(params.dealId, 64)
    .storeInt(params.channelId, 64)
    .storeUint(BigInt(params.contentHash), 256)
    .storeUint(params.duration, 32)
    .storeRef(addressesCell)
    .endCell();
}

/**
 * Sign deal params using TonConnect signData.
 *
 * This prompts the user's TON wallet to sign a Cell containing
 * the deal parameters. The wallet wraps the Cell in a signData
 * envelope before signing, so the TEE must reconstruct the same
 * envelope to verify.
 *
 * @param tonConnectUI - The TonConnect UI instance from useTonConnectUI()
 * @param params - Finalized deal parameters
 * @returns The signature result including signature, publicKey, timestamp, and domain
 */
export async function signDealWithTonConnect(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tonConnectUI: any,
  params: DealParamsForSigning,
): Promise<TonConnectSignResult> {
  const cell = buildDealParamsCell(params);
  const cellBoc = cell.toBoc().toString('base64');

  // Call TonConnect signData with cell type
  const result = await tonConnectUI.signData({
    type: 'cell',
    schema: DEAL_PARAMS_SCHEMA,
    cell: cellBoc,
  });

  return {
    signature: result.signature,
    publicKey: result.publicKey,
    timestamp: result.timestamp,
    domain: result.domain,
  };
}

/**
 * Compute the SHA-256 content hash of text, matching the TEE's
 * `computeContentHash()` in `bot-api.ts`.
 *
 * Returns a "0x…" hex string suitable for BigInt conversion.
 */
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(content));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
