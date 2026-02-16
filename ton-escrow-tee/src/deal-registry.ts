import { Address, Cell, Contract, ContractProvider } from '@ton/core';
import { StoredDeal } from './types';

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
}
