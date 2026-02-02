// TEE Service exports
export { TeeService, TeeServiceConfig } from './tee-service';

// Types
export {
  DealParams,
  VerifyAndRegisterInput,
  CheckDealResult,
  TonWallet,
  StoredDeal,
  ContentVerification,
} from './types';

// Utilities (for external use)
export { computeContentHash } from './bot-api';
export { serializeDealParams, signDealParams, verifyDealSignature } from './signature';
export { deriveAdminWallet, deriveEscrowWallet } from './wallet';

// Example usage / CLI
import dotenv from 'dotenv';
import { TeeService } from './tee-service';

dotenv.config();

async function main() {
  const mnemonic = process.env.MNEMONIC;
  const botToken = process.env.BOT_TOKEN;
  const verificationChatId = process.env.VERIFICATION_CHAT_ID;
  const dealRegistryAddress = process.env.DEAL_REGISTRY_ADDRESS;

  if (!mnemonic) {
    console.error('MNEMONIC environment variable is required');
    process.exit(1);
  }

  if (!botToken || !verificationChatId || !dealRegistryAddress) {
    console.log('='.repeat(60));
    console.log('TEE Service - Demo Mode');
    console.log('='.repeat(60));
    console.log('\nMissing environment variables for full operation:');
    console.log('  BOT_TOKEN - Telegram bot token');
    console.log('  VERIFICATION_CHAT_ID - Chat ID for message verification');
    console.log('  DEAL_REGISTRY_ADDRESS - Deployed contract address');
    console.log('\nDemonstrating wallet derivation only...\n');

    const { deriveAdminWallet, deriveEscrowWallet } = await import('./wallet');

    const adminWallet = await deriveAdminWallet(mnemonic);
    console.log(`Admin Wallet: ${adminWallet.address}`);
    console.log(`Public Key:   ${adminWallet.publicKey.toString('hex').slice(0, 32)}...`);

    console.log('\nEscrow Wallets:');
    for (const dealId of [1, 2, 3]) {
      const escrow = await deriveEscrowWallet(mnemonic, dealId);
      console.log(`  Deal #${dealId}: ${escrow.address}`);
    }

    return;
  }

  // Full service initialization
  const teeService = new TeeService({
    mnemonic,
    botToken,
    verificationChatId: parseInt(verificationChatId),
    dealRegistryAddress,
    testnet: process.env.TESTNET === 'true',
    tonApiKey: process.env.TONCENTER_API_KEY,
  });

  await teeService.initialize();

  console.log('='.repeat(60));
  console.log('TEE Service Ready');
  console.log('='.repeat(60));
  console.log(`\nPublic Key: ${teeService.getPublicKey()}`);
  console.log('\nAvailable functions:');
  console.log('  - createEscrowWallet(dealId)');
  console.log('  - verifyAndRegisterDeal(input)');
  console.log('  - checkDeal(dealId)');
}

// Only run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
