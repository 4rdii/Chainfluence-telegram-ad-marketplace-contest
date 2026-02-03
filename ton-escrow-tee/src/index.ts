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

// HTTP Server
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TeeService } from './tee-service';
import { deriveAdminWallet, deriveEscrowWallet } from './wallet';
import { Address } from '@ton/core';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Global TEE service instance
let teeService: TeeService | null = null;

// Initialize TEE service
async function initializeTeeService(): Promise<boolean> {
  const mnemonic = process.env.MNEMONIC;
  const botToken = process.env.BOT_TOKEN;
  const verificationChatId = process.env.VERIFICATION_CHAT_ID;
  const dealRegistryAddress = process.env.DEAL_REGISTRY_ADDRESS;

  if (!mnemonic) {
    console.error('MNEMONIC environment variable is required');
    return false;
  }

  // If all env vars present, initialize full service
  if (botToken && verificationChatId && dealRegistryAddress) {
    teeService = new TeeService({
      mnemonic,
      botToken,
      verificationChatId: parseInt(verificationChatId),
      dealRegistryAddress,
      testnet: process.env.TESTNET === 'true',
      tonApiKey: process.env.TONCENTER_API_KEY,
    });
    await teeService.initialize();
    console.log('TEE Service fully initialized');
  } else {
    console.log('Running in wallet-only mode (missing BOT_TOKEN, VERIFICATION_CHAT_ID, or DEAL_REGISTRY_ADDRESS)');
  }

  return true;
}

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Chainfluence TEE Escrow Service',
    status: 'running',
    mode: teeService ? 'full' : 'wallet-only',
    endpoints: [
      'POST /createEscrowWallet',
      'POST /verifyAndRegisterDeal',
      'POST /checkDeal',
      'GET /health',
    ],
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================================================
// ENDPOINT 1: createEscrowWallet
// ============================================================
app.post('/createEscrowWallet', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.body;

    if (typeof dealId !== 'number') {
      return res.status(400).json({ error: 'dealId must be a number' });
    }

    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
      return res.status(500).json({ error: 'MNEMONIC not configured' });
    }

    const wallet = await deriveEscrowWallet(mnemonic, dealId);

    res.json({
      address: wallet.address,
      publicKey: wallet.publicKey.toString('hex'),
    });
  } catch (error) {
    console.error('createEscrowWallet error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================
// ENDPOINT 2: verifyAndRegisterDeal
// ============================================================
app.post('/verifyAndRegisterDeal', async (req: Request, res: Response) => {
  try {
    if (!teeService) {
      return res.status(503).json({ error: 'TEE service not fully initialized. Missing env vars.' });
    }

    const { params, publisherSignature, publisherPublicKey, advertiserSignature, advertiserPublicKey } = req.body;

    // Parse addresses from strings
    const dealParams = {
      ...params,
      publisher: Address.parse(params.publisher),
      advertiser: Address.parse(params.advertiser),
      contentHash: BigInt(params.contentHash),
      amount: BigInt(params.amount),
    };

    const result = await teeService.verifyAndRegisterDeal({
      params: dealParams,
      publisherSignature: Buffer.from(publisherSignature, 'hex'),
      publisherPublicKey: Buffer.from(publisherPublicKey, 'hex'),
      advertiserSignature: Buffer.from(advertiserSignature, 'hex'),
      advertiserPublicKey: Buffer.from(advertiserPublicKey, 'hex'),
    });

    res.json(result);
  } catch (error) {
    console.error('verifyAndRegisterDeal error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================
// ENDPOINT 3: checkDeal
// ============================================================
app.post('/checkDeal', async (req: Request, res: Response) => {
  try {
    if (!teeService) {
      return res.status(503).json({ error: 'TEE service not fully initialized. Missing env vars.' });
    }

    const { dealId } = req.body;

    if (typeof dealId !== 'number') {
      return res.status(400).json({ error: 'dealId must be a number' });
    }

    const result = await teeService.checkDeal(dealId);
    res.json(result);
  } catch (error) {
    console.error('checkDeal error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================
// ENDPOINT: getAdminWallet (utility)
// ============================================================
app.get('/adminWallet', async (_req: Request, res: Response) => {
  try {
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
      return res.status(500).json({ error: 'MNEMONIC not configured' });
    }

    const wallet = await deriveAdminWallet(mnemonic);
    res.json({
      address: wallet.address,
      publicKey: wallet.publicKey.toString('hex'),
    });
  } catch (error) {
    console.error('adminWallet error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function main() {
  const initialized = await initializeTeeService();
  if (!initialized) {
    process.exit(1);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('Chainfluence TEE Escrow Service');
    console.log('='.repeat(60));
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Mode: ${teeService ? 'Full Service' : 'Wallet-Only'}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  POST /createEscrowWallet  - Create escrow wallet for a deal`);
    console.log(`  POST /verifyAndRegisterDeal - Verify and register deal on-chain`);
    console.log(`  POST /checkDeal - Check deal status and execute release/refund`);
    console.log(`  GET  /adminWallet - Get TEE admin wallet info`);
    console.log(`  GET  /health - Health check`);
    console.log('='.repeat(60));
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
