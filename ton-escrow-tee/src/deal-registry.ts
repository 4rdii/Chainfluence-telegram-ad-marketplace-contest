import { TonClient } from '@ton/ton';
import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode, toNano } from '@ton/core';
import { StoredDeal, DealParams } from './types';

// Contract opcodes
const OP_CREATE_DEAL = 0x1;

/**
 * Deal Registry contract wrapper for TEE
 */
export class DealRegistry implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address): DealRegistry {
    return new DealRegistry(address);
  }

  /**
   * Send createDeal transaction
   */
  async sendCreateDeal(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    params: DealParams
  ): Promise<void> {
    // Split into two cells due to 1023 bit limit
    const addressesCell = beginCell()
      .storeAddress(params.publisher)
      .storeAddress(params.advertiser)
      .storeCoins(params.amount)
      .storeUint(params.postedAt, 32)
      .endCell();

    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP_CREATE_DEAL, 32)
        .storeUint(params.dealId, 64)
        .storeInt(params.channelId, 64)
        .storeInt(params.postId, 64)
        .storeUint(params.contentHash, 256)
        .storeUint(params.duration, 32)
        .storeRef(addressesCell)
        .endCell(),
    });
  }

  /**
   * Get deal by ID from contract
   */
  async getDeal(provider: ContractProvider, dealId: bigint): Promise<StoredDeal | null> {
    try {
      const result = await provider.get('getDeal', [{ type: 'int', value: dealId }]);

      return {
        channelId: Number(result.stack.readBigNumber()),
        postId: Number(result.stack.readBigNumber()),
        contentHash: result.stack.readBigNumber(),
        duration: Number(result.stack.readBigNumber()),
        publisher: result.stack.readAddress(),
        advertiser: result.stack.readAddress(),
        amount: result.stack.readBigNumber(),
        postedAt: Number(result.stack.readBigNumber()),
        createdAt: Number(result.stack.readBigNumber()),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get next deal ID
   */
  async getNextDealId(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('getNextDealId', []);
    return result.stack.readBigNumber();
  }

  /**
   * Check if deal exists
   */
  async dealExists(provider: ContractProvider, dealId: bigint): Promise<boolean> {
    const result = await provider.get('dealExists', [{ type: 'int', value: dealId }]);
    return result.stack.readNumber() !== 0;
  }
}

/**
 * Create a sender from a wallet for contract interactions
 */
export function createSenderFromWallet(
  secretKey: Buffer,
  publicKey: Buffer,
  client: TonClient
): Sender {
  const { WalletContractV4 } = require('@ton/ton');

  const wallet = WalletContractV4.create({
    publicKey,
    workchain: 0,
  });

  const contract = client.open(wallet);

  return {
    address: wallet.address,
    async send(args) {
      const seqno = await contract.getSeqno();
      await contract.sendTransfer({
        secretKey,
        seqno,
        messages: [args],
      });
    },
  } as Sender;
}
