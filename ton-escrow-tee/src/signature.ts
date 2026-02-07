import { signVerify } from '@ton/crypto';
import { beginCell, Cell, Address } from '@ton/core';
import { WalletContractV4 } from '@ton/ton';
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
export function buildSignDataEnvelope(
  dealParamsCell: Cell,
  signerAddress: Address,
  timestamp: number,
  domain: string,
  schemaHash: number,
): Cell {
  const domainCell = beginCell()
    .storeStringTail(domain)
    .endCell();

  return beginCell()
    .storeUint(SIGN_DATA_PREFIX, 32)
    .storeUint(schemaHash, 32)
    .storeUint(timestamp, 64)
    .storeAddress(signerAddress)
    .storeRef(domainCell)
    .storeRef(dealParamsCell)
    .endCell();
}

/**
 * Verify a TonConnect signData signature.
 *
 * Steps:
 * 1. Build the deal params Cell from deal parameters
 * 2. Reconstruct the signData envelope
 * 3. Verify the ed25519 signature against the envelope hash
 * 4. Verify the public key matches the expected wallet address
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
  // 1. Verify public key matches expected address
  if (!verifyPublicKeyMatchesAddress(publicKey, expectedAddress)) {
    return { valid: false, error: 'Public key does not match expected address' };
  }

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
  if (!signVerify(envelopeHash, signature, publicKey)) {
    return { valid: false, error: 'Invalid TonConnect signData signature' };
  }

  return { valid: true };
}

/**
 * Derive address from public key (v4r2 wallet)
 */
export function addressFromPublicKey(publicKey: Buffer): Address {
  const wallet = WalletContractV4.create({
    publicKey,
    workchain: 0,
  });
  return wallet.address;
}

/**
 * Verify that a public key corresponds to an expected address
 */
export function verifyPublicKeyMatchesAddress(
  publicKey: Buffer,
  expectedAddress: Address
): boolean {
  const derivedAddress = addressFromPublicKey(publicKey);
  return derivedAddress.equals(expectedAddress);
}
