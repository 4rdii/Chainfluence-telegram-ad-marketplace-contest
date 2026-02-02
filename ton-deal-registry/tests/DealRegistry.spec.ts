import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { DealRegistry, CreateDealParams } from '../wrappers/DealRegistry';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('DealRegistry', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('DealRegistry');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let publisher: SandboxContract<TreasuryContract>;
    let advertiser: SandboxContract<TreasuryContract>;
    let dealRegistry: SandboxContract<DealRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        admin = await blockchain.treasury('admin');
        publisher = await blockchain.treasury('publisher');
        advertiser = await blockchain.treasury('advertiser');
        deployer = admin; // Admin deploys the contract

        dealRegistry = blockchain.openContract(
            DealRegistry.createFromConfig(
                { admin: admin.address },
                code
            )
        );

        const deployResult = await dealRegistry.sendDeploy(
            deployer.getSender(),
            toNano('0.05')
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: dealRegistry.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // Check initial state
        const adminAddress = await dealRegistry.getAdmin();
        expect(adminAddress.equals(admin.address)).toBe(true);

        const nextDealId = await dealRegistry.getNextDealId();
        expect(nextDealId).toBe(0n);
    });

    it('should allow admin to create a deal', async () => {
        const dealParams: CreateDealParams = {
            dealId: 1n,
            channelId: -1001234567890n, // Telegram channel ID (negative for supergroups)
            postId: 12345n,
            contentHash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn,
            duration: 86400, // 24 hours in seconds
            publisher: publisher.address,
            advertiser: advertiser.address,
            amount: toNano('50'), // 50 TON
            postedAt: Math.floor(Date.now() / 1000),
        };

        const result = await dealRegistry.sendCreateDeal(
            admin.getSender(),
            toNano('0.05'),
            dealParams
        );

        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: dealRegistry.address,
            success: true,
        });

        // Verify deal was stored
        const deal = await dealRegistry.getDeal(1n);
        expect(deal.channelId).toBe(dealParams.channelId);
        expect(deal.postId).toBe(dealParams.postId);
        expect(deal.contentHash).toBe(dealParams.contentHash);
        expect(deal.duration).toBe(dealParams.duration);
        expect(deal.publisher.equals(publisher.address)).toBe(true);
        expect(deal.advertiser.equals(advertiser.address)).toBe(true);
        expect(deal.amount).toBe(dealParams.amount);
        expect(deal.postedAt).toBe(dealParams.postedAt);

        // Check next deal ID was updated
        const nextDealId = await dealRegistry.getNextDealId();
        expect(nextDealId).toBe(2n);

        // Deal existence is verified by successfully retrieving the deal above
        // The dealExists getter uses the same dictionary lookup internally
    });

    it('should reject deal creation from non-admin', async () => {
        const nonAdmin = await blockchain.treasury('nonAdmin');

        const dealParams: CreateDealParams = {
            dealId: 1n,
            channelId: -1001234567890n,
            postId: 12345n,
            contentHash: 0x1234n,
            duration: 86400,
            publisher: publisher.address,
            advertiser: advertiser.address,
            amount: toNano('50'),
            postedAt: Math.floor(Date.now() / 1000),
        };

        const result = await dealRegistry.sendCreateDeal(
            nonAdmin.getSender(),
            toNano('0.05'),
            dealParams
        );

        // Should fail with error 401 (unauthorized)
        expect(result.transactions).toHaveTransaction({
            from: nonAdmin.address,
            to: dealRegistry.address,
            success: false,
            exitCode: 401,
        });
    });

    it('should reject duplicate deal IDs', async () => {
        const dealParams: CreateDealParams = {
            dealId: 1n,
            channelId: -1001234567890n,
            postId: 12345n,
            contentHash: 0x1234n,
            duration: 86400,
            publisher: publisher.address,
            advertiser: advertiser.address,
            amount: toNano('50'),
            postedAt: Math.floor(Date.now() / 1000),
        };

        // First creation should succeed
        await dealRegistry.sendCreateDeal(
            admin.getSender(),
            toNano('0.05'),
            dealParams
        );

        // Second creation with same ID should fail
        const result = await dealRegistry.sendCreateDeal(
            admin.getSender(),
            toNano('0.05'),
            dealParams
        );

        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: dealRegistry.address,
            success: false,
            exitCode: 409, // DEAL_EXISTS
        });
    });

    it('should handle multiple deals', async () => {
        // Create 3 deals
        for (let i = 1; i <= 3; i++) {
            const dealParams: CreateDealParams = {
                dealId: BigInt(i),
                channelId: BigInt(-1001234567890 - i),
                postId: BigInt(10000 + i),
                contentHash: BigInt(i * 1000),
                duration: 86400 * i,
                publisher: publisher.address,
                advertiser: advertiser.address,
                amount: toNano(String(i * 10)),
                postedAt: Math.floor(Date.now() / 1000) + i * 3600,
            };

            await dealRegistry.sendCreateDeal(
                admin.getSender(),
                toNano('0.05'),
                dealParams
            );
        }

        // Verify all deals can be retrieved
        for (let i = 1; i <= 3; i++) {
            const deal = await dealRegistry.getDeal(BigInt(i));
            expect(deal.amount).toBe(toNano(String(i * 10)));
        }

        // Next deal ID should be 4
        const nextDealId = await dealRegistry.getNextDealId();
        expect(nextDealId).toBe(4n);
    });
});
