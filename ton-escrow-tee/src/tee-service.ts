import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, toNano, internal } from '@ton/core';
import {
  TonWallet,
  DealParams,
  VerifyAndRegisterInput,
  CheckDealResult,
  StoredDeal,
} from './types';
import { deriveAdminWallet, deriveEscrowWallet, getWalletBalance } from './wallet';
import { verifyTonConnectSignature, DEAL_PARAMS_SCHEMA_HASH } from './signature';
import { TelegramBotApi } from './bot-api';
import { DealRegistry } from './deal-registry';
import { createTonClient, withRetry, sleep } from './ton-client';

export interface TeeServiceConfig {
  mnemonic: string;
  botToken: string;
  dealRegistryAddress: string;
  testnet?: boolean;
  tonApiKey?: string;
}

/**
 * TEE Service - Trusted Execution Environment for Ad Escrow
 *
 * All private keys and sensitive operations stay within the TEE.
 * This service handles:
 * 1. Escrow wallet creation/derivation
 * 2. Deal verification and registration
 * 3. Automated release/refund based on conditions
 */
export class TeeService {
  private mnemonic: string;
  private client: TonClient;
  private botApi: TelegramBotApi;
  private dealRegistry: DealRegistry;
  private adminWallet: TonWallet | null = null;

  constructor(config: TeeServiceConfig) {
    this.mnemonic = config.mnemonic;
    this.client = createTonClient({
      testnet: config.testnet,
      apiKey: config.tonApiKey,
    });
    this.botApi = new TelegramBotApi(config.botToken);
    this.dealRegistry = DealRegistry.createFromAddress(Address.parse(config.dealRegistryAddress));
  }

  /**
   * Initialize the service (derive admin wallet)
   */
  async initialize(): Promise<void> {
    this.adminWallet = await deriveAdminWallet(this.mnemonic);
    console.log(`TEE Service initialized. Admin wallet: ${this.adminWallet.address}`);
  }

  /**
   * Get admin wallet (must be initialized first)
   */
  private getAdminWallet(): TonWallet {
    if (!this.adminWallet) {
      throw new Error('TEE Service not initialized. Call initialize() first.');
    }
    return this.adminWallet;
  }

  // ============================================================
  // FUNCTION 1: createEscrowWallet
  // ============================================================

  /**
   * Create/derive an escrow wallet for a specific deal
   * Returns the deposit address for the advertiser
   */
  async createEscrowWallet(dealId: number): Promise<{ address: string; publicKey: string }> {
    const wallet = await deriveEscrowWallet(this.mnemonic, dealId);

    return {
      address: wallet.address,
      publicKey: wallet.publicKey.toString('hex'),
    };
  }

  // ============================================================
  // FUNCTION 2: verifyAndRegisterDeal
  // ============================================================

  /**
   * Verify all conditions and register the deal on-chain
   *
   * Verifications:
   * 1. Publisher TonConnect signData signature valid and matches address
   * 2. Advertiser TonConnect signData signature valid and matches address
   * 3. Deposit exists at escrow wallet
   * 4. Deposit amount >= expected
   * 5. Post exists via Bot API
   * 6. Content hash matches
   *
   * Actions:
   * - Calls createDeal on Deal Registry contract
   */
  async verifyAndRegisterDeal(input: VerifyAndRegisterInput): Promise<{ success: boolean; error?: string; txHash?: string }> {
    const { params, publisher, advertiser, verificationChatId } = input;

    // 1. Verify publisher TonConnect signature
    const publisherCheck = verifyTonConnectSignature(
      params,
      publisher.signature,
      publisher.publicKey,
      params.publisher,
      publisher.timestamp,
      publisher.domain,
      DEAL_PARAMS_SCHEMA_HASH,
    );
    if (!publisherCheck.valid) {
      return { success: false, error: `Publisher signature invalid: ${publisherCheck.error}` };
    }

    // 2. Verify advertiser TonConnect signature
    const advertiserCheck = verifyTonConnectSignature(
      params,
      advertiser.signature,
      advertiser.publicKey,
      params.advertiser,
      advertiser.timestamp,
      advertiser.domain,
      DEAL_PARAMS_SCHEMA_HASH,
    );
    if (!advertiserCheck.valid) {
      return { success: false, error: `Advertiser signature invalid: ${advertiserCheck.error}` };
    }

    // 3. Check deposit at escrow wallet
    const escrowWallet = await deriveEscrowWallet(this.mnemonic, params.dealId);
    const balance = await withRetry(() => getWalletBalance(this.client, escrowWallet.addressRaw));

    if (balance < params.amount) {
      return {
        success: false,
        error: `Insufficient deposit. Expected: ${params.amount}, Found: ${balance}`,
      };
    }

    // 4. Verify post exists and content matches
    const contentStatus = await this.botApi.checkPostStatus(
      params.channelId,
      params.postId,
      params.contentHash,
      verificationChatId
    );

    if (contentStatus === 'deleted') {
      return { success: false, error: 'Post not found in channel' };
    }

    if (contentStatus === 'modified') {
      return { success: false, error: 'Post content does not match expected hash' };
    }

    // 5. Register deal on-chain
    try {
      const adminWallet = this.getAdminWallet();
      const contract = this.client.open(this.dealRegistry);

      const wallet = WalletContractV4.create({
        publicKey: adminWallet.publicKey,
        workchain: 0,
      });
      const walletContract = this.client.open(wallet);
      const seqno = await walletContract.getSeqno();

      // Send createDeal transaction
      await walletContract.sendTransfer({
        secretKey: adminWallet.secretKey,
        seqno,
        messages: [
          internal({
            to: this.dealRegistry.address,
            value: toNano('0.05'), // Gas for contract execution
            body: this.buildCreateDealBody(params),
          }),
        ],
      });

      // Wait for confirmation
      await sleep(10000);

      return {
        success: true,
        txHash: `seqno:${seqno}`, // Simplified - in production, get actual tx hash
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to register deal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private buildCreateDealBody(params: DealParams) {
    const { beginCell } = require('@ton/core');
    const OP_CREATE_DEAL = 0x1;

    const addressesCell = beginCell()
      .storeAddress(params.publisher)
      .storeAddress(params.advertiser)
      .storeCoins(params.amount)
      .storeUint(params.postedAt, 32)
      .endCell();

    return beginCell()
      .storeUint(OP_CREATE_DEAL, 32)
      .storeUint(params.dealId, 64)
      .storeInt(params.channelId, 64)
      .storeInt(params.postId, 64)
      .storeUint(params.contentHash, 256)
      .storeUint(params.duration, 32)
      .storeRef(addressesCell)
      .endCell();
  }

  // ============================================================
  // FUNCTION 3: checkDeal
  // ============================================================

  /** Deposit timeout: if deal is not registered on-chain within this window, advertiser can reclaim */
  private static DEPOSIT_TIMEOUT_SECONDS = 12 * 60 * 60; // 12 hours

  /**
   * Check deal conditions and execute release/refund if appropriate
   *
   * Logic:
   * - If deal not on-chain but escrow has funds and deposit timeout exceeded → Refund
   * - If now >= postedAt + duration AND content unchanged → Release to publisher
   * - If content changed/deleted → Refund to advertiser
   * - If duration not passed AND content unchanged → Do nothing (pending)
   */
  async checkDeal(
    dealId: number,
    verificationChatId: number,
  ): Promise<CheckDealResult> {
    // 1. Get deal from registry
    const contract = this.client.open(this.dealRegistry);
    const deal = await contract.getDeal(BigInt(dealId));

    if (!deal) {
      // Deal not on-chain — check for deposit timeout refund (reads deposit time + sender from TON)
      return this.handleUnregisteredDeal(dealId);
    }

    // 2. Check content status via Bot API
    const contentStatus = await this.botApi.checkPostStatus(
      deal.channelId,
      deal.postId,
      deal.contentHash,
      verificationChatId
    );

    const now = Math.floor(Date.now() / 1000);
    const durationPassed = now >= deal.postedAt + deal.duration;

    // 3. Decision logic
    if (contentStatus === 'deleted' || contentStatus === 'modified') {
      // Content was changed/deleted → Refund to advertiser
      return await this.executeRefund(dealId, deal);
    }

    if (durationPassed) {
      // Duration passed and content still valid → Release to publisher
      return await this.executeRelease(dealId, deal);
    }

    // Content valid but duration not passed yet
    const remainingSeconds = deal.postedAt + deal.duration - now;
    return {
      action: 'pending',
      reason: `Duration not passed. ${remainingSeconds}s remaining.`,
    };
  }

  /**
   * Handle case where deal is not registered on-chain.
   * Reads deposit time directly from TON blockchain (escrow wallet transactions).
   * If the escrow has funds and the deposit timeout has passed, refund the depositor.
   */
  private async handleUnregisteredDeal(
    dealId: number,
  ): Promise<CheckDealResult> {
    try {
      const escrowWallet = await deriveEscrowWallet(this.mnemonic, dealId);
      const balance = await getWalletBalance(this.client, escrowWallet.addressRaw);

      if (balance === 0n) {
        return { action: 'pending', reason: 'Deal not found in registry. No funds in escrow.' };
      }

      // Read the first incoming deposit transaction from the blockchain
      const depositInfo = await this.getFirstDeposit(escrowWallet.addressRaw);
      if (!depositInfo) {
        return { action: 'pending', reason: 'Deal not registered on-chain. Could not read deposit history.' };
      }

      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - depositInfo.timestamp;

      if (elapsed < TeeService.DEPOSIT_TIMEOUT_SECONDS) {
        const remaining = TeeService.DEPOSIT_TIMEOUT_SECONDS - elapsed;
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        return {
          action: 'pending',
          reason: `Deal not registered on-chain. Refund available in ${hours}h ${mins}m.`,
        };
      }

      // Timeout exceeded — refund to the original depositor (address read from blockchain)
      if (!depositInfo.senderAddress) {
        return { action: 'pending', reason: 'Cannot determine depositor address from blockchain.' };
      }

      const gasReserve = toNano('0.01');
      const transferAmount = balance > gasReserve ? balance - gasReserve : 0n;

      if (transferAmount <= 0n) {
        return { action: 'pending', reason: 'Insufficient balance for transfer' };
      }

      const wallet = WalletContractV4.create({
        publicKey: escrowWallet.publicKey,
        workchain: 0,
      });
      const walletContract = this.client.open(wallet);
      const seqno = await walletContract.getSeqno();

      await walletContract.sendTransfer({
        secretKey: escrowWallet.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(depositInfo.senderAddress),
            value: transferAmount,
            body: `Timeout refund: Deal #${dealId}`,
            bounce: false,
          }),
        ],
      });

      return {
        action: 'refunded',
        txHash: `seqno:${seqno}`,
      };
    } catch (error) {
      return {
        action: 'pending',
        reason: `Timeout refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Read the first incoming deposit to an escrow wallet from the TON blockchain.
   * Returns the deposit timestamp and sender address.
   */
  private async getFirstDeposit(
    address: Address,
  ): Promise<{ timestamp: number; senderAddress: string | null } | null> {
    try {
      const txs = await withRetry(() =>
        this.client.getTransactions(address, { limit: 10 }),
      );

      if (!txs || txs.length === 0) return null;

      // Find the earliest incoming value transfer (the deposit)
      // Transactions are returned newest-first, so the last one with incoming value is the deposit
      let earliest: { timestamp: number; senderAddress: string | null } | null = null;

      for (const tx of txs) {
        const inMsg = tx.inMessage;
        if (inMsg && inMsg.info.type === 'internal' && inMsg.info.value.coins > 0n) {
          const sender = inMsg.info.src?.toString({ bounceable: false }) ?? null;
          const ts = tx.now;
          if (!earliest || ts < earliest.timestamp) {
            earliest = { timestamp: ts, senderAddress: sender };
          }
        }
      }

      return earliest;
    } catch (error) {
      console.error(`Failed to read deposit transactions for ${address}:`, error);
      return null;
    }
  }

  /**
   * Execute release: transfer funds from escrow to publisher
   */
  private async executeRelease(dealId: number, deal: StoredDeal): Promise<CheckDealResult> {
    try {
      const escrowWallet = await deriveEscrowWallet(this.mnemonic, dealId);
      const balance = await getWalletBalance(this.client, escrowWallet.addressRaw);

      if (balance === 0n) {
        return { action: 'pending', reason: 'Escrow wallet already empty' };
      }

      // Leave some for gas, send rest to publisher
      const gasReserve = toNano('0.01');
      const transferAmount = balance > gasReserve ? balance - gasReserve : 0n;

      if (transferAmount <= 0n) {
        return { action: 'pending', reason: 'Insufficient balance for transfer' };
      }

      const wallet = WalletContractV4.create({
        publicKey: escrowWallet.publicKey,
        workchain: 0,
      });
      const walletContract = this.client.open(wallet);
      const seqno = await walletContract.getSeqno();

      await walletContract.sendTransfer({
        secretKey: escrowWallet.secretKey,
        seqno,
        messages: [
          internal({
            to: deal.publisher,
            value: transferAmount,
            body: `Release: Deal #${dealId}`,
            bounce: false,
          }),
        ],
      });

      return {
        action: 'released',
        txHash: `seqno:${seqno}`,
      };
    } catch (error) {
      return {
        action: 'pending',
        reason: `Release failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute refund: transfer funds from escrow back to advertiser
   */
  private async executeRefund(dealId: number, deal: StoredDeal): Promise<CheckDealResult> {
    try {
      const escrowWallet = await deriveEscrowWallet(this.mnemonic, dealId);
      const balance = await getWalletBalance(this.client, escrowWallet.addressRaw);

      if (balance === 0n) {
        return { action: 'pending', reason: 'Escrow wallet already empty' };
      }

      // Leave some for gas, send rest to advertiser
      const gasReserve = toNano('0.01');
      const transferAmount = balance > gasReserve ? balance - gasReserve : 0n;

      if (transferAmount <= 0n) {
        return { action: 'pending', reason: 'Insufficient balance for transfer' };
      }

      const wallet = WalletContractV4.create({
        publicKey: escrowWallet.publicKey,
        workchain: 0,
      });
      const walletContract = this.client.open(wallet);
      const seqno = await walletContract.getSeqno();

      await walletContract.sendTransfer({
        secretKey: escrowWallet.secretKey,
        seqno,
        messages: [
          internal({
            to: deal.advertiser,
            value: transferAmount,
            body: `Refund: Deal #${dealId}`,
            bounce: false,
          }),
        ],
      });

      return {
        action: 'refunded',
        txHash: `seqno:${seqno}`,
      };
    } catch (error) {
      return {
        action: 'pending',
        reason: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================
  // UTILITY: getPublicKey
  // ============================================================

  /**
   * Get TEE's admin public key for attestation
   */
  getPublicKey(): string {
    const adminWallet = this.getAdminWallet();
    return adminWallet.publicKey.toString('hex');
  }
}
