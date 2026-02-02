import {
    Address,
    beginCell,
    Cell,
    Contract,
    ContractABI,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    TupleItemInt,
} from '@ton/core';

// Op codes must match the contract
const OP_CREATE_DEAL = 0x1;

export type DealRegistryConfig = {
    admin: Address;
    nextDealId?: bigint;
};

export type Deal = {
    channelId: bigint;
    postId: bigint;
    contentHash: bigint;
    duration: number;
    publisher: Address;
    advertiser: Address;
    amount: bigint;
    postedAt: number;
    createdAt: number;
};

export type CreateDealParams = {
    dealId: bigint;
    channelId: bigint;
    postId: bigint;
    contentHash: bigint;
    duration: number;
    publisher: Address;
    advertiser: Address;
    amount: bigint;
    postedAt: number;
};

export function dealRegistryConfigToCell(config: DealRegistryConfig): Cell {
    return beginCell()
        .storeAddress(config.admin)
        .storeUint(config.nextDealId ?? 0n, 64)
        .storeMaybeRef(null) // empty deals dict
        .endCell();
}

export class DealRegistry implements Contract {
    abi: ContractABI = { name: 'DealRegistry' };

    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new DealRegistry(address);
    }

    static createFromConfig(config: DealRegistryConfig, code: Cell, workchain = 0) {
        const data = dealRegistryConfigToCell(config);
        const init = { code, data };
        return new DealRegistry(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendCreateDeal(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: CreateDealParams
    ) {
        // Split into two cells due to 1023 bit limit
        // Cell 1: op + dealId + channelId + postId + contentHash + duration
        // Cell 2 (ref): publisher + advertiser + amount + postedAt
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

    async getDeal(provider: ContractProvider, dealId: bigint): Promise<Deal> {
        const result = await provider.get('getDeal', [
            { type: 'int', value: dealId } as TupleItemInt,
        ]);

        return {
            channelId: result.stack.readBigNumber(),
            postId: result.stack.readBigNumber(),
            contentHash: result.stack.readBigNumber(),
            duration: result.stack.readNumber(),
            publisher: result.stack.readAddress(),
            advertiser: result.stack.readAddress(),
            amount: result.stack.readBigNumber(),
            postedAt: result.stack.readNumber(),
            createdAt: result.stack.readNumber(),
        };
    }

    async getNextDealId(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('getNextDealId', []);
        return result.stack.readBigNumber();
    }

    async getAdmin(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getAdmin', []);
        return result.stack.readAddress();
    }

    async dealExists(provider: ContractProvider, dealId: bigint): Promise<boolean> {
        const result = await provider.get('dealExists', [
            { type: 'int', value: dealId } as TupleItemInt,
        ]);
        return result.stack.readNumber() !== 0;
    }
}
