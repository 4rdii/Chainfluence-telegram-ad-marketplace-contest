// Integration Tests: TEE <-> Smart Contract
import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';

const TEE_URL = process.env.TEE_URL || 'http://104.196.106.144:8000';
const CONTRACT_ADDRESS = 'EQBqQcjktBg-F8GAFBEcllmTfaxxqCK99ZTqfkOKMFNMmY_o';
const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';

interface WalletResponse {
  address: string;
  publicKey: string;
}

interface DealRegistryResponse {
  success: boolean;
  error?: string;
  txHash?: string;
}

describe('TEE <-> Smart Contract Integration', () => {
  let tonClient: TonClient;

  beforeAll(() => {
    tonClient = new TonClient({
      endpoint: TESTNET_ENDPOINT,
      apiKey: process.env.TONCENTER_API_KEY,
    });
  });

  describe('Contract Verification', () => {
    it('should verify contract is deployed', async () => {
      const address = Address.parse(CONTRACT_ADDRESS);
      const contractState = await tonClient.getContractState(address);

      expect(contractState.state).toBe('active');
    });

    it('should verify TEE admin wallet has sufficient balance', async () => {
      const response = await fetch(`${TEE_URL}/adminWallet`);
      const wallet = await response.json() as WalletResponse;

      const address = Address.parse(wallet.address);
      const balance = await tonClient.getBalance(address);

      console.log(`Admin wallet balance: ${balance} nanoTON (${Number(balance) / 1e9} TON)`);

      // Warn if balance is low (less than 0.1 TON)
      if (balance < BigInt(100000000)) {
        console.warn('⚠️  Admin wallet balance is low. Fund with testnet TON.');
      }

      expect(balance).toBeGreaterThan(0n);
    });
  });

  describe('Escrow Wallet Creation', () => {
    it('should create deterministic escrow wallet', async () => {
      const dealId = 999; // Test deal ID

      const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });

      const wallet = await response.json() as WalletResponse;

      expect(response.status).toBe(200);
      expect(wallet.address).toBeDefined();
      expect(wallet.publicKey).toBeDefined();

      console.log(`Escrow wallet for deal ${dealId}: ${wallet.address}`);
    });

    it('escrow wallet should be different from admin wallet', async () => {
      const adminResponse = await fetch(`${TEE_URL}/adminWallet`);
      const adminWallet = await adminResponse.json() as WalletResponse;

      const escrowResponse = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 999 }),
      });
      const escrowWallet = await escrowResponse.json() as WalletResponse;

      expect(escrowWallet.address).not.toBe(adminWallet.address);
    });
  });

  describe('Deal Registration Flow', () => {
    it('should fail to register deal without required env vars', async () => {
      // TEE is running in wallet-only mode (no BOT_TOKEN, etc.)
      const response = await fetch(`${TEE_URL}/verifyAndRegisterDeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          params: {
            dealId: 1,
            channelId: -1001234567890,
            postId: 123,
            contentHash: '0x' + 'a'.repeat(64),
            duration: 86400,
            publisher: 'EQD1_test_address',
            advertiser: 'EQD2_test_address',
            amount: '1000000000',
            postedAt: Math.floor(Date.now() / 1000),
          },
          publisherSignature: '00'.repeat(64),
          publisherPublicKey: '00'.repeat(32),
          advertiserSignature: '00'.repeat(64),
          advertiserPublicKey: '00'.repeat(32),
          verificationChatId: -1001234567890,
        }),
      });

      const result = await response.json() as DealRegistryResponse;

      expect(response.status).toBe(503);
      expect(result.error).toContain('not fully initialized');
    });
  });

  describe('Contract Queries', () => {
    it('should query contract admin address', async () => {
      const contractAddress = Address.parse(CONTRACT_ADDRESS);

      // Call getAdmin getter
      const result = await tonClient.runMethod(contractAddress, 'getAdmin');
      const adminAddress = result.stack.readAddress();

      console.log(`Contract admin address: ${adminAddress.toString()}`);

      // Verify admin is the TEE hot wallet
      const adminResponse = await fetch(`${TEE_URL}/adminWallet`);
      const adminWallet = await adminResponse.json() as WalletResponse;

      expect(adminAddress.toString()).toContain(adminWallet.address.slice(2, 10));
    });

    it('should query next deal ID from contract', async () => {
      const contractAddress = Address.parse(CONTRACT_ADDRESS);

      const result = await tonClient.runMethod(contractAddress, 'getNextDealId');
      const nextDealId = result.stack.readBigNumber();

      console.log(`Next deal ID: ${nextDealId}`);
      expect(nextDealId).toBeGreaterThanOrEqual(0n);
    });

    it('should check if deal exists (should be false for non-existent deal)', async () => {
      const contractAddress = Address.parse(CONTRACT_ADDRESS);
      const testDealId = 99999n;

      const result = await tonClient.runMethod(contractAddress, 'dealExists', [
        { type: 'int', value: testDealId },
      ]);
      const exists = result.stack.readNumber();

      expect(exists).toBe(0); // 0 = false, -1 = true in TON
    });
  });

  describe('End-to-End Verification', () => {
    it('should demonstrate full TEE capabilities in wallet-only mode', async () => {
      console.log('\n=== TEE Service Capabilities Test ===');

      // 1. Admin wallet
      const adminResponse = await fetch(`${TEE_URL}/adminWallet`);
      const admin = await adminResponse.json() as WalletResponse;
      console.log(`✓ Admin wallet: ${admin.address}`);

      // 2. Create escrow wallets for multiple deals
      const dealIds = [1, 2, 3];
      const escrowAddresses: string[] = [];

      for (const dealId of dealIds) {
        const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId }),
        });
        const wallet = await response.json() as WalletResponse;
        escrowAddresses.push(wallet.address);
        console.log(`✓ Escrow ${dealId}: ${wallet.address}`);
      }

      // 3. Verify contract is accessible
      const contractAddress = Address.parse(CONTRACT_ADDRESS);
      const adminAddr = await tonClient.runMethod(contractAddress, 'getAdmin');
      console.log(`✓ Contract admin: ${adminAddr.stack.readAddress().toString()}`);

      // All checks passed
      expect(admin.address).toBeDefined();
      expect(escrowAddresses.length).toBe(3);
      expect(new Set(escrowAddresses).size).toBe(3); // All unique
    });
  });
});
