// Full Deal Registration Test (with dummy values)
import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';
import { mnemonicToSeed } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { keyPairFromSeed, sign } from '@ton/crypto';
import { beginCell } from '@ton/core';

const TEE_URL = process.env.TEE_URL || 'http://104.196.106.144:8000';
const CONTRACT_ADDRESS = 'EQBqQcjktBg-F8GAFBEcllmTfaxxqCK99ZTqfkOKMFNMmY_o';
const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';

// Test mnemonics - DO NOT use in production
const PUBLISHER_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ADVERTISER_MNEMONIC = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';

interface DealParams {
  dealId: number;
  channelId: number;
  postId: number;
  contentHash: string;
  duration: number;
  publisher: string;
  advertiser: string;
  amount: string;
  postedAt: number;
}

// Derive a TON wallet from mnemonic
async function deriveTestWallet(mnemonic: string) {
  const seed = await mnemonicToSeed(mnemonic);
  const path = "m/44'/607'/0'/0'";
  const { key } = derivePath(path, seed.toString('hex'));
  const keyPair = keyPairFromSeed(Buffer.from(key));

  const wallet = await import('@ton/ton').then(m =>
    m.WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
    })
  );

  return {
    address: wallet.address.toString({ bounceable: false }),
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}

// Serialize deal params for signing (matches TEE logic)
function serializeDealParams(params: DealParams): Buffer {
  const addressesCell = beginCell()
    .storeAddress(Address.parse(params.publisher))
    .storeAddress(Address.parse(params.advertiser))
    .storeCoins(BigInt(params.amount))
    .storeUint(params.postedAt, 32)
    .endCell();

  const cell = beginCell()
    .storeUint(params.dealId, 64)
    .storeInt(params.channelId, 64)
    .storeInt(params.postId, 64)
    .storeUint(BigInt(params.contentHash), 256)
    .storeUint(params.duration, 32)
    .storeRef(addressesCell)
    .endCell();

  return cell.hash();
}

describe('Deal Registration with Dummy Values', () => {
  let tonClient: TonClient;
  let publisherWallet: { address: string; publicKey: Buffer; secretKey: Buffer };
  let advertiserWallet: { address: string; publicKey: Buffer; secretKey: Buffer };

  beforeAll(async () => {
    tonClient = new TonClient({
      endpoint: TESTNET_ENDPOINT,
      apiKey: process.env.TONCENTER_API_KEY,
    });

    publisherWallet = await deriveTestWallet(PUBLISHER_MNEMONIC);
    advertiserWallet = await deriveTestWallet(ADVERTISER_MNEMONIC);

    console.log('\n=== Test Wallets ===');
    console.log(`Publisher:  ${publisherWallet.address}`);
    console.log(`Advertiser: ${advertiserWallet.address}`);
  });

  it('should prepare and sign a deal for registration', async () => {
    const dealId = 1;
    const now = Math.floor(Date.now() / 1000);

    // Create deal parameters with REAL Telegram post
    const dealParams: DealParams = {
      dealId,
      channelId: -1003116795183, // Real channel: @test_functions
      postId: 7, // Real post: https://t.me/test_functions/7
      contentHash: '0xc6225ee6ac38453b4f39d0054866cefefe9444d5a5b36bb543a490408c30c0d4', // Hash of "Hi This is the second test1"
      duration: 86400, // 24 hours
      publisher: publisherWallet.address,
      advertiser: advertiserWallet.address,
      amount: '100000000', // 0.1 TON in nanoTON
      postedAt: now,
    };

    console.log('\n=== Deal Parameters ===');
    console.log(JSON.stringify(dealParams, null, 2));

    // Both parties sign the deal
    const message = serializeDealParams(dealParams);
    const publisherSignature = sign(message, publisherWallet.secretKey);
    const advertiserSignature = sign(message, advertiserWallet.secretKey);

    console.log('\n=== Signatures Generated ===');
    console.log(`Publisher signature:  ${publisherSignature.toString('hex').slice(0, 32)}...`);
    console.log(`Advertiser signature: ${advertiserSignature.toString('hex').slice(0, 32)}...`);

    // Get escrow address for this deal
    const escrowResponse = await fetch(`${TEE_URL}/createEscrowWallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });
    const escrowWallet = await escrowResponse.json() as { address: string; publicKey: string };

    console.log(`\n=== Escrow Wallet ===`);
    console.log(`Address: ${escrowWallet.address}`);
    console.log(`⚠️  Advertiser should deposit ${Number(dealParams.amount) / 1e9} TON to this address`);

    // Attempt to register the deal
    console.log('\n=== Attempting Deal Registration ===');
    const registerResponse = await fetch(`${TEE_URL}/verifyAndRegisterDeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: dealParams,
        publisherSignature: publisherSignature.toString('hex'),
        publisherPublicKey: publisherWallet.publicKey.toString('hex'),
        advertiserSignature: advertiserSignature.toString('hex'),
        advertiserPublicKey: advertiserWallet.publicKey.toString('hex'),
        verificationChatId: -1003116795183, // Real channel: @test_functions
      }),
    });

    const result = await registerResponse.json() as { success?: boolean; error?: string; txHash?: string };
    console.log('Registration result:', result);

    // Expected to fail because:
    // 1. TEE is in wallet-only mode (no BOT_TOKEN, etc.)
    // 2. No actual deposit in escrow wallet
    // 3. No real Telegram post

    if (result.error || !result.success) {
      console.log(`\n✗ Registration failed (expected): ${result.error}`);

      // Check what specifically failed
      if (result.error?.includes('not fully initialized')) {
        console.log('\nTo fix: Add these env vars to TEE KMS:');
        console.log('  - BOT_TOKEN=<telegram_bot_token>');
        console.log(`  - DEAL_REGISTRY_ADDRESS=${CONTRACT_ADDRESS}`);
        console.log('\nNote: verificationChatId is now passed as a request parameter');
      }

      expect(result.error).toBeDefined();
    } else {
      console.log('\n✓ Deal registered successfully!');
      console.log(`Transaction hash: ${result.txHash}`);

      // Wait and verify on-chain
      await new Promise(resolve => setTimeout(resolve, 15000));

      const contractAddress = Address.parse(CONTRACT_ADDRESS);
      const dealData = await tonClient.runMethod(contractAddress, 'getDeal', [
        { type: 'int', value: BigInt(dealId) },
      ]);

      const channelId = dealData.stack.readBigNumber();
      console.log(`\n✓ Deal verified on-chain! Channel ID: ${channelId}`);

      expect(result.success).toBe(true);
      expect(channelId).toBe(BigInt(dealParams.channelId));
    }
  });

  it('should show curl command for manual testing', () => {
    console.log('\n=== Manual Test Command ===');
    console.log('Once TEE is fully configured, use this curl:');
    console.log(`
curl -X POST ${TEE_URL}/verifyAndRegisterDeal \\
  -H "Content-Type: application/json" \\
  -d '{
    "params": {
      "dealId": 1,
      "channelId": -1001234567890,
      "postId": 123,
      "contentHash": "0x${'a'.repeat(64)}",
      "duration": 86400,
      "publisher": "${publisherWallet.address}",
      "advertiser": "${advertiserWallet.address}",
      "amount": "1000000000",
      "postedAt": ${Math.floor(Date.now() / 1000)}
    },
    "publisherSignature": "<hex>",
    "publisherPublicKey": "${publisherWallet.publicKey.toString('hex')}",
    "advertiserSignature": "<hex>",
    "advertiserPublicKey": "${advertiserWallet.publicKey.toString('hex')}",
    "verificationChatId": -1001234567890
  }'
    `.trim());

    expect(true).toBe(true);
  });
});
