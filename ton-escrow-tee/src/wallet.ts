import { mnemonicToSeed } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { keyPairFromSeed, KeyPair } from '@ton/crypto';
import { WalletContractV4, TonClient } from '@ton/ton';
import { Address, internal } from '@ton/core';
import { TonWallet } from './types';

// TON coin type from SLIP-44
const TON_COIN_TYPE = 607;

/**
 * Derive a TON wallet from a BIP-39 mnemonic using SLIP-0010 (ed25519 HD derivation)
 */
export async function deriveTonWallet(mnemonic: string, index: number = 0): Promise<TonWallet> {
  // 1. Convert mnemonic to seed (BIP-39)
  const seed = await mnemonicToSeed(mnemonic);

  // 2. Derive ed25519 key using SLIP-0010
  // Path: m/44'/607'/{index}'/0'
  const path = `m/44'/${TON_COIN_TYPE}'/${index}'/0'`;
  const { key } = derivePath(path, seed.toString('hex'));

  // 3. Create ed25519 keypair from derived seed
  const keyPair: KeyPair = keyPairFromSeed(Buffer.from(key));

  // 4. Create TON wallet contract (v4r2 - standard wallet)
  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  return {
    address: wallet.address.toString({ bounceable: false }),
    addressRaw: wallet.address,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    path,
  };
}

/**
 * Derive the admin/hot wallet (index 0)
 */
export async function deriveAdminWallet(mnemonic: string): Promise<TonWallet> {
  return deriveTonWallet(mnemonic, 0);
}

/**
 * Derive an escrow wallet for a specific deal
 * Uses dealId + 1 as index (0 is reserved for admin)
 */
export async function deriveEscrowWallet(mnemonic: string, dealId: number): Promise<TonWallet> {
  return deriveTonWallet(mnemonic, dealId + 1);
}

/**
 * Get wallet balance from blockchain
 */
export async function getWalletBalance(client: TonClient, address: Address): Promise<bigint> {
  return client.getBalance(address);
}

/**
 * Transfer TON from a wallet
 */
export async function transferTon(
  client: TonClient,
  fromWallet: TonWallet,
  toAddress: string,
  amount: bigint,
  memo?: string
): Promise<{ seqno: number }> {
  const wallet = WalletContractV4.create({
    publicKey: fromWallet.publicKey,
    workchain: 0,
  });

  const contract = client.open(wallet);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
    secretKey: fromWallet.secretKey,
    seqno,
    messages: [
      internal({
        to: toAddress,
        value: amount,
        body: memo || '',
        bounce: false,
      }),
    ],
  });

  return { seqno };
}
