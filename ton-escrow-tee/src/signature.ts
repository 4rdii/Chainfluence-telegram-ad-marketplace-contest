import { signVerify } from '@ton/crypto';
import { beginCell, Cell, Address } from '@ton/core';
import { WalletContractV3R1, WalletContractV3R2, WalletContractV4, WalletContractV5R1 } from '@ton/ton';
import { DealParams } from './types';

// TonConnect signData constants
const SIGN_DATA_PREFIX = 0x75569022;

/**
 * Compute CRC32 of a string (used for TL-B schema hash in TonConnect signData).
 * Standard CRC32 (ISO 3309 / ITU-T V.42).
 */
export function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// TL-B schema for the signed deal params cell — must match what the frontend passes to signData.
// NOTE: postId and postedAt are NOT part of the signed cell. They are passed separately
// to the TEE for content verification and on-chain registration. This allows both parties
// to sign the deal BEFORE the ad is posted (better UX).
export const DEAL_PARAMS_SCHEMA =
  'deal_params#_ deal_id:uint64 channel_id:int64 content_hash:uint256 duration:uint32 addresses:^[publisher:MsgAddress advertiser:MsgAddress amount:Coins] = DealParams';

export const DEAL_PARAMS_SCHEMA_HASH = crc32(DEAL_PARAMS_SCHEMA);

/**
 * Build the signed deal params Cell.
 * Both parties sign this same Cell via TonConnect signData.
 *
 * NOTE: postId and postedAt are intentionally excluded from the signed cell.
 * They are only known after posting and are verified separately by the TEE.
 * This allows signing before the ad is posted.
 *
 * Cell layout:
 *   Main cell: dealId(64) | channelId(64) | contentHash(256) | duration(32)
 *     ref[0] → Addresses cell: publisher | advertiser | amount(coins)
 */
export function buildDealParamsCell(params: DealParams): Cell {
  const addressesCell = beginCell()
    .storeAddress(params.publisher)
    .storeAddress(params.advertiser)
    .storeCoins(params.amount)
    .endCell();

  return beginCell()
    .storeUint(params.dealId, 64)
    .storeInt(params.channelId, 64)
    .storeUint(params.contentHash, 256)
    .storeUint(params.duration, 32)
    .storeRef(addressesCell)
    .endCell();
}

/**
 * Serialize deal params into a buffer (cell hash) for legacy direct signing.
 * Kept for backward compatibility / testing.
 */
export function serializeDealParams(params: DealParams): Buffer {
  return buildDealParamsCell(params).hash();
}

/**
 * Reconstruct the TonConnect signData envelope for `cell` type and return its hash.
 *
 * The wallet signs: hash(envelope), where envelope is:
 *   0x75569022  (32 bits)  — signData prefix
 *   crc32(schema) (32 bits) — TL-B schema hash
 *   timestamp   (64 bits)  — unix seconds when signData was called
 *   address     — signer's address (stored as MsgAddress)
 *   ref[0]      — domain string cell
 *   ref[1]      — the deal params Cell (the actual payload)
 */
/**
 * Encode a domain to TON DNS internal representation (TEP-81).
 * "chainfluence.app" → "app\0chainfluence\0"
 * Labels are split by ".", reversed, and each terminated with 0x00.
 */
export function encodeDnsName(domain: string): string {
  let norm = domain.toLowerCase();
  if (norm.endsWith('.')) norm = norm.slice(0, -1);
  if (!norm) return '\0';

  const labels = norm.split('.');
  const reversed = labels.reverse();
  return reversed.map(l => l + '\0').join('');
}

export function buildSignDataEnvelope(
  dealParamsCell: Cell,
  signerAddress: Address,
  timestamp: number,
  domain: string,
  schemaHash: number,
): Cell {
  const encodedDomain = encodeDnsName(domain);

  return beginCell()
    .storeUint(SIGN_DATA_PREFIX, 32)
    .storeUint(schemaHash, 32)
    .storeUint(timestamp, 64)
    .storeAddress(signerAddress)
    .storeStringRefTail(encodedDomain)
    .storeRef(dealParamsCell)
    .endCell();
}

/**
 * Verify a TonConnect signData signature.
 *
 * Steps:
 * 1. Check pubkey vs address (warning only — custodial wallets won't match)
 * 2. Build the deal params Cell
 * 3. Reconstruct the signData envelope
 * 4. Verify the ed25519 signature against the envelope hash
 *
 * The signData envelope embeds the signer's address, so a valid signature
 * proves the wallet at expectedAddress approved the deal params.
 */
export function verifyTonConnectSignature(
  params: DealParams,
  signature: Buffer,
  publicKey: Buffer,
  expectedAddress: Address,
  timestamp: number,
  domain: string,
  schemaHash: number = DEAL_PARAMS_SCHEMA_HASH,
): { valid: boolean; error?: string } {
  // 1. Check pubkey vs address (informational — custodial wallets like Telegram Wallet
  //    use a signing key that doesn't derive to the wallet address)
  verifyPublicKeyMatchesAddress(publicKey, expectedAddress);

  // 2. Build deal params Cell
  const dealParamsCell = buildDealParamsCell(params);

  // 3. Reconstruct the signData envelope
  const envelope = buildSignDataEnvelope(
    dealParamsCell,
    expectedAddress,
    timestamp,
    domain,
    schemaHash,
  );

  // 4. Verify ed25519 signature against envelope hash
  const envelopeHash = envelope.hash();
  const sigValid = signVerify(envelopeHash, signature, publicKey);
  if (!sigValid) {
    return { valid: false, error: 'Invalid TonConnect signData signature' };
  }

  return { valid: true };
}

/**
 * Verify that a public key corresponds to an expected address.
 * Tries multiple wallet contract versions (V4R2, V5R1, V3R2, V3R1)
 * since we don't know which version the user's wallet uses.
 */
export function verifyPublicKeyMatchesAddress(
  publicKey: Buffer,
  expectedAddress: Address
): boolean {
  const opts = { publicKey, workchain: 0 };

  const candidates: [string, Address][] = [
    ['V4R2', WalletContractV4.create(opts).address],
    ['V5R1', WalletContractV5R1.create(opts).address],
    ['V3R2', WalletContractV3R2.create(opts).address],
    ['V3R1', WalletContractV3R1.create(opts).address],
  ];

  for (const [, derived] of candidates) {
    if (derived.equals(expectedAddress)) {
      return true;
    }
  }
  return false;
}
