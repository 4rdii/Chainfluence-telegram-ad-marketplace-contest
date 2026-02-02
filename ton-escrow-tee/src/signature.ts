import { sign, signVerify } from '@ton/crypto';
import { beginCell, Address } from '@ton/core';
import { WalletContractV4 } from '@ton/ton';
import { DealParams } from './types';

/**
 * Serialize deal params into a cell for signing
 * Both parties sign this exact same cell
 */
export function serializeDealParams(params: DealParams): Buffer {
  // Create a deterministic cell with all deal parameters
  const addressesCell = beginCell()
    .storeAddress(params.publisher)
    .storeAddress(params.advertiser)
    .storeCoins(params.amount)
    .storeUint(params.postedAt, 32)
    .endCell();

  const cell = beginCell()
    .storeUint(params.dealId, 64)
    .storeInt(params.channelId, 64)
    .storeInt(params.postId, 64)
    .storeUint(params.contentHash, 256)
    .storeUint(params.duration, 32)
    .storeRef(addressesCell)
    .endCell();

  // Return the cell hash as the message to sign
  return cell.hash();
}

/**
 * Sign deal params with a secret key
 */
export function signDealParams(params: DealParams, secretKey: Buffer): Buffer {
  const message = serializeDealParams(params);
  return sign(message, secretKey);
}

/**
 * Verify a signature against deal params and public key
 */
export function verifyDealSignature(
  params: DealParams,
  signature: Buffer,
  publicKey: Buffer
): boolean {
  const message = serializeDealParams(params);
  return signVerify(message, signature, publicKey);
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

/**
 * Full signature verification:
 * 1. Verify signature is valid for the message and public key
 * 2. Verify public key produces the expected address
 */
export function verifyPartySignature(
  params: DealParams,
  signature: Buffer,
  publicKey: Buffer,
  expectedAddress: Address
): { valid: boolean; error?: string } {
  // Check public key matches address
  if (!verifyPublicKeyMatchesAddress(publicKey, expectedAddress)) {
    return { valid: false, error: 'Public key does not match expected address' };
  }

  // Check signature is valid
  if (!verifyDealSignature(params, signature, publicKey)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}
