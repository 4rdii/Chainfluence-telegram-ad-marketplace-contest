// TEE Wallet Endpoint Tests
const TEE_URL = process.env.TEE_URL || 'http://104.196.106.144:8000';

interface WalletResponse {
  address: string;
  publicKey: string;
}

interface HealthResponse {
  status: string;
  timestamp: number;
}

interface ServiceInfoResponse {
  service: string;
  status: string;
  mode: string;
  endpoints: string[];
}

interface ErrorResponse {
  error: string;
}

describe('TEE Wallet Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await fetch(`${TEE_URL}/health`);
      const data = await response.json() as HealthResponse;

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should return service info', async () => {
      const response = await fetch(`${TEE_URL}/`);
      const data = await response.json() as ServiceInfoResponse;

      expect(response.status).toBe(200);
      expect(data.service).toBe('Chainfluence TEE Escrow Service');
      expect(data.status).toBe('running');
      expect(data.endpoints).toContain('POST /createEscrowWallet');
    });
  });

  describe('GET /adminWallet', () => {
    it('should return admin wallet info', async () => {
      const response = await fetch(`${TEE_URL}/adminWallet`);
      const data = await response.json() as WalletResponse;

      expect(response.status).toBe(200);
      expect(data.address).toBeDefined();
      expect(data.publicKey).toBeDefined();
      // Address should be TON format
      expect(data.address).toMatch(/^(UQ|EQ|0:)/);
      // Public key should be 64 hex chars (32 bytes)
      expect(data.publicKey).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should return consistent admin wallet', async () => {
      const response1 = await fetch(`${TEE_URL}/adminWallet`);
      const wallet1 = await response1.json() as WalletResponse;

      const response2 = await fetch(`${TEE_URL}/adminWallet`);
      const wallet2 = await response2.json() as WalletResponse;

      expect(wallet1.address).toBe(wallet2.address);
      expect(wallet1.publicKey).toBe(wallet2.publicKey);
    });
  });

  describe('POST /createEscrowWallet', () => {
    it('should return same wallet for same dealId', async () => {
      const dealId = 42;

      const response1 = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });
      const wallet1 = await response1.json() as WalletResponse;

      const response2 = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });
      const wallet2 = await response2.json() as WalletResponse;

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(wallet1.address).toBe(wallet2.address);
      expect(wallet1.publicKey).toBe(wallet2.publicKey);
    });

    it('should return different wallets for different dealIds', async () => {
      const response1 = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 1 }),
      });
      const wallet1 = await response1.json() as WalletResponse;

      const response2 = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 2 }),
      });
      const wallet2 = await response2.json() as WalletResponse;

      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet1.publicKey).not.toBe(wallet2.publicKey);
    });

    it('should return valid TON address format', async () => {
      const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 100 }),
      });
      const wallet = await response.json() as WalletResponse;

      expect(response.status).toBe(200);
      // TON non-bounceable address format
      expect(wallet.address).toMatch(/^(UQ|EQ|0:)/);
      // Public key should be 64 hex chars (32 bytes)
      expect(wallet.publicKey).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should reject invalid dealId', async () => {
      const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 'not-a-number' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBeDefined();
    });

    it('should reject missing dealId', async () => {
      const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('escrow wallet should differ from admin wallet', async () => {
      const adminResponse = await fetch(`${TEE_URL}/adminWallet`);
      const adminWallet = await adminResponse.json() as WalletResponse;

      const escrowResponse = await fetch(`${TEE_URL}/createEscrowWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 1 }),
      });
      const escrowWallet = await escrowResponse.json() as WalletResponse;

      expect(escrowWallet.address).not.toBe(adminWallet.address);
    });
  });

  describe('Wallet Determinism', () => {
    it('should generate unique wallets for deals 1-10', async () => {
      const addresses = new Set<string>();

      for (let dealId = 1; dealId <= 10; dealId++) {
        const response = await fetch(`${TEE_URL}/createEscrowWallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId }),
        });
        const wallet = await response.json() as WalletResponse;
        addresses.add(wallet.address);
      }

      expect(addresses.size).toBe(10);
    });
  });
});
